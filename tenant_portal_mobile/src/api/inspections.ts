import apiClient, { apiService } from './client';
import { InspectionDetail, InspectionSummary, InspectionChecklistItem } from '../types/inspection';

export interface InspectionListResponse {
  inspections: InspectionSummary[];
  total: number;
}

// Backend routes: GET /inspections, GET /inspections/:id, PUT /inspections/:id,
// POST /inspections/:id/photos, PUT /inspections/:id/complete

export const inspectionsApi = {
  list: async (): Promise<InspectionSummary[]> => {
    const response = await apiService.get<{ inspections: InspectionSummary[] }>('/inspections?limit=25');
    return response.inspections ?? [];
  },
  get: async (id: number): Promise<InspectionDetail> => 
    apiService.get<InspectionDetail>(`/inspections/${id}`),
  updateChecklistItem: async (inspectionId: number, items: ({ itemId: number } & Partial<InspectionChecklistItem>)[]) => {
    // PUT /inspections/:id with the updated items
    return apiService.put<InspectionChecklistItem[]>(`/inspections/${inspectionId}`, { items });
  },
  uploadChecklistPhoto: async (inspectionId: number, file: { uri: string; name?: string; type?: string }, caption?: string) => {
    const formData = new FormData();
    const filePart = {
      uri: file.uri,
      name: file.name ?? 'photo.jpg',
      type: file.type ?? 'image/jpeg',
    } as unknown as Blob;
    formData.append('file', filePart);
    if (caption) {
      formData.append('caption', caption);
    }
    const response = await apiClient.post(`/inspections/${inspectionId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
