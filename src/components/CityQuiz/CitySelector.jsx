import React, { useState } from "react";
import { motion } from "framer-motion";
import { MAX_CITY_LENGTH, QUICK_PICK_CITIES } from "./constants";

const CitySelector = ({ onSubmit, disabled }) => {
  const [city, setCity] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = city.trim();
    if (!trimmed) {
      setLocalError("Enter a city name.");
      return;
    }
    if (trimmed.length > MAX_CITY_LENGTH) {
      setLocalError(`Keep it under ${MAX_CITY_LENGTH} characters.`);
      return;
    }
    setLocalError("");
    onSubmit(trimmed);
  };

  const handleQuickPick = (name) => {
    setCity(name);
    setLocalError("");
    onSubmit(name);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="text-center mb-8">
        <h1
          className="text-4xl sm:text-5xl font-bold mb-3"
          style={{ fontFamily: '"DM Serif Display", Georgia, serif', color: "#1A1A1A" }}
        >
          How well do you know your city?
        </h1>
        <p
          className="text-base text-gray-600"
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
        >
          Type a city. Claude will research it on the web, double-check itself,
          then quiz you on ten things you maybe didn't know.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Seattle, Mexico City, Lisbon..."
            maxLength={MAX_CITY_LENGTH}
            disabled={disabled}
            className="flex-1 px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            autoFocus
          />
          <button
            type="submit"
            disabled={disabled || !city.trim()}
            className="px-6 py-3 rounded-md bg-gray-900 text-white font-medium transition-colors hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            Start the quiz
          </button>
        </div>
        {localError && (
          <p className="mt-2 text-sm text-red-600">{localError}</p>
        )}
      </form>

      <div>
        <p
          className="text-xs uppercase tracking-widest text-gray-500 mb-3"
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
        >
          Quick picks
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PICK_CITIES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => handleQuickPick(name)}
              disabled={disabled}
              className="px-3 py-1.5 text-sm rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default CitySelector;
