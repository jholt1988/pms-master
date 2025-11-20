/**
 * Lease Redux Slice
 * State management for lease and document operations
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as leaseApi from '../api/lease';
import {
  Lease,
  Document,
  LeaseRenewalRequest,
  CreateMoveOutNotice,
  MoveOutNotice,
  LeaseSummary,
} from '../types/lease';
import { getErrorMessage } from '../utils/error';

interface LeaseState {
  currentLease: Lease | null;
  leases: Lease[];
  documents: Document[];
  moveOutNotices: MoveOutNotice[];
  summary: LeaseSummary | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: LeaseState = {
  currentLease: null,
  leases: [],
  documents: [],
  moveOutNotices: [],
  summary: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
};

// Async Thunks
type LeaseThunkConfig = {
  rejectValue: string;
};

// Get current lease
export const fetchCurrentLease = createAsyncThunk<Lease, void, LeaseThunkConfig>(
  'lease/fetchCurrent',
  async (_, { rejectWithValue }) => {
    try {
      const lease = await leaseApi.getCurrentLease();
      return lease;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch current lease'));
    }
  }
);

// Get lease by ID
export const fetchLeaseById = createAsyncThunk<Lease, number, LeaseThunkConfig>(
  'lease/fetchById',
  async (leaseId, { rejectWithValue }) => {
    try {
      const lease = await leaseApi.getLeaseById(leaseId);
      return lease;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch lease'));
    }
  }
);

// Get all leases
export const fetchAllLeases = createAsyncThunk<Lease[], void, LeaseThunkConfig>(
  'lease/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const leases = await leaseApi.getAllLeases();
      return leases;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch leases'));
    }
  }
);

// Get lease summary
export const fetchLeaseSummary = createAsyncThunk<LeaseSummary, void, LeaseThunkConfig>(
  'lease/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const summary = await leaseApi.getLeaseSummary();
      return summary;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch lease summary'));
    }
  }
);

// Get documents
export const fetchDocuments = createAsyncThunk<Document[], number | undefined, LeaseThunkConfig>(
  'lease/fetchDocuments',
  async (leaseId, { rejectWithValue }) => {
    try {
      const documents = leaseId
        ? await leaseApi.getLeaseDocuments(leaseId)
        : await leaseApi.getAllDocuments();
      return documents;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch documents'));
    }
  }
);

// Download document
export const downloadDocument = createAsyncThunk<
  { documentId: number; blobUrl: string },
  number,
  LeaseThunkConfig
>(
  'lease/downloadDocument',
  async (documentId, { rejectWithValue }) => {
    try {
      const blobUrl = await leaseApi.downloadDocument(documentId);
      return { documentId, blobUrl };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to download document'));
    }
  }
);

// Request lease renewal
export const requestRenewal = createAsyncThunk<Lease, LeaseRenewalRequest, LeaseThunkConfig>(
  'lease/requestRenewal',
  async (request, { rejectWithValue }) => {
    try {
      const lease = await leaseApi.requestLeaseRenewal(request);
      return lease;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to submit renewal request'));
    }
  }
);

// Submit move-out notice
export const submitMoveOutNotice = createAsyncThunk<MoveOutNotice, CreateMoveOutNotice, LeaseThunkConfig>(
  'lease/submitMoveOut',
  async (notice, { rejectWithValue }) => {
    try {
      const moveOutNotice = await leaseApi.submitMoveOutNotice(notice);
      return moveOutNotice;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to submit move-out notice'));
    }
  }
);

// Get move-out notices
export const fetchMoveOutNotices = createAsyncThunk<MoveOutNotice[], number, LeaseThunkConfig>(
  'lease/fetchMoveOutNotices',
  async (leaseId, { rejectWithValue }) => {
    try {
      const notices = await leaseApi.getMoveOutNotices(leaseId);
      return notices;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch move-out notices'));
    }
  }
);

// Slice
const leaseSlice = createSlice({
  name: 'lease',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentLease: (state) => {
      state.currentLease = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch current lease
      .addCase(fetchCurrentLease.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentLease.fulfilled, (state, action: PayloadAction<Lease>) => {
        state.isLoading = false;
        state.currentLease = action.payload;
      })
      .addCase(fetchCurrentLease.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch lease by ID
      .addCase(fetchLeaseById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLeaseById.fulfilled, (state, action: PayloadAction<Lease>) => {
        state.isLoading = false;
        state.currentLease = action.payload;
      })
      .addCase(fetchLeaseById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch all leases
      .addCase(fetchAllLeases.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllLeases.fulfilled, (state, action: PayloadAction<Lease[]>) => {
        state.isLoading = false;
        state.leases = action.payload;
      })
      .addCase(fetchAllLeases.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch lease summary
      .addCase(fetchLeaseSummary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLeaseSummary.fulfilled, (state, action: PayloadAction<LeaseSummary>) => {
        state.isLoading = false;
        state.summary = action.payload;
      })
      .addCase(fetchLeaseSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch documents
      .addCase(fetchDocuments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action: PayloadAction<Document[]>) => {
        state.isLoading = false;
        state.documents = action.payload;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Download document
      .addCase(downloadDocument.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(downloadDocument.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(downloadDocument.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Request renewal
      .addCase(requestRenewal.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(requestRenewal.fulfilled, (state, action: PayloadAction<Lease>) => {
        state.isSubmitting = false;
        state.currentLease = action.payload;
      })
      .addCase(requestRenewal.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })

      // Submit move-out notice
      .addCase(submitMoveOutNotice.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitMoveOutNotice.fulfilled, (state, action: PayloadAction<MoveOutNotice>) => {
        state.isSubmitting = false;
        state.moveOutNotices.push(action.payload);
      })
      .addCase(submitMoveOutNotice.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })

      // Fetch move-out notices
      .addCase(fetchMoveOutNotices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMoveOutNotices.fulfilled, (state, action: PayloadAction<MoveOutNotice[]>) => {
        state.isLoading = false;
        state.moveOutNotices = action.payload;
      })
      .addCase(fetchMoveOutNotices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentLease } = leaseSlice.actions;
export default leaseSlice.reducer;
