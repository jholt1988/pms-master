#!/bin/bash

# Script to manually sync wiki files from docs/guides/wiki to GitHub Wiki
# This script can be used for local testing or manual wiki updates

set -e  # Exit on error

WIKI_SOURCE_DIR="docs/guides/wiki"
WIKI_REPO_URL="https://github.com/jholt1988/pms.wiki.git"
WIKI_CLONE_DIR="wiki-repo-temp"

echo "================================================"
echo "Wiki Sync Script"
echo "================================================"
echo ""

# Check if wiki source directory exists
if [ ! -d "$WIKI_SOURCE_DIR" ]; then
    echo "Error: Wiki source directory '$WIKI_SOURCE_DIR' not found!"
    exit 1
fi

# Check if there are any markdown files in the source directory
if ! ls "$WIKI_SOURCE_DIR"/*.md 1> /dev/null 2>&1; then
    echo "Error: No markdown files found in '$WIKI_SOURCE_DIR'!"
    exit 1
fi

echo "Step 1: Cloning wiki repository..."
if [ -d "$WIKI_CLONE_DIR" ]; then
    echo "  Removing existing clone directory..."
    rm -rf "$WIKI_CLONE_DIR"
fi

git clone "$WIKI_REPO_URL" "$WIKI_CLONE_DIR"
echo "  ✓ Wiki repository cloned"
echo ""

echo "Step 2: Copying wiki files..."
cp -v "$WIKI_SOURCE_DIR"/*.md "$WIKI_CLONE_DIR/"
echo "  ✓ Files copied"
echo ""

echo "Step 3: Committing changes..."
cd "$WIKI_CLONE_DIR"

# Configure git if not already configured
if [ -z "$(git config user.name)" ]; then
    echo "  Setting git user name..."
    git config user.name "Wiki Sync Script"
fi

if [ -z "$(git config user.email)" ]; then
    echo "  Setting git user email..."
    git config user.email "github-actions[bot]@users.noreply.github.com"
fi

# Add all changes
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "  No changes to commit. Wiki is already up to date."
    cd ..
    rm -rf "$WIKI_CLONE_DIR"
    echo ""
    echo "✓ Sync completed (no changes)"
    exit 0
fi

# Show what will be committed
echo "  Changes to be committed:"
git status --short

# Commit changes
git commit -m "Manual wiki sync from docs/guides/wiki"
echo "  ✓ Changes committed"
echo ""

echo "Step 4: Pushing changes to GitHub..."
git push origin master
echo "  ✓ Changes pushed"
echo ""

# Cleanup
cd ..
rm -rf "$WIKI_CLONE_DIR"

echo "================================================"
echo "✓ Wiki sync completed successfully!"
echo "================================================"
echo ""
echo "Visit https://github.com/jholt1988/pms/wiki to view your wiki"
