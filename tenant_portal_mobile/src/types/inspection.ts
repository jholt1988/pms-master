export type InspectionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface InspectionChecklistItem {
  id: number;
  itemName: string;
  category?: string;
  condition?: string;
  requiresAction?: boolean;
  notes?: string;
  status?: 'pass' | 'fail' | 'pending';
}

export interface InspectionRoom {
  id: number;
  name: string;
  roomType?: string;
  checklistItems?: InspectionChecklistItem[];
}

export interface InspectionSummary {
  id: number;
  type: string;
  status: InspectionStatus;
  scheduledDate: string;
  unit?: {
    unitNumber?: string;
    property?: {
      name?: string;
    };
  };
}

export interface InspectionDetail extends InspectionSummary {
  notes?: string;
  rooms: InspectionRoom[];
}
