// The three stages the game can play on. "explore" is the free-roam
// default; the diorama entry may fall back to explore (see switchMode),
// in which case Free-roam correctly shows as the active option.
const MODES = [
  { id: "explore", label: "Free-roam" },
  { id: "quiz", label: "Quiz" },
  { id: "diorama", label: "3D room" },
];

// Segmented control shown in every phase. Switching between the two
// free-roam stages keeps the run; anything involving quiz — or a switch
// made from the end screen — starts fresh (see the SWITCH_MODE reducer).
const ModeToggle = ({ mode, onSwitch }) => (
  <div
    role="group"
    aria-label="Game mode"
    className="inline-flex items-center gap-1 rounded-lg border border-hype-border bg-hype-surface/70 p-1 self-start sm:self-auto"
  >
    {MODES.map((option) => {
      const active = mode === option.id;
      return (
        <button
          key={option.id}
          type="button"
          aria-pressed={active}
          // Arrow so the click event never leaks into switchMode's
          // injectable `webgl` parameter.
          onClick={() => onSwitch(option.id)}
          className={`inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 sm:px-4 rounded-md text-sm font-medium font-sans-ele transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-hype-text focus-visible:ring-offset-2 focus-visible:ring-offset-hype-bg ${
            active
              ? "bg-hype-text text-hype-bg"
              : "text-hype-muted hover:text-hype-text"
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

export default ModeToggle;
