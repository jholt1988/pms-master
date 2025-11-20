import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as theme from '../../theme';
import type { HomeScreenProps } from '../../navigation/types';

/**
 * Home Screen - Dashboard
 * TODO: Phase 3+ - Implement full dashboard with:
 * - Rent payment status
 * - Upcoming payment due date
 * - Recent maintenance requests
 * - Important announcements
 * - Quick actions (Pay Rent, Submit Request)
 */
export default function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Welcome Home! 🏠</Text>
        <Text style={styles.subtitle}>Dashboard</Text>
        
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            🚧 Under Construction
          </Text>
          <Text style={styles.placeholderSubtext}>
            Coming in Phase 3+
          </Text>
          
          <View style={styles.featureList}>
            <Text style={styles.featureTitle}>Planned Features:</Text>
            <Text style={styles.featureItem}>• Rent payment status</Text>
            <Text style={styles.featureItem}>• Upcoming payment due date</Text>
            <Text style={styles.featureItem}>• Recent maintenance requests</Text>
            <Text style={styles.featureItem}>• Important announcements</Text>
            <Text style={styles.featureItem}>• Quick actions</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  placeholder: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  placeholderText: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  placeholderSubtext: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  featureList: {
    alignSelf: 'stretch',
    marginTop: theme.spacing.md,
  },
  featureTitle: {
    ...theme.typography.h6,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  featureItem: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
});
