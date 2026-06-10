import { forwardRef } from "react";

const Paragraph = forwardRef(function Paragraph({ paragraph }, ref) {
  if (paragraph.type === "scene-break") {
    return (
      <div
        ref={ref}
        data-pid={paragraph.id}
        className="text-center text-mr-text-muted py-4 select-none"
        aria-hidden="true"
      >
        · · ·
      </div>
    );
  }

  if (paragraph.type === "keynote") {
    return (
      <aside
        ref={ref}
        data-pid={paragraph.id}
        className="border-l-2 border-mr-accent/40 bg-mr-surface/60 rounded-r-md px-5 py-4 my-2"
      >
        <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-mr-accent/70 mb-2">
          Elsewhere · Humane Futures Summit 2047
        </p>
        <p className="font-sans text-sm sm:text-base leading-relaxed text-mr-text-secondary italic">
          {paragraph.text}
        </p>
      </aside>
    );
  }

  return (
    <p
      ref={ref}
      data-pid={paragraph.id}
      className="font-serif-atlas text-base sm:text-lg leading-loose text-mr-text"
    >
      {paragraph.text}
    </p>
  );
});

export default Paragraph;
