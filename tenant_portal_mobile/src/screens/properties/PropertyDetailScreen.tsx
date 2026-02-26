import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as theme from '../../theme';

export function PropertyDetailScreen({ route }: any) {
  const { propertyId } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Property Detail</Text>
        <Text style={styles.subtitle}>Details for property ID: {propertyId}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  title: { ...theme.typography.h2, color: theme.colors.text },
  subtitle: { ...theme.typography.body1, color: theme.colors.textSecondary },
});
