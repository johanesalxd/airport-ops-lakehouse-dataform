// Reusable metric SQL snippets. These are the heart of the "model once, reference
// many times" idea. Heavy transformation logic lives here in the Dataform layer;
// the semantic views only roll these atomic measures up.

const { SLA } = require("./constants");

// Classify a delay (in minutes) into a human-readable bucket.
function delayBucket(col) {
  return `
    CASE
      WHEN ${col} IS NULL THEN 'unknown'
      WHEN ${col} < ${SLA.DELAY_MINUTES} THEN 'on_time'
      WHEN ${col} < 60 THEN 'minor'
      WHEN ${col} < 120 THEN 'major'
      ELSE 'severe'
    END`;
}

// 1 when a delay breaches the SLA threshold, else 0 (handy for delay-rate AVG).
function isDelayed(col) {
  return `CASE WHEN ${col} >= ${SLA.DELAY_MINUTES} THEN 1 ELSE 0 END`;
}

// 1 when a security wait breaches the SLA threshold, else 0.
function isWaitBreach(col) {
  return `CASE WHEN ${col} >= ${SLA.SECURITY_WAIT_MINUTES} THEN 1 ELSE 0 END`;
}

// 1 when a passenger count indicates congestion, else 0.
function isCongested(col) {
  return `CASE WHEN ${col} >= ${SLA.CONGESTION_PASSENGERS} THEN 1 ELSE 0 END`;
}

module.exports = {
  delayBucket,
  isDelayed,
  isWaitBreach,
  isCongested,
};
