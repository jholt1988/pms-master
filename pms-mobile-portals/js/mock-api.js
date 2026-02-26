// Mock API Interceptor for Development
const MOCK_DELAY = 600;

// Helper to mimic API responses
function mockResponse(data, status = 200) {
    return Promise.resolve({
        ok: true,
        status,
        json: async () => data
    });
}

function mockError(status, message) {
    return Promise.resolve({
        ok: false,
        status,
        json: async () => ({ message })
    });
}

const MOCK_DB = {
    user: {
        id: 'user_123',
        firstName: 'Jordan',
        lastName: 'Davis',
        email: 'jordan.davis@email.com',
        unitNumber: '4B',
        propertyName: 'Riverside Apartments',
        leaseEnd: '2026-08-31'
    },
    inspections: [
        {
            id: 101,
            type: 'Annual',
            status: 'scheduled',
            scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
            durationMinutes: 30,
            items: [ // Changed from 'checklist' to match typical API structure or map it
                { id: 1, text: 'Smoke detectors functional', status: null },
                { id: 2, text: 'HVAC filter clean', status: null },
                { id: 3, text: 'No water leaks under sinks', status: null },
                { id: 4, text: 'Window locks functional', status: null },
                { id: 5, text: 'Carpet condition', status: null }
            ]
        },
        {
            id: 99,
            type: 'Move-in',
            status: 'completed',
            scheduledDate: '2026-02-01T10:00:00Z',
            durationMinutes: 45,
            items: []
        }
    ],
    maintenance: [
        {
            id: 'm_1',
            title: 'Kitchen Faucet Leak',
            status: 'in_progress',
            createdAt: '2026-02-15T09:30:00Z',
            description: 'Water dripping under sink.'
        }
    ]
};

// Override window.fetch
const originalFetch = window.fetch;

window.fetch = async (url, options) => {
    // Only mock calls to our API base URL (which contains /api)
    if (!url.includes('/api/')) {
        return originalFetch(url, options);
    }

    console.log(`[MockAPI] ${options?.method || 'GET'} ${url}`);
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, MOCK_DELAY));

    // Router Logic - simple string matching for now
    
    // Auth
    if (url.includes('/auth/login')) {
        return mockResponse({ token: 'mock_jwt_token_123' });
    }

    // Tenant Profile
    if (url.includes('/tenants/me')) {
        return mockResponse(MOCK_DB.user);
    }

    // Single Inspection (needs to be checked before list because of partial match)
    const inspectionIdMatch = url.match(/\/inspections\/(\d+)$/);
    if (inspectionIdMatch) {
        const id = parseInt(inspectionIdMatch[1]);
        const inspection = MOCK_DB.inspections.find(i => i.id === id);
        return inspection ? mockResponse(inspection) : mockError(404, 'Not Found');
    }

    // Inspection List
    if (url.includes('/inspections')) {
        return mockResponse({ 
            data: MOCK_DB.inspections,
            meta: { total: MOCK_DB.inspections.length }
        });
    }

    // --- Maintenance ---
    if (url.includes('/maintenance') && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        const newRequest = {
            id: `m_${Date.now()}`,
            title: body.title || 'New Request',
            status: 'pending',
            createdAt: new Date().toISOString(),
            description: body.description,
            priority: body.priority || 'medium'
        };
        MOCK_DB.maintenance.unshift(newRequest);
        return mockResponse(newRequest, 201);
    }

    if (url.includes('/maintenance')) {
        return mockResponse({ data: MOCK_DB.maintenance });
    }

    // --- Payments ---
    if (url.includes('/payments/upcoming')) {
        return mockResponse({
            amount: 1250.00,
            dueDate: '2026-03-01',
            status: 'unpaid'
        });
    }

    if (url.includes('/payments') && options?.method === 'POST') {
        return mockResponse({ success: true, transactionId: 'tx_999' });
    }

    // --- Messages ---
    if (url.includes('/conversations')) {
        return mockResponse({
            data: [
                {
                    id: 'c_1',
                    lastMessage: 'Re: March rent reminder',
                    sender: 'Property Manager',
                    timestamp: new Date(Date.now() - 7200000).toISOString(), // 2h ago
                    unread: true
                }
            ]
        });
    }

    // --- Admin Endpoints ---
    
    // Properties
    if (url.includes('/properties/current')) {
        return mockResponse({
            id: 'prop_1',
            name: 'Riverside Apartments',
            unitsCount: 24,
            occupancyRate: 0.92,
            location: 'Wichita, KS'
        });
    }

    if (url.includes('/properties/stats')) {
        return mockResponse({
            occupancy: { value: 92, trend: 2 },
            rentCollected: { value: 28500, total: 31000 },
            lateRentCount: 3,
            openMaintenanceCount: 7,
            vacantUnitsCount: 2
        });
    }

    // Units
    if (url.includes('/units')) {
        return mockResponse({
            data: [
                { id: 'u1', number: '1A', tenant: 'Sarah Mitchell', status: 'occupied', rent: 1150, leaseEnd: '2026-08-31', issues: [] },
                { id: 'u2', number: '2C', tenant: 'David Park', status: 'occupied', rent: 950, leaseEnd: '2026-06-30', issues: [{ type: 'urgent', text: 'Water heater failed' }] },
                { id: 'u3', number: '3B', tenant: 'Emily Rodriguez', status: 'late_rent', rent: 1250, leaseEnd: '2026-09-30', lateDays: 5, issues: [] },
                { id: 'u4', number: '4A', tenant: null, status: 'vacant', marketRent: 850, issues: [] },
                { id: 'u5', number: '4B', tenant: 'Jordan Davis', status: 'occupied', rent: 1250, leaseEnd: '2026-08-31', issues: [] }
            ]
        });
    }

    // Priority Tasks
    if (url.includes('/tasks/priority')) {
        return mockResponse({
            data: [
                { id: 't1', type: 'maintenance_approval', title: 'Urgent: Water Heater Failed', subtitle: 'Unit 2C • Sarah Johnson', badge: 'Urgent', badgeColor: 'red', meta: 'Estimated cost: $850-1,200', actions: ['Approve', 'Details'] },
                { id: 't2', type: 'lease_renewal', title: 'Lease Renewal Due', subtitle: 'Unit 7A • Mike Chen', badge: '30 days', badgeColor: 'amber', meta: 'Current: $950/mo • Market: $1,050/mo', actions: ['Send Offer', 'AI Pricing'] },
                { id: 't3', type: 'inspection_due', title: 'Inspection Due', subtitle: 'Unit 4B • Jordan Davis', badge: 'Scheduled', badgeColor: 'purple', meta: 'Mar 15, 10:00 AM', actions: ['Reschedule', 'Checklist'] }
            ]
        });
    }
    
    // Fallback for unhandled API routes
    console.warn(`[MockAPI] Unhandled route: ${url}`);
    return mockError(404, 'Endpoint not found in mock');
};

console.log('✅ Mock API Loaded. All /api requests will be intercepted.');
