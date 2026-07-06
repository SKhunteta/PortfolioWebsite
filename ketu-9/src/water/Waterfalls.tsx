import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  ShaderMaterial,
  SpriteMaterial,
} from "three";
import { sampleHeight } from "../terrain/heightfield";
import { POI, type WaterfallSite } from "../world/locations";
import { useWorldClock } from "../world/WorldClock";
import { dayness } from "../world/sun";
import { PALETTE, mix } from "../world/palettes";

// Meltwater falls off the fjord cliffs (Milestone 6 brings the full Ocean/River
// systems; the falls land early because Observer Mode tours them).
//
// Each sheet detaches at the cliff lip (found by walking the height profile)
// and arcs outward as it falls, like a real plunge fall — a free arc also can't
// be swallowed by the LOD render mesh, which deviates from the analytic
// heightfield at distance. The shader scrolls streaky value noise downward,
// additively, so the water reads as glowing silver; sprite pairs fake the mist
// at the plunge pool. Tint follows dayness() — bright silver in the Bright,
// indigo in the Dark.

const waterfallVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const waterfallFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uTint;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    // Two layers of streaks falling at different speeds = parallax in the water.
    float n1 = vnoise(vec2(vUv.x * 14.0, vUv.y * 5.0 + uTime * 1.6));
    float n2 = vnoise(vec2(vUv.x * 31.0 + 7.0, vUv.y * 9.0 + uTime * 2.6));
    float body = smoothstep(0.32, 0.78, n1 * 0.65 + n2 * 0.45);

    // Soften the ribbon edges; brighten into foam near the plunge pool.
    float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
    float foam = smoothstep(0.16, 0.0, vUv.y);
    float lip = smoothstep(1.0, 0.94, vUv.y); // fade in just under the lip

    float a = (body * 0.95 + foam * 0.75) * edge * lip;
    vec3 col = uTint * (0.85 + 0.35 * foam + 0.25 * body);
    gl_FragColor = vec4(col, a);
  }
`;

/** Soft radial blob texture for the mist sprites. */
function makeMistTexture(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, "rgba(255,255,255,0.85)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.28)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

const ROWS = 26;
const COLS = 4;
const WIDTH = 42; // ribbon width in meters

interface FallGeom {
  geometry: BufferGeometry;
  baseX: number;
  baseZ: number;
  top: number;
}

/** Walk the cliff profile and build a strip that drapes down the rock face. */
function buildFall(site: WaterfallSite): FallGeom {
  const top = sampleHeight(site.x, site.z);
  const { dirX, dirZ } = site;
  const sideX = -dirZ; // ribbon width axis, perpendicular to the fall direction
  const sideZ = dirX;

  // Find the cliff lip: first point along dir where the ground lets go.
  let lip = 0;
  for (let d = 0; d <= 260; d += 4) {
    if (sampleHeight(site.x + dirX * d, site.z + dirZ * d) < top - 25) break;
    lip = d;
  }

  // The sheet detaches at the lip and arcs outward as it falls, the way a real
  // plunge fall leaves its wall. A free arc also can't be swallowed by the LOD
  // render mesh, which deviates from the analytic heightfield at distance.
  const positions = new Float32Array(ROWS * COLS * 3);
  const uvs = new Float32Array(ROWS * COLS * 2);
  for (let r = 0; r < ROWS; r++) {
    const v = 1 - r / (ROWS - 1); // v=1 at the lip, 0 at the water
    const y = v * top;
    const out = lip + 14 + Math.pow(1 - v, 1.6) * 70; // plunge arc, in meters
    const px = site.x + dirX * out;
    const pz = site.z + dirZ * out;
    for (let cIdx = 0; cIdx < COLS; cIdx++) {
      const u = cIdx / (COLS - 1);
      const w = (u - 0.5) * (WIDTH * (0.7 + 0.5 * (1 - v))); // widens as it falls
      const i = r * COLS + cIdx;
      positions[i * 3] = px + sideX * w;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = pz + sideZ * w;
      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;
    }
  }

  const indices: number[] = [];
  for (let r = 0; r < ROWS - 1; r++) {
    for (let cIdx = 0; cIdx < COLS - 1; cIdx++) {
      const a = r * COLS + cIdx;
      indices.push(a, a + COLS, a + 1, a + 1, a + COLS, a + COLS + 1);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  // Mist anchors at the plunge pool.
  const last = (ROWS - 1) * COLS + Math.floor(COLS / 2);
  return {
    geometry,
    baseX: positions[last * 3],
    baseZ: positions[last * 3 + 2],
    top,
  };
}

export function Waterfalls() {
  const falls = useMemo(() => POI.waterfalls.map(buildFall), []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: waterfallVertex,
        fragmentShader: waterfallFragment,
        uniforms: {
          uTime: { value: 0 },
          uTint: { value: new Color("#dceafc") },
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        // Additive: the sheet reads as glowing silver against rock at any
        // distance (and this is a world where the water glows — see canon).
        blending: AdditiveBlending,
      }),
    []
  );

  const mistMaterial = useMemo(
    () =>
      new SpriteMaterial({
        map: makeMistTexture(),
        transparent: true,
        opacity: 0.35,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  const tint = useMemo(() => new Color(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    material.uniforms.uTime.value = t;
    const d = dayness(useWorldClock.getState().phase);
    tint.copy(mix(PALETTE.fogDark, new Color("#eef6ff"), Math.max(d, 0.12)));
    material.uniforms.uTint.value.copy(tint);
    mistMaterial.opacity = 0.3 + 0.2 * d;
  });

  return (
    <group>
      {falls.map((fall, i) => (
        <group key={i}>
          <mesh geometry={fall.geometry} material={material} frustumCulled={false} />
          <sprite material={mistMaterial} position={[fall.baseX, 14, fall.baseZ]} scale={[105, 55, 1]} />
          <sprite material={mistMaterial} position={[fall.baseX, 34, fall.baseZ]} scale={[70, 42, 1]} />
        </group>
      ))}
    </group>
  );
}
