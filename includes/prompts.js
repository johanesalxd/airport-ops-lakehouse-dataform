// Gemini prompt templates kept in one place so prompt engineering is versioned
// alongside the models that use it.

const { SENTIMENTS, URGENCIES } = require("./constants");

// Builds the multilingual feedback-enrichment prompt. Asks for strict JSON so a
// downstream model can parse it deterministically. The allowed sentiment/urgency
// values come from constants.js, so the prompt and the assertion can never drift.
function feedbackEnrichmentPrompt(feedbackTextCol) {
  return `CONCAT(
    'You are analysing synthetic airport passenger feedback. ',
    'Return STRICT minified JSON with exactly these keys: ',
    'detected_language, english_translation, sentiment, topic, urgency, summary. ',
    'sentiment must be one of: ${SENTIMENTS.join(", ")}. ',
    'urgency must be one of: ${URGENCIES.join(", ")}. ',
    'topic is a short snake_case label such as security_wait, baggage, wifi, staff, cleanliness, signage, retail. ',
    'Do not include markdown, code fences, or commentary. ',
    'Feedback: ',
    ${feedbackTextCol}
  )`;
}

module.exports = {
  feedbackEnrichmentPrompt,
};
