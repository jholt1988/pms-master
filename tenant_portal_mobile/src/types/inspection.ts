export type InspectionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface InspectionPhoto {
  id: number;
  url: string;
  caption?: string;
}

export interface InspectionChecklistItem {
  id: number;
  roomId?: number;
  itemName: string;
  category?: string;
  condition?: string;
  requiresAction?: boolean;
  notes?: string;
  photos?: InspectionPhoto[];
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
  photos?: InspectionPhoto[];
  rooms: InspectionRoom[];
}
