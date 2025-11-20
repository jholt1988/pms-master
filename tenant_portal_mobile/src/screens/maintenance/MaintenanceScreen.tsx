import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
  fetchMaintenanceRequests,
  fetchMaintenanceSummary,
  clearError,
} from '../../store/maintenanceSlice';
import {
  MaintenanceRequest,
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceCategory,
} from '../../types/maintenance';
import * as theme from '../../theme';

/**
 * Maintenance Screen
 * List of maintenance requests with filtering and status tracking
 */
export default function MaintenanceScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const { requests, summary, error } = useSelector(
    (state: RootState) => state.maintenance
  );

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [dispatch, error]);

  const loadData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchMaintenanceRequests()).unwrap(),
        dispatch(fetchMaintenanceSummary()).unwrap(),
      ]);
    } catch (err) {
      console.error('Failed to load maintenance data:', err);
    }
  }, [dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateRequest = () => {
    navigation.navigate('CreateMaintenanceRequest');
  };

  const handleRequestPress = (request: MaintenanceRequest) => {
    navigation.navigate('MaintenanceDetail', { requestId: request.id });
  };

  const filteredRequests = requests.filter((request: MaintenanceRequest) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return request.status === MaintenanceStatus.PENDING;
    if (filter === 'in_progress') {
      return (
        request.status === MaintenanceStatus.ASSIGNED ||
        request.status === MaintenanceStatus.IN_PROGRESS
      );
    }
    if (filter === 'completed') return request.status === MaintenanceStatus.COMPLETED;
    return true;
  });

  const getPriorityColor = (priority: MaintenancePriority) => {
    switch (priority) {
      case MaintenancePriority.EMERGENCY:
        return theme.colors.error;
      case MaintenancePriority.HIGH:
        return theme.colors.warning;
      case MaintenancePriority.MEDIUM:
        return theme.colors.info;
      case MaintenancePriority.LOW:
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case MaintenanceStatus.COMPLETED:
        return theme.colors.success;
      case MaintenanceStatus.IN_PROGRESS:
      case MaintenanceStatus.ASSIGNED:
        return theme.colors.info;
      case MaintenanceStatus.PENDING:
        return theme.colors.warning;
      case MaintenanceStatus.CANCELLED:
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: MaintenanceStatus) => {
    switch (status) {
      case MaintenanceStatus.COMPLETED:
        return '✓';
      case MaintenanceStatus.IN_PROGRESS:
        return '⚙️';
      case MaintenanceStatus.ASSIGNED:
        return '👤';
      case MaintenanceStatus.PENDING:
        return '⏳';
      case MaintenanceStatus.CANCELLED:
        return '✗';
      default:
        return '•';
    }
  };

  const getCategoryIcon = (category: MaintenanceCategory) => {
    switch (category) {
      case MaintenanceCategory.PLUMBING:
        return '🚰';
      case MaintenanceCategory.ELECTRICAL:
        return '⚡';
      case MaintenanceCategory.HVAC:
        return '❄️';
      case MaintenanceCategory.APPLIANCE:
        return '🔌';
      case MaintenanceCategory.STRUCTURAL:
        return '🏗️';
      case MaintenanceCategory.PEST_CONTROL:
        return '🐛';
      case MaintenanceCategory.LOCKS_KEYS:
        return '🔑';
      case MaintenanceCategory.LANDSCAPING:
        return '🌿';
      case MaintenanceCategory.GENERAL:
        return '🔧';
      case MaintenanceCategory.OTHER:
        return '❓';
      default:
        return '🔧';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Maintenance</Text>
          <Text style={styles.subtitle}>Track and manage your requests</Text>
        </View>

        {/* Summary Cards */}
        {summary && (
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, styles.pendingCard]}>
              <Text style={styles.summaryNumber}>{summary.pendingRequests}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
            <View style={[styles.summaryCard, styles.activeCard]}>
              <Text style={styles.summaryNumber}>{summary.inProgressRequests}</Text>
              <Text style={styles.summaryLabel}>In Progress</Text>
            </View>
            <View style={[styles.summaryCard, styles.completedCard]}>
              <Text style={styles.summaryNumber}>{summary.completedRequests}</Text>
              <Text style={styles.summaryLabel}>Completed</Text>
            </View>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({requests.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
            onPress={() => setFilter('pending')}
          >
            <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
              Pending ({summary?.pendingRequests || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'in_progress' && styles.filterTabActive]}
            onPress={() => setFilter('in_progress')}
          >
            <Text
              style={[styles.filterText, filter === 'in_progress' && styles.filterTextActive]}
            >
              Active ({summary?.inProgressRequests || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
            onPress={() => setFilter('completed')}
          >
            <Text
              style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}
            >
              Done ({summary?.completedRequests || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Request List */}
        <View style={styles.requestsSection}>
          {filteredRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No requests found</Text>
              <Text style={styles.emptySubtext}>
                {filter === 'all'
                  ? 'Create your first maintenance request'
                  : `No ${filter.replace('_', ' ')} requests`}
              </Text>
            </View>
          ) : (
            filteredRequests.map((request: MaintenanceRequest) => (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() => handleRequestPress(request)}
              >
                <View style={styles.requestHeader}>
                  <View style={styles.requestTitleRow}>
                    <Text style={styles.categoryIcon}>
                      {getCategoryIcon(request.category)}
                    </Text>
                    <Text style={styles.requestTitle} numberOfLines={1}>
                      {request.title}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: `${getPriorityColor(request.priority)}20` },
                    ]}
                  >
                    <Text
                      style={[styles.priorityText, { color: getPriorityColor(request.priority) }]}
                    >
                      {request.priority}
                    </Text>
                  </View>
                </View>

                <Text style={styles.requestDescription} numberOfLines={2}>
                  {request.description}
                </Text>

                <View style={styles.requestFooter}>
                  <View style={styles.requestMeta}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${getStatusColor(request.status)}20` },
                      ]}
                    >
                      <Text style={styles.statusIcon}>{getStatusIcon(request.status)}</Text>
                      <Text
                        style={[styles.statusText, { color: getStatusColor(request.status) }]}
                      >
                        {request.status.replace('_', ' ')}
                      </Text>
                    </View>
                    <Text style={styles.requestDate}>{formatDate(request.createdAt)}</Text>
                  </View>
                  {request.photos && request.photos.length > 0 && (
                    <View style={styles.photoIndicator}>
                      <Text style={styles.photoIcon}>📷</Text>
                      <Text style={styles.photoCount}>{request.photos.length}</Text>
                    </View>
                  )}
                </View>

                {request.technician && (
                  <View style={styles.technicianInfo}>
                    <Text style={styles.technicianIcon}>👷</Text>
                    <Text style={styles.technicianName}>{request.technician.name}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateRequest}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  summaryCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  pendingCard: {
    backgroundColor: `${theme.colors.warning}15`,
  },
  activeCard: {
    backgroundColor: `${theme.colors.info}15`,
  },
  completedCard: {
    backgroundColor: `${theme.colors.success}15`,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  filterTab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.small,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: '#fff',
  },
  requestsSection: {
    padding: theme.spacing.lg,
    paddingTop: 0,
  },
  requestCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  requestTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  requestTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  priorityBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.small,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  requestDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.small,
    gap: 4,
  },
  statusIcon: {
    fontSize: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  requestDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoIcon: {
    fontSize: 16,
  },
  photoCount: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  technicianInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  technicianIcon: {
    fontSize: 16,
  },
  technicianName: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.large,
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 32,
  },
});

