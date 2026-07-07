import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  ShaderMaterial,
  Vector3,
} from "three";
import { useWorldClock } from "../world/WorldClock";
import { dayness } from "../world/sun";
import { PALETTE, mix } from "../world/palettes";
import { IS_TOUCH } from "../world/device";

// One pooled, GPU-stateless particle system for every burst effect in the
// world: breach splashes, spray rings, blowhole spouts, glassbear breath.
// Particles are ballistic — the vertex shader integrates
// p = origin + v·age − ½g·age² from immutable per-particle attributes, so the
// CPU touches the buffers only at emit time (a ring cursor overwrites the
// oldest slots). Additive blobs, tinted by dayness() per the two color
// scripts: silver-white in the Bright, indigo-teal in the Dark.

export interface BurstOptions {
  kind: "splash" | "sprayRing" | "vapor" | "spout";
  origin: Vector3;
  /** Mean emission direction (unit-ish). Defaults to +Y. Ignored by sprayRing. */
  dir?: Vector3;
  count: number;
  baseSpeed: number;
  /** Cone half-angle-ish randomization, 0..1. */
  spread: number;
  life: number;
  /** World-space blob diameter in meters at birth. */
  size: number;
  gravity?: number;
}

const particleVertex = /* glsl */ `
  attribute vec3 aVel;
  attribute float aBirth;
  attribute float aLife;
  attribute float aSize;
  attribute float aGrav;
  uniform float uTime;
  uniform float uGrow;
  uniform float uPixelScale;
  varying float vAlpha;

  void main() {
    float age = uTime - aBirth;
    float k = clamp(age / max(aLife, 1e-3), 0.0, 1.0);
    vec3 p = position + aVel * age - vec3(0.0, 0.5 * aGrav * age * age, 0.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // Quick ramp in, quadratic fade out.
    vAlpha = smoothstep(0.0, 0.12, k) * (1.0 - k) * (1.0 - k);
    gl_PointSize = aSize * (1.0 + uGrow * k) * uPixelScale / max(1.0, -mv.z);
    gl_Position = projectionMatrix * mv;
    // Dead or unborn: throw the vertex outside the clip volume.
    if (age < 0.0 || k >= 1.0) gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
  }
`;

const particleFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform vec3 uTint;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    float m = texture2D(uMap, gl_PointCoord).a;
    gl_FragColor = vec4(uTint * (m * vAlpha * uOpacity), 1.0);
  }
`;

/** Soft radial blob — same recipe as the waterfall mist sprites. */
function makeBlobTexture(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.32)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

interface Pool {
  geometry: BufferGeometry;
  material: ShaderMaterial;
  capacity: number;
  cursor: number;
  /** Multiplies the burst tint — vapor is fainter than a breach plume. */
  opacity: number;
  grow: number;
}

function makePool(capacity: number, opacity: number, grow: number, map: CanvasTexture): Pool {
  const geometry = new BufferGeometry();
  const zero3 = new Float32Array(capacity * 3);
  const birth = new Float32Array(capacity).fill(-1e9); // everything starts dead
  geometry.setAttribute("position", new BufferAttribute(zero3.slice(), 3));
  geometry.setAttribute("aVel", new BufferAttribute(zero3.slice(), 3));
  geometry.setAttribute("aBirth", new BufferAttribute(birth, 1));
  geometry.setAttribute("aLife", new BufferAttribute(new Float32Array(capacity).fill(1), 1));
  geometry.setAttribute("aSize", new BufferAttribute(new Float32Array(capacity), 1));
  geometry.setAttribute("aGrav", new BufferAttribute(new Float32Array(capacity), 1));

  const material = new ShaderMaterial({
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    uniforms: {
      uTime: { value: 0 },
      uGrow: { value: grow },
      uPixelScale: { value: 600 },
      uMap: { value: map },
      uTint: { value: new Color("#e8f2f8") },
      uOpacity: { value: opacity },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  return { geometry, material, capacity, cursor: 0, opacity, grow };
}

// Pools by particle "weight class": splash = coarse water, mist = fine spray
// (rings + spouts), vapor = breath. Touch devices get quarter-size pools.
const POOL_DEFS = IS_TOUCH
  ? { splash: 256, mist: 256, vapor: 96 }
  : { splash: 1024, mist: 1024, vapor: 256 };

const pools: Record<string, Pool> = {};
let poolTime = 0; // mirrors the render clock so emits timestamp correctly

function ensurePools(): Record<string, Pool> {
  if (!pools.splash) {
    const map = makeBlobTexture();
    // Splash rides into HDR (>1) on purpose — the Bloom pass ignites the plume.
    pools.splash = makePool(POOL_DEFS.splash, 1.35, 2.2, map);
    pools.mist = makePool(POOL_DEFS.mist, 0.7, 3.2, map);
    pools.vapor = makePool(POOL_DEFS.vapor, 0.55, 3.8, map);
  }
  return pools;
}

const KIND_POOL: Record<BurstOptions["kind"], keyof typeof POOL_DEFS> = {
  splash: "splash",
  sprayRing: "mist",
  spout: "mist",
  vapor: "vapor",
};

const KIND_GRAVITY: Record<BurstOptions["kind"], number> = {
  splash: 14,
  sprayRing: 3.2,
  spout: 6,
  vapor: -0.25, // warm breath rises
};

const scratchDir = new Vector3(0, 1, 0);

/** Spawn a burst. Cheap: writes `count` slots into a ring buffer, no allocation. */
export function emitBurst(opts: BurstOptions): void {
  const pool = ensurePools()[KIND_POOL[opts.kind]];
  const g = opts.gravity ?? KIND_GRAVITY[opts.kind];
  const dir = opts.dir ? scratchDir.copy(opts.dir).normalize() : scratchDir.set(0, 1, 0);
  // Touch pools are a quarter size — thin the bursts to match.
  const count = Math.min(IS_TOUCH ? Math.ceil(opts.count / 3) : opts.count, pool.capacity);

  const pos = pool.geometry.getAttribute("position") as BufferAttribute;
  const vel = pool.geometry.getAttribute("aVel") as BufferAttribute;
  const birth = pool.geometry.getAttribute("aBirth") as BufferAttribute;
  const life = pool.geometry.getAttribute("aLife") as BufferAttribute;
  const size = pool.geometry.getAttribute("aSize") as BufferAttribute;
  const grav = pool.geometry.getAttribute("aGrav") as BufferAttribute;

  for (let n = 0; n < count; n++) {
    const i = pool.cursor;
    pool.cursor = (pool.cursor + 1) % pool.capacity;

    const speed = opts.baseSpeed * (0.45 + 0.75 * Math.random());
    let vx: number, vy: number, vz: number;
    if (opts.kind === "sprayRing") {
      // Horizontal radial sheet with a little lift.
      const a = Math.random() * Math.PI * 2;
      vx = Math.cos(a) * speed;
      vz = Math.sin(a) * speed;
      vy = speed * (0.12 + 0.25 * Math.random());
    } else {
      // Cone around `dir`.
      const s = opts.spread;
      vx = dir.x + (Math.random() * 2 - 1) * s;
      vy = dir.y + (Math.random() * 2 - 1) * s;
      vz = dir.z + (Math.random() * 2 - 1) * s;
      const inv = speed / Math.max(1e-4, Math.hypot(vx, vy, vz));
      vx *= inv;
      vy *= inv;
      vz *= inv;
    }

    pos.setXYZ(
      i,
      opts.origin.x + (Math.random() * 2 - 1) * opts.size * 0.5,
      opts.origin.y + (Math.random() * 2 - 1) * opts.size * 0.25,
      opts.origin.z + (Math.random() * 2 - 1) * opts.size * 0.5
    );
    vel.setXYZ(i, vx, vy, vz);
    birth.setX(i, poolTime + Math.random() * 0.12); // stagger so edges feather
    life.setX(i, opts.life * (0.65 + 0.7 * Math.random()));
    size.setX(i, opts.size * (0.7 + 0.6 * Math.random()));
    grav.setX(i, g);
  }

  pos.needsUpdate = true;
  vel.needsUpdate = true;
  birth.needsUpdate = true;
  life.needsUpdate = true;
  size.needsUpdate = true;
  grav.needsUpdate = true;
}

// Dev affordance, same pattern as __ketuClock / __ketuObserver.
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__ketuFX = { emitBurst, Vector3 };
}

export function ParticleField() {
  const ready = useMemo(ensurePools, []);
  const tint = useMemo(() => new Color(), []);

  useEffect(() => {
    return () => {
      // Hot-reload hygiene: keep pools (module-level) but nothing to tear down.
    };
  }, []);

  useFrame((state) => {
    poolTime = state.clock.elapsedTime;
    const d = dayness(useWorldClock.getState().phase);
    // Bright: cold silver spray. Dark: aurora-tinted indigo-teal.
    tint.copy(mix(PALETTE.fogDark, new Color("#eef6ff"), Math.max(d, 0.18)));
    const pixelScale =
      (state.gl.getPixelRatio() * state.size.height) /
      (2 * Math.tan(((state.camera as { fov?: number }).fov ?? 55) * (Math.PI / 360)));
    for (const key of Object.keys(ready)) {
      const pool = ready[key];
      pool.material.uniforms.uTime.value = poolTime;
      pool.material.uniforms.uTint.value.copy(tint);
      pool.material.uniforms.uPixelScale.value = pixelScale;
    }
  });

  return (
    <group>
      {Object.keys(ready).map((key) => (
        <points
          key={key}
          geometry={ready[key].geometry}
          material={ready[key].material}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
