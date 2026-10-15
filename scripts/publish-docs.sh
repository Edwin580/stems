#!/usr/bin/env bash
# Publish a built site into main:/docs, which GitHub Pages serves.
#
#   publish-docs.sh <site-checkout> <build-dir> <target> <message>
#
#   target "."                → production: replaces the app at docs/ root, keeping
#                               docs/previews/, Markdown docs and .nojekyll.
#   target "previews/pr-N"    → per-PR preview at docs/previews/pr-N/.
#   build-dir "-"             → delete the target instead (closed PRs).
#
# Several workflows can write main at once (one per PR plus production), so
# every attempt starts from the latest origin/main and retries on a rejected push.
set -euo pipefail
site="$1"; build="$2"; target="$3"; message="$4"
cd "$site"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

for attempt in 1 2 3 4 5 6; do
  git fetch --quiet origin main
  git reset --quiet --hard origin/main
  mkdir -p docs
  touch docs/.nojekyll # serve files as-is (no Jekyll processing)
  if [ "$target" = "." ]; then
    find docs -mindepth 1 -maxdepth 1 ! -name previews ! -name '*.md' ! -name .nojekyll -exec rm -rf {} +
    [ "$build" != "-" ] && cp -R "$build"/. docs/
  else
    rm -rf "docs/$target"
    if [ "$build" != "-" ]; then
      mkdir -p "docs/$target"
      cp -R "$build"/. "docs/$target/"
    fi
  fi
  git add -A docs
  if git diff --cached --quiet; then
    echo "Nothing to publish."
    exit 0
  fi
  git commit --quiet -m "$message"
  if git push --quiet origin HEAD:main; then
    echo "Published to docs/$target on attempt $attempt."
    exit 0
  fi
  echo "Push rejected (main moved); retrying…"
  sleep $((attempt * 5))
done
echo "Could not publish after retries." >&2
exit 1
