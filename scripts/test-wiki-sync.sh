#!/bin/bash

# Test script to validate wiki sync functionality
# This script simulates what the GitHub Actions workflow does

set -e  # Exit on error

echo "================================================"
echo "Wiki Sync Test Script"
echo "================================================"
echo ""

WIKI_SOURCE_DIR="docs/guides/wiki"
TEST_WIKI_DIR="/tmp/test-wiki-sync"

# Cleanup function
cleanup() {
    if [ -d "$TEST_WIKI_DIR" ]; then
        echo "Cleaning up test directory..."
        rm -rf "$TEST_WIKI_DIR"
    fi
}

# Register cleanup on exit
trap cleanup EXIT

echo "Test 1: Checking wiki source directory..."
if [ ! -d "$WIKI_SOURCE_DIR" ]; then
    echo "❌ FAIL: Wiki source directory '$WIKI_SOURCE_DIR' not found!"
    exit 1
fi
echo "✓ PASS: Wiki source directory exists"
echo ""

echo "Test 2: Checking for markdown files..."
MD_FILES=$(find "$WIKI_SOURCE_DIR" -name "*.md" -type f | wc -l)
if [ "$MD_FILES" -eq 0 ]; then
    echo "❌ FAIL: No markdown files found in '$WIKI_SOURCE_DIR'!"
    exit 1
fi
echo "✓ PASS: Found $MD_FILES markdown files"
echo ""

echo "Test 3: Listing wiki files..."
find "$WIKI_SOURCE_DIR" -name "*.md" -type f -exec basename {} \; | sort
echo ""

echo "Test 4: Validating file content..."
for file in "$WIKI_SOURCE_DIR"/*.md; do
    if [ ! -s "$file" ]; then
        echo "❌ FAIL: File $(basename "$file") is empty!"
        exit 1
    fi
done
echo "✓ PASS: All markdown files have content"
echo ""

echo "Test 5: Simulating workflow copy operation..."
mkdir -p "$TEST_WIKI_DIR"
cp -v "$WIKI_SOURCE_DIR"/*.md "$TEST_WIKI_DIR/"
COPIED_FILES=$(find "$TEST_WIKI_DIR" -name "*.md" -type f | wc -l)
if [ "$COPIED_FILES" -ne "$MD_FILES" ]; then
    echo "❌ FAIL: File count mismatch! Expected $MD_FILES, got $COPIED_FILES"
    exit 1
fi
echo "✓ PASS: Files copied successfully"
echo ""

echo "Test 6: Checking GitHub Actions workflow file..."
WORKFLOW_FILE=".github/workflows/sync-wiki.yml"
if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "❌ FAIL: Workflow file not found!"
    exit 1
fi
echo "✓ PASS: Workflow file exists"
echo ""

echo "Test 7: Validating workflow YAML syntax..."
if command -v python3 &> /dev/null; then
    if python3 -c "import yaml; yaml.safe_load(open('$WORKFLOW_FILE'))" 2>&1; then
        echo "✓ PASS: Workflow YAML syntax is valid"
    else
        echo "❌ FAIL: Workflow YAML syntax is invalid!"
        exit 1
    fi
else
    echo "⚠ SKIP: Python3 not available, skipping YAML validation"
fi
echo ""

echo "Test 8: Checking manual sync script..."
SYNC_SCRIPT="scripts/sync-wiki.sh"
if [ ! -f "$SYNC_SCRIPT" ]; then
    echo "❌ FAIL: Manual sync script not found!"
    exit 1
fi
if [ ! -x "$SYNC_SCRIPT" ]; then
    echo "❌ FAIL: Manual sync script is not executable!"
    exit 1
fi
echo "✓ PASS: Manual sync script exists and is executable"
echo ""

echo "Test 9: Checking documentation..."
WIKI_SYNC_DOC="WIKI_SYNC.md"
if [ ! -f "$WIKI_SYNC_DOC" ]; then
    echo "❌ FAIL: Wiki sync documentation not found!"
    exit 1
fi
echo "✓ PASS: Documentation exists"
echo ""

echo "Test 10: Verifying .gitignore entries..."
if grep -q "wiki-repo-temp" .gitignore && grep -q "wiki-repo/" .gitignore; then
    echo "✓ PASS: .gitignore contains wiki temp directory entries"
else
    echo "❌ FAIL: .gitignore missing wiki temp directory entries!"
    exit 1
fi
echo ""

echo "================================================"
echo "✓ All tests passed!"
echo "================================================"
echo ""
echo "Summary:"
echo "  - Wiki source directory: $WIKI_SOURCE_DIR"
echo "  - Number of wiki files: $MD_FILES"
echo "  - Workflow file: $WORKFLOW_FILE"
echo "  - Manual sync script: $SYNC_SCRIPT"
echo "  - Documentation: $WIKI_SYNC_DOC"
echo ""
echo "Next steps:"
echo "  1. Merge this PR to main branch"
echo "  2. Enable GitHub Wiki for the repository (if not already enabled)"
echo "  3. The workflow will automatically sync wiki files on the next push"
echo "  4. Or manually trigger the workflow from the Actions tab"
