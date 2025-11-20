import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { Loading } from '../components/common';
import { useAppSelector } from '../store/hooks';

/**
 * Root Navigator
 * Top-level navigation that switches between Auth and Main stacks
 * based on authentication state
 */
export function RootNavigator() {
  const { isLoading, user } = useAppSelector((state) => state.auth);

  // Show loading screen while checking auth state
  if (isLoading) {
    return <Loading fullScreen text="Loading..." />;
  }

  // Render appropriate navigator based on auth state
  if (!user) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
}
