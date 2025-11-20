/**
 * Notification Redux Slice
 * Manages notification state with async thunks
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  Notification,
  NotificationPreferences,
  NotificationStats,
  NotificationListParams,
  NotificationStatus,
} from '../types/notification';
import * as notificationApi from '../api/notification';

/**
 * Notification state interface
 */
interface NotificationState {
  notifications: Notification[];
  stats: NotificationStats | null;
  unreadCount: number;
  preferences: NotificationPreferences | null;
  selectedNotification: Notification | null;
  filters: NotificationListParams;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}

/**
 * Initial state
 */
const initialState: NotificationState = {
  notifications: [],
  stats: null,
  unreadCount: 0,
  preferences: null,
  selectedNotification: null,
  filters: {
    page: 1,
    limit: 20,
  },
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  error: null,
  hasMore: true,
  page: 1,
};

/**
 * Async Thunks
 */

// Fetch notifications
export const fetchNotifications = createAsyncThunk(
  'notification/fetchNotifications',
  async (params?: NotificationListParams) => {
    const response = await notificationApi.getNotifications(params);
    return response;
  }
);

// Refresh notifications
export const refreshNotifications = createAsyncThunk(
  'notification/refreshNotifications',
  async () => {
    const response = await notificationApi.getNotifications({ page: 1, limit: 20 });
    return response;
  }
);

// Load more notifications
export const loadMoreNotifications = createAsyncThunk(
  'notification/loadMoreNotifications',
  async (page: number, { getState }) => {
    const state = getState() as { notification: NotificationState };
    const response = await notificationApi.getNotifications({
      ...state.notification.filters,
      page,
    });
    return response;
  }
);

// Fetch notification by ID
export const fetchNotificationById = createAsyncThunk(
  'notification/fetchNotificationById',
  async (id: number) => {
    const notification = await notificationApi.getNotificationById(id);
    return notification;
  }
);

// Fetch notification stats
export const fetchNotificationStats = createAsyncThunk(
  'notification/fetchNotificationStats',
  async () => {
    const stats = await notificationApi.getNotificationStats();
    return stats;
  }
);

// Fetch unread count
export const fetchUnreadCount = createAsyncThunk(
  'notification/fetchUnreadCount',
  async () => {
    const count = await notificationApi.getUnreadCount();
    return count;
  }
);

// Mark notification as read
export const markAsRead = createAsyncThunk(
  'notification/markAsRead',
  async (id: number) => {
    const notification = await notificationApi.markNotificationAsRead(id);
    return notification;
  }
);

// Mark notification as unread
export const markAsUnread = createAsyncThunk(
  'notification/markAsUnread',
  async (id: number) => {
    const notification = await notificationApi.markNotificationAsUnread(id);
    return notification;
  }
);

// Mark all as read
export const markAllAsRead = createAsyncThunk(
  'notification/markAllAsRead',
  async () => {
    await notificationApi.markAllAsRead();
  }
);

// Delete notification
export const deleteNotification = createAsyncThunk(
  'notification/deleteNotification',
  async (id: number) => {
    await notificationApi.deleteNotification(id);
    return id;
  }
);

// Delete multiple notifications
export const deleteNotifications = createAsyncThunk(
  'notification/deleteNotifications',
  async (ids: number[]) => {
    await notificationApi.deleteNotifications(ids);
    return ids;
  }
);

// Archive notification
export const archiveNotification = createAsyncThunk(
  'notification/archiveNotification',
  async (id: number) => {
    const notification = await notificationApi.archiveNotification(id);
    return notification;
  }
);

// Fetch notification preferences
export const fetchPreferences = createAsyncThunk(
  'notification/fetchPreferences',
  async () => {
    const preferences = await notificationApi.getNotificationPreferences();
    return preferences;
  }
);

// Update notification preferences
export const updatePreferences = createAsyncThunk(
  'notification/updatePreferences',
  async (preferences: Partial<NotificationPreferences>) => {
    const updated = await notificationApi.updateNotificationPreferences(preferences);
    return updated;
  }
);

// Clear read notifications
export const clearReadNotifications = createAsyncThunk(
  'notification/clearReadNotifications',
  async () => {
    await notificationApi.clearReadNotifications();
  }
);

/**
 * Notification Slice
 */
const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    // Set filters
    setFilters: (state, action: PayloadAction<NotificationListParams>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.page = 1;
    },
    
    // Clear filters
    clearFilters: (state) => {
      state.filters = { page: 1, limit: 20 };
      state.page = 1;
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    
    // Clear selected notification
    clearSelectedNotification: (state) => {
      state.selectedNotification = null;
    },
    
    // Reset state
    resetNotificationState: (state) => {
      return state = {...state, ...initialState};
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload.notifications;
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch notifications';
      })
      
      // Refresh notifications
      .addCase(refreshNotifications.pending, (state) => {
        state.isRefreshing = true;
        state.error = null;
      })
      .addCase(refreshNotifications.fulfilled, (state, action) => {
        state.isRefreshing = false;
        state.notifications = action.payload.notifications;
        state.hasMore = action.payload.hasMore;
        state.page = 1;
      })
      .addCase(refreshNotifications.rejected, (state, action) => {
        state.isRefreshing = false;
        state.error = action.error.message || 'Failed to refresh notifications';
      })
      
      // Load more notifications
      .addCase(loadMoreNotifications.pending, (state) => {
        state.isLoadingMore = true;
        state.error = null;
      })
      .addCase(loadMoreNotifications.fulfilled, (state, action) => {
        state.isLoadingMore = false;
        state.notifications = [...state.notifications, ...action.payload.notifications];
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
      })
      .addCase(loadMoreNotifications.rejected, (state, action) => {
        state.isLoadingMore = false;
        state.error = action.error.message || 'Failed to load more notifications';
      })
      
      // Fetch notification by ID
      .addCase(fetchNotificationById.fulfilled, (state, action) => {
        state.selectedNotification = action.payload;
      })
      
      // Fetch notification stats
      .addCase(fetchNotificationStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      
      // Fetch unread count
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      
      // Mark as read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const index = state.notifications.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          state.notifications[index] = action.payload;
        }
        if (state.unreadCount > 0) {
          state.unreadCount--;
        }
      })
      
      // Mark as unread
      .addCase(markAsUnread.fulfilled, (state, action) => {
        const index = state.notifications.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          state.notifications[index] = action.payload;
        }
        state.unreadCount++;
      })
      
      // Mark all as read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((n) => ({
          ...n,
          status: NotificationStatus.READ,
          readAt: new Date().toISOString(),
        }));
        state.unreadCount = 0;
      })
      
      // Delete notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.notifications = state.notifications.filter((n) => n.id !== action.payload);
      })
      
      // Delete notifications
      .addCase(deleteNotifications.fulfilled, (state, action) => {
        state.notifications = state.notifications.filter((n) => !action.payload.includes(n.id));
      })
      
      // Archive notification
      .addCase(archiveNotification.fulfilled, (state, action) => {
        const index = state.notifications.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          state.notifications[index] = action.payload;
        }
      })
      
      // Fetch preferences
      .addCase(fetchPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      })
      
      // Update preferences
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      })
      
      // Clear read notifications
      .addCase(clearReadNotifications.fulfilled, (state) => {
        state.notifications = state.notifications.filter(
          (n) => n.status === NotificationStatus.UNREAD
        );
      });
  },
});

// Export actions
export const {
  setFilters,
  clearFilters,
  clearError,
  clearSelectedNotification,
  resetNotificationState,
} = notificationSlice.actions;

// Export reducer
export default notificationSlice.reducer;
