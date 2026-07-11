import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

// Canvas-drawn signage (no external assets — the station labels itself in
// code). Glow text on a transparent ground; pair with a MeshBasicMaterial
// (transparent, depthWrite: false) so a sign reads as light painted on the
// hull, not a lit slab. Everything stays under the 1.05 bloom threshold.

export interface LabelLine {
  text: string;
  size?: number; // px at canvas scale (default 44)
  color?: string; // defaults to the station cyan
  gap?: number; // extra px of air above this line
}

export function makeLabelTexture(
  lines: LabelLine[],
  { width = 512, height = 256 }: { width?: number; height?: number } = {}
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Stencil tracking, where the browser supports it (harmless where not).
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D).letterSpacing = "3px";

  const lineH = (l: LabelLine) => (l.size ?? 44) * 1.35 + (l.gap ?? 0);
  const total = lines.reduce((a, l) => a + lineH(l), 0);
  let y = (height - total) / 2;
  for (const l of lines) {
    const size = l.size ?? 44;
    const color = l.color ?? "#5ee9ff";
    y += (l.gap ?? 0) + size * 1.35 * 0.5;
    ctx.font = `700 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.4;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.95;
    // Twice: the first pass builds the glow halo, the second sharpens the face.
    ctx.fillText(l.text, width / 2, y, width - 32);
    ctx.fillText(l.text, width / 2, y, width - 32);
    y += size * 1.35 * 0.5;
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.anisotropy = 4;
  return tex;
}
