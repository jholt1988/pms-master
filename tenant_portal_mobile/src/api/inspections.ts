import apiClient, { apiService } from './client';
import { InspectionDetail, InspectionSummary, InspectionChecklistItem } from '../types/inspection';

export interface InspectionListResponse {
  inspections: InspectionSummary[];
  total: number;
}

export const inspectionsApi = {
  list: async (): Promise<InspectionSummary[]> => {
    const response = await apiService.get<{ inspections: InspectionSummary[] }>('/inspections?limit=25');
    return response.inspections ?? [];
  },
  get: async (id: number): Promise<InspectionDetail> => apiService.get<InspectionDetail>(`/inspections/${id}`),
  updateChecklistItem: async (roomId: number, items: Array<{ itemId: number } & Partial<InspectionChecklistItem>>) => {
    return apiService.patch<InspectionChecklistItem[]>(`/inspections/rooms/${roomId}/items`, { items });
  },
  uploadChecklistPhoto: async (itemId: number, file: { uri: string; name?: string; type?: string }, caption?: string) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name ?? 'photo.jpg',
      type: file.type ?? 'image/jpeg',
    } as any);
    if (caption) {
      formData.append('caption', caption);
    }
    const response = await apiClient.post(`/inspections/items/${itemId}/photos/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
