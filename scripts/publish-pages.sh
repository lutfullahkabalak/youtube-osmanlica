#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain -- landing-page)" ]; then
  echo 'Önce landing-page değişikliklerini commit edin.' >&2
  exit 1
fi

sh scripts/check.sh
pages_commit=$(git subtree split --prefix=landing-page HEAD)
git push origin "$pages_commit:refs/heads/gh-pages"
echo 'GitHub Pages yayını: https://lutfullahkabalak.github.io/youtube-osmanlica/'
