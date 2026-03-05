import React from "react";

const MaquinaFooter = () => {
  return (
    <footer className="border-t border-maq-border py-6 px-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="text-xs text-maq-text-muted font-mono-maq">
            La Máquina Bilingüe &mdash; Built by{" "}
            <a
              href="https://builtbyshrey.com"
              className="text-maq-accent hover:underline"
            >
              Shreyans Khunteta
            </a>
          </p>
          <p className="text-xs text-maq-text-muted font-mono-maq mt-1">
            Cross-lingual emotion analysis powered by XLM-RoBERTa + LaBSE
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/SKhunteta"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-maq-text-secondary hover:text-maq-text font-mono-maq transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://prompt-injection.ghost.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-maq-text-secondary hover:text-maq-text font-mono-maq transition-colors"
          >
            Blog
          </a>
        </div>
      </div>
    </footer>
  );
};

export default MaquinaFooter;
