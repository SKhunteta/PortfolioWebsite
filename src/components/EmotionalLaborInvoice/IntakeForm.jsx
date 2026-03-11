import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  EMOTIONS,
  EMOTION_ORDER,
} from "../EmotionalLaborExchange/constants";
import {
  MODIFIERS,
  DURATIONS,
  CLIENT_GHOST_TEXTS,
  SERVICE_GHOST_TEXT,
  PRESET_SCENARIOS,
} from "./constants";

export default function IntakeForm({ emotionPrices, onSubmit }) {
  const [client, setClient] = useState("");
  const [fromName, setFromName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [selectedEmotions, setSelectedEmotions] = useState([]);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [ghostTextIndex, setGhostTextIndex] = useState(0);

  // Rotate client ghost text
  useEffect(() => {
    const interval = setInterval(() => {
      setGhostTextIndex((i) => (i + 1) % CLIENT_GHOST_TEXTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleEmotion = (key) => {
    setSelectedEmotions((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]
    );
  };

  const toggleModifier = (key) => {
    setSelectedModifiers((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };

  const applyPreset = (preset) => {
    setClient(preset.client);
    setDescription(preset.description);
    setDuration(preset.duration);
    setSelectedEmotions(preset.emotions);
  };

  const isValid =
    client.trim() && description.trim() && duration && selectedEmotions.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({
      client: client.trim(),
      from: fromName.trim() || undefined,
      description: description.trim(),
      duration,
      emotions: selectedEmotions,
      modifiers: selectedModifiers,
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="w-full max-w-xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-invoice text-2xl sm:text-3xl font-semibold text-inv-text tracking-tight">
          Emotional Labor Invoice
        </h1>
        <p className="font-sans-ele text-ele-text-secondary text-sm mt-2">
          Document the work. Name the price. File the record.
        </p>
      </div>

      {/* Preset Scenarios */}
      <div className="mb-8">
        <p className="font-invoice text-[10px] uppercase tracking-[0.2em] text-ele-text-tertiary mb-2">
          Quick Scenarios
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESET_SCENARIOS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="border border-inv-border bg-white text-inv-text/70 hover:border-inv-gold/40 hover:text-inv-text text-xs font-sans-ele px-3 py-1.5 rounded-full cursor-pointer transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client */}
      <div className="mb-6">
        <label htmlFor="inv-client" className="block font-invoice text-xs font-medium text-inv-text uppercase tracking-widest mb-2">
          Bill To (Client)
        </label>
        <input
          id="inv-client"
          type="text"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder={CLIENT_GHOST_TEXTS[ghostTextIndex]}
          className="w-full px-4 py-3 bg-white border border-inv-border rounded-md font-sans-ele text-inv-text text-sm placeholder:text-ele-text-tertiary placeholder:italic focus:outline-none focus:border-inv-gold focus:ring-1 focus:ring-inv-gold/30 transition-colors"
        />
      </div>

      {/* From (Optional) */}
      <div className="mb-6">
        <label htmlFor="inv-from" className="block font-invoice text-xs font-medium text-inv-text uppercase tracking-widest mb-2">
          From <span className="normal-case tracking-normal font-normal text-ele-text-tertiary">(optional)</span>
        </label>
        <input
          id="inv-from"
          type="text"
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          placeholder="Your name (or leave blank)"
          className="w-full px-4 py-3 bg-white border border-inv-border rounded-md font-sans-ele text-inv-text text-sm placeholder:text-ele-text-tertiary placeholder:italic focus:outline-none focus:border-inv-gold focus:ring-1 focus:ring-inv-gold/30 transition-colors"
        />
      </div>

      {/* Service Description */}
      <div className="mb-6">
        <label htmlFor="inv-description" className="block font-invoice text-xs font-medium text-inv-text uppercase tracking-widest mb-2">
          Service Rendered
        </label>
        <textarea
          id="inv-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={SERVICE_GHOST_TEXT}
          rows={4}
          className="w-full px-4 py-3 bg-white border border-inv-border rounded-md font-sans-ele text-inv-text text-sm placeholder:text-ele-text-tertiary placeholder:italic focus:outline-none focus:border-inv-gold focus:ring-1 focus:ring-inv-gold/30 transition-colors resize-none"
        />
      </div>

      {/* Duration */}
      <div className="mb-8">
        <label htmlFor="inv-duration" className="block font-invoice text-xs font-medium text-inv-text uppercase tracking-widest mb-2">
          Duration
        </label>
        <select
          id="inv-duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-inv-border rounded-md font-sans-ele text-inv-text text-sm focus:outline-none focus:border-inv-gold focus:ring-1 focus:ring-inv-gold/30 transition-colors appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239CA3AF' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: "right 0.75rem center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "1.25em 1.25em",
          }}
        >
          <option value="" disabled>
            Select duration
          </option>
          {DURATIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Emotion Selector */}
      <div className="mb-8">
        <label className="block font-invoice text-xs font-medium text-inv-text uppercase tracking-widest mb-3">
          Emotional Categories Involved
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {EMOTION_ORDER.map((key) => {
            const emotion = EMOTIONS[key];
            const price = emotionPrices[key]?.price;
            const isSelected = selectedEmotions.includes(key);

            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleEmotion(key)}
                aria-pressed={isSelected}
                aria-label={`${emotion.name}${price != null ? `, $${price.toFixed(2)}` : ""}`}
                className={`relative flex flex-col items-center px-3 py-3 sm:px-3 sm:py-3 min-h-[48px] rounded-md border text-sm transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-transparent text-white shadow-sm"
                    : "border-inv-border bg-white text-inv-text hover:border-ele-text-tertiary"
                }`}
                style={
                  isSelected
                    ? { backgroundColor: emotion.accentColor }
                    : undefined
                }
              >
                <span className="text-lg mb-0.5">{emotion.icon}</span>
                <span className="font-sans-ele font-medium text-xs">
                  {emotion.name}
                </span>
                {price != null && (
                  <span
                    className={`font-mono text-[10px] mt-0.5 ${
                      isSelected ? "text-white/80" : "text-ele-text-tertiary"
                    }`}
                  >
                    ${price.toFixed(2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Context Modifiers */}
      <div className="mb-10">
        <label className="block font-invoice text-xs font-medium text-inv-text uppercase tracking-widest mb-3">
          Context Modifiers
          <span className="normal-case tracking-normal font-normal text-ele-text-tertiary ml-2">
            (affect rate)
          </span>
        </label>
        <div className="space-y-2">
          {MODIFIERS.map((mod) => {
            const isChecked = selectedModifiers.includes(mod.key);
            return (
              <label
                key={mod.key}
                className={`flex items-start gap-3 px-4 py-3 rounded-md border cursor-pointer transition-all duration-200 ${
                  isChecked
                    ? "border-inv-gold/40 bg-inv-gold/5"
                    : "border-inv-border bg-white hover:border-ele-text-tertiary"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleModifier(mod.key)}
                  className="mt-0.5 h-4 w-4 rounded border-inv-border text-inv-gold focus:ring-inv-gold/30 accent-[#C49A3C] cursor-pointer"
                />
                <span className="font-sans-ele text-sm text-inv-text leading-snug">
                  {mod.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid}
        className={`w-full py-3.5 rounded-md font-invoice text-sm font-semibold uppercase tracking-widest transition-all duration-200 ${
          isValid
            ? "bg-inv-text text-inv-bg hover:bg-inv-text/90 cursor-pointer shadow-sm"
            : "bg-inv-border text-ele-text-tertiary cursor-not-allowed"
        }`}
      >
        Generate Invoice
      </button>
    </motion.form>
  );
}
