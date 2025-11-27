/**
 * MSW Request Handlers
 * Comprehensive mock API responses for development and testing
 */

import { http, HttpResponse, delay } from 'msw';
import { mockMaintenanceRequests, mockInvoices, mockPayments, mockLeases } from './apiFixtures';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Helper to simulate network delay
const networkDelay = async () => {
  if (import.meta.env.MODE === 'test') {
    return; // No delay in tests
  }
  await delay(Math.random() * 500 + 200); // 200-700ms delay
};

// Helper to get auth token from request
const getAuthToken = (request: Request): string | null => {
  const authHeader = request.headers.get('Authorization');
  return authHeader?.replace('Bearer ', '') || null;
};

// Helper to check if user is authenticated
const isAuthenticated = (request: Request): boolean => {
  return !!getAuthToken(request);
};

export const handlers = [
  // ==================== Authentication ====================
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    await networkDelay();
    const body = await request.json() as { username: string; password: string };
    
    // Mock successful login
    if (body.username && body.password) {
      return HttpResponse.json({
        accessToken: 'mock-jwt-token-' + Date.now(),
        user: {
          id: 1,
          username: body.username,
          role: body.username.includes('pm') ? 'PROPERTY_MANAGER' : 'TENANT',
          email: body.username,
        },
      });
    }
    
    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    await networkDelay();
    const body = await request.json() as { username: string; password: string; role: string };
    
    return HttpResponse.json({
      user: {
        id: Math.floor(Math.random() * 1000),
        username: body.username,
        role: body.role || 'TENANT',
        email: body.username,
      },
      accessToken: 'mock-jwt-token-' + Date.now(),
    }, { status: 201 });
  }),

  http.get(`${API_BASE}/auth/profile`, ({ request }) => {
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({
      sub: 1,
      username: 'test@test.com',
      role: 'TENANT',
    });
  }),

  // ==================== Properties ====================
  http.get(`${API_BASE}/properties/public`, async () => {
    await networkDelay();
    return HttpResponse.json([
      {
        id: 1,
        name: 'Maple Street Apartments',
        address: '123 Maple St',
        city: 'Springfield',
        state: 'CA',
        zipCode: '12345',
        units: [
          { id: 1, name: 'Unit 1A', rent: 1200 },
          { id: 2, name: 'Unit 2B', rent: 1350 },
          { id: 3, name: 'Unit 3C', rent: 1500 },
        ],
      },
      {
        id: 2,
        name: 'Oak Avenue Complex',
        address: '456 Oak Ave',
        city: 'Springfield',
        state: 'CA',
        zipCode: '12345',
        units: [
          { id: 4, name: 'Unit 1A', rent: 1100 },
          { id: 5, name: 'Unit 2B', rent: 1250 },
        ],
      },
    ]);
  }),

  http.get(`${API_BASE}/property`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json([
      {
        id: 1,
        name: 'Maple Street Apartments',
        address: '123 Maple St',
        city: 'Springfield',
        state: 'CA',
        zipCode: '12345',
        units: [
          { id: 1, name: 'Unit 1A', rent: 1200 },
          { id: 2, name: 'Unit 2B', rent: 1350 },
        ],
      },
    ]);
  }),

  // ==================== Rental Applications ====================
  http.post(`${API_BASE}/rental-applications`, async ({ request }) => {
    await networkDelay();
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      propertyId: body.propertyId,
      unitId: body.unitId,
      fullName: body.fullName,
      email: body.email,
      phoneNumber: body.phoneNumber,
      income: body.income,
      employmentStatus: body.employmentStatus,
      previousAddress: body.previousAddress,
      creditScore: body.creditScore,
      monthlyDebt: body.monthlyDebt,
      status: 'PENDING',
      applicationDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.get(`${API_BASE}/rental-applications`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json([
      {
        id: 1,
        fullName: 'John Doe',
        email: 'john.doe@test.com',
        phoneNumber: '(555) 123-4567',
        status: 'PENDING',
        property: { name: 'Maple Street Apartments' },
        unit: { name: 'Unit 1A' },
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE}/rental-applications/:id`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({
      id: Number(params.id),
      fullName: 'John Doe',
      email: 'john.doe@test.com',
      status: 'PENDING',
      property: { name: 'Maple Street Apartments' },
      unit: { name: 'Unit 1A' },
    });
  }),

  http.get(`${API_BASE}/rental-applications/:id/timeline`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json([
      {
        id: 1,
        applicationId: Number(params.id),
        eventType: 'SUBMITTED',
        toStatus: 'PENDING',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE}/rental-applications/:id/lifecycle`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({
      stage: 'Under Review',
      status: 'UNDER_REVIEW',
      progress: 30,
      nextSteps: ['Wait for property manager to review', 'Automated screening will be performed'],
    });
  }),

  http.put(`${API_BASE}/rental-applications/:id/status`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as { status: string };
    
    return HttpResponse.json({
      id: Number(params.id),
      status: body.status,
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE}/rental-applications/:id/screen`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({
      id: Number(params.id),
      screeningScore: 75,
      qualificationStatus: 'QUALIFIED',
      recommendation: 'RECOMMEND_RENT',
      screenedAt: new Date().toISOString(),
    });
  }),

  // ==================== Maintenance ====================
  http.get(`${API_BASE}/maintenance`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json(mockMaintenanceRequests);
  }),

  http.post(`${API_BASE}/maintenance`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      ...body,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.put(`${API_BASE}/maintenance/:id/status`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as { status: string };
    
    return HttpResponse.json({
      id: Number(params.id),
      status: body.status,
      updatedAt: new Date().toISOString(),
    });
  }),

  // ==================== Payments ====================
  http.get(`${API_BASE}/payments/invoices`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json(mockInvoices);
  }),

  http.post(`${API_BASE}/payments`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      ...body,
      status: 'COMPLETED',
      paymentDate: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.get(`${API_BASE}/payments/payment-methods`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json([
      {
        id: 1,
        type: 'CARD',
        provider: 'STRIPE',
        last4: '4242',
        brand: 'Visa',
      },
    ]);
  }),

  http.post(`${API_BASE}/payments/payment-methods`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      ...body,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // ==================== Leases ====================
  http.get(`${API_BASE}/lease/my-lease`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json(mockLeases[0]);
  }),

  http.get(`${API_BASE}/lease`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json(mockLeases);
  }),

  http.post(`${API_BASE}/lease`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      ...body,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // ==================== Messaging ====================
  http.get(`${API_BASE}/messaging/conversations`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json([
      {
        id: 1,
        subject: 'Maintenance Question',
        participants: [{ id: 1, username: 'pm@test.com' }],
        lastMessage: {
          content: 'When will the repair be completed?',
          createdAt: new Date().toISOString(),
        },
      },
    ]);
  }),

  http.post(`${API_BASE}/messaging/conversations`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      ...body,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.post(`${API_BASE}/messaging/conversations/:id/messages`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as { content: string };
    
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      conversationId: Number(params.id),
      content: body.content,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.get(`${API_BASE}/messaging/conversations/:id/messages`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json([
      {
        id: 1,
        conversationId: Number(params.id),
        content: 'Hello, I have a question about my lease.',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
    ]);
  }),

  // ==================== Dashboard ====================
  http.get(`${API_BASE}/dashboard/tenant`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({
      lease: mockLeases[0],
      upcomingPayments: mockInvoices.filter(inv => inv.status === 'PENDING'),
      maintenanceRequests: mockMaintenanceRequests.filter(req => req.status === 'PENDING'),
    });
  }),

  http.get(`${API_BASE}/dashboard`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({
      stats: {
        totalProperties: 5,
        totalUnits: 25,
        activeLeases: 20,
        pendingApplications: 3,
      },
      recentActivity: [],
    });
  }),

  // ==================== Notifications ====================
  http.get(`${API_BASE}/notifications`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json([
      {
        id: 1,
        type: 'INFO',
        title: 'Payment Reminder',
        message: 'Your rent payment is due in 5 days',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  http.put(`${API_BASE}/notifications/:id/read`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({
      id: Number(params.id),
      read: true,
    });
  }),

  // ==================== Chatbot ====================
  http.post(`${API_BASE}/chatbot/message`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as { message: string };
    
    return HttpResponse.json({
      response: `This is a mock response to: "${body.message}"`,
      sessionId: 'mock-session-' + Date.now(),
      suggestedActions: [],
    });
  }),

  // ==================== Leasing/Leads ====================
  http.post(`${API_BASE}/leads`, async ({ request }) => {
    await networkDelay();
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: `lead-${Date.now()}`,
      sessionId: body.sessionId || `session-${Date.now()}`,
      name: body.name || null,
      email: body.email || null,
      phone: body.phone || null,
      status: body.status || 'NEW',
      bedrooms: body.bedrooms || null,
      budget: body.budget || null,
      moveInDate: body.moveInDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.get(`${API_BASE}/leads/:id`, async ({ params, request }) => {
    await networkDelay();
    
    return HttpResponse.json({
      id: params.id,
      sessionId: `session-${params.id}`,
      name: 'Test Lead',
      email: 'test@example.com',
      phone: '555-1234',
      status: 'NEW',
      createdAt: new Date().toISOString(),
    });
  }),

  http.get(`${API_BASE}/leads/session/:sessionId`, async ({ params, request }) => {
    await networkDelay();
    
    return HttpResponse.json({
      id: `lead-${params.sessionId}`,
      sessionId: params.sessionId,
      name: 'Test Lead',
      email: 'test@example.com',
      phone: '555-1234',
      status: 'NEW',
      createdAt: new Date().toISOString(),
    });
  }),

  // ==================== Property Search ====================
  http.get(`${API_BASE}/properties/search`, async ({ request }) => {
    await networkDelay();
    const url = new URL(request.url);
    const bedrooms = url.searchParams.get('bedrooms');
    const maxRent = url.searchParams.get('maxRent');
    
    return HttpResponse.json([
      {
        propertyId: '1',
        unitId: '1',
        address: '123 Main Street',
        city: 'Springfield',
        state: 'CA',
        bedrooms: bedrooms ? parseInt(bedrooms) : 2,
        bathrooms: 2,
        rent: maxRent ? Math.min(parseInt(maxRent), 1700) : 1700,
        available: true,
        status: 'AVAILABLE',
        petFriendly: true,
        amenities: ['Parking', 'Pool', 'Gym'],
        matchScore: 0.95,
        images: [],
      },
      {
        propertyId: '2',
        unitId: '2',
        address: '456 Oak Avenue',
        city: 'Springfield',
        state: 'CA',
        bedrooms: bedrooms ? parseInt(bedrooms) : 2,
        bathrooms: 1,
        rent: maxRent ? Math.min(parseInt(maxRent), 1600) : 1600,
        available: true,
        status: 'AVAILABLE',
        petFriendly: true,
        amenities: ['Parking', 'Pet-friendly', 'Balcony'],
        matchScore: 0.85,
        images: [],
      },
      {
        propertyId: '3',
        unitId: '3',
        address: '789 Pine Boulevard',
        city: 'Springfield',
        state: 'CA',
        bedrooms: bedrooms ? parseInt(bedrooms) : 2,
        bathrooms: 2,
        rent: maxRent ? Math.min(parseInt(maxRent), 1800) : 1800,
        available: true,
        status: 'AVAILABLE',
        petFriendly: false,
        amenities: ['Gym', 'Pool', 'Concierge'],
        matchScore: 0.90,
        images: [],
      },
    ]);
  }),

  // ==================== Bulk Messaging ====================
  http.post(`${API_BASE}/messaging/bulk/preview`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as any;
    
    return HttpResponse.json({
      totalRecipients: body.filters?.propertyIds?.length ? body.filters.propertyIds.length * 2 : 2,
      sample: [],
    });
  }),

  http.post(`${API_BASE}/messaging/bulk`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      title: body.title,
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
      deliverySummary: { total: 0, sent: 0, failed: 0, pending: 0 },
    }, { status: 201 });
  }),

  // ==================== Lead Messages ====================
  http.post(`${API_BASE}/leads/:id/messages`, async ({ params, request }) => {
    await networkDelay();
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      leadId: params.id,
      role: body.role,
      content: body.content,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // Default catch-all for unmocked endpoints
  http.all(`${API_BASE}/*`, ({ request }) => {
    console.warn(`[MSW] Unhandled ${request.method} request to ${request.url}`);
    return HttpResponse.json(
      { error: 'Endpoint not mocked', url: request.url },
      { status: 404 }
    );
  }),
];

