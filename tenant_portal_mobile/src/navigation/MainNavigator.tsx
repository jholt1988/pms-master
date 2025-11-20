import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAppSelector } from '../store/hooks';
import HomeScreen from '../screens/home/HomeScreen';
import { PaymentsStackNavigator } from './PaymentsStackNavigator';
import { MaintenanceStackNavigator } from './MaintenanceStackNavigator';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { MainTabParamList } from './types';
import { RootState } from '../store';
import { usePushNotifications } from '../hooks/usePushNotifications';
import * as theme from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Main Tab Navigator
 * Bottom tab navigation for authenticated users
 */
export function MainNavigator() {
  const unreadCount = useAppSelector((state: RootState) => state.notification.unreadCount);

  usePushNotifications();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="🏠" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Payments"
        component={PaymentsStackNavigator}
        options={{
          title: 'Payments',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="💳" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Maintenance"
        component={MaintenanceStackNavigator}
        options={{
          title: 'Maintenance',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="🔧" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => (
            <TabIconWithBadge name="🔔" color={color} size={size} badgeCount={unreadCount} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="👤" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Simple emoji icon component for tab bar
 * TODO: Replace with proper icons from @expo/vector-icons in future
 */
function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  return (
    <Text
      style={{
        fontSize: size,
        opacity: color === theme.colors.primary ? 1 : 0.6,
      }}
    >
      {name}
    </Text>
  );
}

/**
 * Tab icon with badge for unread notifications
 */
function TabIconWithBadge({
  name,
  color,
  size,
  badgeCount,
}: {
  name: string;
  color: string;
  size: number;
  badgeCount: number;
}) {
  return (
    <View style={{ position: 'relative' }}>
      <Text
        style={{
          fontSize: size,
          opacity: color === theme.colors.primary ? 1 : 0.6,
        }}
      >
        {name}
      </Text>
      {badgeCount > 0 && (
        <View
          style={{
            position: 'absolute',
            right: -6,
            top: -4,
            backgroundColor: theme.colors.error,
            borderRadius: 10,
            minWidth: 18,
            height: 18,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '700',
            }}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );
}
