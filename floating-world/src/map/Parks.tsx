// Parks as soft green under-washes. They render BELOW the translucent
// ground (renderOrder 0), which dims them the same way it dims tunnels —
// and lets lake fills draw over park polygons that contain their own water.
// One multi-shape geometry, one draw call. No wobble: stillness under the
// paper is cheaper and invisible.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HAS_BASEMAP, BASEMAP_PARKS } from "./basemap";
import { LIVE } from "../world/palettes";
import { CONFIG } from "../world/config";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";
import { PAPER_CUT_GLSL } from "./paperCutGlsl";
import { PAPER_CUT_VEC } from "./paperCut";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  void main() {
    vWorld = vec2(position.x, -position.y); // shape XY -> world XZ
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  ${PAPER_CUT_GLSL}
  uniform vec3 uPark;
  uniform float uOpacity;
  void main() {
    float mottle = 0.75 + 0.4 * wcFbm(vWorld * 1.4);
    vec3 c = mix(uPark, uFog, fogFactor());
    // A wash under the sheet still belongs to the sheet: carved away inside
    // the dive incision so no green hangs over the pit (Cal Anderson sits
    // right beside Capitol Hill's hall).
    gl_FragColor = vec4(c, uOpacity * mottle * cutKeep(vWorld));
  }
`;

export function Parks() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    if (!HAS_BASEMAP || !BASEMAP_PARKS.length) return null;
    const shapes = BASEMAP_PARKS.map((poly) => {
      const shape = new THREE.Shape();
      poly.ring.forEach(([x, z], i) => {
        if (i === 0) shape.moveTo(x, -z);
        else shape.lineTo(x, -z);
      });
      for (const hole of poly.holes) {
        const path = new THREE.Path();
        hole.forEach(([x, z], i) => {
          if (i === 0) path.moveTo(x, -z);
          else path.lineTo(x, -z);
        });
        shape.holes.push(path);
      }
      return shape;
    });
    return new THREE.ShapeGeometry(shapes);
  }, []);

  useFrame(() => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.uOpacity.value = LIVE.parkOpacity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
  });

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      rotation-x={-Math.PI / 2}
      position-y={CONFIG.basemap.parkY}
      renderOrder={0}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uPark: { value: LIVE.park },
          uCut: { value: PAPER_CUT_VEC }, // shared cut signal, by reference
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
          uOpacity: { value: LIVE.parkOpacity },
        }}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
