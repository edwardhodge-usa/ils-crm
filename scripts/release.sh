#!/bin/bash
set -euo pipefail

# ILS CRM Release Script
# Usage: ./scripts/release.sh [patch|minor|major] [--dry-run]
#
# Bumps version, builds, and publishes a GitHub Release so
# existing installs receive the update via electron-updater.

BUMP_TYPE="${1:-patch}"
DRY_RUN=false

for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

# --- Safety checks ---

if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  echo "Error: bump type must be patch, minor, or major (got '$BUMP_TYPE')"
  exit 1
fi

if [[ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]]; then
  echo "Error: must be on the main branch"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is not clean — commit or stash changes first"
  exit 1
fi

if ! command -v gh &>/dev/null; then
  echo "Error: gh CLI not found — install with: brew install gh"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "Error: gh is not authenticated — run: gh auth login"
  exit 1
fi

if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
  echo "Error: node/npm not found"
  exit 1
fi

# --- Version bump ---

OLD_VERSION=$(node -p "require('./package.json').version")
npm version "$BUMP_TYPE" --no-git-tag-version >/dev/null
NEW_VERSION=$(node -p "require('./package.json').version")
TAG="v${NEW_VERSION}"

echo "Version: ${OLD_VERSION} → ${NEW_VERSION}"

if $DRY_RUN; then
  echo "[dry-run] Would commit, tag ${TAG}, build, and create GitHub release"
  git checkout package.json
  exit 0
fi

# --- Commit, tag, push ---

git add package.json
git commit -m "chore: bump version to ${NEW_VERSION}"
git tag "$TAG"
git push origin main
git push origin "$TAG"

echo "Pushed ${TAG} to origin"

# --- Build ---

echo "Building ILS CRM ${NEW_VERSION}..."
npm run package

# --- Verify build artifacts ---

RELEASE_DIR="release"
DMG="${RELEASE_DIR}/ILS CRM-${NEW_VERSION}-arm64.dmg"
ZIP="${RELEASE_DIR}/ILS CRM-${NEW_VERSION}-arm64-mac.zip"
YML="${RELEASE_DIR}/latest-mac.yml"

for f in "$DMG" "$ZIP" "$YML"; do
  if [[ ! -f "$f" ]]; then
    echo "Error: expected build artifact not found: $f"
    exit 1
  fi
done

echo "Build artifacts verified"

# --- Create GitHub Release ---

echo "Creating GitHub release ${TAG}..."
gh release create "$TAG" \
  --title "ILS CRM ${TAG}" \
  --generate-notes \
  "$DMG" "$ZIP" "$YML"

RELEASE_URL=$(gh release view "$TAG" --json url -q '.url')
echo ""
echo "Release published: ${RELEASE_URL}"
echo "Existing installs will pick up the update automatically."
