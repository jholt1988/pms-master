"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = require("bcrypt");
var prisma = new client_1.PrismaClient();
function ensureGlobalSla(priority, resolution, response) {
    return __awaiter(this, void 0, void 0, function () {
        var existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.maintenanceSlaPolicy.findFirst({
                        where: {
                            propertyId: null,
                            priority: priority,
                        },
                    })];
                case 1:
                    existing = _a.sent();
                    if (!existing) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.maintenanceSlaPolicy.update({
                            where: { id: existing.id },
                            data: {
                                resolutionTimeMinutes: resolution,
                                responseTimeMinutes: response !== null && response !== void 0 ? response : null,
                                active: true,
                            },
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, existing];
                case 3: return [2 /*return*/, prisma.maintenanceSlaPolicy.create({
                        data: {
                            name: "".concat(priority.toLowerCase(), " default"),
                            priority: priority,
                            resolutionTimeMinutes: resolution,
                            responseTimeMinutes: response !== null && response !== void 0 ? response : null,
                        },
                    })];
            }
        });
    });
}
function ensureTechnician(name, role, contact) {
    return __awaiter(this, void 0, void 0, function () {
        var existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.technician.findFirst({ where: { name: name } })];
                case 1:
                    existing = _a.sent();
                    if (existing) {
                        return [2 /*return*/, existing];
                    }
                    return [2 /*return*/, prisma.technician.create({
                            data: {
                                name: name,
                                role: role,
                                phone: contact.phone,
                                email: contact.email,
                            },
                        })];
            }
        });
    });
}
function ensurePropertyWithUnits() {
    return __awaiter(this, void 0, void 0, function () {
        var property;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.property.findFirst({
                        where: { name: 'Central Plaza' },
                        include: { units: true },
                    })];
                case 1:
                    property = _a.sent();
                    if (!!property) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.property.create({
                            data: {
                                name: 'Central Plaza',
                                address: '500 Market Street, Springfield',
                                units: {
                                    create: [{ name: 'Suite 101' }, { name: 'Suite 102' }, { name: 'Suite 201' }],
                                },
                            },
                            include: { units: true },
                        })];
                case 2:
                    property = _a.sent();
                    return [3 /*break*/, 7];
                case 3:
                    if (!!property.address) return [3 /*break*/, 5];
                    return [4 /*yield*/, prisma.property.update({
                            where: { id: property.id },
                            data: { address: '500 Market Street, Springfield' },
                            include: { units: true },
                        })];
                case 4:
                    property = _a.sent();
                    _a.label = 5;
                case 5:
                    if (!(property.units.length === 0)) return [3 /*break*/, 7];
                    return [4 /*yield*/, prisma.property.update({
                            where: { id: property.id },
                            data: {
                                units: {
                                    create: [{ name: 'Suite 101' }, { name: 'Suite 102' }],
                                },
                            },
                            include: { units: true },
                        })];
                case 6:
                    property = _a.sent();
                    _a.label = 7;
                case 7: return [2 /*return*/, property];
            }
        });
    });
}
function ensureAsset(propertyId, unitId, name, category) {
    return __awaiter(this, void 0, void 0, function () {
        var existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.maintenanceAsset.findFirst({
                        where: {
                            name: name,
                            propertyId: propertyId,
                            unitId: unitId === null ? null : unitId !== null && unitId !== void 0 ? unitId : undefined,
                        },
                    })];
                case 1:
                    existing = _a.sent();
                    if (existing) {
                        return [2 /*return*/, existing];
                    }
                    return [2 /*return*/, prisma.maintenanceAsset.create({
                            data: {
                                property: { connect: { id: propertyId } },
                                unit: unitId ? { connect: { id: unitId } } : undefined,
                                name: name,
                                category: category,
                            },
                        })];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var adminHashedPassword, adminUser, property, units, allUnits, technicians, hashedPassword, tenant1, tenant2, tenant3, propertyManager, today, oneYearFromNow, sixMonthsAgo, maintenanceRequests, lease1, _a, _b, _c, _d, _e, _f, lease2, _g, _h, lease3, _j, _k, currentMonth, lastMonth, twoMonthsAgo;
        var _l, _m, _o, _p, _q, _r, _s, _t, _u;
        return __generator(this, function (_v) {
            switch (_v.label) {
                case 0:
                    // Check if seeding is disabled via environment variable
                    if (process.env.DISABLE_AUTO_SEED === 'true' || process.env.SKIP_SEED === 'true') {
                        console.info('⏭️  Auto-seeding is disabled. Skipping seed process.');
                        console.info('   To seed manually, run: npm run db:seed');
                        return [2 /*return*/];
                    }
                    console.info('🌱 Seeding comprehensive test data...');
                    // 0. Create initial Property Manager account
                    console.info('👤 Creating initial property manager account...');
                    return [4 /*yield*/, bcrypt.hash('Admin123!@#', 10)];
                case 1:
                    adminHashedPassword = _v.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { username: 'admin' },
                            update: {
                                password: adminHashedPassword,
                                role: client_1.Role.PROPERTY_MANAGER,
                                passwordUpdatedAt: new Date(),
                            },
                            create: {
                                username: 'admin',
                                password: adminHashedPassword,
                                role: client_1.Role.PROPERTY_MANAGER,
                                passwordUpdatedAt: new Date(),
                            },
                        })];
                case 2:
                    adminUser = _v.sent();
                    console.info("\u2705 Property Manager created: ".concat(adminUser.username, " (ID: ").concat(adminUser.id, ")"));
                    console.info("   Default password: Admin123!@# (Please change after first login)");
                    // 1. Create SLA Policies
                    console.info('📋 Creating SLA policies...');
                    return [4 /*yield*/, ensureGlobalSla(client_1.MaintenancePriority.EMERGENCY, 240, 60)];
                case 3:
                    _v.sent();
                    return [4 /*yield*/, ensureGlobalSla(client_1.MaintenancePriority.HIGH, 720, 240)];
                case 4:
                    _v.sent();
                    return [4 /*yield*/, ensureGlobalSla(client_1.MaintenancePriority.MEDIUM, 1440, 480)];
                case 5:
                    _v.sent();
                    return [4 /*yield*/, ensureGlobalSla(client_1.MaintenancePriority.LOW, 4320)];
                case 6:
                    _v.sent();
                    // 2. Create Properties and Units
                    console.info('🏢 Creating properties and units...');
                    return [4 /*yield*/, ensurePropertyWithUnits()];
                case 7:
                    property = _v.sent();
                    units = property.units;
                    if (!(units.length < 5)) return [3 /*break*/, 9];
                    return [4 /*yield*/, prisma.unit.createMany({
                            data: [
                                { name: 'Suite 202', propertyId: property.id },
                                { name: 'Suite 203', propertyId: property.id },
                                { name: 'Suite 301', propertyId: property.id },
                            ],
                            skipDuplicates: true,
                        })];
                case 8:
                    _v.sent();
                    _v.label = 9;
                case 9: return [4 /*yield*/, prisma.unit.findMany({ where: { propertyId: property.id } })];
                case 10:
                    allUnits = _v.sent();
                    // 3. Create Technicians
                    console.info('👷 Creating technicians...');
                    return [4 /*yield*/, Promise.all([
                            ensureTechnician('Alex Rivera', client_1.TechnicianRole.IN_HOUSE, {
                                phone: '+1-555-0100',
                                email: 'alex.rivera@example.com',
                            }),
                            ensureTechnician('Skyline HVAC Services', client_1.TechnicianRole.VENDOR, {
                                phone: '+1-555-0155',
                                email: 'dispatch@skyline-hvac.example',
                            }),
                            ensureTechnician('PlumbPro Solutions', client_1.TechnicianRole.VENDOR, {
                                phone: '+1-555-0200',
                                email: 'service@plumbpro.example',
                            }),
                        ])];
                case 11:
                    technicians = _v.sent();
                    // 4. Create Assets
                    console.info('🔧 Creating maintenance assets...');
                    return [4 /*yield*/, ensureAsset(property.id, (_m = (_l = allUnits[0]) === null || _l === void 0 ? void 0 : _l.id) !== null && _m !== void 0 ? _m : null, 'Main Rooftop HVAC', client_1.MaintenanceAssetCategory.HVAC)];
                case 12:
                    _v.sent();
                    return [4 /*yield*/, ensureAsset(property.id, null, 'Fire Pump Controller', client_1.MaintenanceAssetCategory.SAFETY)];
                case 13:
                    _v.sent();
                    return [4 /*yield*/, ensureAsset(property.id, (_p = (_o = allUnits[0]) === null || _o === void 0 ? void 0 : _o.id) !== null && _p !== void 0 ? _p : null, 'Water Heater Unit 101', client_1.MaintenanceAssetCategory.PLUMBING)];
                case 14:
                    _v.sent();
                    return [4 /*yield*/, ensureAsset(property.id, null, 'Building Elevator', client_1.MaintenanceAssetCategory.OTHER)];
                case 15:
                    _v.sent();
                    // 5. Create Test Users
                    console.info('👥 Creating test users...');
                    return [4 /*yield*/, bcrypt.hash('password123', 10)];
                case 16:
                    hashedPassword = _v.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { username: 'john_tenant' },
                            update: {},
                            create: {
                                username: 'john_tenant',
                                password: hashedPassword,
                                role: client_1.Role.TENANT,
                            },
                        })];
                case 17:
                    tenant1 = _v.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { username: 'sarah_tenant' },
                            update: {},
                            create: {
                                username: 'sarah_tenant',
                                password: hashedPassword,
                                role: client_1.Role.TENANT,
                            },
                        })];
                case 18:
                    tenant2 = _v.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { username: 'mike_tenant' },
                            update: {},
                            create: {
                                username: 'mike_tenant',
                                password: hashedPassword,
                                role: client_1.Role.TENANT,
                            },
                        })];
                case 19:
                    tenant3 = _v.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { username: 'admin_pm' },
                            update: {},
                            create: {
                                username: 'admin_pm',
                                password: hashedPassword,
                                role: client_1.Role.PROPERTY_MANAGER,
                            },
                        })];
                case 20:
                    propertyManager = _v.sent();
                    console.info('   Created users:');
                    console.info('   - TENANT: john_tenant / password123');
                    console.info('   - TENANT: sarah_tenant / password123');
                    console.info('   - TENANT: mike_tenant / password123');
                    console.info('   - PROPERTY_MANAGER: admin_pm / password123');
                    // 6. Create Leases
                    console.info('📄 Creating leases...');
                    if (!(allUnits.length >= 3)) return [3 /*break*/, 24];
                    today = new Date();
                    oneYearFromNow = new Date(today);
                    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
                    sixMonthsAgo = new Date(today);
                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                    // Active lease for tenant1
                    return [4 /*yield*/, prisma.lease.upsert({
                            where: { tenantId: tenant1.id },
                            update: {},
                            create: {
                                tenantId: tenant1.id,
                                unitId: allUnits[0].id,
                                startDate: sixMonthsAgo,
                                endDate: oneYearFromNow,
                                moveInAt: sixMonthsAgo,
                                rentAmount: 1800,
                                depositAmount: 1800,
                                status: client_1.LeaseStatus.ACTIVE,
                                noticePeriodDays: 30,
                                autoRenew: true,
                                autoRenewLeadDays: 60,
                            },
                        })];
                case 21:
                    // Active lease for tenant1
                    _v.sent();
                    // Active lease for tenant2
                    return [4 /*yield*/, prisma.lease.upsert({
                            where: { tenantId: tenant2.id },
                            update: {},
                            create: {
                                tenantId: tenant2.id,
                                unitId: allUnits[1].id,
                                startDate: sixMonthsAgo,
                                endDate: oneYearFromNow,
                                moveInAt: sixMonthsAgo,
                                rentAmount: 2100,
                                depositAmount: 2100,
                                status: client_1.LeaseStatus.ACTIVE,
                                noticePeriodDays: 30,
                                autoRenew: false,
                                autoRenewLeadDays: 60,
                            },
                        })];
                case 22:
                    // Active lease for tenant2
                    _v.sent();
                    // Active lease for tenant3
                    return [4 /*yield*/, prisma.lease.upsert({
                            where: { tenantId: tenant3.id },
                            update: {},
                            create: {
                                tenantId: tenant3.id,
                                unitId: allUnits[2].id,
                                startDate: sixMonthsAgo,
                                endDate: oneYearFromNow,
                                moveInAt: sixMonthsAgo,
                                rentAmount: 1950,
                                depositAmount: 1950,
                                status: client_1.LeaseStatus.ACTIVE,
                                noticePeriodDays: 30,
                                autoRenew: true,
                                autoRenewLeadDays: 60,
                            },
                        })];
                case 23:
                    // Active lease for tenant3
                    _v.sent();
                    _v.label = 24;
                case 24:
                    // 7. Create Maintenance Requests
                    console.info('🔨 Creating maintenance requests...');
                    maintenanceRequests = [];
                    return [4 /*yield*/, prisma.lease.findUnique({ where: { tenantId: tenant1.id } })];
                case 25:
                    lease1 = _v.sent();
                    _b = (_a = maintenanceRequests).push;
                    return [4 /*yield*/, prisma.maintenanceRequest.create({
                            data: {
                                authorId: tenant1.id,
                                unitId: (_q = allUnits[0]) === null || _q === void 0 ? void 0 : _q.id,
                                title: 'Leaking Faucet in Kitchen',
                                description: 'The kitchen faucet has been dripping constantly for the past two days.',
                                priority: client_1.MaintenancePriority.MEDIUM,
                                status: client_1.Status.PENDING,
                                leaseId: lease1 === null || lease1 === void 0 ? void 0 : lease1.id,
                            },
                        })];
                case 26:
                    _b.apply(_a, [_v.sent()]);
                    // In Progress request for tenant1
                    _d = (_c = maintenanceRequests).push;
                    return [4 /*yield*/, prisma.maintenanceRequest.create({
                            data: {
                                authorId: tenant1.id,
                                unitId: (_r = allUnits[0]) === null || _r === void 0 ? void 0 : _r.id,
                                title: 'HVAC Not Heating Properly',
                                description: 'The heating system is not reaching the set temperature. Currently only getting to 65°F.',
                                priority: client_1.MaintenancePriority.HIGH,
                                status: client_1.Status.IN_PROGRESS,
                                assigneeId: technicians[1].id,
                                leaseId: lease1 === null || lease1 === void 0 ? void 0 : lease1.id,
                            },
                        })];
                case 27:
                    // In Progress request for tenant1
                    _d.apply(_c, [_v.sent()]);
                    // Completed request for tenant1
                    _f = (_e = maintenanceRequests).push;
                    return [4 /*yield*/, prisma.maintenanceRequest.create({
                            data: {
                                authorId: tenant1.id,
                                unitId: (_s = allUnits[0]) === null || _s === void 0 ? void 0 : _s.id,
                                title: 'Light Bulb Replacement',
                                description: 'Light bulb in hallway needs replacement.',
                                priority: client_1.MaintenancePriority.LOW,
                                status: client_1.Status.COMPLETED,
                                assigneeId: technicians[0].id,
                                completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                                leaseId: lease1 === null || lease1 === void 0 ? void 0 : lease1.id,
                            },
                        })];
                case 28:
                    // Completed request for tenant1
                    _f.apply(_e, [_v.sent()]);
                    return [4 /*yield*/, prisma.lease.findUnique({ where: { tenantId: tenant2.id } })];
                case 29:
                    lease2 = _v.sent();
                    _h = (_g = maintenanceRequests).push;
                    return [4 /*yield*/, prisma.maintenanceRequest.create({
                            data: {
                                authorId: tenant2.id,
                                unitId: (_t = allUnits[1]) === null || _t === void 0 ? void 0 : _t.id,
                                title: 'Water Leak from Ceiling',
                                description: 'Emergency! Water is leaking from the ceiling in the bathroom.',
                                priority: client_1.MaintenancePriority.EMERGENCY,
                                status: client_1.Status.IN_PROGRESS,
                                assigneeId: technicians[2].id,
                                leaseId: lease2 === null || lease2 === void 0 ? void 0 : lease2.id,
                            },
                        })];
                case 30:
                    _h.apply(_g, [_v.sent()]);
                    return [4 /*yield*/, prisma.lease.findUnique({ where: { tenantId: tenant3.id } })];
                case 31:
                    lease3 = _v.sent();
                    _k = (_j = maintenanceRequests).push;
                    return [4 /*yield*/, prisma.maintenanceRequest.create({
                            data: {
                                authorId: tenant3.id,
                                unitId: (_u = allUnits[2]) === null || _u === void 0 ? void 0 : _u.id,
                                title: 'Broken Window Lock',
                                description: 'The lock on the bedroom window is broken and won\'t close properly.',
                                priority: client_1.MaintenancePriority.MEDIUM,
                                status: client_1.Status.PENDING,
                                leaseId: lease3 === null || lease3 === void 0 ? void 0 : lease3.id,
                            },
                        })];
                case 32:
                    _k.apply(_j, [_v.sent()]);
                    // 8. Create Payments
                    console.info('💰 Creating payment records...');
                    currentMonth = new Date();
                    lastMonth = new Date(currentMonth);
                    lastMonth.setMonth(lastMonth.getMonth() - 1);
                    twoMonthsAgo = new Date(currentMonth);
                    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
                    // Tenant 1 payments (no paymentMethod for now - can be added later)
                    return [4 /*yield*/, prisma.payment.create({
                            data: {
                                userId: tenant1.id,
                                amount: 1800,
                                paymentDate: twoMonthsAgo,
                                status: 'COMPLETED',
                            },
                        })];
                case 33:
                    // Tenant 1 payments (no paymentMethod for now - can be added later)
                    _v.sent();
                    return [4 /*yield*/, prisma.payment.create({
                            data: {
                                userId: tenant1.id,
                                amount: 1800,
                                paymentDate: lastMonth,
                                status: 'COMPLETED',
                            },
                        })];
                case 34:
                    _v.sent();
                    return [4 /*yield*/, prisma.payment.create({
                            data: {
                                userId: tenant1.id,
                                amount: 1800,
                                paymentDate: currentMonth,
                                status: 'PENDING',
                            },
                        })];
                case 35:
                    _v.sent();
                    // Tenant 2 payments
                    return [4 /*yield*/, prisma.payment.create({
                            data: {
                                userId: tenant2.id,
                                amount: 2100,
                                paymentDate: twoMonthsAgo,
                                status: 'COMPLETED',
                            },
                        })];
                case 36:
                    // Tenant 2 payments
                    _v.sent();
                    return [4 /*yield*/, prisma.payment.create({
                            data: {
                                userId: tenant2.id,
                                amount: 2100,
                                paymentDate: lastMonth,
                                status: 'COMPLETED',
                            },
                        })];
                case 37:
                    _v.sent();
                    return [4 /*yield*/, prisma.payment.create({
                            data: {
                                userId: tenant2.id,
                                amount: 2100,
                                paymentDate: currentMonth,
                                status: 'PENDING',
                            },
                        })];
                case 38:
                    _v.sent();
                    // 9. Create Rental Applications
                    console.info('📝 Creating rental applications...');
                    if (!(allUnits.length >= 5)) return [3 /*break*/, 42];
                    return [4 /*yield*/, prisma.rentalApplication.create({
                            data: {
                                fullName: 'Emily Johnson',
                                email: 'emily.johnson@example.com',
                                phoneNumber: '+1-555-0300',
                                previousAddress: '123 Oak Street, Springfield',
                                income: 5000,
                                employmentStatus: 'Employed Full-Time',
                                propertyId: property.id,
                                unitId: allUnits[3].id,
                                status: client_1.ApplicationStatus.PENDING,
                            },
                        })];
                case 39:
                    _v.sent();
                    return [4 /*yield*/, prisma.rentalApplication.create({
                            data: {
                                fullName: 'David Chen',
                                email: 'david.chen@example.com',
                                phoneNumber: '+1-555-0600',
                                previousAddress: '789 Pine Road, Springfield',
                                income: 6500,
                                employmentStatus: 'Employed Full-Time',
                                propertyId: property.id,
                                unitId: allUnits[4].id,
                                status: client_1.ApplicationStatus.PENDING,
                            },
                        })];
                case 40:
                    _v.sent();
                    return [4 /*yield*/, prisma.rentalApplication.create({
                            data: {
                                fullName: 'Lisa Martinez',
                                email: 'lisa.martinez@example.com',
                                phoneNumber: '+1-555-0900',
                                previousAddress: '555 Cedar Lane, Springfield',
                                income: 4500,
                                employmentStatus: 'Employed Part-Time',
                                propertyId: property.id,
                                unitId: allUnits[0].id,
                                status: client_1.ApplicationStatus.PENDING,
                                screenedById: propertyManager.id,
                            },
                        })];
                case 41:
                    _v.sent();
                    _v.label = 42;
                case 42:
                    // 10. Create Expenses (for Property Manager)
                    console.info('📊 Creating expense records...');
                    return [4 /*yield*/, prisma.expense.create({
                            data: {
                                description: 'HVAC System Maintenance',
                                amount: 850,
                                date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                                category: client_1.ExpenseCategory.MAINTENANCE,
                                propertyId: property.id,
                                recordedById: propertyManager.id,
                            },
                        })];
                case 43:
                    _v.sent();
                    return [4 /*yield*/, prisma.expense.create({
                            data: {
                                description: 'Landscaping Services',
                                amount: 300,
                                date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                                category: client_1.ExpenseCategory.OTHER,
                                propertyId: property.id,
                                recordedById: propertyManager.id,
                            },
                        })];
                case 44:
                    _v.sent();
                    return [4 /*yield*/, prisma.expense.create({
                            data: {
                                description: 'Property Insurance',
                                amount: 1200,
                                date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                                category: client_1.ExpenseCategory.INSURANCE,
                                propertyId: property.id,
                                recordedById: propertyManager.id,
                            },
                        })];
                case 45:
                    _v.sent();
                    console.info('\n✅ Comprehensive seed data created!');
                    console.info('\n📊 Summary:');
                    console.info("   - Users: 4 (3 tenants, 1 property manager)");
                    console.info("   - Properties: 1 with ".concat(allUnits.length, " units"));
                    console.info("   - Active Leases: 3");
                    console.info("   - Maintenance Requests: ".concat(maintenanceRequests.length));
                    console.info("   - Payments: 6 (3 completed, 3 pending)");
                    console.info("   - Rental Applications: 3");
                    console.info("   - Expenses: 3");
                    console.info("   - Technicians: ".concat(technicians.length));
                    console.info('\n🔑 Login Credentials:');
                    console.info('   TENANT LOGIN:');
                    console.info('     username: john_tenant   | password: password123');
                    console.info('     username: sarah_tenant  | password: password123');
                    console.info('     username: mike_tenant   | password: password123');
                    console.info('   PROPERTY MANAGER LOGIN:');
                    console.info('     username: admin_pm      | password: password123');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (error) {
    console.error('Seeding failed', error);
    process.exitCode = 1;
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
