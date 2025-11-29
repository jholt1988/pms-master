# Scripts

This directory contains utility scripts for the Property Management Suite project.

## Available Scripts

### sync-wiki.sh

Manually synchronizes wiki files from `docs/guides/wiki` to the GitHub Wiki repository.

**Usage:**
```bash
./scripts/sync-wiki.sh
```

**Requirements:**
- Git must be installed
- You must have push access to the repository
- The GitHub Wiki must be enabled for the repository

**What it does:**
1. Clones the GitHub Wiki repository to a temporary directory
2. Copies all markdown files from `docs/guides/wiki/`
3. Commits changes with a descriptive message
4. Pushes the changes to the wiki
5. Cleans up the temporary directory

**When to use:**
- Testing wiki changes locally before pushing to main
- Manual wiki updates when the automated workflow is not available
- Debugging wiki sync issues

### test-wiki-sync.sh

Tests and validates the wiki sync functionality without actually pushing to GitHub.

**Usage:**
```bash
./scripts/test-wiki-sync.sh
```

**Requirements:**
- Python3 (optional, for YAML validation)

**What it does:**
1. Validates that the wiki source directory exists
2. Checks for markdown files in the wiki directory
3. Simulates the file copy operation
4. Validates the GitHub Actions workflow syntax
5. Verifies all required files are in place
6. Checks .gitignore entries

**When to use:**
- Before committing changes to the wiki setup
- Validating the wiki sync configuration
- Troubleshooting wiki sync issues
