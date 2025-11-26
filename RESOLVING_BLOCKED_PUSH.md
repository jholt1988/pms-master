# Resolving a Blocked Push

This guide helps you resolve common issues that prevent pushing to GitHub.

## Current Status

- **Branch**: `main`
- **Commits ahead**: 5 commits
- **Remote**: `https://github.com/jholt1988/pms-master.git`

## Common Causes & Solutions

### 1. Branch Protection Rules

If your repository has branch protection enabled, you may need to:
- Create a Pull Request instead of pushing directly
- Get approval from required reviewers
- Ensure CI checks pass

**Solution**: Create a feature branch and open a PR:
```bash
# Create a new branch
git checkout -b fix/gitignore-updates

# Push the new branch
git push origin fix/gitignore-updates

# Then create a PR on GitHub
```

### 2. Authentication Issues

If you're getting authentication errors:

**Solution A - Use Personal Access Token:**
```bash
# Update remote URL to use token
git remote set-url origin https://YOUR_TOKEN@github.com/jholt1988/pms-master.git
```

**Solution B - Use SSH:**
```bash
# Change remote to SSH
git remote set-url origin git@github.com:jholt1988/pms-master.git
```

**Solution C - Use GitHub CLI:**
```bash
# Authenticate with GitHub CLI
gh auth login
```

### 3. History Rewrite (Force Push Required)

If you've rewritten history (e.g., removed .env file), you need to force push:

**⚠️ WARNING**: Only use force push if you're sure no one else has pushed to the branch!

```bash
# Safe force push (recommended)
git push --force-with-lease origin main

# If --force-with-lease fails, check what's different
git fetch origin
git log origin/main..HEAD
```

### 4. Large Files

GitHub blocks files larger than 100MB. Check for large files:

```bash
# Find large files in your commits
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | findstr /i "blob" | sort /r /+3

# If you find large files, use Git LFS
git lfs track "*.largefile"
git add .gitattributes
git commit -m "Add Git LFS tracking"
```

### 5. Pre-push Hooks

Check if there are any pre-push hooks blocking the push:

```bash
# Check for active hooks
ls .git/hooks/pre-push*

# If a hook exists and is blocking, you can temporarily bypass it
git push --no-verify origin main
```

## Step-by-Step Resolution

### Step 1: Check the Actual Error

Try pushing with verbose output:
```bash
git push -v origin main 2>&1
```

### Step 2: Verify Authentication

```bash
# Test GitHub connection
git ls-remote origin

# If this fails, you have an authentication issue
```

### Step 3: Check Branch Protection

1. Go to: `https://github.com/jholt1988/pms-master/settings/branches`
2. Check if `main` branch has protection rules
3. If yes, create a PR instead of pushing directly

### Step 4: Try Safe Force Push (if history was rewritten)

```bash
# Fetch latest changes
git fetch origin

# Check what's different
git log origin/main..HEAD

# Safe force push
git push --force-with-lease origin main
```

### Step 5: Create Pull Request (Recommended)

If direct push is blocked, use a PR:

```bash
# Create feature branch
git checkout -b fix/gitignore-and-chatbot-ai

# Push feature branch
git push origin fix/gitignore-and-chatbot-ai

# Then create PR on GitHub web interface
```

## Quick Fix Commands

### If you just need to push your changes:

```bash
# Standard push
git push origin main

# If that fails, try with verbose output
git push -v origin main

# If history was rewritten
git push --force-with-lease origin main

# If you need to create a PR instead
git checkout -b feature/your-changes
git push origin feature/your-changes
```

### If authentication is the issue:

```bash
# Use GitHub CLI (recommended)
gh auth login
git push origin main

# Or use Personal Access Token
# 1. Create token at: https://github.com/settings/tokens
# 2. Use it when prompted, or update remote URL
```

## What to Do Right Now

Based on your current situation (5 commits ahead), try these in order:

1. **First, try standard push:**
   ```bash
   git push origin main
   ```

2. **If that fails, check the error message** and refer to the solutions above

3. **If branch protection is enabled**, create a feature branch:
   ```bash
   git checkout -b fix/gitignore-updates
   git push origin fix/gitignore-updates
   ```

4. **If you've rewritten history**, use safe force push:
   ```bash
   git push --force-with-lease origin main
   ```

## Need More Help?

If none of these solutions work, share the exact error message you're seeing when you run:
```bash
git push -v origin main
```

