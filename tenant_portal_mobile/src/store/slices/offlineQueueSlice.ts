import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PendingRequest {
  id: string;
  url: string;
  method: string;
  body: any;
  timestamp: number;
}

interface OfflineQueueState {
  requests: PendingRequest[];
  isOnline: boolean;
}

const initialState: OfflineQueueState = {
  requests: [],
  isOnline: true,
};

export const offlineQueueSlice = createSlice({
  name: 'offlineQueue',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    enqueueRequest: (state, action: PayloadAction<PendingRequest>) => {
      state.requests.push(action.payload);
    },
    removeRequest: (state, action: PayloadAction<string>) => {
      state.requests = state.requests.filter(req => req.id !== action.payload);
    },
    clearQueue: (state) => {
      state.requests = [];
    }
  },
});

export const { setOnlineStatus, enqueueRequest, removeRequest, clearQueue } = offlineQueueSlice.actions;

export default offlineQueueSlice.reducer;
