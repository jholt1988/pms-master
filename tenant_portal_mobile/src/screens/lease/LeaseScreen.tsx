import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, ActivityIndicator, Card } from 'react-native-paper';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { format, differenceInDays, parseISO } from 'date-fns';

import { theme } from '../../theme';
import { LeaseStatus, RenewalStatus } from '../../types/lease';
import {
  fetchCurrentLease,
  fetchLeaseSummary,
  clearError,
} from '../../store/leaseSlice';
import { RootState, AppDispatch } from '../../store';

/**
 * Lease Screen
 * Display current lease information, documents, and renewal options
 */
export default function LeaseScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const dispatch = useDispatch<AppDispatch>();

  const { currentLease, isLoading, error } = useSelector(
    (state: RootState) => state.lease
  );

  const [refreshing, setRefreshing] = useState(false);

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
        dispatch(fetchCurrentLease()).unwrap(),
        dispatch(fetchLeaseSummary()).unwrap(),
      ]);
    } catch (err) {
      console.error('Failed to load lease data:', err);
    }
  }, [dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusColor = (status: LeaseStatus): string => {
    switch (status) {
      case LeaseStatus.ACTIVE:
        return theme.colors.success;
      case LeaseStatus.EXPIRING:
        return theme.colors.warning;
      case LeaseStatus.EXPIRED:
      case LeaseStatus.TERMINATED:
        return theme.colors.error;
      case LeaseStatus.PENDING:
        return theme.colors.info;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getDaysUntilExpiration = (): number | null => {
    if (!currentLease?.endDate) return null;
    return differenceInDays(parseISO(currentLease.endDate), new Date());
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const handleViewDocuments = () => {
    navigation.navigate('Documents');
  };

  const handleRenewalOptions = () => {
    if (currentLease) {
      navigation.navigate('LeaseRenewal', { leaseId: currentLease.id });
    }
  };

  const handleMoveOut = () => {
    if (currentLease) {
      navigation.navigate('MoveOutNotice', { leaseId: currentLease.id });
    }
  };

  if (isLoading && !currentLease) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading lease information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentLease) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyTitle}>No Active Lease</Text>
            <Text style={styles.emptyText}>
            You don’t have an active lease at this time.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const daysUntilExpiration = getDaysUntilExpiration();
  const showRenewalWarning =
    daysUntilExpiration !== null &&
    daysUntilExpiration <= 90 &&
    daysUntilExpiration > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Lease</Text>
          <Text style={styles.subtitle}>Lease agreement and property details</Text>
        </View>

        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(currentLease.status) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(currentLease.status) },
            ]}
          >
            {currentLease.status.replace('_', ' ')}
          </Text>
        </View>

        {/* Renewal Warning */}
        {showRenewalWarning && (
          <Card style={styles.warningCard}>
            <Card.Content>
              <View style={styles.warningContent}>
                <Text style={styles.warningIcon}>⏰</Text>
                <View style={styles.warningTextContainer}>
                  <Text style={styles.warningTitle}>Lease Expiring Soon</Text>
                  <Text style={styles.warningText}>
                    Your lease expires in {daysUntilExpiration} days on{' '}
                    {formatDate(currentLease.endDate)}
                  </Text>
                </View>
              </View>
              {currentLease.renewalEligible && (
                <Button
                  mode="contained"
                  onPress={handleRenewalOptions}
                  style={styles.warningButton}
                  compact
                >
                  View Renewal Options
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Property Information */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>🏠 Property Information</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Property</Text>
                <Text style={styles.infoValue}>{currentLease.propertyName}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Unit</Text>
                <Text style={styles.infoValue}>Unit {currentLease.unitNumber}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>
                  {currentLease.propertyAddress}
                  {'\n'}
                  {currentLease.propertyCity}, {currentLease.propertyState}{' '}
                  {currentLease.propertyZip}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Lease Terms */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>📋 Lease Terms</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Start Date</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(currentLease.startDate)}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>End Date</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(currentLease.endDate)}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Monthly Rent</Text>
                  <Text style={[styles.infoValue, styles.amountText]}>
                    {formatCurrency(currentLease.monthlyRent)}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Lease Term</Text>
                  <Text style={styles.infoValue}>
                    {currentLease.leaseTermMonths} months
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Security Deposit</Text>
                <Text style={styles.infoValue}>
                  {formatCurrency(currentLease.securityDeposit)}
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Notice Required</Text>
                <Text style={styles.infoValue}>
                  {currentLease.noticeRequiredDays} days
                </Text>
              </View>

              {currentLease.parkingSpaces && currentLease.parkingSpaces > 0 && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Parking Spaces</Text>
                  <Text style={styles.infoValue}>
                    {currentLease.parkingSpaces}
                  </Text>
                </View>
              )}

              {currentLease.petDeposit && currentLease.petDeposit > 0 && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Pet Deposit</Text>
                  <Text style={styles.infoValue}>
                    {formatCurrency(currentLease.petDeposit)}
                  </Text>
                </View>
              )}

              {currentLease.storageUnit && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Storage Unit</Text>
                  <Text style={styles.infoValue}>{currentLease.storageUnit}</Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Renewal Information */}
        {currentLease.renewalEligible && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>🔄 Renewal Information</Text>
              <View style={styles.infoGrid}>
                {currentLease.renewalStatus && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Renewal Status</Text>
                    <Text style={styles.infoValue}>
                      {currentLease.renewalStatus.replace('_', ' ')}
                    </Text>
                  </View>
                )}
                {currentLease.renewalOfferedRent && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Offered Renewal Rent</Text>
                    <Text style={[styles.infoValue, styles.amountText]}>
                      {formatCurrency(currentLease.renewalOfferedRent)}/month
                    </Text>
                  </View>
                )}
              </View>
              {currentLease.renewalStatus !== RenewalStatus.PENDING && (
                <Button
                  mode="contained"
                  onPress={handleRenewalOptions}
                  style={styles.actionButton}
                >
                  Request Renewal
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleViewDocuments}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>📄</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Documents</Text>
              <Text style={styles.actionDescription}>
                Lease agreement, addendums, and notices
              </Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          {currentLease.renewalEligible && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleRenewalOptions}
            >
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>🔄</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Renewal Options</Text>
                <Text style={styles.actionDescription}>
                  Explore lease renewal terms
                </Text>
              </View>
              <Text style={styles.actionChevron}>›</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.actionCard} onPress={handleMoveOut}>
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>📦</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Move-Out Notice</Text>
              <Text style={styles.actionDescription}>
                Submit notice of intent to vacate
              </Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.lg,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  warningCard: {
    backgroundColor: theme.colors.warning + '15',
    marginBottom: theme.spacing.lg,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  warningIcon: {
    fontSize: 40,
    marginRight: theme.spacing.md,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  warningText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  warningButton: {
    borderRadius: theme.borderRadius.medium,
  },
  card: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  infoGrid: {
    gap: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
    lineHeight: 22,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  actionsSection: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.small,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  actionDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  actionChevron: {
    fontSize: 32,
    color: theme.colors.textSecondary,
    fontWeight: '300',
  },
  actionButton: {
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
  },
});
