# PowerShell script to remove .env file from git history
# This will rewrite commit history to remove tenant_portal_backend/.env

Write-Host "Removing tenant_portal_backend/.env from git history..."

# Use git filter-branch to remove the file
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch tenant_portal_backend/.env" --prune-empty --tag-name-filter cat -- --all

Write-Host "Done! The .env file has been removed from history."
Write-Host "You can now force push with: git push --force-with-lease"

