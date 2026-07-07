import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from "three";
import { useWorldClock } from "../world/WorldClock";
import { dayness, sunDirection, sunLight } from "../world/sun";
import { PALETTE, mix } from "../world/palettes";
import { IS_TOUCH } from "../world/device";

// The real sea surface (replaces OceanPlaceholder): an inner Gerstner-displaced
// grid that snaps to the camera in whole grid steps (so vertices never crawl),
// its displacement fading at the rim into a flat 60 km skirt that shares the
// same fragment shader. Fresnel mixes the depth color toward the fog/sky color
// so the water belongs to the aerial-perspective look; the sun-glint lobe
// deliberately exceeds 1.0 so the Bloom pass ignites the glint lane. Alpha
// stays low at steep view angles — the leviathan pod must keep reading as
// shadows below. All season inputs derive from the ONE WorldClock via sun.ts.
//
// Draw order: the grid renders first and writes depth; the skirt (drawn after,
// sitting 3 m lower — below the deepest wave trough) is depth-rejected
// wherever the grid covers it, so the two translucent sheets never double-blend.

const GRID_SIZE = 3000; // meters
const GRID_SEGS = 192;
const GRID_STEP = GRID_SIZE / GRID_SEGS;
const SKIRT_SIZE = 60000;
const SKIRT_DROP = 3; // below the deepest possible wave trough (~2.4 m)

const oceanVertex = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCamPos;
  varying vec3 vWorld;
  varying vec3 vGerstnerNormal;

  // Three Gerstner waves: direction, wavelength (m), amplitude (m).
  const vec2 DIR1 = vec2(0.94, 0.34);
  const vec2 DIR2 = vec2(0.36, -0.93);
  const vec2 DIR3 = vec2(-0.60, 0.80);

  void gerstner(vec2 dir, float lambda, float amp, vec2 xz, float t,
                inout vec3 disp, inout vec3 grad) {
    float k = 6.28318 / lambda;
    float c = sqrt(9.8 / k); // deep-water phase speed
    float f = k * (dot(dir, xz) - c * t);
    float s = sin(f);
    float co = cos(f);
    float steep = 0.55; // crest sharpening; sum of steep·k·amp stays < 1
    disp.x += steep * amp * dir.x * co;
    disp.z += steep * amp * dir.y * co;
    disp.y += amp * s;
    grad.x += k * amp * dir.x * co;
    grad.z += k * amp * dir.y * co;
    grad.y += steep * k * amp * s;
  }

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);

    #ifdef WAVES
      vec3 disp = vec3(0.0);
      vec3 grad = vec3(0.0);
      vec2 xz = world.xz;
      gerstner(DIR1, 130.0, 1.4, xz, uTime, disp, grad);
      gerstner(DIR2, 62.0, 0.7, xz, uTime, disp, grad);
      gerstner(DIR3, 27.0, 0.3, xz, uTime, disp, grad);
      // Fade displacement toward the grid rim so it meets the flat skirt.
      float amp = smoothstep(1500.0, 800.0, distance(xz, uCamPos.xz));
      world.xyz += disp * amp;
      vGerstnerNormal = normalize(vec3(-grad.x * amp, 1.0 - grad.y * amp, -grad.z * amp));
    #else
      vGerstnerNormal = vec3(0.0, 1.0, 0.0);
    #endif

    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const oceanFragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uCamPos;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uSkyColor;
  uniform float uGlintPower;
  varying vec3 vWorld;
  varying vec3 vGerstnerNormal;

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

  // Scrolling ripple field; sampled thrice for a world-space gradient normal
  // (screen-space derivatives alias badly at distance).
  float detail(vec2 xz) {
    float n = vnoise(xz * 0.055 + vec2(uTime * 0.060, uTime * 0.031));
    #if DETAIL_OCTAVES > 1
      n = n * 0.65 + vnoise(xz * 0.19 - vec2(uTime * 0.045, -uTime * 0.07)) * 0.35;
    #endif
    return n;
  }

  void main() {
    float e = 1.2;
    float n0 = detail(vWorld.xz);
    float nx = detail(vWorld.xz + vec2(e, 0.0));
    float nz = detail(vWorld.xz + vec2(0.0, e));
    // Soften ripples with distance so the far field doesn't sparkle.
    float dist = distance(uCamPos, vWorld);
    float ripple = 2.0 * smoothstep(6000.0, 400.0, dist);
    vec3 N = normalize(vGerstnerNormal + vec3(n0 - nx, 0.0, n0 - nz) * ripple);

    vec3 V = normalize(uCamPos - vWorld);
    float NdV = max(dot(N, V), 0.0);
    float F = 0.02 + 0.98 * pow(1.0 - NdV, 5.0); // Schlick

    vec3 water = mix(uDeepColor, uShallowColor, 0.25 + 0.3 * n0);
    vec3 col = mix(water, uSkyColor, F);

    // Sun glint: tight in high sun, a wide golden lane at the hinge. HDR on
    // purpose — the Bloom pass catches values over 1.0.
    if (uSunDir.y > -0.05) {
      vec3 H = normalize(uSunDir + V);
      float spec = pow(max(dot(N, H), 0.0), uGlintPower);
      col += uSunColor * spec * 2.4 * smoothstep(-0.05, 0.06, uSunDir.y);
    }

    // Translucent near-vertical (the pod reads as shadows below), solid at grazing.
    float alpha = mix(0.60, 0.96, F);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function Ocean() {
  const gridRef = useRef<Mesh>(null);
  const skirtRef = useRef<Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSunDir: { value: new Vector3(0, 1, 0) },
      uSunColor: { value: new Color("#ffffff") },
      uCamPos: { value: new Vector3() },
      uDeepColor: { value: new Color("#0e1830") },
      uShallowColor: { value: new Color("#3d5f72") },
      uSkyColor: { value: new Color("#a9c4d6") },
      uGlintPower: { value: 300 },
    }),
    []
  );

  const materials = useMemo(() => {
    const make = (waves: boolean) =>
      new ShaderMaterial({
        vertexShader: oceanVertex,
        fragmentShader: oceanFragment,
        uniforms, // shared object — one per-frame update drives both meshes
        defines: {
          DETAIL_OCTAVES: IS_TOUCH ? 1 : 2,
          ...(waves ? { WAVES: 1 } : {}),
        },
        transparent: true,
        depthWrite: true,
        side: DoubleSide,
      });
    return {
      grid: IS_TOUCH ? null : make(true), // touch: skirt only — strictly cheaper
      skirt: make(false),
    };
  }, [uniforms]);

  const geoms = useMemo(
    () => ({
      grid: IS_TOUCH ? null : new PlaneGeometry(GRID_SIZE, GRID_SIZE, GRID_SEGS, GRID_SEGS),
      skirt: new PlaneGeometry(SKIRT_SIZE, SKIRT_SIZE, 1, 1),
    }),
    []
  );

  const skyScratch = useMemo(() => new Color(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const phase = useWorldClock.getState().phase;
    const d = dayness(phase);
    const sun = sunDirection(phase);
    const { color: sunColor } = sunLight(phase);

    uniforms.uTime.value = t;
    uniforms.uSunDir.value.copy(sun);
    uniforms.uSunColor.value.copy(sunColor);
    uniforms.uCamPos.value.copy(state.camera.position);
    uniforms.uDeepColor.value.copy(mix(PALETTE.seaDark, PALETTE.seaBright, d));
    skyScratch.copy(mix(PALETTE.fogDark, PALETTE.fogBright, d));
    uniforms.uSkyColor.value.copy(skyScratch);
    // Shallow tint: the deep color lifted toward the sky — a cheap subsurface read.
    uniforms.uShallowColor.value.copy(uniforms.uDeepColor.value).lerp(skyScratch, 0.35);
    // Glint lane widens as the sun drops (golden hour) — tightens at high sun.
    uniforms.uGlintPower.value = 90 + 610 * Math.min(1, Math.max(0, sun.y * 2.2));

    // Grid snaps to whole grid steps of the camera; skirt just follows it.
    const cam = state.camera.position;
    if (gridRef.current) {
      gridRef.current.position.set(
        Math.round(cam.x / GRID_STEP) * GRID_STEP,
        0,
        Math.round(cam.z / GRID_STEP) * GRID_STEP
      );
    }
    // Touch has no grid, so the skirt IS the sea surface — it must sit at sea
    // level or every shoreline strands 3 m up its bank on dry seabed. With the
    // grid present it hides below the deepest trough as designed.
    if (skirtRef.current) skirtRef.current.position.set(cam.x, IS_TOUCH ? 0 : -SKIRT_DROP, cam.z);
  });

  return (
    <group>
      {materials.grid && geoms.grid && (
        <mesh
          ref={gridRef}
          geometry={geoms.grid}
          material={materials.grid}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={0}
          frustumCulled={false}
        />
      )}
      <mesh
        ref={skirtRef}
        geometry={geoms.skirt}
        material={materials.skirt}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
        frustumCulled={false}
      />
    </group>
  );
}
