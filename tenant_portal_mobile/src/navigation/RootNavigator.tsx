import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { AdminNavigator } from './AdminNavigator';
import { Loading } from '../components/common';
import { useAppSelector } from '../store/hooks';

export function RootNavigator() {
  const { isLoading, user } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return <Loading fullScreen text="Loading..." />;
  }

  if (!user) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  if (user.role === 'PROPERTY_MANAGER' || user.role === 'ADMIN') {
    return (
      <NavigationContainer>
        <AdminNavigator />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
}
