# Property Manager Account Setup

## Initial Property Manager Creation

The seed script has been updated to automatically create an initial property manager account.

### Running the Seed Script

From the `tenant_portal_backend` directory, run:

```bash
npm run db:seed
```

### Default Credentials

After running the seed script, you can login with:

- **Username:** `admin`
- **Password:** `Admin123!@#`

**⚠️ IMPORTANT:** Change this password immediately after first login!

### What Gets Created

The seed script will:
1. ✅ Create a property manager account with username `admin`
2. ✅ Set up test data (properties, units, SLA policies, etc.)
3. ✅ Use `upsert` to avoid duplicate accounts if run multiple times

### How to Change Password After First Login

1. Login to the application with the default credentials
2. Navigate to your profile/settings
3. Update your password to something secure
4. Follow password policy requirements:
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character

### Creating Additional Property Managers

Once logged in as a property manager, you can create additional property manager accounts via:

**API Endpoint:**
```bash
POST /api/users
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "username": "new_manager",
  "password": "SecurePassword123!",
  "role": "PROPERTY_MANAGER"
}
```

**Or build a UI for user management in your admin panel.**

### Security Notes

- ✅ Public signup (`/api/auth/register`) only creates TENANT accounts
- ✅ Property manager accounts can only be created by existing property managers
- ✅ All property manager creations are logged and auditable
- ⚠️ Never commit credentials to version control
- ⚠️ Use environment variables for production passwords

### Troubleshooting

**If the seed script fails:**
1. Ensure PostgreSQL is running
2. Check your `.env` file has correct `DATABASE_URL`
3. Run `npx prisma migrate dev` to ensure database is up to date
4. Try running the seed script again

**If you forget the admin password:**
1. Run the seed script again - it will update the existing admin user
2. Or reset directly in the database using SQL
3. Or create a new admin with a different username

### Production Deployment

For production environments:

1. **Do not use the default password!**
2. Either:
   - Modify the seed script before deployment with a secure password
   - Or run the seed, login immediately, and change the password
   - Or create the admin account directly via database with a secure hash

3. Consider using environment variables:
   ```typescript
   const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';
   const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
   ```

4. Disable or modify the seed script after initial deployment to prevent accidental overwrites
