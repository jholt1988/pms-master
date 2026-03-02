import { apiService } from './client';

export interface PropertySummary {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  units?: { id: string; name: string; status?: string }[];
  occupancyRate?: number;
}

export const propertiesApi = {
  list: async (): Promise<PropertySummary[]> => {
    return apiService.get<PropertySummary[]>('/properties');
  },
};
