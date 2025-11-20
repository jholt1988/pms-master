/**
 * Lease API Service
 * API calls for lease and document management
 */

import api from './client';
import {
  Lease,
  Document,
  LeaseRenewalRequest,
  CreateMoveOutNotice,
  MoveOutNotice,
  LeaseSummary,
} from '../types/lease';

/**
 * Get current/active lease for tenant
 */
export const getCurrentLease = async (): Promise<Lease> => {
  const response = await api.get('/leases/current');
  return response.data;
};

/**
 * Get lease by ID
 */
export const getLeaseById = async (leaseId: number): Promise<Lease> => {
  const response = await api.get(`/leases/${leaseId}`);
  return response.data;
};

/**
 * Get all leases for tenant (including past leases)
 */
export const getAllLeases = async (): Promise<Lease[]> => {
  const response = await api.get('/leases');
  return response.data;
};

/**
 * Get lease summary
 */
export const getLeaseSummary = async (): Promise<LeaseSummary> => {
  const response = await api.get('/leases/summary');
  return response.data;
};

/**
 * Get documents for a lease
 */
export const getLeaseDocuments = async (leaseId: number): Promise<Document[]> => {
  const response = await api.get(`/leases/${leaseId}/documents`);
  return response.data;
};

/**
 * Get all documents for current tenant
 */
export const getAllDocuments = async (): Promise<Document[]> => {
  const response = await api.get('/documents');
  return response.data;
};

/**
 * Download document (returns blob URL)
 */
export const downloadDocument = async (documentId: number): Promise<string> => {
  const response = await api.get(`/documents/${documentId}/download`, {
    responseType: 'blob',
  });
  
  // Create blob URL for viewing/downloading
  const blob = new Blob([response.data], { type: response.headers['content-type'] });
  return URL.createObjectURL(blob);
};

/**
 * Request lease renewal
 */
export const requestLeaseRenewal = async (
  request: LeaseRenewalRequest
): Promise<Lease> => {
  const response = await api.post('/leases/renewal', request);
  return response.data;
};

/**
 * Submit move-out notice
 */
export const submitMoveOutNotice = async (
  notice: CreateMoveOutNotice
): Promise<MoveOutNotice> => {
  const response = await api.post('/leases/move-out-notice', notice);
  return response.data;
};

/**
 * Get move-out notices
 */
export const getMoveOutNotices = async (leaseId: number): Promise<MoveOutNotice[]> => {
  const response = await api.get(`/leases/${leaseId}/move-out-notices`);
  return response.data;
};

export default {
  getCurrentLease,
  getLeaseById,
  getAllLeases,
  getLeaseSummary,
  getLeaseDocuments,
  getAllDocuments,
  downloadDocument,
  requestLeaseRenewal,
  submitMoveOutNotice,
  getMoveOutNotices,
};
