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
  // ==================== Test Handler ====================
  // Simple test to verify MSW is working - handle multiple possible paths
  http.get('/api/test-msw', async () => {
    console.log('[MSW] ✅ Test handler matched (/api/test-msw) - MSW is working!');
    return HttpResponse.json({ 
      message: 'MSW is working!', 
      timestamp: new Date().toISOString(),
      apiBase: API_BASE 
    });
  }),
  http.get(`${API_BASE}/test-msw`, async () => {
    console.log(`[MSW] ✅ Test handler matched (${API_BASE}/test-msw) - MSW is working!`);
    return HttpResponse.json({ 
      message: 'MSW is working!', 
      timestamp: new Date().toISOString(),
      apiBase: API_BASE 
    });
  }),

  // ==================== Rental Applications ====================
  // POST /rental-applications - Submit new application (must be first to ensure proper matching)
  http.post(`${API_BASE}/rental-applications`, async ({ request }) => {
    await networkDelay();
    const body = await request.json() as any;
    
    // Return the application with all submitted data
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      propertyId: body.propertyId,
      unitId: body.unitId,
      fullName: body.fullName,
      email: body.email,
      phoneNumber: body.phoneNumber,
      previousAddress: body.previousAddress,
      income: body.income,
      creditScore: body.creditScore,
      monthlyDebt: body.monthlyDebt,
      status: 'PENDING',
      references: body.references || [],
      pastLandlords: body.pastLandlords || [],
      employments: body.employments || [],
      additionalIncomes: body.additionalIncomes || [],
      pets: body.pets || [],
      vehicles: body.vehicles || [],
      authorizeCreditCheck: body.authorizeCreditCheck,
      authorizeBackgroundCheck: body.authorizeBackgroundCheck,
      authorizeEmploymentVerification: body.authorizeEmploymentVerification,
      negativeAspectsExplanation: body.negativeAspectsExplanation,
      applicationDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),
  
  // Also handle with explicit /api path
  http.post('/api/rental-applications', async ({ request }) => {
    await networkDelay();
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      propertyId: body.propertyId,
      unitId: body.unitId,
      fullName: body.fullName,
      email: body.email,
      phoneNumber: body.phoneNumber,
      previousAddress: body.previousAddress,
      income: body.income,
      creditScore: body.creditScore,
      monthlyDebt: body.monthlyDebt,
      status: 'PENDING',
      references: body.references || [],
      pastLandlords: body.pastLandlords || [],
      employments: body.employments || [],
      additionalIncomes: body.additionalIncomes || [],
      pets: body.pets || [],
      vehicles: body.vehicles || [],
      authorizeCreditCheck: body.authorizeCreditCheck,
      authorizeBackgroundCheck: body.authorizeBackgroundCheck,
      authorizeEmploymentVerification: body.authorizeEmploymentVerification,
      negativeAspectsExplanation: body.negativeAspectsExplanation,
      applicationDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

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

  http.get(`${API_BASE}/properties`, async ({ request }) => {
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
        unitCount: 10,
        propertyType: 'APARTMENT',
        units: [
          { id: 1, name: 'Unit 1A', rent: 1200, status: 'OCCUPIED', propertyId: 1 },
          { id: 2, name: 'Unit 2B', rent: 1350, status: 'VACANT', propertyId: 1 },
          { id: 3, name: 'Unit 3C', rent: 1500, status: 'OCCUPIED', propertyId: 1 },
        ],
        marketingProfile: {
          availabilityStatus: 'AVAILABLE',
          isSyndicationEnabled: false,
          minRent: 1200,
          maxRent: 1500,
        },
        tags: ['pet-friendly', 'parking'],
        photos: [
          {
            id: 1,
            url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            caption: 'Building exterior',
            isPrimary: true,
            displayOrder: 0,
          },
        ],
        amenities: [
          {
            id: 1,
            key: 'parking',
            label: 'Parking',
            isFeatured: true,
          },
          {
            id: 2,
            key: 'gym',
            label: 'Fitness Center',
            isFeatured: true,
          },
        ],
      },
      {
        id: 2,
        name: 'Oak Avenue Complex',
        address: '456 Oak Ave',
        city: 'Springfield',
        state: 'CA',
        zipCode: '12345',
        unitCount: 8,
        propertyType: 'APARTMENT',
        units: [
          { id: 4, name: 'Unit 1A', rent: 1100, status: 'VACANT', propertyId: 2 },
          { id: 5, name: 'Unit 2B', rent: 1250, status: 'OCCUPIED', propertyId: 2 },
        ],
        marketingProfile: {
          availabilityStatus: 'LIMITED',
          isSyndicationEnabled: true,
          minRent: 1100,
          maxRent: 1250,
        },
        tags: ['furnished'],
      },
    ]);
  }),

  http.get(`${API_BASE}/properties/:id/marketing`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({
      property: {
        id: Number(params.id),
        name: 'Maple Street Apartments',
        address: '123 Maple St',
      },
      marketingProfile: {
        minRent: 1200,
        maxRent: 1500,
        availabilityStatus: 'AVAILABLE',
        marketingHeadline: 'Beautiful Apartments in Prime Location',
        marketingDescription: 'Spacious units with modern amenities',
        isSyndicationEnabled: false,
        lastSyncedAt: new Date().toISOString(),
      },
      photos: [
        {
          id: 1,
          url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
          caption: 'Building exterior',
          isPrimary: true,
          displayOrder: 0,
        },
        {
          id: 2,
          url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
          caption: 'Lobby area',
          isPrimary: false,
          displayOrder: 1,
        },
      ],
      amenities: [
        {
          id: 1,
          key: 'parking',
          label: 'Parking',
          description: 'On-site parking available',
          category: 'Parking',
          isFeatured: true,
          value: 'Covered parking',
        },
        {
          id: 2,
          key: 'gym',
          label: 'Fitness Center',
          description: '24/7 fitness center',
          category: 'Amenities',
          isFeatured: true,
        },
        {
          id: 3,
          key: 'pool',
          label: 'Swimming Pool',
          description: 'Outdoor swimming pool',
          category: 'Amenities',
          isFeatured: false,
        },
      ],
      unitCount: 10,
    });
  }),

  http.get(`${API_BASE}/listings/syndication/:id/status`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json([
      {
        id: 1,
        channel: 'ZILLOW',
        status: 'ACTIVE',
        lastAttemptAt: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE}/listings/syndication/credentials/all`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json([]);
  }),

  http.post(`${API_BASE}/listings/syndication/:id/trigger`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_BASE}/listings/syndication/:id/pause`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_BASE}/properties`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      ...body,
      unitCount: 0,
      units: [],
      photos: [],
      amenities: [],
      tags: body.tags || [],
      marketingProfile: {
        availabilityStatus: 'AVAILABLE',
        isSyndicationEnabled: false,
      },
    }, { status: 201 });
  }),

  // POST /properties/:id/units - Create unit (must come before PATCH routes)
  http.post(`${API_BASE}/properties/:id/units`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as {
      name: string;
    };
    
    // Validate that only 'name' is provided (backend DTO only accepts name)
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return HttpResponse.json(
        { message: 'Validation failed', errors: [{ field: 'name', message: 'name should not be empty' }] },
        { status: 400 }
      );
    }
    
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      name: body.name,
      propertyId: Number(params.id),
      status: 'VACANT',
      bedrooms: undefined,
      bathrooms: undefined,
      squareFeet: undefined,
      hasParking: false,
      hasLaundry: false,
      hasBalcony: false,
      hasAC: false,
      isFurnished: false,
      petsAllowed: false,
    }, { status: 201 });
  }),

  // PATCH /properties/:id/units/:unitId - Update unit (MUST come before PATCH /properties/:id)
  // Handle both /api/properties and /properties paths
  http.patch('/api/properties/:id/units/:unitId', async ({ params, request }) => {
    await networkDelay();
    console.log('[MSW] PATCH unit matched (/api path)', { 
      propertyId: params.id, 
      unitId: params.unitId,
      url: request.url 
    });
    
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as {
      name: string;
    };
    
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return HttpResponse.json(
        { message: 'Validation failed', errors: [{ field: 'name', message: 'name should not be empty' }] },
        { status: 400 }
      );
    }
    
    return HttpResponse.json({
      id: Number(params.unitId),
      name: body.name,
      propertyId: Number(params.id),
      status: 'VACANT',
      rent: undefined,
      bedrooms: undefined,
      bathrooms: undefined,
      squareFeet: undefined,
      hasParking: false,
      hasLaundry: false,
      hasBalcony: false,
      hasAC: false,
      isFurnished: false,
      petsAllowed: false,
    }, { status: 200 });
  }),

  http.patch(`${API_BASE}/properties/:id/units/:unitId`, async ({ params, request }) => {
    await networkDelay();
    console.log(`[MSW] ✅ PATCH unit matched (${API_BASE}/properties/:id/units/:unitId)`, { 
      propertyId: params.id, 
      unitId: params.unitId,
      url: request.url,
      apiBase: API_BASE,
      method: request.method
    });
    
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as {
      name: string;
    };
    
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return HttpResponse.json(
        { message: 'Validation failed', errors: [{ field: 'name', message: 'name should not be empty' }] },
        { status: 400 }
      );
    }
    
    return HttpResponse.json({
      id: Number(params.unitId),
      name: body.name,
      propertyId: Number(params.id),
      status: 'VACANT',
      rent: undefined,
      bedrooms: undefined,
      bathrooms: undefined,
      squareFeet: undefined,
      hasParking: false,
      hasLaundry: false,
      hasBalcony: false,
      hasAC: false,
      isFurnished: false,
      petsAllowed: false,
    }, { status: 200 });
  }),

  // PATCH /properties/:id - Update property (must come after more specific routes)
  // Handle both /api/properties and /properties paths
  // IMPORTANT: This must come AFTER the PATCH /properties/:id/units/:unitId handler
  http.patch('/api/properties/:id', async ({ params, request }) => {
    await networkDelay();
    // Only match if it's NOT a units endpoint
    if (request.url.includes('/units/')) {
      // This shouldn't happen if routes are ordered correctly, but log it
      console.warn('[MSW] ⚠️ PATCH /api/properties/:id matched but URL contains /units/', request.url);
    }
    console.log('[MSW] ✅ PATCH property matched (/api/properties/:id)', { 
      propertyId: params.id,
      url: request.url,
      method: request.method
    });
    
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: Number(params.id),
      name: body.name || 'Updated Property',
      address: body.address,
      city: body.city,
      state: body.state,
      zipCode: body.zipCode,
      country: body.country || 'USA',
      propertyType: body.propertyType,
      description: body.description,
      yearBuilt: body.yearBuilt,
      tags: body.tags || [],
      units: [],
      unitCount: 0,
      photos: [],
      amenities: [],
      marketingProfile: {
        availabilityStatus: 'AVAILABLE',
        isSyndicationEnabled: false,
      },
    }, { status: 200 });
  }),

  http.patch(`${API_BASE}/properties/:id`, async ({ params, request }) => {
    await networkDelay();
    // Only match if it's NOT a units endpoint
    if (request.url.includes('/units/')) {
      // This shouldn't happen if routes are ordered correctly, but log it
      console.warn(`[MSW] ⚠️ PATCH ${API_BASE}/properties/:id matched but URL contains /units/`, request.url);
    }
    console.log(`[MSW] ✅ PATCH property matched (${API_BASE}/properties/:id)`, { 
      propertyId: params.id,
      url: request.url,
      apiBase: API_BASE,
      method: request.method
    });
    
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as any;
    
    // Return updated property with all fields
    return HttpResponse.json({
      id: Number(params.id),
      name: body.name || 'Updated Property',
      address: body.address,
      city: body.city,
      state: body.state,
      zipCode: body.zipCode,
      country: body.country || 'USA',
      propertyType: body.propertyType,
      description: body.description,
      yearBuilt: body.yearBuilt,
      tags: body.tags || [],
      units: [],
      unitCount: 0,
      photos: [],
      amenities: [],
      marketingProfile: {
        availabilityStatus: 'AVAILABLE',
        isSyndicationEnabled: false,
      },
    }, { status: 200 });
  }),

  http.post(`${API_BASE}/properties/:id/marketing`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as {
      photos?: Array<{ url: string; caption?: string; isPrimary?: boolean; displayOrder?: number }>;
      amenities?: Array<{ key: string; label: string; value?: string; isFeatured?: boolean }>;
      minRent?: number;
      maxRent?: number;
      availabilityStatus?: string;
      marketingHeadline?: string;
      marketingDescription?: string;
      isSyndicationEnabled?: boolean;
    };
    
    // Return updated marketing profile
    return HttpResponse.json({
      property: {
        id: Number(params.id),
        name: 'Maple Street Apartments',
        address: '123 Maple St',
      },
      marketingProfile: {
        minRent: body.minRent,
        maxRent: body.maxRent,
        availabilityStatus: body.availabilityStatus || 'AVAILABLE',
        marketingHeadline: body.marketingHeadline,
        marketingDescription: body.marketingDescription,
        isSyndicationEnabled: body.isSyndicationEnabled ?? false,
        lastSyncedAt: new Date().toISOString(),
      },
      photos: body.photos || [],
      amenities: body.amenities || [],
      unitCount: 10,
    });
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

  // More specific routes must come before less specific ones in MSW
  // PUT /rental-applications/:id/status - Update application status (approve/reject)
  http.put(`${API_BASE}/rental-applications/:id/status`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as { status: string };
    const applicationId = Number(params.id);
    
    // Return the full updated application object to match backend behavior
    // This should match the structure returned by rental-application.service.ts updateApplicationStatus
    return HttpResponse.json({
      id: applicationId,
      status: body.status,
      fullName: 'John Doe',
      email: 'john.doe@test.com',
      phoneNumber: '(555) 123-4567',
      income: 5000,
      employmentStatus: 'Full-time',
      creditScore: 720,
      monthlyDebt: 500,
      previousAddress: '123 Previous St, City, State',
      property: { 
        id: 1,
        name: 'Maple Street Apartments',
        address: '123 Maple St'
      },
      unit: { 
        id: 1,
        name: 'Unit 1A',
        propertyId: 1
      },
      applicant: {
        id: 1,
        username: 'john.doe@test.com',
        role: 'TENANT'
      },
      manualNotes: [],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
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

  http.post(`${API_BASE}/rental-applications/:id/notes`, async ({ params, request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as { content: string };
    
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      applicationId: Number(params.id),
      content: body.content,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
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

  // ==================== Maintenance ====================
  http.get(`${API_BASE}/maintenance`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Transform mock data to match expected format
    const formattedRequests = mockMaintenanceRequests.map((req) => ({
      id: req.id,
      title: req.title,
      description: req.description || 'No description provided',
      status: req.status,
      priority: req.priority === 'HIGH' ? 'HIGH' : req.priority === 'MEDIUM' ? 'MEDIUM' : 'LOW',
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      unit: {
        id: 1,
        name: req.unit,
        property: {
          id: 1,
          name: 'Sample Property',
        },
      },
      author: {
        id: 1,
        username: 'tenant@example.com',
      },
      photos: [],
    }));
    
    // Return in format expected by MaintenanceManagementPage - return array directly
    return HttpResponse.json(formattedRequests);
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

  // ==================== Leases ====================
  http.get(`${API_BASE}/leases`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const mockLeases = [
      {
        id: 1,
        startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000).toISOString(),
        rentAmount: 1200,
        depositAmount: 2400,
        status: 'ACTIVE',
        tenant: {
          id: 1,
          username: 'tenant@example.com',
        },
        unit: {
          name: 'Unit 1A',
          property: {
            name: 'Maple Street Apartments',
          },
        },
        esignEnvelopes: [],
      },
      {
        id: 2,
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000).toISOString(),
        rentAmount: 1350,
        depositAmount: 2700,
        status: 'ACTIVE',
        tenant: {
          id: 2,
          username: 'tenant2@example.com',
        },
        unit: {
          name: 'Unit 2B',
          property: {
            name: 'Maple Street Apartments',
          },
        },
        esignEnvelopes: [],
      },
      {
        id: 3,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
        rentAmount: 1500,
        depositAmount: 3000,
        status: 'ACTIVE',
        tenant: {
          id: 3,
          username: 'tenant3@example.com',
        },
        unit: {
          name: 'Unit 3C',
          property: {
            name: 'Oak Avenue Complex',
          },
        },
        esignEnvelopes: [],
      },
    ];
    
    // Return array directly - LeaseManagementPageModern handles both formats
    return HttpResponse.json(mockLeases);
  }),

  http.get(`${API_BASE}/leases/my-lease`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({
      id: 1,
      startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000).toISOString(),
      rentAmount: 1200,
      depositAmount: 2400,
      status: 'ACTIVE',
      unit: {
        name: 'Unit 1A',
        property: {
          name: 'Maple Street Apartments',
        },
      },
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

  http.get(`${API_BASE}/dashboard/metrics`, async ({ request }) => {
    await networkDelay();
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({
      occupancy: {
        total: 25,
        occupied: 23,
        vacant: 2,
        percentage: 92,
      },
      financials: {
        monthlyRevenue: 45000,
        collectedThisMonth: 42500,
        outstanding: 2500,
      },
      maintenance: {
        total: 12,
        pending: 3,
        inProgress: 5,
        overdue: 2,
      },
      applications: {
        total: 8,
        pending: 3,
        approved: 4,
        rejected: 1,
      },
      recentActivity: [
        {
          id: 1,
          type: 'maintenance',
          title: 'HVAC repair completed',
          date: new Date().toISOString(),
          status: 'completed',
        },
        {
          id: 2,
          type: 'application',
          title: 'New rental application submitted',
          date: new Date(Date.now() - 3600000).toISOString(),
          status: 'pending',
        },
      ],
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

  // Catch-all for PATCH requests to help debug (must come after specific handlers)
  http.patch(`${API_BASE}/*`, ({ request }) => {
    const url = request.url;
    console.error(`[MSW] ❌ PATCH request NOT matched by specific handler: ${url}`);
    console.error(`[MSW] This means the route pattern didn't match. Check the URL pattern.`);
    
    // Try to provide helpful error message
    if (url.includes('/properties/') && url.includes('/units/')) {
      return HttpResponse.json(
        { 
          error: 'PATCH /properties/:id/units/:unitId endpoint not matched', 
          url: url,
          hint: 'Check if MSW handlers are in correct order and route patterns match'
        },
        { status: 404 }
      );
    }
    
    return HttpResponse.json(
      { error: 'PATCH endpoint not specifically mocked', url: url, method: 'PATCH' },
      { status: 404 }
    );
  }),

  // Default catch-all for unmocked endpoints (must be last)
  http.all(`${API_BASE}/*`, ({ request }) => {
    if (request.method !== 'PATCH') {
      console.warn(`[MSW] Unhandled ${request.method} request to ${request.url}`);
      return HttpResponse.json(
        { error: 'Endpoint not mocked', url: request.url },
        { status: 404 }
      );
    }
    // PATCH requests are handled by the PATCH catch-all above
    return HttpResponse.json(
      { error: 'Endpoint not mocked', url: request.url },
      { status: 404 }
    );
  }),
];

// Debug: Log handlers count at module load time
// This runs when the module is first imported
try {
  console.log('[MSW handlers.ts] ✅ Module loaded successfully');
  console.log('[MSW handlers.ts] Handlers count:', handlers.length);
  console.log('[MSW handlers.ts] API_BASE:', API_BASE);
  if (handlers.length === 0) {
    console.error('[MSW handlers.ts] ❌ ERROR: handlers array is empty!');
    throw new Error('Handlers array is empty - this will break MSW');
  }
} catch (error) {
  console.error('[MSW handlers.ts] ❌ ERROR loading handlers module:', error);
  throw error; // Re-throw to prevent silent failure
}
