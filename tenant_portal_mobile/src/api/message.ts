/**
 * Message API Service
 * Handles all messaging-related API calls
 */

import axios from 'axios';
import {
  Message,
  MessageThread,
  CreateMessageDto,
  CreateThreadDto,
  UpdateThreadDto,
  MessageListParams,
  ThreadListParams,
  MessageListResponse,
  ThreadListResponse,
  UnreadMessageCount,
} from '../types/message';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Get all message threads
 */
export const getThreads = async (params?: ThreadListParams): Promise<ThreadListResponse> => {
  const response = await axios.get(`${API_BASE_URL}/messages/threads`, { params });
  return response.data;
};

/**
 * Get a single thread by ID
 */
export const getThreadById = async (id: number): Promise<MessageThread> => {
  const response = await axios.get(`${API_BASE_URL}/messages/threads/${id}`);
  return response.data;
};

/**
 * Create a new message thread
 */
export const createThread = async (data: CreateThreadDto): Promise<MessageThread> => {
  const response = await axios.post(`${API_BASE_URL}/messages/threads`, data);
  return response.data;
};

/**
 * Update a thread
 */
export const updateThread = async (
  id: number,
  data: UpdateThreadDto
): Promise<MessageThread> => {
  const response = await axios.patch(`${API_BASE_URL}/messages/threads/${id}`, data);
  return response.data;
};

/**
 * Archive a thread
 */
export const archiveThread = async (id: number): Promise<MessageThread> => {
  const response = await axios.patch(`${API_BASE_URL}/messages/threads/${id}/archive`);
  return response.data;
};

/**
 * Close a thread
 */
export const closeThread = async (id: number): Promise<MessageThread> => {
  const response = await axios.patch(`${API_BASE_URL}/messages/threads/${id}/close`);
  return response.data;
};

/**
 * Get messages for a thread
 */
export const getMessages = async (params: MessageListParams): Promise<MessageListResponse> => {
  const response = await axios.get(`${API_BASE_URL}/messages`, { params });
  return response.data;
};

/**
 * Get a single message by ID
 */
export const getMessageById = async (id: number): Promise<Message> => {
  const response = await axios.get(`${API_BASE_URL}/messages/${id}`);
  return response.data;
};

/**
 * Send a message
 */
export const sendMessage = async (data: CreateMessageDto): Promise<Message> => {
  const response = await axios.post(`${API_BASE_URL}/messages`, data);
  return response.data;
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (id: number): Promise<Message> => {
  const response = await axios.patch(`${API_BASE_URL}/messages/${id}/read`);
  return response.data;
};

/**
 * Mark all messages in a thread as read
 */
export const markThreadAsRead = async (threadId: number): Promise<void> => {
  await axios.patch(`${API_BASE_URL}/messages/threads/${threadId}/mark-read`);
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (): Promise<UnreadMessageCount> => {
  const response = await axios.get(`${API_BASE_URL}/messages/unread-count`);
  return response.data;
};

/**
 * Delete a message
 */
export const deleteMessage = async (id: number): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/messages/${id}`);
};

/**
 * Search messages
 */
export const searchMessages = async (query: string): Promise<Message[]> => {
  const response = await axios.get(`${API_BASE_URL}/messages/search`, {
    params: { q: query },
  });
  return response.data;
};
