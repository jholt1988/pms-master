import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { inspectionsApi } from '../../api/inspections';
import { InspectionDetail, InspectionChecklistItem } from '../../types/inspection';
import { format } from 'date-fns';
import * as theme from '../../theme';
import type { InspectionsStackParamList } from '../../navigation/types';

interface Props {
  route: RouteProp<InspectionsStackParamList, 'InspectionDetail'>;
}

export function InspectionDetailScreen({ route }: Props) {
  const { inspectionId } = route.params;
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await inspectionsApi.get(inspectionId);
        setInspection(result);
      } catch (error) {
        console.error('[InspectionDetail] Failed to load inspection', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [inspectionId]);

  if (loading || !inspection) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading inspection…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{inspection.type} inspection</Text>
        <Text style={styles.subtitle}>{format(new Date(inspection.scheduledDate), 'MMMM d, yyyy • h:mm a')}</Text>
        <View style={styles.metaRow}>
          <Badge label={inspection.status} />
          <Text style={styles.metaText}>{inspection.unit?.property?.name ?? 'Property'} · {inspection.unit?.unitNumber ?? ''}</Text>
        </View>

        {inspection.rooms?.map((room) => (
          <View key={room.id} style={styles.roomCard}>
            <Text style={styles.roomTitle}>{room.name}</Text>
            {room.checklistItems?.map((item) => (
              <ChecklistItemRow key={item.id} item={item} />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ChecklistItemRow({ item }: { item: InspectionChecklistItem }) {
  return (
    <View style={styles.itemRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{item.itemName}</Text>
        {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
      </View>
      <View style={styles.itemButtons}>
        <TouchableOpacity style={[styles.resultButton, item.status === 'pass' && styles.resultButtonActivePass]}>
          <Text style={styles.resultText}>Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.resultButton, item.status === 'fail' && styles.resultButtonActiveFail]}>
          <Text style={styles.resultText}>Fail</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  metaText: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  badge: {
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#4338ca',
    fontWeight: '600',
  },
  roomCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  roomTitle: {
    ...theme.typography.h5,
    marginBottom: theme.spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingVertical: theme.spacing.md,
  },
  itemTitle: {
    ...theme.typography.body1,
    color: theme.colors.text,
  },
  itemNotes: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  itemButtons: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  resultButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resultButtonActivePass: {
    borderColor: '#22c55e',
    backgroundColor: '#dcfce7',
  },
  resultButtonActiveFail: {
    borderColor: '#ef4444',
    backgroundColor: '#fee2e2',
  },
  resultText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
