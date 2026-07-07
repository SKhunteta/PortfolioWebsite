import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, ShaderMaterial } from "three";
import { IS_TOUCH } from "../world/device";

// The view out the porthole: an inward-facing sky sphere carrying a
// domain-warped FBM nebula (violet + teal dye) and two scales of hash-sparkle
// stars, plus one indifferent gas planet low in the frame. All raw GLSL, all
// code-generated. The sphere drifts very slowly — the station's residual spin.
//
// NOTE: never enable logarithmicDepthBuffer — three doesn't patch raw
// ShaderMaterials for log depth, which silently hides them.

const NEBULA_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const NEBULA_FRAG = /* glsl */ `
varying vec3 vDir;
uniform float uTime;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < OCTAVES; i++) {
    s += a * vnoise(p);
    p *= 2.13;
    a *= 0.5;
  }
  return s;
}

void main() {
  // Residual station spin: the whole sky slides, slowly.
  float an = uTime * 0.006;
  vec3 d = vDir;
  d.xz = mat2(cos(an), -sin(an), sin(an), cos(an)) * d.xz;

  // Domain-warped dye clouds.
  vec3 q = d * 2.4;
  float w = fbm(q + vec3(0.0, uTime * 0.004, 0.0));
  float n = fbm(q * 1.8 + 2.5 * vec3(w));

  vec3 deep   = vec3(0.022, 0.016, 0.06);
  vec3 violet = vec3(0.36, 0.12, 0.6);
  vec3 teal   = vec3(0.06, 0.5, 0.55);
  vec3 col = deep
    + violet * smoothstep(0.35, 0.78, n)
    + teal   * smoothstep(0.50, 0.92, w) * 0.65;

  // Two star layers: fine dust + a few bright ones that get to bloom.
  for (int layer = 0; layer < 2; layer++) {
    float scale = layer == 0 ? 90.0 : 42.0;
    float gate  = layer == 0 ? 0.992 : 0.997;
    vec3 cp = d * scale;
    vec3 cell = floor(cp);
    float h = hash(cell);
    vec3 lp = fract(cp) - 0.5;
    float star = smoothstep(0.16, 0.0, length(lp)) * step(gate, h);
    float tw = 0.72 + 0.28 * sin(uTime * 2.4 + h * 47.0);
    col += star * tw * vec3(0.85, 0.9, 1.0) * (layer == 0 ? 0.9 : 1.7);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

const PLANET_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const PLANET_FRAG = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
uniform float uTime;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 sun = normalize(vec3(0.55, 0.35, 0.65));
  float day = max(dot(n, sun), 0.0);

  // Slow-scrolling cloud bands.
  float bands = vnoise(n * vec3(2.0, 6.0, 2.0) + vec3(uTime * 0.01, 0.0, 0.0));
  vec3 sea  = vec3(0.06, 0.22, 0.24);
  vec3 land = vec3(0.35, 0.28, 0.5);
  vec3 base = mix(sea, land, smoothstep(0.42, 0.62, bands));

  vec3 view = normalize(cameraPosition - vWorldPos);
  float rim = pow(1.0 - max(dot(n, view), 0.0), 3.0);

  vec3 col = base * (0.06 + 0.94 * day) + vec3(0.35, 0.6, 0.9) * rim * (0.25 + 0.75 * day);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function Nebula() {
  const skyMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: NEBULA_VERT,
        fragmentShader: NEBULA_FRAG,
        uniforms: { uTime: { value: 0 } },
        defines: { OCTAVES: IS_TOUCH ? 3 : 4 },
        side: BackSide,
        depthWrite: false,
      }),
    []
  );
  const planetMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: PLANET_VERT,
        fragmentShader: PLANET_FRAG,
        uniforms: { uTime: { value: 0 } },
      }),
    []
  );
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    skyMat.uniforms.uTime.value += dt;
    planetMat.uniforms.uTime.value += dt;
  });

  return (
    <group>
      <mesh material={skyMat} position={[0, 2, 0]}>
        <sphereGeometry args={[60, 48, 32]} />
      </mesh>
      {/* One indifferent gas planet, framed low-left in the porthole so the
          nebula and stars keep most of the view. */}
      <mesh material={planetMat} position={[-16, -4, -46]}>
        <sphereGeometry args={[6, 40, 28]} />
      </mesh>
    </group>
  );
}
