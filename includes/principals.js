// Helper functions to normalize comma-separated IAM member overrides for
// BigQuery Row-Level Security (IAM v1 grantee format) and Column-Level Security
// Data Policies (IAM v2 principal format).

const UNSAFE_SQL_CHARS = /['"`\\;\r\n\t\s]/;
const V2_USER_PREFIX = "principal://goog/subject/";
const V2_GROUP_PREFIX = "principalSet://goog/group/";
const V2_SA_PREFIX = "principal://iam.googleapis.com/projects/-/serviceAccounts/";

function parseMembers(rawMembers) {
  if (!rawMembers || typeof rawMembers !== "string") {
    return [];
  }
  const seen = new Set();
  const out = [];
  for (const part of rawMembers.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    if (UNSAFE_SQL_CHARS.test(trimmed)) {
      throw new Error(`Invalid principal character in member override: "${trimmed}"`);
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return out;
}

function normalizeToIamV1(entry) {
  if (entry.startsWith(V2_USER_PREFIX)) {
    const addr = entry.slice(V2_USER_PREFIX.length);
    if (!addr) throw new Error(`Empty user principal: "${entry}"`);
    return `user:${addr}`;
  }
  if (entry.startsWith(V2_GROUP_PREFIX)) {
    const addr = entry.slice(V2_GROUP_PREFIX.length);
    if (!addr) throw new Error(`Empty group principal: "${entry}"`);
    return `group:${addr}`;
  }
  if (entry.startsWith(V2_SA_PREFIX)) {
    const addr = entry.slice(V2_SA_PREFIX.length);
    if (!addr) throw new Error(`Empty serviceAccount principal: "${entry}"`);
    return `serviceAccount:${addr}`;
  }
  if (entry.startsWith("principal://") || entry.startsWith("principalSet://")) {
    throw new Error(`Unsupported IAM v2 principal for ROW ACCESS POLICY: "${entry}"`);
  }
  const colonIdx = entry.indexOf(":");
  if (colonIdx === -1) {
    if (!entry.includes("@")) {
      throw new Error(`Expected email or prefixed principal, got: "${entry}"`);
    }
    return `user:${entry}`;
  }
  const prefix = entry.slice(0, colonIdx);
  const addr = entry.slice(colonIdx + 1);
  if (!addr) {
    throw new Error(`Empty principal address in: "${entry}"`);
  }
  if (!["user", "group", "serviceAccount", "domain"].includes(prefix)) {
    throw new Error(`Unsupported principal prefix "${prefix}" in: "${entry}"`);
  }
  return `${prefix}:${addr}`;
}

function normalizeToDataPolicyV2(entry) {
  if (entry.startsWith("principal://") || entry.startsWith("principalSet://")) {
    return entry;
  }
  const v1 = normalizeToIamV1(entry);
  const colonIdx = v1.indexOf(":");
  const prefix = v1.slice(0, colonIdx);
  const addr = v1.slice(colonIdx + 1);
  if (prefix === "user") {
    return `${V2_USER_PREFIX}${addr}`;
  }
  if (prefix === "group") {
    return `${V2_GROUP_PREFIX}${addr}`;
  }
  if (prefix === "serviceAccount") {
    return `${V2_SA_PREFIX}${addr}`;
  }
  throw new Error(
    `Principal prefix "${prefix}:" cannot be mapped automatically for GRANT FINE_GRAINED_READ ON DATA_POLICY: "${entry}"`
  );
}

function resolvePrincipals(membersVar, legacyVar, formatter) {
  const explicit = parseMembers(membersVar);
  const rawList = explicit.length > 0 ? explicit : parseMembers(legacyVar);
  if (rawList.length === 0) {
    throw new Error("At least one principal must be configured for staff_directory access policies.");
  }
  const seen = new Set();
  const resolved = [];
  for (const item of rawList) {
    const formatted = formatter(item);
    if (!seen.has(formatted)) {
      seen.add(formatted);
      resolved.push(formatted);
    }
  }
  return resolved;
}

function formatRlsGrantList(membersVar, legacyVar) {
  return resolvePrincipals(membersVar, legacyVar, normalizeToIamV1)
    .map((p) => `'${p}'`)
    .join(", ");
}

function formatClsGrantList(membersVar, legacyVar) {
  return resolvePrincipals(membersVar, legacyVar, normalizeToDataPolicyV2)
    .map((p) => `"${p}"`)
    .join(", ");
}

module.exports = {
  parseMembers,
  normalizeToIamV1,
  normalizeToDataPolicyV2,
  formatRlsGrantList,
  formatClsGrantList,
};
