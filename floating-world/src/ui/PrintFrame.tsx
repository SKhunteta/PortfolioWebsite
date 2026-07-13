// The printed sheet's frame: the two vermilion seal-cartouches that bracket
// every ukiyo-e sheet, plus the foreground botanical repoussoir (pine and
// fern in sumi ink) framing the lower corners the way Hiroshige and Yoshida
// pushed a dark bough across the front of a distant view. All DOM/SVG,
// outside the canvas, pointer-transparent — it never eats a drag or a tap.
//
// The cartouches share the HUD's "settle" fade (they carry .hud-settled) so
// the chrome still gets out of the way once you've read it. The foreground
// stays — it is part of the print, not a caption — but quiet enough to frame
// without competing with the moving map.

// --- foreground botany (procedural sumi silhouettes) ------------------------

// One fern frond, drawn in a local frame that points straight up (toward −Y),
// base at the origin: a curving rachis with teardrop pinnae shrinking to the
// tip. Returned as SVG path-data strings so the caller can place/mirror it.
function frondLeaflets(len: number, base: number, curl: number, tipRatio: number): string[] {
  const N = 15;
  const out: string[] = [];
  const f = (n: number) => n.toFixed(1);
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const sy = -len * t;
    const sx = curl * Math.sin(t * Math.PI * 0.9);
    const taper = Math.max(0.08, 1 - t * tipRatio);
    const pl = base * taper;
    for (const side of [-1, 1]) {
      const ex = sx + side * pl;
      const ey = sy - pl * 0.55; // pinnae angle upward
      const c1x = sx + side * pl * 0.35;
      const c1y = sy - pl * 0.05;
      const c2x = ex - side * pl * 0.15;
      const c2y = ey + pl * 0.2;
      out.push(
        `M${f(sx)} ${f(sy)} C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(ex)} ${f(ey)} ` +
          `C ${f(ex - side * pl * 0.1)} ${f(ey + pl * 0.3)}, ${f(sx + side * pl * 0.2)} ${f(sy + pl * 0.15)}, ${f(sx)} ${f(sy)} Z`
      );
    }
  }
  return out;
}

// The frond's rachis (central stem) as a single stroked curve.
function frondRachis(len: number, curl: number): string {
  const midx = curl * 0.9;
  return `M0 0 Q ${midx.toFixed(1)} ${(-len * 0.5).toFixed(1)} ${(curl * 0.2).toFixed(1)} ${(-len).toFixed(1)}`;
}

function Fern({
  x,
  y,
  scale,
  rotate,
  flip = 1,
  len = 200,
  base = 34,
  curl = 26,
  tipRatio = 0.85,
}: {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  flip?: number;
  len?: number;
  base?: number;
  curl?: number;
  tipRatio?: number;
}) {
  const leaflets = frondLeaflets(len, base, curl, tipRatio);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale * flip} ${scale})`}>
      <path d={frondRachis(len, curl)} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
      {leaflets.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  );
}

// A pine sprig: a stem carrying tufts of needles fanned to both sides — the
// dark evergreen mass that anchors an Evergreen-City print. Needles are thin
// strokes (the woodblock hatch), the stem a heavier one.
function PineNeedles(stemLen: number, tufts: number, needleLen: number): string[] {
  const out: string[] = [];
  const f = (n: number) => n.toFixed(1);
  for (let i = 0; i < tufts; i++) {
    const t = tufts === 1 ? 0 : i / (tufts - 1);
    const sy = -stemLen * t;
    const sx = stemLen * 0.16 * Math.sin(t * Math.PI);
    const count = 7;
    for (let k = 0; k < count; k++) {
      const g = k / (count - 1); // 0..1 across the fan
      for (const side of [-1, 1]) {
        const ang = -Math.PI / 2 + side * (0.22 + 0.62 * g); // fan opens upward-out
        const nl = needleLen * (0.65 + 0.4 * (1 - t));
        const ex = sx + Math.cos(ang) * nl;
        const ey = sy + Math.sin(ang) * nl;
        out.push(`M${f(sx)} ${f(sy)} L ${f(ex)} ${f(ey)}`);
      }
    }
  }
  return out;
}

function Pine({
  x,
  y,
  scale,
  rotate,
  flip = 1,
  stemLen = 210,
  tufts = 9,
  needleLen = 40,
}: {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  flip?: number;
  stemLen?: number;
  tufts?: number;
  needleLen?: number;
}) {
  const needles = PineNeedles(stemLen, tufts, needleLen);
  const stemBendX = stemLen * 0.16;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale * flip} ${scale})`}>
      <path
        d={`M0 0 Q ${stemBendX.toFixed(1)} ${(-stemLen * 0.5).toFixed(1)} ${(stemBendX * 0.4).toFixed(1)} ${(-stemLen).toFixed(1)}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={3.4}
        strokeLinecap="round"
      />
      <g fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
        {needles.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </g>
  );
}

function Foreground() {
  return (
    <div className="fw-foreground" aria-hidden="true">
      {/* Lower-left: a pine bough sweeping in with a fern beneath it. */}
      <svg className="fw-foliage fw-foliage-left" viewBox="0 0 320 300" preserveAspectRatio="xMinYMax meet">
        <g fill="currentColor">
          <Pine x={70} y={300} scale={1.05} rotate={-24} stemLen={250} tufts={11} needleLen={46} />
          <Pine x={20} y={300} scale={0.8} rotate={-8} stemLen={210} tufts={9} needleLen={40} />
          <Fern x={120} y={300} scale={0.9} rotate={-46} flip={1} len={210} />
          <Fern x={45} y={300} scale={0.7} rotate={-16} len={170} />
        </g>
      </svg>
      {/* Lower-right: a mirrored pine bough with ferns fanning up — a fuller
          counterweight so both corners frame the view. */}
      <svg className="fw-foliage fw-foliage-right" viewBox="0 0 320 300" preserveAspectRatio="xMaxYMax meet">
        <g fill="currentColor">
          <Pine x={258} y={300} scale={1.0} rotate={24} flip={-1} stemLen={248} tufts={11} needleLen={46} />
          <Pine x={302} y={300} scale={0.78} rotate={9} flip={-1} stemLen={206} tufts={9} needleLen={40} />
          <Fern x={206} y={300} scale={0.9} rotate={44} flip={-1} len={210} />
          <Fern x={280} y={300} scale={0.72} rotate={16} flip={-1} len={172} />
        </g>
      </svg>
    </div>
  );
}

// --- the sheet's chrome ------------------------------------------------------

export function PrintFrame({ settled }: { settled: boolean }) {
  const fade = settled ? "hud-settled" : "";
  return (
    <>
      {/* Left seal-cartouche: the piece's title in Chinese characters — 浮世
          (the floating world) · 西雅圖 (Seattle), 光之鐵路 (railway of light) —
          over a small vermilion hanko. */}
      <div className={`fw-cartouche fw-cartouche-left ${fade}`} aria-hidden="true">
        <div className="fw-cartouche-box">
          <div className="fw-cartouche-cols">
            <span>浮世・西雅圖</span>
            <span>光之鐵路</span>
          </div>
          <div className="fw-hanko">印</div>
        </div>
      </div>

      {/* Lower-right seal: 常綠之都 — the Evergreen Capital. */}
      <div className={`fw-cartouche fw-cartouche-right ${fade}`} aria-hidden="true">
        <div className="fw-evergreen-col">常綠之都</div>
        <div className="fw-evergreen-caption">Evergreen City</div>
      </div>

      <Foreground />
    </>
  );
}
