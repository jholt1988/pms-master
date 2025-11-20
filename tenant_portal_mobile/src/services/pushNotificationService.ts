/**
 * Push Notification Service
 * Handles push notification registration, permissions, and token management
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Configure notification handler
 * Determines how notifications are handled when app is in foreground
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permissions not granted');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Get push notification token
 */
export const getPushToken = async (): Promise<string | null> => {
  try {
    // Check if running on a physical device
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    // Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    // Get the token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.warn('No project ID found. Using legacy token method.');
      // Fallback for development without EAS
      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData.data;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2196F3',
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

/**
 * Get device information
 */
export const getDeviceInfo = () => {
  return {
    deviceId: Constants.deviceId || 'unknown',
    platform: Platform.OS as 'ios' | 'android' | 'web',
  };
};

/**
 * Schedule a local notification
 */
export const scheduleLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, unknown>,
  triggerSeconds: number = 1
): Promise<string> => {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      seconds: triggerSeconds,
    },
  });

  return notificationId;
};

/**
 * Cancel a scheduled notification
 */
export const cancelNotification = async (notificationId: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Get badge count
 */
export const getBadgeCount = async (): Promise<number> => {
  return await Notifications.getBadgeCountAsync();
};

/**
 * Set badge count
 */
export const setBadgeCount = async (count: number): Promise<void> => {
  await Notifications.setBadgeCountAsync(count);
};

/**
 * Clear badge count
 */
export const clearBadgeCount = async (): Promise<void> => {
  await Notifications.setBadgeCountAsync(0);
};

/**
 * Add notification received listener
 */
export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void
) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Add notification response listener (when user taps notification)
 */
export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void
) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Get last notification response (for deep linking on app launch)
 */
export const getLastNotificationResponse = async (): Promise<Notifications.NotificationResponse | null> => {
  return await Notifications.getLastNotificationResponseAsync();
};

/**
 * Dismiss notification
 */
export const dismissNotification = async (notificationId: string): Promise<void> => {
  await Notifications.dismissNotificationAsync(notificationId);
};

/**
 * Dismiss all notifications
 */
export const dismissAllNotifications = async (): Promise<void> => {
  await Notifications.dismissAllNotificationsAsync();
};
