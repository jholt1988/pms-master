import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { format, addMonths, differenceInCalendarDays, formatDistanceToNowStrict } from 'date-fns';
import { dashboardApi, TenantDashboardLease, TenantDashboardResponse } from '../../api/dashboard';
import { Loading } from '../../components/common';
import type { HomeScreenProps } from '../../navigation/types';
import * as theme from '../../theme';

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [dashboard, setDashboard] = useState<TenantDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await dashboardApi.getTenantDashboard();
      setDashboard(response);
      setError(null);
    } catch (err) {
      console.error('[HomeScreen] Failed to load dashboard', err);
      setError('Unable to load dashboard data. Pull to refresh to retry.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const activeLease = useMemo(() => selectActiveLease(dashboard?.leases ?? []), [dashboard]);
  const upcomingInspection = dashboard?.recentInspections?.[0];
  const recentActivity = useMemo(() => buildRecentActivity(dashboard), [dashboard]);
  const heroData = useMemo(() => buildHeroData(activeLease), [activeLease]);

  const quickActions = useMemo(
    () => [
      {
        id: 'pay',
        title: 'Pay Rent',
        subtitle: 'Secure payment',
        emoji: '💳',
        action: () => navigation.navigate('Payments'),
      },
      {
        id: 'request',
        title: 'Submit Request',
        subtitle: 'Log an issue',
        emoji: '🛠️',
        action: () => navigation.navigate('Maintenance'),
      },
      {
        id: 'messages',
        title: 'Messages',
        subtitle: 'Check updates',
        emoji: '💬',
        action: () => navigation.navigate('Notifications'),
      },
      {
        id: 'profile',
        title: 'Profile',
        subtitle: 'Account details',
        emoji: '👤',
        action: () => navigation.navigate('Profile'),
      },
    ],
    [navigation]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.fullScreen}>
        <Loading fullScreen text="Loading your dashboard" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadDashboard(true)} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.location}>
              {activeLease?.unit?.property?.name ?? 'Your home'} · {activeLease?.unit?.unitNumber ?? 'Unit'}
            </Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => loadDashboard()} style={styles.retryButton}>
              <Text style={styles.retryLabel}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.heroCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={styles.heroLabel}>Rent due</Text>
              <Text style={styles.heroAmount}>{heroData.amountLabel}</Text>
              <Text style={styles.heroSubtext}>{heroData.dueLabel}</Text>
            </View>
            <TouchableOpacity style={styles.payButton} onPress={() => navigation.navigate('Payments')}>
              <Text style={styles.payButtonText}>Pay rent</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaText}>{heroData.propertyLabel}</Text>
            <Text style={styles.heroMetaText}>{heroData.daysUntilDueLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity key={action.id} style={styles.quickCard} onPress={action.action}>
                <Text style={styles.quickEmoji}>{action.emoji}</Text>
                <Text style={styles.quickTitle}>{action.title}</Text>
                <Text style={styles.quickSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {upcomingInspection && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming inspection</Text>
            <View style={styles.inspectionCard}>
              <View>
                <Text style={styles.inspectionTitle}>{upcomingInspection.type} inspection</Text>
                <Text style={styles.inspectionSubtitle}>
                  {format(new Date(upcomingInspection.scheduledDate), 'MMM d, yyyy • h:mm a')}
                </Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{upcomingInspection.status}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
          </View>
          {recentActivity.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No recent updates yet</Text>
              <Text style={styles.emptySubtext}>We’ll show your maintenance, inspection, and payment activity here.</Text>
            </View>
          ) : (
            recentActivity.map((item) => (
              <View key={item.id} style={styles.activityRow}>
                <View style={styles.activityIcon}>
                  <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activityMeta}>{item.meta}</Text>
                </View>
                <Text style={styles.activityTime}>{item.relativeDate}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function selectActiveLease(leases: TenantDashboardLease[]): TenantDashboardLease | undefined {
  if (!leases.length) return undefined;
  const today = new Date();
  const active = leases.find((lease) => new Date(lease.endDate) >= today);
  return active ?? leases[0];
}

function buildHeroData(lease?: TenantDashboardLease) {
  if (!lease) {
    return {
      amountLabel: '$0.00',
      dueLabel: 'No active lease',
      propertyLabel: '—',
      daysUntilDueLabel: '',
    };
  }

  const rentAmount = lease.rentAmount ?? lease.monthlyRent ?? 0;
  const nextDueDate = getNextDueDate(lease);
  const amountLabel = formatCurrency(rentAmount);
  const dueLabel = nextDueDate ? `Due ${format(nextDueDate, 'MMM d')}` : 'Due soon';
  const daysUntilDueLabel = nextDueDate
    ? `${differenceInCalendarDays(nextDueDate, new Date())} days remaining`
    : '';
  const propertyLabel = `${lease.unit?.property?.name ?? 'Property'} · ${lease.unit?.unitNumber ?? 'Unit'}`;

  return {
    amountLabel,
    dueLabel,
    propertyLabel,
    daysUntilDueLabel,
  };
}

function getNextDueDate(lease: TenantDashboardLease): Date | null {
  const payments = [...(lease.payments ?? [])].sort(
    (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  );
  if (payments.length) {
    return addMonths(new Date(payments[0].paymentDate), 1);
  }
  return lease.startDate ? new Date(lease.startDate) : null;
}

function buildRecentActivity(dashboard: TenantDashboardResponse | null) {
  if (!dashboard) return [] as Array<{ id: string; emoji: string; title: string; meta: string; relativeDate: string }>;
  const maintenance = (dashboard.maintenanceRequests ?? []).map((req) => ({
    id: `maintenance-${req.id}`,
    emoji: '🛠️',
    title: req.title,
    meta: `${capitalize(req.status)} • ${format(new Date(req.createdAt), 'MMM d, h:mm a')}`,
    timestamp: new Date(req.createdAt),
  }));

  const inspections = (dashboard.recentInspections ?? []).map((insp) => ({
    id: `inspection-${insp.id}`,
    emoji: '📋',
    title: `${insp.type} inspection`,
    meta: `${capitalize(insp.status)} • ${format(new Date(insp.scheduledDate), 'MMM d, h:mm a')}`,
    timestamp: new Date(insp.scheduledDate),
  }));

  return [...maintenance, ...inspections]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 4)
    .map((item) => ({
      ...item,
      relativeDate: formatDistanceToNowStrict(item.timestamp, { addSuffix: true }),
    }));
}

function formatCurrency(value?: number) {
  if (!value) {
    return '$0.00';
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function capitalize(value?: string) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  headerRow: {
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  location: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 28,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  heroAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
    marginVertical: 4,
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  heroMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  heroMetaText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  payButton: {
    backgroundColor: '#f97316',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  payButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  quickCard: {
    width: '47%',
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: theme.spacing.md,
    ...theme.shadows.small,
  },
  quickEmoji: {
    fontSize: 24,
    marginBottom: theme.spacing.sm,
  },
  quickTitle: {
    ...theme.typography.h6,
    color: theme.colors.text,
  },
  quickSubtitle: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  inspectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  inspectionTitle: {
    ...theme.typography.h5,
    color: theme.colors.text,
  },
  inspectionSubtitle: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  badge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: '#b45309',
    fontWeight: '600',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.tiny,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  activityTitle: {
    ...theme.typography.h6,
    color: theme.colors.text,
  },
  activityMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  activityTime: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: theme.spacing.lg,
  },
  emptyText: {
    ...theme.typography.h6,
    color: theme.colors.text,
  },
  emptySubtext: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    color: '#991b1b',
    marginBottom: theme.spacing.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ef4444',
    borderRadius: 999,
  },
  retryLabel: {
    color: '#fff',
    fontWeight: '600',
  },
});
