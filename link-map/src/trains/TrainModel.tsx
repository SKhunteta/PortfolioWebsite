// The articulated toy S700, instanced: one InstancedMesh of cabs (2 per
// train), one of mid sections (pantograph merged in), one of HDR headlight
// quads. Trains.tsx (the app's single frame driver) writes transforms
// through the imperative TRAIN_MODEL registry — no React in the hot path,
// no useFrame priorities (they'd disable R3F auto-render).
//
// These materials are THE one depthWrite:true exception in the scene: the
// sections must self-occlude. Safe at renderOrder 9 — every map layer
// below writes no depth, and the additive glow above doesn't test against
// anything it can't beat.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pointAt } from "../map/network";
import { CONFIG } from "../world/config";
import { LIVE } from "../world/palettes";
import {
  buildCabGeometry,
  buildMidGeometry,
  buildLiveryTexture,
  buildEmissiveTexture,
} from "./trainGeometry";
import { MAX_TRAINS } from "./Trains";

const BODY_VERT = /* glsl */ `
  attribute float aLead;
  varying vec3 vLocal;
  varying vec3 vNormalL;
  varying vec3 vNormalW;
  varying float vLead;
  void main() {
    vLocal = position;
    vLead = aLead;
    vNormalL = normal; // LOCAL normal: region classification must not rotate
    vNormalW = normalize(mat3(instanceMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

// Texture regions are derived from local position + normal: sides sample the
// side band (top half of the atlas), the raked front samples the front
// square, roof the roof square; anything above the roofline (pantograph) and
// the underside go dark.
const BODY_FRAG = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vNormalL;
  varying vec3 vNormalW;
  varying float vLead;
  uniform sampler2D uLivery;
  uniform sampler2D uEmissive;
  uniform float uAmbient;
  uniform vec3 uWindow;
  uniform float uWindowIntensity;

  vec2 regionUv() {
    vec3 an = abs(vNormalL); // local axes: yaw-proof face classification
    float u = clamp(vLocal.x + 0.5, 0.0, 1.0);
    float v = clamp(vLocal.y + 0.5, 0.0, 1.0);
    if (vLocal.y > 0.52) return vec2(0.55 + 0.2 * u, 0.25); // pantograph -> dark
    if (an.y > 0.7 && vNormalL.y < 0.0) return vec2(0.55 + 0.2 * u, 0.25); // underside
    // Roof square lives in the atlas' BOTTOM half (canvas flips into v 0..0.5).
    if (an.y > 0.7) return vec2(0.27 + 0.2 * u, 0.06 + 0.38 * clamp(vLocal.z + 0.5, 0.0, 1.0)); // roof
    if (an.x > 0.6) { // cab nose / section end
      float fu = clamp(vLocal.z + 0.5, 0.0, 1.0);
      return vec2(fu * 0.25, 0.5 - 0.5 * v);
    }
    return vec2(u, 1.0 - 0.5 * v); // side band
  }

  void main() {
    vec2 uv = regionUv();
    vec3 livery = texture2D(uLivery, uv).rgb;
    float lit = texture2D(uEmissive, uv).r;
    // Soft fake sun so the box reads as a volume.
    float shade = 0.72 + 0.28 * max(0.0, dot(vNormalW, normalize(vec3(0.35, 0.85, 0.3))));
    // The trailing cab's nose shows taillights, not headlights.
    bool nose = abs(vNormalL.x) > 0.6 && vLocal.y <= 0.52;
    vec3 glowColor = nose ? mix(vec3(0.75, 0.08, 0.05), uWindow, vLead) : uWindow;
    vec3 c = livery * uAmbient * shade + glowColor * lit * uWindowIntensity;
    gl_FragColor = vec4(c, 1.0);
  }
`;

const LIGHT_VERT = /* glsl */ `
  attribute float aSize;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mv.xy += (uv - 0.5) * aSize;
    gl_Position = projectionMatrix * mv;
  }
`;

const LIGHT_FRAG = /* glsl */ `
  uniform float uCore;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r2 = dot(p, p);
    float core = exp(-r2 * 18.0);
    vec3 warm = vec3(1.0, 0.92, 0.72);
    gl_FragColor = vec4(warm * core * uCore, clamp(core, 0.0, 1.0));
  }
`;

interface Registry {
  write: (
    i: number,
    dir: Parameters<typeof pointAt>[0],
    s: number,
    y: number,
    L: number
  ) => void;
  commit: (trainCount: number) => void;
}

// Default no-op until the meshes mount.
export const TRAIN_MODEL: Registry = { write: () => {}, commit: () => {} };

const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
const scale = new THREE.Vector3();
const matrix = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);
const front = { x: 0, z: 0 };
const back = { x: 0, z: 0 };

export function TrainModel() {
  const cabRef = useRef<THREE.InstancedMesh>(null);
  const midRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.InstancedMesh>(null);
  const bodyMatRef = useRef<THREE.ShaderMaterial>(null);

  const { cabGeo, midGeo, livery, emissive, sizeAttr } = useMemo(() => {
    const sizeAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAINS), 1);
    sizeAttr.setUsage(THREE.DynamicDrawUsage);
    const cabGeo = buildCabGeometry();
    const midGeo = buildMidGeometry();
    // Instance order is fixed (i*2 = lead cab, i*2+1 = trailing cab), so the
    // lead flag is static: headlights forward, taillights aft.
    const cabLead = new Float32Array(MAX_TRAINS * 2);
    for (let i = 0; i < MAX_TRAINS; i++) cabLead[i * 2] = 1;
    cabGeo.setAttribute("aLead", new THREE.InstancedBufferAttribute(cabLead, 1));
    midGeo.setAttribute(
      "aLead",
      new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRAINS).fill(1), 1)
    );
    return {
      cabGeo,
      midGeo,
      livery: buildLiveryTexture(),
      emissive: buildEmissiveTexture(),
      sizeAttr,
    };
  }, []);

  const bodyUniforms = useMemo(
    () => ({
      uLivery: { value: livery },
      uEmissive: { value: emissive },
      uAmbient: { value: LIVE.trainAmbient },
      uWindow: { value: LIVE.trainWindow }, // palette-by-reference
      uWindowIntensity: { value: LIVE.windowIntensity },
    }),
    [livery, emissive]
  );

  useEffect(() => {
    const cab = cabRef.current;
    const mid = midRef.current;
    const light = lightRef.current;
    if (!cab || !mid || !light) return;

    const m = CONFIG.train.model;

    // Place one section by its chord so curves bend the train, not clip it.
    const sectionMatrix = (
      dir: Parameters<typeof pointAt>[0],
      sCenter: number,
      y: number,
      len: number,
      width: number,
      height: number,
      flip: boolean
    ) => {
      pointAt(dir, sCenter + len / 2, front);
      pointAt(dir, sCenter - len / 2, back);
      pos.set((front.x + back.x) / 2, y + height / 2, (front.z + back.z) / 2);
      const theta = Math.atan2(-(front.z - back.z), front.x - back.x) + (flip ? Math.PI : 0);
      quat.setFromAxisAngle(UP, theta);
      scale.set(len * (1 - m.sectionGapFrac), height, width);
      matrix.compose(pos, quat, scale);
      return matrix;
    };

    TRAIN_MODEL.write = (i, dir, s, y, L) => {
      const sec = L / 3;
      const width = L * m.widthFrac;
      const height = L * m.heightFrac;
      // Lead cab (nose forward), mid, trail cab (nose backward).
      cab.setMatrixAt(i * 2, sectionMatrix(dir, s + sec, y, sec, width, height, false));
      cab.setMatrixAt(i * 2 + 1, sectionMatrix(dir, s - sec, y, sec, width, height, true));
      mid.setMatrixAt(i, sectionMatrix(dir, s, y, sec, width, height, false));
      // Headlight just ahead of the leading nose.
      pointAt(dir, s + sec * 1.62, front);
      pos.set(front.x, y + height * 0.35, front.z);
      quat.identity();
      scale.set(1, 1, 1);
      matrix.compose(pos, quat, scale);
      light.setMatrixAt(i, matrix);
      sizeAttr.setX(i, Math.max(0.02, L * 0.12));
    };

    TRAIN_MODEL.commit = (trainCount) => {
      cab.count = trainCount * 2;
      mid.count = trainCount;
      light.count = trainCount;
      cab.instanceMatrix.needsUpdate = true;
      mid.instanceMatrix.needsUpdate = true;
      light.instanceMatrix.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    };

    return () => {
      TRAIN_MODEL.write = () => {};
      TRAIN_MODEL.commit = () => {};
    };
  }, [sizeAttr]);

  useFrame(() => {
    if (bodyMatRef.current) {
      bodyMatRef.current.uniforms.uAmbient.value = LIVE.trainAmbient;
      bodyMatRef.current.uniforms.uWindowIntensity.value = LIVE.windowIntensity;
    }
  });

  const bodyMaterialProps = {
    vertexShader: BODY_VERT,
    fragmentShader: BODY_FRAG,
    uniforms: bodyUniforms,
    depthWrite: true, // THE exception — see order table in GroundPlane.tsx
    depthTest: true,
  };

  return (
    <group>
      <instancedMesh
        ref={cabRef}
        args={[cabGeo, undefined, MAX_TRAINS * 2]}
        renderOrder={9}
        frustumCulled={false}
      >
        <shaderMaterial ref={bodyMatRef} {...bodyMaterialProps} />
      </instancedMesh>
      <instancedMesh
        ref={midRef}
        args={[midGeo, undefined, MAX_TRAINS]}
        renderOrder={9}
        frustumCulled={false}
      >
        <shaderMaterial {...bodyMaterialProps} />
      </instancedMesh>
      <instancedMesh
        ref={lightRef}
        args={[undefined, undefined, MAX_TRAINS]}
        renderOrder={10}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]}>
          <primitive object={sizeAttr} attach="attributes-aSize" />
        </planeGeometry>
        <shaderMaterial
          vertexShader={LIGHT_VERT}
          fragmentShader={LIGHT_FRAG}
          uniforms={{ uCore: { value: CONFIG.train.model.headlightCore } }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
    </group>
  );
}
