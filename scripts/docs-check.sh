#!/usr/bin/env bash
# docs-check.sh — verify documentation hygiene for pms-master
# Exits non-zero on failure so it can gate CI.

set -euo pipefail
ROOT="${1:-.}"
cd "$ROOT"

fail=0

# 1. Every top-level package must have a README.md
for pkg in tenant_portal_backend tenant_portal_app tenant_portal_mobile operator_app pms-mobile-portals prisma rent_optimization_ml security/mil scripts; do
  if [[ ! -f "$pkg/README.md" ]]; then
    echo "MISSING README: $pkg/README.md"
    fail=1
  fi
done

# 2. Root README must exist
[[ -f README.md ]] || { echo "MISSING README: README.md"; fail=1; }

# 3. docs/README.md must exist
[[ -f docs/README.md ]] || { echo "MISSING: docs/README.md"; fail=1; }

# 4. Plan file must exist
[[ -f docs/WIKI_AND_DOCS_UPDATE_PLAN.md ]] || { echo "MISSING: docs/WIKI_AND_DOCS_UPDATE_PLAN.md"; fail=1; }

# 5. No obviously broken relative markdown links in docs/README.md
# (lightweight: check that linked .md targets exist)
python3 - "$ROOT" <<'PY'
import re, os, sys
root = sys.argv[1]
path = os.path.join(root, "docs", "README.md")
text = open(path).read()
broken = []
for m in re.finditer(r"\(([^)]+\.md)\)", text):
    target = m.group(1)
    if target.startswith("http"):
        continue
    full = os.path.normpath(os.path.join(os.path.dirname(path), target))
    if not os.path.exists(full):
        broken.append(target)
if broken:
    print("BROKEN LINKS in docs/README.md:")
    for b in broken:
        print("  -", b)
    sys.exit(1)
PY
rc=$?
if [[ $rc -ne 0 ]]; then fail=1; fi

if [[ $fail -ne 0 ]]; then
  echo "docs-check: FAILED"
  exit 1
fi
echo "docs-check: OK"
