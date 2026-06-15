// Gemini prompt templates kept in one place so prompt engineering is versioned
// alongside the models that use it.

// Builds the multilingual feedback-enrichment prompt. Asks for strict JSON so a
// downstream model can parse it deterministically.
function feedbackEnrichmentPrompt(feedbackTextCol) {
  return `CONCAT(
    'You are analysing synthetic airport passenger feedback. ',
    'Return STRICT minified JSON with exactly these keys: ',
    'detected_language, english_translation, sentiment, topic, urgency, summary. ',
    'sentiment must be one of: positive, neutral, negative. ',
    'urgency must be one of: low, medium, high. ',
    'topic is a short snake_case label such as security_wait, baggage, wifi, staff, cleanliness, signage, retail. ',
    'Do not include markdown, code fences, or commentary. ',
    'Feedback: ',
    ${feedbackTextCol}
  )`;
}

module.exports = {
  feedbackEnrichmentPrompt,
};
