import { useState, useEffect } from "react";
import { EMOTIONS, EMOTION_ORDER } from "./constants";

const STATUS_MESSAGES = [
  "Connecting to neural feeds",
  "Calibrating emotion sensors",
  "Scanning global news streams",
  "Pricing emotional futures",
  "Syncing labor exchange data",
  "Indexing sentiment vectors",
];

const LoadingState = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2200);
    return () => clearInterval(msgInterval);
  }, []);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev + Math.random() * 0.5;
        return prev + Math.random() * 3 + 1;
      });
    }, 150);
    return () => clearInterval(progressInterval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24">
      {/* Orbiting emotion symbols */}
      <div className="relative w-48 h-48 sm:w-56 sm:h-56 mb-12">
        {/* Center pulse ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-20 h-20 rounded-full border border-ele-border"
            style={{
              animation: "ele-ring-pulse 2.5s ease-in-out infinite",
            }}
          />
          <div
            className="absolute w-12 h-12 rounded-full border border-ele-border"
            style={{
              animation: "ele-ring-pulse 2.5s ease-in-out infinite 0.4s",
            }}
          />
          {/* Center dot */}
          <div
            className="absolute w-2 h-2 rounded-full bg-ele-text-tertiary"
            style={{
              animation: "ele-center-breathe 2s ease-in-out infinite",
            }}
          />
        </div>

        {/* Emotion icons orbiting */}
        {EMOTION_ORDER.map((key, i) => {
          const emotion = EMOTIONS[key];
          const angle = (i / EMOTION_ORDER.length) * 360;
          const radius = 85;
          const duration = 12 + i * 0.5;

          return (
            <div
              key={key}
              className="absolute left-1/2 top-1/2"
              style={{
                animation: `ele-orbit ${duration}s linear infinite`,
                transformOrigin: "0 0",
              }}
            >
              <div
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white shadow-sm border border-ele-border"
                style={{
                  transform: `rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)`,
                  animation: `ele-icon-float ${2 + (i % 3) * 0.5}s ease-in-out infinite, ele-orbit-counter ${duration}s linear infinite`,
                  marginLeft: "-18px",
                  marginTop: "-18px",
                }}
              >
                <span
                  className="text-sm"
                  style={{
                    color: emotion.accentColor,
                    filter: `drop-shadow(0 0 4px ${emotion.accentColor}40)`,
                  }}
                >
                  {emotion.icon}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status text */}
      <div className="text-center mb-8 h-14">
        <p
          key={messageIndex}
          className="font-sans-ele text-ele-text-secondary text-base sm:text-lg"
          style={{ animation: "ele-text-fade 2.2s ease-in-out" }}
        >
          {STATUS_MESSAGES[messageIndex]}
          <span className="inline-flex ml-0.5 tracking-widest">
            <span
              style={{ animation: "ele-dot-blink 1.4s steps(1) infinite" }}
            >
              .
            </span>
            <span
              style={{
                animation: "ele-dot-blink 1.4s steps(1) infinite 0.3s",
              }}
            >
              .
            </span>
            <span
              style={{
                animation: "ele-dot-blink 1.4s steps(1) infinite 0.6s",
              }}
            >
              .
            </span>
          </span>
        </p>
        <p className="font-mono text-[11px] text-ele-text-tertiary mt-2 tracking-wide uppercase">
          ELE Terminal v0.1
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-64 sm:w-80">
        <div className="h-px bg-ele-border rounded-full overflow-hidden">
          <div
            className="h-full bg-ele-text-tertiary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 95)}%` }}
          />
        </div>
        {/* Emotion color segments flowing beneath */}
        <div className="flex mt-3 gap-1 justify-center">
          {EMOTION_ORDER.map((key, i) => (
            <div
              key={key}
              className="h-0.5 w-6 rounded-full"
              style={{
                backgroundColor: EMOTIONS[key].accentColor,
                opacity: 0.4,
                animation: `ele-bar-pulse 2s ease-in-out infinite ${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingState;
