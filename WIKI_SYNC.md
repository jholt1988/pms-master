# Wiki Documentation Sync

This repository uses GitHub Actions to automatically sync wiki documentation from the `tenant_portal_app/docs/wiki` directory to the GitHub Wiki.

## How It Works

The workflow (`.github/workflows/sync-wiki.yml`) automatically:

1. Triggers when changes are pushed to the `main` branch that affect files in `tenant_portal_app/docs/wiki/`
2. Clones the GitHub Wiki repository
3. Copies all markdown files from `tenant_portal_app/docs/wiki/` to the wiki
4. Commits and pushes the changes to the wiki

## Manual Sync

### Via GitHub Actions

You can manually trigger the wiki sync via GitHub Actions by:

1. Going to the Actions tab in GitHub
2. Selecting the "Sync Wiki" workflow
3. Clicking "Run workflow"

### Via Local Script

You can also run the sync manually from your local machine using the provided script:

```bash
./scripts/sync-wiki.sh
```

This script will:
- Clone the wiki repository
- Copy all markdown files from `tenant_portal_app/docs/wiki/`
- Commit and push changes to the wiki

**Note:** You need to have push access to the repository for the manual script to work.

## Adding or Updating Wiki Pages

To add or update wiki pages:

1. Edit the markdown files in `tenant_portal_app/docs/wiki/`
2. Commit and push your changes to the `main` branch
3. The workflow will automatically sync the changes to the wiki

## Wiki Files

The following wiki pages are maintained in this repository:

- **Home.md** - Main wiki landing page
- **Authentication.md** - Authentication and user roles
- **Maintenance.md** - Maintenance request feature
- **Payments.md** - Payment functionality
- **Messaging.md** - Messaging system
- **Lease-Management.md** - Lease management features
- **Rental-Application.md** - Rental application process
- **Tenant-Screening.md** - Tenant screening functionality
- **Expense-Tracker.md** - Expense tracking features
- **Rent-Estimator.md** - Rent estimation tool

## Prerequisites

For the automatic sync to work, ensure that:

1. The GitHub Wiki is enabled for the repository
2. The GitHub Actions workflow has permission to push to the wiki repository

## Troubleshooting

If the wiki sync fails:

1. Check that the GitHub Wiki is enabled in repository settings
2. Verify that the workflow has the necessary permissions
3. Check the Actions tab for detailed error logs
