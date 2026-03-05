import React from "react";

const ConstellationDecoration = () => (
  <svg
    className="absolute top-16 right-4 w-32 h-32 pointer-events-none opacity-[0.07]"
    viewBox="0 0 100 100"
    fill="none"
  >
    <circle cx="20" cy="15" r="2" fill="#06B6D4" />
    <circle cx="50" cy="8" r="1.5" fill="#06B6D4" />
    <circle cx="75" cy="25" r="2.5" fill="#06B6D4" />
    <circle cx="60" cy="50" r="1.5" fill="#06B6D4" />
    <circle cx="30" cy="45" r="2" fill="#06B6D4" />
    <circle cx="85" cy="60" r="1.5" fill="#06B6D4" />
    <circle cx="45" cy="75" r="2" fill="#06B6D4" />
    <line x1="20" y1="15" x2="50" y2="8" stroke="#06B6D4" strokeWidth="0.5" opacity="0.5" />
    <line x1="50" y1="8" x2="75" y2="25" stroke="#06B6D4" strokeWidth="0.5" opacity="0.5" />
    <line x1="75" y1="25" x2="60" y2="50" stroke="#06B6D4" strokeWidth="0.5" opacity="0.5" />
    <line x1="60" y1="50" x2="30" y2="45" stroke="#06B6D4" strokeWidth="0.5" opacity="0.5" />
    <line x1="30" y1="45" x2="20" y2="15" stroke="#06B6D4" strokeWidth="0.5" opacity="0.5" />
    <line x1="60" y1="50" x2="85" y2="60" stroke="#06B6D4" strokeWidth="0.5" opacity="0.5" />
    <line x1="85" y1="60" x2="45" y2="75" stroke="#06B6D4" strokeWidth="0.5" opacity="0.5" />
  </svg>
);

const VineDecoration = () => (
  <svg
    className="absolute top-0 left-0 w-8 h-full pointer-events-none opacity-[0.06]"
    viewBox="0 0 30 400"
    fill="none"
    preserveAspectRatio="none"
  >
    <path
      d="M15 0 Q5 50 15 100 Q25 150 15 200 Q5 250 15 300 Q25 350 15 400"
      stroke="#8B5CF6"
      strokeWidth="1"
      fill="none"
    />
    <circle cx="10" cy="80" r="4" fill="#8B5CF640" />
    <circle cx="20" cy="180" r="3" fill="#8B5CF640" />
    <circle cx="8" cy="280" r="5" fill="#8B5CF640" />
    <path d="M15 100 Q0 90 5 75" stroke="#8B5CF6" strokeWidth="0.5" fill="none" />
    <path d="M15 200 Q30 190 25 175" stroke="#8B5CF6" strokeWidth="0.5" fill="none" />
    <path d="M15 300 Q0 290 5 275" stroke="#8B5CF6" strokeWidth="0.5" fill="none" />
  </svg>
);

const FingerprintDecoration = () => (
  <svg
    className="absolute bottom-20 right-6 w-24 h-24 pointer-events-none opacity-[0.05]"
    viewBox="0 0 80 80"
    fill="none"
  >
    {[16, 22, 28, 34].map((r) => (
      <ellipse
        key={r}
        cx="40"
        cy="40"
        rx={r}
        ry={r * 1.2}
        stroke="#94A3B8"
        strokeWidth="0.8"
        fill="none"
        strokeDasharray={r > 28 ? "4 3" : undefined}
      />
    ))}
  </svg>
);

const HeartsDecoration = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.04]">
    {[
      { top: "15%", left: "8%", size: 16 },
      { top: "40%", right: "5%", size: 12 },
      { bottom: "25%", left: "12%", size: 10 },
      { top: "60%", right: "15%", size: 14 },
    ].map((pos, i) => (
      <svg
        key={i}
        className="absolute"
        style={{ ...pos, width: pos.size, height: pos.size }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F43F5E"
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ))}
  </div>
);

const DECORATIONS = {
  "sci-fi": ConstellationDecoration,
  fantasy: VineDecoration,
  noir: FingerprintDecoration,
  romance: HeartsDecoration,
};

const GenreDecoration = ({ genre }) => {
  const Decoration = DECORATIONS[genre];
  if (!Decoration) return null;
  return <Decoration />;
};

export default GenreDecoration;
