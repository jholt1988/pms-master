/**
 * Message Redux Slice
 * Manages messaging state with async thunks
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  Message,
  MessageThread,
  CreateMessageDto,
  CreateThreadDto,
  UpdateThreadDto,
  MessageListParams,
  ThreadListParams,
} from '../types/message';
import * as messageApi from '../api/message';

/**
 * Message state interface
 */
interface MessageState {
  threads: MessageThread[];
  currentThread: MessageThread | null;
  messages: Message[];
  unreadCount: number;
  unreadByThread: { [threadId: number]: number };
  filters: ThreadListParams;
  isLoading: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  error: string | null;
  hasMoreThreads: boolean;
  hasMoreMessages: boolean;
  threadsPage: number;
  messagesPage: number;
}

/**
 * Initial state
 */
const initialState: MessageState = {
  threads: [],
  currentThread: null,
  messages: [],
  unreadCount: 0,
  unreadByThread: {},
  filters: {
    page: 1,
    limit: 20,
  },
  isLoading: false,
  isLoadingMessages: false,
  isSending: false,
  error: null,
  hasMoreThreads: true,
  hasMoreMessages: true,
  threadsPage: 1,
  messagesPage: 1,
};

/**
 * Async Thunks
 */

// Fetch threads
export const fetchThreads = createAsyncThunk(
  'message/fetchThreads',
  async (params?: ThreadListParams) => {
    const response = await messageApi.getThreads(params);
    return response;
  }
);

// Load more threads
export const loadMoreThreads = createAsyncThunk(
  'message/loadMoreThreads',
  async (page: number, { getState }) => {
    const state = getState() as { message: MessageState };
    const response = await messageApi.getThreads({
      ...state.message.filters,
      page,
    });
    return response;
  }
);

// Fetch thread by ID
export const fetchThreadById = createAsyncThunk(
  'message/fetchThreadById',
  async (id: number) => {
    const thread = await messageApi.getThreadById(id);
    return thread;
  }
);

// Create thread
export const createThread = createAsyncThunk(
  'message/createThread',
  async (data: CreateThreadDto) => {
    const thread = await messageApi.createThread(data);
    return thread;
  }
);

// Update thread
export const updateThread = createAsyncThunk(
  'message/updateThread',
  async ({ id, data }: { id: number; data: UpdateThreadDto }) => {
    const thread = await messageApi.updateThread(id, data);
    return thread;
  }
);

// Archive thread
export const archiveThread = createAsyncThunk(
  'message/archiveThread',
  async (id: number) => {
    const thread = await messageApi.archiveThread(id);
    return thread;
  }
);

// Close thread
export const closeThread = createAsyncThunk('message/closeThread', async (id: number) => {
  const thread = await messageApi.closeThread(id);
  return thread;
});

// Fetch messages
export const fetchMessages = createAsyncThunk(
  'message/fetchMessages',
  async (params: MessageListParams) => {
    const response = await messageApi.getMessages(params);
    return response;
  }
);

// Load more messages
export const loadMoreMessages = createAsyncThunk(
  'message/loadMoreMessages',
  async ({ threadId, page }: { threadId: number; page: number }) => {
    const response = await messageApi.getMessages({
      threadId,
      page,
      limit: 20,
    });
    return response;
  }
);

// Send message
export const sendMessage = createAsyncThunk(
  'message/sendMessage',
  async (data: CreateMessageDto) => {
    const message = await messageApi.sendMessage(data);
    return message;
  }
);

// Mark message as read
export const markMessageAsRead = createAsyncThunk(
  'message/markMessageAsRead',
  async (id: number) => {
    const message = await messageApi.markMessageAsRead(id);
    return message;
  }
);

// Mark thread as read
export const markThreadAsRead = createAsyncThunk(
  'message/markThreadAsRead',
  async (threadId: number) => {
    await messageApi.markThreadAsRead(threadId);
    return threadId;
  }
);

// Fetch unread count
export const fetchUnreadCount = createAsyncThunk('message/fetchUnreadCount', async () => {
  const count = await messageApi.getUnreadCount();
  return count;
});

// Delete message
export const deleteMessage = createAsyncThunk('message/deleteMessage', async (id: number) => {
  await messageApi.deleteMessage(id);
  return id;
});

/**
 * Message Slice
 */
const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    // Set filters
    setFilters: (state, action: PayloadAction<ThreadListParams>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.threadsPage = 1;
    },

    // Clear filters
    clearFilters: (state) => {
      state.filters = { page: 1, limit: 20 };
      state.threadsPage = 1;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Clear current thread
    clearCurrentThread: (state) => {
      state.currentThread = null;
      state.messages = [];
      state.messagesPage = 1;
    },

    // Reset state
    resetMessageState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch threads
      .addCase(fetchThreads.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchThreads.fulfilled, (state, action) => {
        state.isLoading = false;
        state.threads = action.payload.threads;
        state.hasMoreThreads = action.payload.hasMore;
        state.threadsPage = action.payload.page;
      })
      .addCase(fetchThreads.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch threads';
      })

      // Load more threads
      .addCase(loadMoreThreads.fulfilled, (state, action) => {
        state.threads = [...state.threads, ...action.payload.threads];
        state.hasMoreThreads = action.payload.hasMore;
        state.threadsPage = action.payload.page;
      })

      // Fetch thread by ID
      .addCase(fetchThreadById.fulfilled, (state, action) => {
        state.currentThread = action.payload;
      })

      // Create thread
      .addCase(createThread.fulfilled, (state, action) => {
        state.threads = [action.payload, ...state.threads];
        state.currentThread = action.payload;
      })

      // Update thread
      .addCase(updateThread.fulfilled, (state, action) => {
        const index = state.threads.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.threads[index] = action.payload;
        }
        if (state.currentThread?.id === action.payload.id) {
          state.currentThread = action.payload;
        }
      })

      // Archive thread
      .addCase(archiveThread.fulfilled, (state, action) => {
        const index = state.threads.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.threads[index] = action.payload;
        }
      })

      // Close thread
      .addCase(closeThread.fulfilled, (state, action) => {
        const index = state.threads.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.threads[index] = action.payload;
        }
      })

      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.isLoadingMessages = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoadingMessages = false;
        state.messages = action.payload.messages;
        state.hasMoreMessages = action.payload.hasMore;
        state.messagesPage = action.payload.page;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoadingMessages = false;
        state.error = action.error.message || 'Failed to fetch messages';
      })

      // Load more messages
      .addCase(loadMoreMessages.fulfilled, (state, action) => {
        state.messages = [...action.payload.messages, ...state.messages];
        state.hasMoreMessages = action.payload.hasMore;
        state.messagesPage = action.payload.page;
      })

      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.isSending = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isSending = false;
        state.messages = [...state.messages, action.payload];

        // Update thread's last message
        if (state.currentThread && state.currentThread.id === action.payload.threadId) {
          state.currentThread.lastMessage = action.payload;
          state.currentThread.updatedAt = action.payload.createdAt;
        }

        // Update thread in list
        const threadIndex = state.threads.findIndex(
          (t) => t.id === action.payload.threadId
        );
        if (threadIndex !== -1) {
          state.threads[threadIndex].lastMessage = action.payload;
          state.threads[threadIndex].updatedAt = action.payload.createdAt;
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isSending = false;
        state.error = action.error.message || 'Failed to send message';
      })

      // Mark message as read
      .addCase(markMessageAsRead.fulfilled, (state, action) => {
        const index = state.messages.findIndex((m) => m.id === action.payload.id);
        if (index !== -1) {
          state.messages[index] = action.payload;
        }
      })

      // Mark thread as read
      .addCase(markThreadAsRead.fulfilled, (state, action) => {
        const threadId = action.payload;
        if (state.unreadByThread[threadId]) {
          state.unreadCount -= state.unreadByThread[threadId];
          state.unreadByThread[threadId] = 0;
        }

        // Update thread
        const threadIndex = state.threads.findIndex((t) => t.id === threadId);
        if (threadIndex !== -1) {
          state.threads[threadIndex].unreadCount = 0;
        }
        if (state.currentThread?.id === threadId) {
          state.currentThread.unreadCount = 0;
        }
      })

      // Fetch unread count
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.total;
        state.unreadByThread = action.payload.byThread;
      })

      // Delete message
      .addCase(deleteMessage.fulfilled, (state, action) => {
        state.messages = state.messages.filter((m) => m.id !== action.payload);
      });
  },
});

// Export actions
export const {
  setFilters,
  clearFilters,
  clearError,
  clearCurrentThread,
  resetMessageState,
} = messageSlice.actions;

// Export reducer
export default messageSlice.reducer;
