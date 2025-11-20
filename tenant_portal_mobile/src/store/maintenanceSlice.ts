import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { maintenanceApi } from '../api/maintenance';
import {
  MaintenanceRequest,
  CreateMaintenanceRequest,
  UpdateMaintenanceRequest,
  MaintenanceSummary,
  MaintenancePhoto,
} from '../types/maintenance';
import { getErrorMessage } from '../utils/error';

/**
 * Maintenance State
 */
interface MaintenanceState {
  requests: MaintenanceRequest[];
  selectedRequest: MaintenanceRequest | null;
  summary: MaintenanceSummary | null;
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
}

const initialState: MaintenanceState = {
  requests: [],
  selectedRequest: null,
  summary: null,
  isLoading: false,
  isUploading: false,
  error: null,
};

/**
 * Async Thunks
 */
type MaintenanceThunkConfig = {
  rejectValue: string;
};

// Fetch all maintenance requests
export const fetchMaintenanceRequests = createAsyncThunk<
  MaintenanceRequest[],
  void,
  MaintenanceThunkConfig
>(
  'maintenance/fetchRequests',
  async (_, { rejectWithValue }) => {
    try {
      const requests = await maintenanceApi.getMaintenanceRequests();
      return requests;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch maintenance requests'));
    }
  }
);

// Fetch single maintenance request
export const fetchMaintenanceRequest = createAsyncThunk<
  MaintenanceRequest,
  number,
  MaintenanceThunkConfig
>(
  'maintenance/fetchRequest',
  async (id, { rejectWithValue }) => {
    try {
      const request = await maintenanceApi.getMaintenanceRequest(id);
      return request;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch maintenance request'));
    }
  }
);

// Create maintenance request
export const createMaintenanceRequest = createAsyncThunk<
  MaintenanceRequest,
  CreateMaintenanceRequest,
  MaintenanceThunkConfig
>(
  'maintenance/createRequest',
  async (data, { rejectWithValue }) => {
    try {
      const request = await maintenanceApi.createMaintenanceRequest(data);
      return request;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to create maintenance request'));
    }
  }
);

// Update maintenance request
export const updateMaintenanceRequest = createAsyncThunk<
  MaintenanceRequest,
  { id: number; data: UpdateMaintenanceRequest },
  MaintenanceThunkConfig
>(
  'maintenance/updateRequest',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const request = await maintenanceApi.updateMaintenanceRequest(id, data);
      return request;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update maintenance request'));
    }
  }
);

// Cancel maintenance request
export const cancelMaintenanceRequest = createAsyncThunk<
  MaintenanceRequest,
  number,
  MaintenanceThunkConfig
>(
  'maintenance/cancelRequest',
  async (id, { rejectWithValue }) => {
    try {
      const request = await maintenanceApi.cancelMaintenanceRequest(id);
      return request;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to cancel maintenance request'));
    }
  }
);

// Upload photo
export const uploadMaintenancePhoto = createAsyncThunk<
  { requestId: number; photo: MaintenancePhoto },
  { requestId: number; photoUri: string; caption?: string },
  MaintenanceThunkConfig
>(
  'maintenance/uploadPhoto',
  async ({ requestId, photoUri, caption }, { rejectWithValue }) => {
    try {
      const photo = await maintenanceApi.uploadMaintenancePhoto(requestId, photoUri, caption);
      return { requestId, photo };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to upload photo'));
    }
  }
);

// Delete photo
export const deleteMaintenancePhoto = createAsyncThunk<
  { requestId: number; photoId: number },
  { requestId: number; photoId: number },
  MaintenanceThunkConfig
>(
  'maintenance/deletePhoto',
  async ({ requestId, photoId }, { rejectWithValue }) => {
    try {
      await maintenanceApi.deleteMaintenancePhoto(requestId, photoId);
      return { requestId, photoId };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to delete photo'));
    }
  }
);

// Fetch maintenance summary
export const fetchMaintenanceSummary = createAsyncThunk<
  MaintenanceSummary,
  void,
  MaintenanceThunkConfig
>(
  'maintenance/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const summary = await maintenanceApi.getMaintenanceSummary();
      return summary;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch maintenance summary'));
    }
  }
);

// Sign maintenance request
export const signMaintenanceRequest = createAsyncThunk<
  MaintenanceRequest,
  { id: number; signature: string },
  MaintenanceThunkConfig
>(
  'maintenance/signRequest',
  async ({ id, signature }, { rejectWithValue }) => {
    try {
      const request = await maintenanceApi.signMaintenanceRequest(id, signature);
      return request;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to sign maintenance request'));
    }
  }
);

/**
 * Maintenance Slice
 */
const maintenanceSlice = createSlice({
  name: 'maintenance',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedRequest: (state) => {
      state.selectedRequest = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all requests
    builder
      .addCase(fetchMaintenanceRequests.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMaintenanceRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.requests = action.payload;
      })
      .addCase(fetchMaintenanceRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch single request
    builder
      .addCase(fetchMaintenanceRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMaintenanceRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedRequest = action.payload;
        
        // Update in list if it exists
        const index = state.requests.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.requests[index] = action.payload;
        }
      })
      .addCase(fetchMaintenanceRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create request
    builder
      .addCase(createMaintenanceRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMaintenanceRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.requests.unshift(action.payload); // Add to beginning
        state.selectedRequest = action.payload;
      })
      .addCase(createMaintenanceRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update request
    builder
      .addCase(updateMaintenanceRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateMaintenanceRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // Update in list
        const index = state.requests.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.requests[index] = action.payload;
        }
        
        // Update selected if it's the same request
        if (state.selectedRequest?.id === action.payload.id) {
          state.selectedRequest = action.payload;
        }
      })
      .addCase(updateMaintenanceRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Cancel request
    builder
      .addCase(cancelMaintenanceRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelMaintenanceRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // Update in list
        const index = state.requests.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.requests[index] = action.payload;
        }
        
        // Update selected if it's the same request
        if (state.selectedRequest?.id === action.payload.id) {
          state.selectedRequest = action.payload;
        }
      })
      .addCase(cancelMaintenanceRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Upload photo
    builder
      .addCase(uploadMaintenancePhoto.pending, (state) => {
        state.isUploading = true;
        state.error = null;
      })
      .addCase(uploadMaintenancePhoto.fulfilled, (state, action) => {
        state.isUploading = false;
        
        const { requestId, photo } = action.payload;
        
        // Add photo to selected request
        if (state.selectedRequest?.id === requestId) {
          if (!state.selectedRequest.photos) {
            state.selectedRequest.photos = [];
          }
          state.selectedRequest.photos.push(photo);
        }
        
        // Add photo to request in list
        const request = state.requests.find((r) => r.id === requestId);
        if (request) {
          if (!request.photos) {
            request.photos = [];
          }
          request.photos.push(photo);
        }
      })
      .addCase(uploadMaintenancePhoto.rejected, (state, action) => {
        state.isUploading = false;
        state.error = action.payload as string;
      });

    // Delete photo
    builder
      .addCase(deleteMaintenancePhoto.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteMaintenancePhoto.fulfilled, (state, action) => {
        state.isLoading = false;
        
        const { requestId, photoId } = action.payload;
        
        // Remove photo from selected request
        if (state.selectedRequest?.id === requestId && state.selectedRequest.photos) {
          state.selectedRequest.photos = state.selectedRequest.photos.filter(
            (p) => p.id !== photoId
          );
        }
        
        // Remove photo from request in list
        const request = state.requests.find((r) => r.id === requestId);
        if (request && request.photos) {
          request.photos = request.photos.filter((p) => p.id !== photoId);
        }
      })
      .addCase(deleteMaintenancePhoto.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch summary
    builder
      .addCase(fetchMaintenanceSummary.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchMaintenanceSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      })
      .addCase(fetchMaintenanceSummary.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Sign request
    builder
      .addCase(signMaintenanceRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signMaintenanceRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // Update in list
        const index = state.requests.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.requests[index] = action.payload;
        }
        
        // Update selected if it's the same request
        if (state.selectedRequest?.id === action.payload.id) {
          state.selectedRequest = action.payload;
        }
      })
      .addCase(signMaintenanceRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedRequest } = maintenanceSlice.actions;
export default maintenanceSlice.reducer;
