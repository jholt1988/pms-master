import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { inspectionsApi } from '../api/inspections';
import { InspectionDetail, InspectionChecklistItem, InspectionPhoto } from '../types/inspection';
import { getErrorMessage } from '../utils/error';

interface ChecklistState {
  detail: InspectionDetail | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ChecklistState = {
  detail: null,
  isLoading: false,
  error: null,
};

export const fetchInspectionDetail = createAsyncThunk<InspectionDetail, number>(
  'checklist/fetchDetail',
  async (inspectionId, { rejectWithValue }) => {
    try {
      return await inspectionsApi.get(inspectionId);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load inspection'));
    }
  }
);


export const addChecklistPhoto = createAsyncThunk<InspectionPhoto, { itemId: number; file: { uri: string; name?: string; type?: string }; caption?: string }>(
  'checklist/addPhoto',
  async ({ itemId, file, caption }, { rejectWithValue }) => {
    try {
      const photo = await inspectionsApi.uploadChecklistPhoto(itemId, file, caption);
      return photo;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to upload photo'));
    }
  }
);

export const updateChecklistItem = createAsyncThunk<InspectionChecklistItem, { roomId: number; itemId: number; updates: Partial<InspectionChecklistItem> }>(
  'checklist/updateItem',
  async ({ roomId, itemId, updates }, { rejectWithValue }) => {
    try {
      const result = await inspectionsApi.updateChecklistItem(roomId, [{ itemId, ...updates }]);
      return result.find((item) => item.id === itemId) as InspectionChecklistItem;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update checklist item'));
    }
  }
);

const checklistSlice = createSlice({
  name: 'checklist',
  initialState,
  reducers: {
    setLocalChecklistItem(state, action: PayloadAction<{ itemId: number; updates: Partial<InspectionChecklistItem> }>) {
      const item = state.detail?.rooms?.flatMap((room) => room.checklistItems ?? []).find((i) => i.id === action.payload.itemId);
      if (item) {
        Object.assign(item, action.payload.updates);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInspectionDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInspectionDetail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.detail = {
          ...action.payload,
          rooms: action.payload.rooms?.map((room) => ({
            ...room,
            checklistItems: room.checklistItems?.map((item) => ({ ...item, roomId: room.id })) || [],
          })),
        };
      })
      .addCase(fetchInspectionDetail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? 'Failed to load inspection';
      })
      .addCase(updateChecklistItem.fulfilled, (state, action) => {
        if (!state.detail) return;
        const item = state.detail.rooms?.flatMap((room) => room.checklistItems ?? []).find((i) => i.id === action.payload.id);
        if (item) {
          Object.assign(item, action.payload);
        }
      })
      .addCase(addChecklistPhoto.fulfilled, (state, action) => {
        if (!state.detail) return;
        const item = state.detail.rooms?.flatMap((room) => room.checklistItems ?? []).find((i) => i.id === action.meta.arg.itemId);
        if (item) {
          item.photos = item.photos ? [...item.photos, action.payload] : [action.payload];
        }
      });
  },
});

export const { setLocalChecklistItem } = checklistSlice.actions;
export default checklistSlice.reducer;
