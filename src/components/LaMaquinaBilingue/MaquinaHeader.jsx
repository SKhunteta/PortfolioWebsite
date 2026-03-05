import React from "react";
import { Link } from "react-router-dom";

const MaquinaHeader = () => {
  return (
    <header className="bg-maq-bg border-b border-maq-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Title */}
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-maq-text-muted hover:text-maq-text-secondary transition-colors text-sm font-mono-maq"
            >
              &larr; Portfolio
            </Link>
            <div className="h-4 w-px bg-maq-border" />
            <div>
              <h1
                className="text-lg font-bold text-maq-text tracking-tight"
                style={{ fontFamily: '"IBM Plex Mono", monospace' }}
              >
                La Máquina Bilingüe
              </h1>
              <p className="text-xs text-maq-text-muted font-mono-maq hidden sm:block">
                Cross-lingual emotion analysis
              </p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono-maq text-maq-en">EN</span>
              <span className="text-maq-text-muted">/</span>
              <span className="text-xs font-mono-maq text-maq-es">ES</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-maq-joy animate-pulse" />
              <span className="text-xs font-mono-maq text-maq-text-secondary">
                LIVE
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MaquinaHeader;
