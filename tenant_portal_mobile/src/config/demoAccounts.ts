export type DemoAccount = {
  label: string;
  username: string;
  password: string;
  role: 'TENANT' | 'PROPERTY_MANAGER' | 'ADMIN';
};

export const DEMO_TENANT_ACCOUNTS: DemoAccount[] = [
  { label: 'Jordan Davis (Unit 4B)', username: 'john_tenant', password: 'password123', role: 'TENANT' },
  { label: 'Sarah Tenant (Unit 2A)', username: 'sarah_tenant', password: 'password123', role: 'TENANT' },
  { label: 'Mike Tenant (Unit 3C)', username: 'mike_tenant', password: 'password123', role: 'TENANT' },
];

export const DEFAULT_TENANT_ACCOUNT = DEMO_TENANT_ACCOUNTS[0];
export const DEMO_ACCOUNT_STORAGE_KEY = 'pms_demo_account';

export const DEMO_ADMIN_ACCOUNTS: DemoAccount[] = [
  { label: 'Admin PM', username: 'admin_pm', password: 'password123', role: 'PROPERTY_MANAGER' },
  { label: 'System Admin', username: 'admin', password: 'Admin123!@#', role: 'ADMIN' },
];

export const DEFAULT_ADMIN_ACCOUNT = DEMO_ADMIN_ACCOUNTS[0];
