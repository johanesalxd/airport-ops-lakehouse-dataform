#!/usr/bin/env bash
# Scan tracked and untracked non-ignored repository files for internal,
# corporate, customer, or personal identifiers before public release.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
if ! REPO_ROOT="$(git -C "$SCRIPT_DIR/.." rev-parse --show-toplevel 2>/dev/null)"; then
  REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
fi

if ! git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  printf 'ERROR: %s is not inside a git work tree.\n' "$REPO_ROOT" >&2
  exit 2
fi

# Construct structural patterns without embedding forbidden literals in this
# public file itself, and use POSIX ERE boundaries portable across Linux/macOS.
WB_START='(^|[^[:alnum:]_])'
WB_END='($|[^[:alnum:]_])'

BUILTIN_REGEX="$(
  printf '%s|' \
    "[@][g]oogle[.]com" \
    "al[t]ostrat[.]com" \
    "cor[p][.]google" \
    "${WB_START}[g]o/[a-z0-9_-]+" \
    "[g]oto[.]google[.]com" \
    "//[d]epot/" \
    "${WB_START}[g]oogle3/" \
    "${WB_START}([b]|cl)/[0-9]{4,}" \
    "[c]hat[.]google[.]com" \
    "clou[d]-gtm" \
    "${WB_START}g[T]AP${WB_END}" \
    "${WB_START}E[D]P${WB_END}" \
    "${WB_START}Bundle [A]djustment${WB_END}" \
    "${WB_START}DA [F]AST${WB_END}" \
    "${WB_START}k[c]md${WB_END}" \
    "[-][c]ompute@[d]eveloper[.]gserviceaccount[.]com" \
    "[a-z0-9-]+-play[g]round-[0-9]{6}" \
    "${WB_START}[0-9]{12}${WB_END}"
)"
BUILTIN_REGEX="${BUILTIN_REGEX%|}"

declare -a FILES=()
while IFS= read -r -d '' rel_path; do
  if [[ -f "${REPO_ROOT}/${rel_path}" ]]; then
    FILES+=("$rel_path")
  fi
done < <(git -C "$REPO_ROOT" ls-files -z --cached --others --exclude-standard)

if [[ ${#FILES[@]} -eq 0 ]]; then
  printf 'ERROR: no scannable files discovered under %s.\n' "$REPO_ROOT" >&2
  exit 2
fi

scan_with_regex() {
  local label="$1"
  local pattern="$2"
  local hits=0
  local output=""
  local rc=0

  set +e
  output="$(cd -- "$REPO_ROOT" && grep -nEI -- "$pattern" "${FILES[@]}")"
  rc=$?
  set -e

  if [[ $rc -eq 0 ]]; then
    printf 'FAIL [%s]: forbidden identifier match(es) detected:\n%s\n' "$label" "$output" >&2
    hits=1
  elif [[ $rc -gt 1 ]]; then
    printf 'ERROR [%s]: grep failed with exit code %d\n' "$label" "$rc" >&2
    exit 2
  fi
  return "$hits"
}

status=0
if ! scan_with_regex "builtin" "$BUILTIN_REGEX"; then
  status=1
fi

if [[ -n "${EXTRA_FORBIDDEN_REGEX:-}" ]]; then
  if ! scan_with_regex "extra" "$EXTRA_FORBIDDEN_REGEX"; then
    status=1
  fi
fi

if [[ $status -eq 0 ]]; then
  printf 'OK: 0 forbidden identifiers found across %d files.\n' "${#FILES[@]}"
fi

exit "$status"
