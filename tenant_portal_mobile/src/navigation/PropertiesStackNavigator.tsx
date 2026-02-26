import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PropertiesListScreen } from '../screens/properties/PropertiesListScreen';
import { PropertyDetailScreen } from '../screens/properties/PropertyDetailScreen';
import { PropertiesStackParamList } from './types';

const Stack = createNativeStackNavigator<PropertiesStackParamList>();

export function PropertiesStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PropertiesList"
        component={PropertiesListScreen}
        options={{ title: 'Properties' }}
      />
      <Stack.Screen
        name="PropertyDetail"
        component={PropertyDetailScreen}
        options={{ title: 'Property Details' }}
      />
    </Stack.Navigator>
  );
}
