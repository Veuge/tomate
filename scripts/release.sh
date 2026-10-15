#!/usr/bin/env bash
# Cuts a release: bumps the version, opens a PR with the change, and pushes the vX.Y.Z tag.
# Usage: npm run release -- <major|minor|patch>   (or: npm run release:patch, etc.)
set -euo pipefail

bump="${1:-}"
case "$bump" in
  major | minor | patch) ;;
  *) echo "Usage: npm run release -- <major|minor|patch>" >&2; exit 1 ;;
esac

base=main
die() { echo "✗ $*" >&2; exit 1; }

# Start from an up-to-date, clean main so the release contains exactly what's on main.
[ "$(git branch --show-current)" = "$base" ] || die "Switch to $base first."
[ -z "$(git status --porcelain)" ] || die "Commit or stash your changes first."
git fetch --quiet origin "$base" --tags
[ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$base")" ] || die "$base is not in sync with origin/$base. Pull or push first."

echo "→ Running tests and build"
npm test --silent
npm run build --silent >/dev/null

# 1. npm version: bumps package.json + package-lock.json, commits, and tags vX.Y.Z.
git switch --quiet -c release/next
version="$(npm version "$bump" -m "Release v%s")" # prints "vX.Y.Z"
branch="release/$version"
git branch -m "$branch"
git rev-parse -q --verify "refs/remotes/origin/$branch" >/dev/null && die "$branch already exists on origin."

# 2. Push the branch and open a PR.
echo "→ Pushing $branch"
git push --quiet -u origin "$branch"

repo_url="$(git remote get-url origin | sed -E 's#^git@([^:]+):#https://\1/#; s#\.git$##')"
if command -v gh >/dev/null; then
  gh pr create --base "$base" --head "$branch" --title "Release $version" \
    --body "Bumps the version to \`${version#v}\`. Merge with **Create a merge commit** so tag \`$version\` stays on $base."
else
  pr_url="$repo_url/compare/$base...$branch?expand=1&title=Release%20$version"
  echo "→ Open the PR here: $pr_url"
  command -v open >/dev/null && open "$pr_url"
fi

# 3. Push the tag.
echo "→ Pushing tag $version"
git push --quiet origin "$version"

git switch --quiet "$base"
echo "✓ Released $version. Merge the PR with a merge commit (not squash) so the tag stays on $base."
