import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { PropertiesStackNavigator } from './PropertiesStackNavigator';
import ProfileScreen from '../screens/profile/ProfileScreen';
import * as theme from '../theme';
import { AdminTabParamList } from './types';

const Tab = createBottomTabNavigator<AdminTabParamList>();

export function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <TabIcon name="📊" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Properties"
        component={PropertiesStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <TabIcon name="🏢" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <TabIcon name="👤" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  return <Text style={{ fontSize: size, opacity: color === theme.colors.primary ? 1 : 0.6 }}>{name}</Text>;
}
