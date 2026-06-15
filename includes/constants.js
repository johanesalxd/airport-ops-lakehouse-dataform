// Reusable constants for the Airport Operations Lakehouse.
// Centralising these in one place is the "semantic thinking" the demo teaches:
// define business facts once, reference them everywhere (DRY).

const TERMINALS = ["T1", "T2", "T3", "T4"];

// Service-level thresholds (synthetic, for the demo).
const SLA = {
  // A flight is "delayed" at/above this many minutes.
  DELAY_MINUTES: 15,
  // Security wait considered "breach" at/above this many minutes.
  SECURITY_WAIT_MINUTES: 30,
  // Baggage considered late if full journey exceeds this many minutes.
  BAGGAGE_JOURNEY_MINUTES: 45,
  // Terminal zone considered "congested" at/above this passenger count.
  CONGESTION_PASSENGERS: 900,
};

const TIMEZONE = "Asia/Singapore";

// Allowed enrichment values (kept in sync with the Gemini prompt + assertions).
const SENTIMENTS = ["positive", "neutral", "negative"];
const URGENCIES = ["low", "medium", "high"];

module.exports = {
  TERMINALS,
  SLA,
  TIMEZONE,
  SENTIMENTS,
  URGENCIES,
};
