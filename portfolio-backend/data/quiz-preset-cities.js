// Cities pre-generated as quiz presets. Must stay in sync with the
// QUICK_PICK_CITIES list in src/components/CityQuiz/constants.js.
//
// To regenerate the JSON files in data/quiz-presets/, run:
//   ANTHROPIC_API_KEY=... npm run generate-presets        # only missing cities
//   ANTHROPIC_API_KEY=... npm run generate-presets -- --force   # regenerate all
//
// Each preset stores 30 questions; the runtime samples 10 per request.
export const PRESET_CITIES = [
  "New York City",
  "Los Angeles",
  "Chicago",
  "Seattle",
  "Austin",
  "London",
  "Tokyo",
  "Mumbai",
];
