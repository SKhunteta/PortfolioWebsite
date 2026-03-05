/**
 * La Máquina Bilingüe — Constants
 * Emotion colors, tab config, and static data
 */

export const EMOTIONS = [
  { key: "anger", label: "Anger", labelEs: "Ira", color: "#F85149" },
  { key: "disgust", label: "Disgust", labelEs: "Asco", color: "#A371F7" },
  { key: "fear", label: "Fear", labelEs: "Miedo", color: "#D29922" },
  { key: "joy", label: "Joy", labelEs: "Alegría", color: "#3FB950" },
  { key: "sadness", label: "Sadness", labelEs: "Tristeza", color: "#58A6FF" },
  { key: "surprise", label: "Surprise", labelEs: "Sorpresa", color: "#F778BA" },
  { key: "neutral", label: "Neutral", labelEs: "Neutral", color: "#8B949E" },
];

export const TABS = [
  { key: "feed", label: "Live Feed", labelEs: "En Vivo" },
  { key: "divergence", label: "Divergence", labelEs: "Divergencia" },
  { key: "trends", label: "Trends", labelEs: "Tendencias" },
  { key: "translator", label: "Translator", labelEs: "Traductor" },
  { key: "system", label: "System", labelEs: "Sistema" },
];

export const LANGUAGE_CONFIG = {
  en: { label: "English", color: "#58A6FF", flag: "EN" },
  es: { label: "Español", color: "#F0883E", flag: "ES" },
};

export const API_BASE = "/api/maquina";
