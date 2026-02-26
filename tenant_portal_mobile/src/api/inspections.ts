import { apiService } from './client';
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
};
