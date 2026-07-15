// Persistent name-slips for the two SODO stadiums — the print's only always-on
// place labels. A toy bowl can't announce itself as "Lumen Field" from a drift
// altitude, so each hero stadium wears a small washi slip with its name in the
// same ink-on-paper register as the station hover labels (canvas texture,
// system monospace — no external font fetch, ever). Each slip carries an
// identity tick in its club's real signature color. renderOrder 11 with
// depthTest off so the slip always floats clear above its bowl and the town
// fabric around it, and the two heights are staggered so the north (Lumen) and
// south (T-Mobile) slips never stack on screen when the camera drifts overhead.

import { useMemo } from "react";
import * as THREE from "three";
import { projectLatLng } from "./network";

const FONT = '400 44px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const PAD = 26;

/** A washi name-slip: the label text inked on a soft paper backing that fades
 *  out at both ends, with a club-colored identity dot ahead of the name — the
 *  same slip the station labels draw, minted once per stadium. */
function slipTexture(text: string, accent: string): { texture: THREE.CanvasTexture; aspect: number } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = FONT;
  const tick = 16;
  const gap = 18;
  const w = Math.ceil(ctx.measureText(text).width) + PAD * 2 + tick + gap;
  const h = 88;
  canvas.width = w;
  canvas.height = h;
  ctx.font = FONT;
  ctx.textBaseline = "middle";
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "rgba(240,228,200,0)");
  grad.addColorStop(0.16, "rgba(240,228,200,0.85)");
  grad.addColorStop(0.84, "rgba(240,228,200,0.85)");
  grad.addColorStop(1, "rgba(240,228,200,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(PAD + tick / 2, h / 2 + 2, tick / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(58,43,26,0.95)"; // sumi-brown ink
  ctx.fillText(text, PAD + tick + gap, h / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return { texture, aspect: w / h };
}

// Positions match the two stadium bowls in Landmarks.tsx; each slip floats a
// short way above its bowl's roofline (peaks reach ~0.3), small enough to name
// the bowl rather than blanket it, and y is staggered — Lumen north/higher,
// T-Mobile south/lower — so the two captions never stack on screen from a
// drift-altitude overhead.
const SLIPS = [
  { text: "LUMEN FIELD", accent: "#69be28", lat: 47.5952, lng: -122.3316, y: 0.62 }, // Seahawks action green
  { text: "T-MOBILE PARK", accent: "#0c2c56", lat: 47.5914, lng: -122.3325, y: 0.48 }, // Mariners navy
];

const SLIP_HEIGHT = 0.17; // world-unit cap height of the slip — a name tag, not a banner

export function StadiumLabels() {
  const slips = useMemo(
    () =>
      SLIPS.map((s) => {
        const { texture, aspect } = slipTexture(s.text, s.accent);
        const { x, z } = projectLatLng(s.lat, s.lng);
        return { texture, x, y: s.y, z, w: SLIP_HEIGHT * aspect, h: SLIP_HEIGHT };
      }),
    []
  );

  return (
    <>
      {slips.map((s, i) => (
        <sprite key={i} renderOrder={11} position={[s.x, s.y, s.z]} scale={[s.w, s.h, 1]}>
          <spriteMaterial
            map={s.texture}
            transparent
            depthWrite={false}
            depthTest={false}
            opacity={0.92}
          />
        </sprite>
      ))}
    </>
  );
}
