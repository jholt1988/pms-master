import React, { useEffect, useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { inspectionsApi } from '../../api/inspections';
import { InspectionSummary } from '../../types/inspection';
import { Loading } from '../../components/common';
import { format } from 'date-fns';
import * as theme from '../../theme';
import type { InspectionsStackNavigationProp } from '../../navigation/types';

interface Props {
  navigation: InspectionsStackNavigationProp;
}

export function InspectionsListScreen({ navigation }: Props) {
  const [inspections, setInspections] = useState<InspectionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInspections = async (isPull = false) => {
    try {
      if (isPull) setIsRefreshing(true);
      else setIsLoading(true);
      const data = await inspectionsApi.list();
      setInspections(data);
      setError(null);
    } catch (err) {
      console.error('[InspectionsList] Failed to load', err);
      setError('Unable to load inspections. Pull to refresh to retry.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, []);

  const upcoming = useMemo(() => inspections.filter((insp) => insp.status === 'SCHEDULED'), [inspections]);
  const history = useMemo(() => inspections.filter((insp) => insp.status !== 'SCHEDULED'), [inspections]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.fullScreen}>
        <Loading fullScreen text="Loading inspections" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Inspections</Text>
            <Text style={styles.subtitle}>Track upcoming and recent inspections</Text>
            {error && (
              <TouchableOpacity style={styles.errorCard} onPress={() => loadInspections()}>
                <Text style={styles.errorText}>{error}</Text>
              </TouchableOpacity>
            )}
            <Section title="Upcoming">
              {upcoming.length === 0 ? (
                <EmptyState message="No upcoming inspections" />
              ) : (
                upcoming.map((inspection) => (
                  <InspectionCard key={inspection.id} inspection={inspection} onPress={() => navigation.navigate('InspectionDetail', { inspectionId: inspection.id })} />
                ))
              )}
            </Section>
            <Section title="History">
              {history.length === 0 ? (
                <EmptyState message="No inspection history" />
              ) : (
                history.map((inspection) => (
                  <InspectionCard key={inspection.id} inspection={inspection} compact onPress={() => navigation.navigate('InspectionDetail', { inspectionId: inspection.id })} />
                ))
              )}
            </Section>
          </View>
        }
        data={[]}
        renderItem={null}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadInspections(true)} />}
      />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

function InspectionCard({ inspection, onPress, compact = false }: { inspection: InspectionSummary; onPress: () => void; compact?: boolean }) {
  return (
    <TouchableOpacity style={[styles.card, compact && styles.cardCompact]} onPress={onPress}>
      <View>
        <Text style={styles.cardTitle}>{inspection.type} Inspection</Text>
        <Text style={styles.cardMeta}>
          {format(new Date(inspection.scheduledDate), 'MMM d, yyyy • h:mm a')}
        </Text>
        <Text style={styles.cardMeta}>{inspection.unit?.property?.name ?? 'Property'} · {inspection.unit?.unitNumber ?? 'Unit'}</Text>
      </View>
      <View style={[styles.statusBadge, statusBadgeStyles[inspection.status] ?? {}]}>
        <Text style={styles.statusLabel}>{inspection.status}</Text>
      </View>
    </TouchableOpacity>
  );
}

const statusBadgeStyles: Record<string, object> = {
  SCHEDULED: { backgroundColor: '#ecfdf5', borderColor: '#22c55e' },
  COMPLETED: { backgroundColor: '#e0f2fe', borderColor: '#0284c7' },
  IN_PROGRESS: { backgroundColor: '#fef9c3', borderColor: '#ca8a04' },
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h4,
    marginBottom: theme.spacing.sm,
  },
  emptyCard: {
    padding: theme.spacing.lg,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
  },
  emptyText: {
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardCompact: {
    paddingVertical: theme.spacing.sm,
  },
  cardTitle: {
    ...theme.typography.h5,
    color: theme.colors.text,
  },
  cardMeta: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusLabel: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    padding: theme.spacing.sm,
    borderRadius: 12,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: '#991b1b',
  },
});
