/**
 * Notification API Service
 * Handles all notification-related API calls
 */

import axios from 'axios';
import {
  Notification,
  NotificationPreferences,
  NotificationStats,
  PushNotificationToken,
  NotificationListParams,
  NotificationListResponse,
} from '../types/notification';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Get all notifications for the current user
 */
export const getNotifications = async (
  params?: NotificationListParams
): Promise<NotificationListResponse> => {
  const response = await axios.get(`${API_BASE_URL}/notifications`, { params });
  return response.data;
};

/**
 * Get a single notification by ID
 */
export const getNotificationById = async (id: number): Promise<Notification> => {
  const response = await axios.get(`${API_BASE_URL}/notifications/${id}`);
  return response.data;
};

/**
 * Get notification statistics
 */
export const getNotificationStats = async (): Promise<NotificationStats> => {
  const response = await axios.get(`${API_BASE_URL}/notifications/stats`);
  return response.data;
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (): Promise<number> => {
  const response = await axios.get(`${API_BASE_URL}/notifications/unread-count`);
  return response.data.count;
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (id: number): Promise<Notification> => {
  const response = await axios.patch(`${API_BASE_URL}/notifications/${id}/read`);
  return response.data;
};

/**
 * Mark notification as unread
 */
export const markNotificationAsUnread = async (id: number): Promise<Notification> => {
  const response = await axios.patch(`${API_BASE_URL}/notifications/${id}/unread`);
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (): Promise<void> => {
  await axios.patch(`${API_BASE_URL}/notifications/mark-all-read`);
};

/**
 * Delete a notification
 */
export const deleteNotification = async (id: number): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/notifications/${id}`);
};

/**
 * Delete multiple notifications
 */
export const deleteNotifications = async (ids: number[]): Promise<void> => {
  await axios.post(`${API_BASE_URL}/notifications/bulk-delete`, { ids });
};

/**
 * Archive a notification
 */
export const archiveNotification = async (id: number): Promise<Notification> => {
  const response = await axios.patch(`${API_BASE_URL}/notifications/${id}/archive`);
  return response.data;
};

/**
 * Get notification preferences
 */
export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const response = await axios.get(`${API_BASE_URL}/notifications/preferences`);
  return response.data;
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> => {
  const response = await axios.patch(`${API_BASE_URL}/notifications/preferences`, preferences);
  return response.data;
};

/**
 * Register push notification token
 */
export const registerPushToken = async (
  tokenData: Omit<PushNotificationToken, 'createdAt' | 'updatedAt'>
): Promise<PushNotificationToken> => {
  const response = await axios.post(`${API_BASE_URL}/notifications/push-token`, tokenData);
  return response.data;
};

/**
 * Unregister push notification token
 */
export const unregisterPushToken = async (token: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/notifications/push-token/${token}`);
};

/**
 * Test push notification
 */
export const testPushNotification = async (): Promise<void> => {
  await axios.post(`${API_BASE_URL}/notifications/test-push`);
};

/**
 * Clear all read notifications
 */
export const clearReadNotifications = async (): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/notifications/clear-read`);
};

/**
 * Get notifications by category
 */
export const getNotificationsByCategory = async (
  category: string,
  params?: NotificationListParams
): Promise<NotificationListResponse> => {
  const response = await axios.get(`${API_BASE_URL}/notifications/category/${category}`, {
    params,
  });
  return response.data;
};
