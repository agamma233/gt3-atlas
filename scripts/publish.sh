#!/bin/sh
# Commit only after you have reviewed git diff. Authentication uses your Git client.
set -eu
cd "$(dirname "$0")/.."
python3 scripts/check.py
python3 scripts/build.py
git add data src assets scripts .github README.md .gitignore index.html
git diff --cached --quiet && { echo '没有待发布的修改'; exit 0; }
git commit -m "${1:-Update GT3 atlas}"
git push origin main
