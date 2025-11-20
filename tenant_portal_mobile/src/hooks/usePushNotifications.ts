/**
 * usePushNotifications Hook
 * Manages push notification setup, listeners, and deep linking
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import * as Notifications from 'expo-notifications';
import {
  getPushToken,
  getDeviceInfo,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getLastNotificationResponse,
  setBadgeCount,
} from '../services/pushNotificationService';
import { registerPushToken } from '../api/notification';
import { fetchUnreadCount } from '../store/notificationSlice';
import { AppDispatch, RootState } from '../store';
import { NotificationAction, NotificationActionType } from '../types/notification';

type NotificationPayload = {
  action?: NotificationAction;
};

export const usePushNotifications = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const unreadCount = useSelector((state: RootState) => state.notification.unreadCount);

  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);

  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  /**
   * Register push token with backend
   */
  const registerToken = useCallback(async (token: string) => {
    try {
      const deviceInfo = getDeviceInfo();
      await registerPushToken({
        token,
        deviceId: deviceInfo.deviceId,
        platform: deviceInfo.platform,
      });
      console.log('Push token registered successfully');
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  }, []);

  /**
   * Handle notification tap navigation
   */
  const handleNotificationNavigation = useCallback((data?: NotificationPayload) => {
    if (!data?.action) return;

    const { action } = data;
    const actionType = action.type;
    const params = action.params || {};

    // Navigate based on action type
    switch (actionType) {
      case NotificationActionType.VIEW_PAYMENT:
        if (params.paymentId) {
          navigation.navigate('PaymentsStack', {
            screen: 'PaymentReceipt',
            params: { paymentId: params.paymentId },
          });
        }
        break;

      case NotificationActionType.MAKE_PAYMENT:
        navigation.navigate('PaymentsStack', {
          screen: 'MakePayment',
        });
        break;

      case NotificationActionType.VIEW_PAYMENT_HISTORY:
        navigation.navigate('PaymentsStack');
        break;

      case NotificationActionType.VIEW_MAINTENANCE_REQUEST:
        if (params.requestId) {
          navigation.navigate('MaintenanceStack', {
            screen: 'MaintenanceDetail',
            params: { requestId: params.requestId },
          });
        }
        break;

      case NotificationActionType.CREATE_MAINTENANCE_REQUEST:
        navigation.navigate('MaintenanceStack', {
          screen: 'CreateMaintenanceRequest',
        });
        break;

      case NotificationActionType.VIEW_MAINTENANCE_LIST:
        navigation.navigate('MaintenanceStack');
        break;

      case NotificationActionType.VIEW_LEASE:
        navigation.navigate('Lease');
        break;

      case NotificationActionType.RENEW_LEASE:
        if (params.leaseId) {
          navigation.navigate('Lease', {
            screen: 'LeaseRenewal',
            params: { leaseId: params.leaseId },
          });
        }
        break;

      case NotificationActionType.VIEW_DOCUMENTS:
        navigation.navigate('Lease', {
          screen: 'Documents',
        });
        break;

      case NotificationActionType.DOWNLOAD_DOCUMENT:
        if (params.documentId) {
          navigation.navigate('Lease', {
            screen: 'Documents',
            params: { documentId: params.documentId },
          });
        }
        break;

      case NotificationActionType.UPDATE_PROFILE:
        navigation.navigate('Profile');
        break;

      case NotificationActionType.OPEN_NOTIFICATIONS:
        navigation.navigate('Notifications');
        break;

      case NotificationActionType.NO_ACTION:
      default:
        // Open notifications screen as default
        navigation.navigate('Notifications');
        break;
    }
  }, [navigation]);

  /**
   * Initialize push notifications
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    // Get push token and register
    const initPushNotifications = async () => {
      const token = await getPushToken();
      if (token) {
        setExpoPushToken(token);
        await registerToken(token);
      }
    };

    initPushNotifications();

    // Set up notification listeners
    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      setNotification(notification);
      
      // Update unread count
      dispatch(fetchUnreadCount());
    });

    responseListener.current = addNotificationResponseListener((response) => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data as NotificationPayload;
      handleNotificationNavigation(data);
      
      // Update unread count
      dispatch(fetchUnreadCount());
    });

    // Check for notification that opened the app
    getLastNotificationResponse().then((response) => {
      if (response) {
        const data = response.notification.request.content.data as NotificationPayload;
        handleNotificationNavigation(data);
      }
    });

    // Cleanup listeners
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [dispatch, handleNotificationNavigation, isAuthenticated, registerToken]);

  /**
   * Update badge count when unread count changes
   */
  useEffect(() => {
    setBadgeCount(unreadCount);
  }, [unreadCount]);

  return {
    expoPushToken,
    notification,
  };
};
