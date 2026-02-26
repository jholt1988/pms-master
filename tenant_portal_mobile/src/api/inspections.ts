import { apiService } from './client';
import { InspectionDetail, InspectionSummary } from '../types/inspection';

export interface InspectionListResponse {
  inspections: InspectionSummary[];
  total: number;
}

export const inspectionsApi = {
  list: async (): Promise<InspectionSummary[]> => {
    const response = await apiService.get<{ inspections: InspectionSummary[] }>('/inspections?limit=25');
    return response.inspections ?? [];
  },
  get: async (id: number): Promise<InspectionDetail> => {
    return apiService.get<InspectionDetail>(`/inspections/${id}`);
  },
};
