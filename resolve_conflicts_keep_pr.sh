#!/usr/bin/env bash
# resolve_conflicts_keep_pr.sh
# Merge base branch into a PR branch and resolve ALL merge conflicts
# by keeping the PR/head versions (i.e., "ours" during the merge).
#
# Usage:
#   ./resolve_conflicts_keep_pr.sh [--yes] [--no-push] [--remote <remote>] [--pr-branch <branch>] [--base <base-branch>]
#
# Examples:
#   ./resolve_conflicts_keep_pr.sh         # interactive, pushes by default
#   ./resolve_conflicts_keep_pr.sh --yes   # non-interactive, auto-confirm and push
#   ./resolve_conflicts_keep_pr.sh --no-push  # do everything locally, do not push
#
set -euo pipefail

# Defaults
REMOTE="origin"
PR_BRANCH="fix/full-audit-fixes"
BASE_BRANCH="main"
AUTO_PUSH=true
AUTO_YES=false

# Parse args
while (( "$#" )); do
  case "$1" in
    --remote) REMOTE="$2"; shift 2;;
    --pr-branch) PR_BRANCH="$2"; shift 2;;
    --base) BASE_BRANCH="$2"; shift 2;;
    --no-push) AUTO_PUSH=false; shift;;
    --yes) AUTO_YES=true; shift;;
    -h|--help)
      sed -n '1,160p' "$0"
      exit 0;;
    *)
      echo "Unknown argument: $1"
      echo "Use --help for usage"
      exit 1;;
  esac
done

# Safety checks
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: This script must be run inside a git repository."
  exit 2
fi

echo "Repository detected. Remote: $REMOTE, PR branch: $PR_BRANCH, Base branch: $BASE_BRANCH"
echo

# Fetch latest refs
echo "Fetching from $REMOTE..."
git fetch "$REMOTE" --prune

# Create a backup branch from the remote PR head as a safe checkpoint
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
SAFE_BACKUP_BRANCH="backup/${PR_BRANCH//\//-}-$TIMESTAMP"
echo "Creating backup branch '$SAFE_BACKUP_BRANCH' from $REMOTE/$PR_BRANCH ..."
git checkout -B "$SAFE_BACKUP_BRANCH" "$REMOTE/$PR_BRANCH"
echo "Backup branch created: $SAFE_BACKUP_BRANCH"
echo

# Switch to PR branch and reset to remote head to ensure exact match
echo "Checking out PR branch '$PR_BRANCH' and resetting to $REMOTE/$PR_BRANCH ..."
if git show-ref --verify --quiet "refs/heads/$PR_BRANCH"; then
  git checkout "$PR_BRANCH"
else
  git checkout -b "$PR_BRANCH" "$REMOTE/$PR_BRANCH"
fi
git reset --hard "$REMOTE/$PR_BRANCH"
echo "Now at $(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD)"
echo

# Merge base into PR branch (may produce conflicts)
echo "Merging $REMOTE/$BASE_BRANCH into $PR_BRANCH ..."
set +e
git merge --no-ff "$REMOTE/$BASE_BRANCH" -m "Merge $REMOTE/$BASE_BRANCH into $PR_BRANCH (prepare conflict resolution)"
MERGE_STATUS=$?
set -e

if [ $MERGE_STATUS -eq 0 ]; then
  echo "Merge completed without conflicts."
  if [ "$AUTO_PUSH" = true ]; then
    echo "Pushing merge commit to $REMOTE/$PR_BRANCH..."
    git push "$REMOTE" "$PR_BRANCH"
    echo "Pushed. You can view the PR at: https://github.com/$(git remote get-url "$REMOTE" | sed -n 's#.*github.com[:/]\(.*\)\.git#\1#p')/pull/101"
  else
    echo "AUTO_PUSH is disabled. Inspect the local branch and push when ready."
  fi
  exit 0
fi

echo "Merge resulted in conflicts. Preparing to resolve by keeping PR (head) versions for all conflicted files."
echo

# Collect conflicted files (null-delimited for safety)
CONFLICTS_Z=$(git diff --name-only --diff-filter=U -z)

if [ -z "$CONFLICTS_Z" ]; then
  echo "No conflicted files found (unexpected). Exiting."
  exit 3
fi

echo "Conflicted files:"
printf '%s' "$CONFLICTS_Z" | tr '\0' '\n'
echo

# Confirm unless auto-yes
if [ "$AUTO_YES" = false ]; then
  echo "This script will resolve ALL the above conflicts by keeping the PR (HEAD) version for each file."
  read -p "Proceed and stage these resolutions? (type 'yes' to continue) " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Aborting. You can inspect the repo; backup branch created: $SAFE_BACKUP_BRANCH"
    exit 4
  fi
else
  echo "--yes provided: continuing without prompt."
fi

# Use xargs -0 to handle paths safely. Fall back if xargs -0 not present.
# Checkout PR/head versions for each conflicted file (ours)
printf '%s' "$CONFLICTS_Z" | xargs -0 git checkout --ours -- || {
  echo "Warning: git checkout --ours failed with xargs -0 fallback; trying a safer loop..."
  printf '%s' "$CONFLICTS_Z" | tr '\0' '\n' | while IFS= read -r f; do
    git checkout --ours -- "$f"
  done
}

# Stage files
printf '%s' "$CONFLICTS_Z" | xargs -0 git add -- || {
  printf '%s' "$CONFLICTS_Z" | tr '\0' '\n' | while IFS= read -r f; do
    git add -- "$f"
  done
}

echo
echo "Staged changes (summary):"
git --no-pager diff --staged --name-status
echo

# Prompt to review staged changes before committing (unless auto-yes)
if [ "$AUTO_YES" = false ]; then
  echo "Inspect the staged changes with 'git diff --staged'."
  read -p "Commit the staged resolutions now? (type 'yes' to commit) " CONF2
  if [ "$CONF2" != "yes" ]; then
    echo "Aborting before commit. You can inspect, modify, or commit manually. Backup branch: $SAFE_BACKUP_BRANCH"
    exit 5
  fi
fi

# Commit the resolution
git commit -m "Resolve merge conflicts: keep PR (head) versions for conflicted files"

echo "Committed conflict resolution. Commit:"
git --no-pager log -1 --stat

# Push back to remote if requested
if [ "$AUTO_PUSH" = true ]; then
  echo "Pushing updated PR branch to $REMOTE/$PR_BRANCH ..."
  git push "$REMOTE" "$PR_BRANCH"
  echo "Push complete. PR conflicts should be resolved. Open the PR to verify: https://github.com/$(git remote get-url "$REMOTE" | sed -n 's#.*github.com[:/]\(.*\)\.git#\1#p')/pull/101"
else
  echo "AUTO_PUSH disabled. Review the local branch and push when ready:"
  echo "  git push $REMOTE $PR_BRANCH"
fi

echo
echo "Done. Backup branch retained at: $SAFE_BACKUP_BRANCH"