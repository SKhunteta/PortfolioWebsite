import React from "react";

const titleFor = (errorType) => {
  switch (errorType) {
    case "insufficient_data":
      return "Not enough verifiable trivia";
    case "rate_limited":
      return "Slow down a sec";
    case "budget_exceeded":
      return "Research budget reached";
    case "timeout":
      return "Claude took too long";
    case "validation":
      return "That doesn't look like a city";
    default:
      return "Something went wrong";
  }
};

const subtitleFor = (errorType) => {
  switch (errorType) {
    case "insufficient_data":
      return "Try a nearby larger city — we couldn't find enough fact-checkable material on this one.";
    case "rate_limited":
      return "We rate-limit the quiz to keep API costs sane. Try again in a minute.";
    case "budget_exceeded":
      return "Hourly research budget is full. Try a popular city (likely cached) or come back in an hour.";
    case "timeout":
      return "The two-pass research took longer than 90 seconds. Try again — it usually completes.";
    case "validation":
      return "Enter a real city name (1–100 characters, no weird symbols).";
    default:
      return "Try again or pick a different city.";
  }
};

const ErrorState = ({ error, errorType, onRetry, onTryAnother }) => {
  return (
    <div className="w-full max-w-xl mx-auto text-center">
      <h2
        className="text-2xl sm:text-3xl font-bold mb-2"
        style={{ fontFamily: '"DM Serif Display", Georgia, serif', color: "#1A1A1A" }}
      >
        {titleFor(errorType)}
      </h2>
      <p
        className="text-gray-600 mb-6"
        style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
      >
        {subtitleFor(errorType)}
      </p>
      {error && (
        <p className="text-xs text-gray-400 mb-6 font-mono">{error}</p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-5 py-2.5 rounded-md bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            Try again
          </button>
        )}
        {onTryAnother && (
          <button
            type="button"
            onClick={onTryAnother}
            className="px-5 py-2.5 rounded-md border border-gray-900 text-gray-900 font-medium hover:bg-gray-100 transition-colors"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            Pick another city
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;
