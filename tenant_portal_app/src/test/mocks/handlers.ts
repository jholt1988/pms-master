/**
 * MSW Request Handlers
 * Mock API responses for testing
 */

import { http, HttpResponse } from 'msw';

const API_BASE = '/api';

export const handlers = [
  // Maintenance requests
  http.get(`${API_BASE}/maintenance/requests`, () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Leaky Faucet',
        description: 'Kitchen faucet is leaking',
        unit: 'Unit 2B',
        priority: 'MEDIUM',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  // Payments
  http.get(`${API_BASE}/payments/invoices`, () => {
    return HttpResponse.json([
      {
        id: 1,
        amount: 1500,
        dueDate: new Date().toISOString(),
        status: 'PENDING',
      },
    ]);
  }),

  // Properties
  http.get(`${API_BASE}/properties`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Test Property',
        units: [{ id: 1, name: 'Unit 1A' }],
      },
    ]);
  }),

  // Leases
  http.get(`${API_BASE}/leases`, () => {
    return HttpResponse.json({
      data: [
        {
          id: 1,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          rentAmount: 1500,
          status: 'ACTIVE',
        },
      ],
    });
  }),

  // Messages
  http.get(`${API_BASE}/messages/conversations`, () => {
    return HttpResponse.json([
      {
        id: 1,
        lastMessage: {
          text: 'Test message',
          createdAt: new Date().toISOString(),
        },
      },
    ]);
  }),

  // Default catch-all
  http.all(`${API_BASE}/*`, () => {
    return HttpResponse.json({ error: 'Not mocked' }, { status: 404 });
  }),
];

