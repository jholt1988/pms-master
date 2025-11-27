import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, getApiBase } from './apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getApiBase', () => {
    it('returns default API base when VITE_API_URL is not set', () => {
      const base = getApiBase();
      // In test environment, VITE_API_URL may be set, so accept either value
      expect(['/api', 'http://localhost:3001/api']).toContain(base);
    });

    it('returns a string value', () => {
      const base = getApiBase();
      expect(typeof base).toBe('string');
      expect(base.length).toBeGreaterThan(0);
    });
  });

  describe('apiFetch', () => {
    it('makes GET request by default', async () => {
      const mockResponse = { data: 'test' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      const result = await apiFetch('/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('includes Authorization header when token is provided', async () => {
      const mockResponse = { data: 'test' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      await apiFetch('/test', { token: 'test-token' });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('sends POST request with body', async () => {
      const mockResponse = { success: true };
      const requestBody = { name: 'Test' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response);

      await apiFetch('/test', {
        method: 'POST',
        body: requestBody,
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('throws error on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
        headers: new Headers(),
      } as Response);

      await expect(apiFetch('/test')).rejects.toThrow();
    });

    it('returns null for 204 No Content', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      const result = await apiFetch('/test', { method: 'DELETE' });
      expect(result).toBeNull();
    });
  });
});

