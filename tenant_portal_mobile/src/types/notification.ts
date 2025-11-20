/**
 * Notification Type Definitions
 * Comprehensive notification system for tenant portal
 */

/**
 * Notification category types
 */
export enum NotificationCategory {
  PAYMENT = 'PAYMENT',
  MAINTENANCE = 'MAINTENANCE',
  LEASE = 'LEASE',
  DOCUMENT = 'DOCUMENT',
  SYSTEM = 'SYSTEM',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Notification read status
 */
export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Notification action types for deep linking
 */
export enum NotificationActionType {
  // Payment actions
  VIEW_PAYMENT = 'VIEW_PAYMENT',
  MAKE_PAYMENT = 'MAKE_PAYMENT',
  VIEW_PAYMENT_HISTORY = 'VIEW_PAYMENT_HISTORY',
  
  // Maintenance actions
  VIEW_MAINTENANCE_REQUEST = 'VIEW_MAINTENANCE_REQUEST',
  CREATE_MAINTENANCE_REQUEST = 'CREATE_MAINTENANCE_REQUEST',
  VIEW_MAINTENANCE_LIST = 'VIEW_MAINTENANCE_LIST',
  
  // Lease actions
  VIEW_LEASE = 'VIEW_LEASE',
  RENEW_LEASE = 'RENEW_LEASE',
  VIEW_DOCUMENTS = 'VIEW_DOCUMENTS',
  DOWNLOAD_DOCUMENT = 'DOWNLOAD_DOCUMENT',
  
  // System actions
  UPDATE_PROFILE = 'UPDATE_PROFILE',
  OPEN_NOTIFICATIONS = 'OPEN_NOTIFICATIONS',
  NO_ACTION = 'NO_ACTION',
}

/**
 * Notification action payload
 */
export type NotificationActionParams = {
  paymentId?: number;
  requestId?: number;
  leaseId?: number;
  documentId?: number;
  [key: string]: string | number | boolean | undefined;
};

export interface NotificationAction {
  type: NotificationActionType;
  params?: NotificationActionParams;
}

/**
 * Main notification interface
 */
export interface Notification {
  id: number;
  userId: number;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  action?: NotificationAction;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
}

/**
 * Notification preferences for each category
 */
export interface NotificationPreferences {
  userId: number;
  enablePushNotifications: boolean;
  categories: {
    [NotificationCategory.PAYMENT]: {
      enabled: boolean;
      pushEnabled: boolean;
      emailEnabled: boolean;
    };
    [NotificationCategory.MAINTENANCE]: {
      enabled: boolean;
      pushEnabled: boolean;
      emailEnabled: boolean;
    };
    [NotificationCategory.LEASE]: {
      enabled: boolean;
      pushEnabled: boolean;
      emailEnabled: boolean;
    };
    [NotificationCategory.DOCUMENT]: {
      enabled: boolean;
      pushEnabled: boolean;
      emailEnabled: boolean;
    };
    [NotificationCategory.SYSTEM]: {
      enabled: boolean;
      pushEnabled: boolean;
      emailEnabled: boolean;
    };
    [NotificationCategory.ANNOUNCEMENT]: {
      enabled: boolean;
      pushEnabled: boolean;
      emailEnabled: boolean;
    };
  };
}

/**
 * Notification statistics summary
 */
export interface NotificationStats {
  total: number;
  unread: number;
  byCategory: {
    [key in NotificationCategory]: number;
  };
  byPriority: {
    [key in NotificationPriority]: number;
  };
}

/**
 * Push notification token for device registration
 */
export interface PushNotificationToken {
  token: string;
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  createdAt: string;
  updatedAt: string;
}

/**
 * Create notification request payload
 */
export interface CreateNotificationDto {
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  action?: NotificationAction;
  metadata?: Record<string, unknown>;
}

/**
 * Update notification request payload
 */
export interface UpdateNotificationDto {
  status?: NotificationStatus;
  readAt?: string;
}

/**
 * Notification list query parameters
 */
export interface NotificationListParams {
  category?: NotificationCategory;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Notification list response
 */
export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
