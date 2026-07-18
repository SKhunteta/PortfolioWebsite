// The two SODO stadiums wear their real names the way the buildings do in life:
// engraved across the roof, not floating on a billboard. Each wordmark is baked
// to a canvas texture (system type, no external font fetch — the airliner
// livery rule) and laid FLAT on the roofline, so the drift camera reads it off
// the roof from above, exactly like an aerial of Lumen Field's canopy or the
// sign band on T-Mobile Park's great arch.
//
// It stays a roof decal, never a billboard: the letters lie flat on the roof
// at a FIXED bearing, like the real engravings — each wordmark runs along its
// stadium's north–south long axis and reads upright from the Sound / downtown
// side, exactly as the aerials show. From the far side of a drift orbit it
// reads reversed, the honest price of paint on a roof. Painted, not lit: a warm off-white held under
// the bright-paper bloom line (like the airliner liveries), normal-blended,
// depthWrite off, inheriting scene fog through the built-in material so the
// horizon stays intact. renderOrder sits just above the landmark + town fabric
// so the name always reads on top of its bowl.

import { useMemo } from "react";
import * as THREE from "three";
import { projectLatLng } from "./network";

// System monospace — matches the station labels' register, and Canvas fillText
// uses only installed fonts (no web-font fetch, ever).
const FONT = '700 88px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const INK = "#efe7d3"; // warm washi-white, the real white signage held under bloom
const EDGE = "rgba(40,28,18,0.55)"; // faint sumi edge so the letters read on the dark roof

/** Bake a wordmark to a transparent canvas: warm-white letters with a thin ink
 *  edge, so it reads as paint laid on the roof rather than a glowing decal. */
function wordmarkTexture(text: string): { texture: THREE.CanvasTexture; aspect: number } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = FONT;
  const pad = 40;
  const tw = Math.ceil(ctx.measureText(text).width);
  const w = tw + pad * 2;
  const h = 170;
  canvas.width = w;
  canvas.height = h;
  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 7;
  ctx.strokeText(text, w / 2, h / 2 + 4);
  ctx.fillStyle = INK;
  ctx.fillText(text, w / 2, h / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return { texture, aspect: w / h };
}

// Each sign: the stadium's location, the height on its roofline the letters
// float at, the length (world km) the wordmark spans across the roof, and the
// fixed yaw of the baseline. π/2 runs the text along the SODO stadiums'
// north–south long axis with the letter tops pointing east, so the names read
// upright from over the Sound and downtown — the postcard angle.
const SIGNS = [
  { text: "LUMEN FIELD", lat: 47.5952, lng: -122.3316, y: 0.2, span: 0.3, yaw: Math.PI / 2 },
  { text: "T-MOBILE PARK", lat: 47.5914, lng: -122.3325, y: 0.14, span: 0.3, yaw: Math.PI / 2 },
];

export function StadiumSigns() {
  const signs = useMemo(
    () =>
      SIGNS.map((s) => {
        const { texture, aspect } = wordmarkTexture(s.text);
        const { x, z } = projectLatLng(s.lat, s.lng);
        return { texture, x, y: s.y, z, w: s.span, h: s.span / aspect, yaw: s.yaw };
      }),
    []
  );

  return (
    <>
      {signs.map((s, i) => (
        <group key={i} position={[s.x, s.y, s.z]} rotation={[0, s.yaw, 0]}>
          {/* Lay the plane flat on the roof (facing up); the group's fixed yaw
              sets the real-world bearing of the engraving. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={6.5} frustumCulled={false}>
            <planeGeometry args={[s.w, s.h]} />
            <meshBasicMaterial
              map={s.texture}
              transparent
              depthWrite={false}
              toneMapped={false}
              side={THREE.FrontSide}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
