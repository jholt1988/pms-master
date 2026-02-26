import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { InspectionsListScreen, InspectionDetailScreen } from '../screens/inspections';
import type { InspectionsStackParamList } from './types';

const Stack = createNativeStackNavigator<InspectionsStackParamList>();

export function InspectionsStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="InspectionsList"
        component={InspectionsListScreen}
        options={{ title: 'Inspections' }}
      />
      <Stack.Screen
        name="InspectionDetail"
        component={InspectionDetailScreen}
        options={{ title: 'Inspection detail' }}
      />
    </Stack.Navigator>
  );
}
