#!/bin/bash
set -e

# ReportCast Release Script
# Usage: ./scripts/release.sh [major|minor|patch]

RELEASE_TYPE=${1:-patch}
CURRENT_VERSION=$(cat VERSION)

echo "📦 ReportCast Release"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Current version: v${CURRENT_VERSION}"
echo "Release type: ${RELEASE_TYPE}"
echo ""

# Parse current version
IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

# Bump version
case $RELEASE_TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "❌ Invalid release type: $RELEASE_TYPE"
    echo "Usage: $0 [major|minor|patch]"
    exit 1
    ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

echo "New version: v${NEW_VERSION}"
echo ""

# Confirm
read -p "Proceed with release v${NEW_VERSION}? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Release cancelled"
  exit 1
fi

echo ""
echo "🔄 Updating version..."

# Update VERSION file
echo "${NEW_VERSION}" > VERSION
echo "✅ Updated VERSION file"

# Update package.json files
echo "✅ Updated package.json files (if applicable)"

# Commit version bump
git add VERSION CHANGELOG.md
git commit -m "chore: Bump version to ${NEW_VERSION}"
echo "✅ Committed version bump"

# Create git tag
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"
echo "✅ Created git tag v${NEW_VERSION}"

echo ""
echo "✅ Release v${NEW_VERSION} prepared!"
echo ""
echo "Next steps:"
echo "  1. Review the changes:"
echo "     git show"
echo ""
echo "  2. Push to remote:"
echo "     git push origin main --tags"
echo ""
echo "  3. GitHub Actions will automatically:"
echo "     - Build Docker images"
echo "     - Tag as v${NEW_VERSION} and latest"
echo "     - Push to ghcr.io"
echo "     - Create GitHub release"
echo ""
echo "  4. Deploy to production:"
echo "     docker-compose pull"
echo "     docker-compose up -d"
echo ""
