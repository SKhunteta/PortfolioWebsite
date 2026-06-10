import { useState } from "react";
import { CONSENT_CLAUSES } from "./constants";

const BootSequence = ({ onConnect, reducedMotion }) => {
  const [connecting, setConnecting] = useState(false);

  const handleAccept = () => {
    if (connecting) return;
    setConnecting(true);
    setTimeout(onConnect, reducedMotion ? 200 : 1600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mr-bg px-5 py-12">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-mr-accent animate-pulse" />
          <span className="font-mono text-xs tracking-[0.3em] text-mr-accent uppercase">
            Meridian
          </span>
          <span className="font-mono text-xs tracking-widest text-mr-text-muted uppercase">
            Neural Uplink v11.4
          </span>
        </div>

        {connecting ? (
          <div className="font-mono text-sm text-mr-text-secondary space-y-2" role="status">
            <p>ESTABLISHING NEURAL LINK…</p>
            <p className="text-mr-text-muted">Calibrating baseline melancholy…</p>
            <p className="text-mr-text-muted">Locating buyers in U.S.-West-2…</p>
            <div className="h-1 mt-4 rounded bg-mr-panel overflow-hidden">
              <div
                className="h-full bg-mr-accent"
                style={{
                  width: "100%",
                  transition: reducedMotion ? "none" : "width 1.4s ease-in",
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-2xl sm:text-3xl text-mr-text mb-2">
              Emotional Data Provider Agreement
            </h1>
            <p className="font-mono text-xs text-mr-text-muted mb-6">
              FORM EMOTE-7 · SINGLE-SESSION GIG LICENSE · NON-NEGOTIABLE
            </p>
            <ul className="space-y-3 mb-8">
              {CONSENT_CLAUSES.map((clause) => (
                <li
                  key={clause}
                  className="flex gap-3 text-sm text-mr-text-secondary leading-relaxed"
                >
                  <span className="text-mr-accent font-mono shrink-0">§</span>
                  {clause}
                </li>
              ))}
            </ul>
            <button
              onClick={handleAccept}
              className="w-full sm:w-auto font-mono text-sm px-6 py-3 rounded-md bg-mr-accent text-mr-bg font-semibold hover:opacity-90 transition-opacity"
            >
              ACCEPT &amp; CONNECT INTERFACE &rarr;
            </button>
            <p className="font-mono text-[10px] text-mr-text-muted mt-4">
              By connecting you agree that you have feelings and that they are for sale.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default BootSequence;
