// Keyring OS Mock Data Factories
// Scenario-driven, relational, state-aware data for seeding + decision triggers

const today = new Date();
const days = (d: number) => new Date(today.getTime() + d * 24 * 60 * 60 * 1000);
const daysAgo = (d: number) => new Date(today.getTime() - d * 24 * 60 * 60 * 1000);

// ============== TYPES ==============
interface Property { id: string; name: string; address: string; units: Unit[]; }
interface Unit { id: string; propertyId: string; unitNumber: string; status: 'vacant' | 'listed' | 'occupied' | 'under_repair'; rent: number; lease?: Lease; }
interface Lease { id: string; unitId: string; status: 'active' | 'expiring_soon' | 'expired'; startDate: Date; endDate: Date; tenant?: Tenant; }
interface Tenant { id: string; leaseId: string; fullName: string; email: string; income: number; creditScore: number; missingContact?: boolean; }
interface Payment { id: string; leaseId: string; amount: number; dueDate: Date; status: 'paid' | 'overdue' | 'partially_paid'; paidDate?: Date; }
interface Maintenance { id: string; unitId: string; priority: 'low' | 'medium' | 'high'; status: 'open' | 'scheduled' | 'completed'; scheduledDate?: Date; description: string; }
interface Transaction { id: string; propertyId: string; unitId?: string; amount: number; category: string; date: Date; }

// ============== FACTORIES ==============
export function createProperty(name: string, address: string): Property {
  return { id: `prop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name, address, units: [] };
}

export function createUnit(propertyId: string, unitNumber: string, status: Unit['status'], rent: number): Unit {
  return { id: `unit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, propertyId, unitNumber, status, rent };
}

export function createLease(unitId: string, status: Lease['status'], startDate: Date, endDate: Date): Lease {
  return { id: `lease_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, unitId, status, startDate, endDate };
}

export function createTenant(leaseId: string, fullName: string, email: string, income: number, creditScore: number, missingContact = false): Tenant {
  return { id: `tenant_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, leaseId, fullName, email, income, creditScore, missingContact };
}

export function createPayment(leaseId: string, amount: number, dueDate: Date, status: Payment['status'], paidDate?: Date): Payment {
  return { id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, leaseId, amount, dueDate, status, paidDate };
}

export function createMaintenanceRequest(unitId: string, priority: Maintenance['priority'], status: Maintenance['status'], description: string, scheduledDate?: Date): Maintenance {
  return { id: `maint_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, unitId, priority, status, scheduledDate, description };
}

export function createTransaction(propertyId: string, amount: number, category: string, unitId?: string): Transaction {
  return { id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, propertyId, unitId, amount, category, date: daysAgo(Math.floor(Math.random() * 30)) };
}

// ============== SCENARIO: DELINQUENT TENANT ==============
export function createDelinquentTenantScenario() {
  const property = createProperty('Riverside Apartments', '123 Riverside Dr, Chicago, IL');
  const unit = createUnit(property.id, '101', 'occupied', 2200);
  const lease = createLease(unit.id, 'active', daysAgo(180), days(185)); // 6 months in, 185 days left
  const tenant = createTenant(lease.id, 'Marcus Johnson', 'marcus.j@email.com', 95000, 580, false); // High income, low credit
  
  const payments: Payment[] = [
    createPayment(lease.id, 2200, daysAgo(35), 'overdue'), // 35 days overdue - TRIGGERS payment decision
    createPayment(lease.id, 2200, daysAgo(5), 'paid', daysAgo(3)),
    createPayment(lease.id, 2200, daysAgo(65), 'paid', daysAgo(60)),
  ];

  return { property, unit, lease, tenant, payments, decisionTrigger: 'overdue_rent' };
}

// ============== SCENARIO: VACANCY CRISIS ==============
export function createVacancyCrisisScenario() {
  const property = createProperty('Oak Grove Complex', '456 Oak Lane, Chicago, IL');
  const units = [
    createUnit(property.id, '201', 'vacant', 1800), // TRIGGERS leasing decision
    createUnit(property.id, '202', 'listed', 1850),
    createUnit(property.id, '203', 'occupied', 1900),
    createUnit(property.id, '204', 'vacant', 1750), // TRIGGERS leasing decision
  ];

  return { property, units, decisionTrigger: 'vacant_unit' };
}

// ============== SCENARIO: EXPIRING LEASES ==============
export function createExpiringLeasesScenario() {
  const property = createProperty('Lakeview Heights', '789 Lakeview Ave, Chicago, IL');
  const unit1 = createUnit(property.id, '301', 'occupied', 2400);
  const unit2 = createUnit(property.id, '302', 'occupied', 2600);
  
  const lease1 = createLease(unit1.id, 'expiring_soon', daysAgo(335), days(25)); // 25 days left - TRIGGERS renewal decision
  const lease2 = createLease(unit2.id, 'active', daysAgo(300), days(70)); // 70 days left
  
  const tenant1 = createTenant(lease1.id, 'Sarah Chen', 'sarah.chen@email.com', 75000, 720, false);
  const tenant2 = createTenant(lease2.id, 'David Kim', 'david.kim@email.com', 68000, 650, false);

  return { property, units: [unit1, unit2], leases: [lease1, lease2], tenants: [tenant1, tenant2], decisionTrigger: 'expiring_lease' };
}

// ============== SCENARIO: MAINTENANCE FAILURE ==============
export function createMaintenanceFailureScenario() {
  const property = createProperty('Sunset Manor', '100 Sunset Blvd, Chicago, IL');
  const unit = createUnit(property.id, '401', 'under_repair', 2100);
  
  const maintenance: Maintenance[] = [
    createMaintenanceRequest(unit.id, 'high', 'open', 'HVAC system failure - no cooling', undefined), // High priority, no schedule - TRIGGERS repair decision
    createMaintenanceRequest(unit.id, 'medium', 'scheduled', 'Leaking faucet in bathroom', days(2)),
    createMaintenanceRequest(unit.id, 'low', 'completed', 'Smoke detector battery replaced', daysAgo(5)),
  ];

  return { property, unit, maintenance, decisionTrigger: 'maintenance_request' };
}

// ============== SCENARIO: EDGE CASES ==============
export function createEdgeCasesScenario() {
  const property = createProperty('Edge Case Properties', '999 Edge Rd, Chicago, IL');
  
  // Unit with no lease (gap)
  const vacantUnit = createUnit(property.id, '501', 'vacant', 1500);
  
  // High income, low credit
  const unit1 = createUnit(property.id, '502', 'occupied', 3200);
  const lease1 = createLease(unit1.id, 'active', daysAgo(60), days(305));
  const tenantHighIncomeLowCredit = createTenant(lease1.id, 'Alex Rivera', 'alex.r@email.com', 150000, 520, false);
  
  // Missing contact info
  const unit2 = createUnit(property.id, '503', 'occupied', 1800);
  const lease2 = createLease(unit2.id, 'active', daysAgo(90), days(275));
  const tenantMissingContact = createTenant(lease2.id, 'Jordan Taylor', '', 55000, 700, true);
  
  // Payment exactly on due date boundary
  const unit3 = createUnit(property.id, '504', 'occupied', 2000);
  const lease3 = createLease(unit3.id, 'active', daysAgo(120), days(250));
  const boundaryPayment = createPayment(lease3.id, 2000, days(0), 'paid', days(0)); // Due today, paid today

  return { 
    property, 
    units: [vacantUnit, unit1, unit2, unit3], 
    leases: [lease1, lease2, lease3],
    tenants: [tenantHighIncomeLowCredit, tenantMissingContact],
    payments: [boundaryPayment],
    decisionTrigger: 'edge_cases'
  };
}

// ============== SCENARIO: UNCATEGORIZED TRANSACTIONS ==============
export function createUncategorizedTransactionsScenario() {
  const property = createProperty('Downtown Lofts', '500 Downtown St, Chicago, IL');
  const unit = createUnit(property.id, '601', 'occupied', 3500);
  
  const transactions: Transaction[] = [
    createTransaction(property.id, 4500, 'UNCATEGORIZED', unit.id), // TRIGGERS financial decision
    createTransaction(property.id, 2200, 'RENT', unit.id),
    createTransaction(property.id, -850, 'MAINTENANCE', unit.id),
    createTransaction(property.id, 1200, 'UNCATEGORIZED', undefined), // Property-level uncategorized
  ];

  return { property, unit, transactions, decisionTrigger: 'uncategorized_transaction' };
}

// ============== MASTER SEED FUNCTION ==============
export interface SeedResult {
  properties: Property[];
  units: Unit[];
  leases: Lease[];
  tenants: Tenant[];
  payments: Payment[];
  maintenance: Maintenance[];
  transactions: Transaction[];
  decisionSummary: { type: string; count: number }[];
}

export function seedKeyringDemoData(): SeedResult {
  const properties: Property[] = [];
  const units: Unit[] = [];
  const leases: Lease[] = [];
  const tenants: Tenant[] = [];
  const payments: Payment[] = [];
  const maintenance: Maintenance[] = [];
  const transactions: Transaction[] = [];
  const decisionSummary: { type: string; count: number }[] = [];

  // Delinquent Tenant
  const delinquent = createDelinquentTenantScenario();
  properties.push(delinquent.property);
  units.push(delinquent.unit);
  leases.push(delinquent.lease);
  tenants.push(delinquent.tenant);
  payments.push(...delinquent.payments);
  decisionSummary.push({ type: 'overdue_rent', count: 1 });

  // Vacancy Crisis
  const vacancy = createVacancyCrisisScenario();
  properties.push(vacancy.property);
  units.push(...vacancy.units.filter(u => u.status === 'vacant'));
  decisionSummary.push({ type: 'vacant_unit', count: vacancy.units.filter(u => u.status === 'vacant').length });

  // Expiring Leases
  const expiring = createExpiringLeasesScenario();
  properties.push(expiring.property);
  units.push(...expiring.units);
  leases.push(...expiring.leases);
  tenants.push(...expiring.tenants);
  decisionSummary.push({ type: 'expiring_lease', count: expiring.leases.filter(l => l.status === 'expiring_soon').length });

  // Maintenance Failure
  const maintScenario = createMaintenanceFailureScenario();
  properties.push(maintScenario.property);
  units.push(maintScenario.unit);
  maintenance.push(...maintScenario.maintenance);
  decisionSummary.push({ type: 'maintenance_high_priority', count: maintScenario.maintenance.filter(m => m.priority === 'high' && m.status === 'open').length });

  // Edge Cases
  const edges = createEdgeCasesScenario();
  properties.push(edges.property);
  units.push(...edges.units);
  leases.push(...edges.leases);
  tenants.push(...edges.tenants);
  payments.push(...edges.payments);

  // Uncategorized Transactions
  const txnScenario = createUncategorizedTransactionsScenario();
  properties.push(txnScenario.property);
  units.push(txnScenario.unit);
  transactions.push(...txnScenario.transactions);
  decisionSummary.push({ type: 'uncategorized_transaction', count: txnScenario.transactions.filter(t => t.category === 'UNCATEGORIZED').length });

  // Print summary
  console.log('\n🎯 Keyring Demo Data Seeded');
  console.log('=========================');
  console.log(`Properties: ${properties.length}`);
  console.log(`Units: ${units.length}`);
  console.log(`Leases: ${leases.length}`);
  console.log(`Tenants: ${tenants.length}`);
  console.log(`Payments: ${payments.length}`);
  console.log(`Maintenance: ${maintenance.length}`);
  console.log(`Transactions: ${transactions.length}`);
  console.log('\n⚡ Decision Triggers:');
  decisionSummary.forEach(d => console.log(`  - ${d.type}: ${d.count}`));

  return { properties, units, leases, tenants, payments, maintenance, transactions, decisionSummary };
}

// Export for JSON output example
export function getExampleDataset() {
  const result = seedKeyringDemoData();
  return JSON.stringify(result, (key, value) => {
    if (value instanceof Date) return value.toISOString();
    return value;
  }, 2);
}