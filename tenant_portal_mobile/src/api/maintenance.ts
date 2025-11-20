import { apiService } from './client';
import {
  MaintenanceRequest,
  CreateMaintenanceRequest,
  UpdateMaintenanceRequest,
  MaintenanceSummary,
  MaintenancePhoto,
} from '../types/maintenance';

type ReactNativeFile = {
  uri: string;
  name: string;
  type: string;
};

/**
 * Maintenance API Service
 * Handles all maintenance request operations
 */
export const maintenanceApi = {
  /**
   * Get all maintenance requests for the current tenant
   */
  getMaintenanceRequests: async (): Promise<MaintenanceRequest[]> => {
    return apiService.get<MaintenanceRequest[]>('/maintenance-requests');
  },

  /**
   * Get a single maintenance request by ID
   */
  getMaintenanceRequest: async (id: number): Promise<MaintenanceRequest> => {
    return apiService.get<MaintenanceRequest>(`/maintenance-requests/${id}`);
  },

  /**
   * Create a new maintenance request
   */
  createMaintenanceRequest: async (
    data: CreateMaintenanceRequest
  ): Promise<MaintenanceRequest> => {
    return apiService.post<MaintenanceRequest>('/maintenance-requests', data);
  },

  /**
   * Update an existing maintenance request
   */
  updateMaintenanceRequest: async (
    id: number,
    data: UpdateMaintenanceRequest
  ): Promise<MaintenanceRequest> => {
    return apiService.patch<MaintenanceRequest>(`/maintenance-requests/${id}`, data);
  },

  /**
   * Cancel a maintenance request
   */
  cancelMaintenanceRequest: async (id: number): Promise<MaintenanceRequest> => {
    return apiService.post<MaintenanceRequest>(`/maintenance-requests/${id}/cancel`, {});
  },

  /**
   * Upload a photo for a maintenance request
   */
  uploadMaintenancePhoto: async (
    requestId: number,
    photoUri: string,
    caption?: string
  ): Promise<MaintenancePhoto> => {
    const formData = new FormData();
    
    // Create file object from URI
    const filename = photoUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    const photoFile: ReactNativeFile = {
      uri: photoUri,
      name: filename,
      type,
    };

    formData.append('photo', photoFile as unknown as Blob);
    
    if (caption) {
      formData.append('caption', caption);
    }

    return apiService.post<MaintenancePhoto>(
      `/maintenance-requests/${requestId}/photos`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  },

  /**
   * Delete a photo from a maintenance request
   */
  deleteMaintenancePhoto: async (
    requestId: number,
    photoId: number
  ): Promise<void> => {
    return apiService.delete(`/maintenance-requests/${requestId}/photos/${photoId}`);
  },

  /**
   * Get maintenance request summary statistics
   */
  getMaintenanceSummary: async (): Promise<MaintenanceSummary> => {
    return apiService.get<MaintenanceSummary>('/maintenance-requests/summary');
  },

  /**
   * Mark maintenance request as tenant-approved/signed
   */
  signMaintenanceRequest: async (
    id: number,
    signature: string
  ): Promise<MaintenanceRequest> => {
    return apiService.post<MaintenanceRequest>(`/maintenance-requests/${id}/sign`, {
      signature,
    });
  },
};
