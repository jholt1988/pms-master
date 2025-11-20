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
import { useNavigation } from '@react-navigation/native';
import { Button, Loading } from '../../components/common';
import * as theme from '../../theme';
import type { PaymentsStackNavigationProp } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchPayments, fetchPaymentSummary, fetchCurrentLease, clearError } from '../../store/paymentsSlice';
import { Payment } from '../../api/payments';

/**
 * Payments Screen
 * Payment history, summary, and quick actions
 */
export default function PaymentsScreen() {
  const navigation = useNavigation<PaymentsStackNavigationProp>();
  const dispatch = useAppDispatch();
  const { payments, paymentSummary, currentLease, isLoading, error } = useAppSelector(
    (state) => state.payments
  );

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');

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
        dispatch(fetchPayments()).unwrap(),
        dispatch(fetchPaymentSummary()).unwrap(),
        dispatch(fetchCurrentLease()).unwrap(),
      ]);
    } catch (err) {
      console.error('Failed to load payment data:', err);
    }
  }, [dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMakePayment = () => {
    navigation.navigate('MakePayment');
  };

  const handleManagePaymentMethods = () => {
    navigation.navigate('PaymentMethods', { returnTo: 'PaymentsList' });
  };

  const handleSetupAutoPay = () => {
    navigation.navigate('AutoPaySetup');
  };

  const handlePaymentPress = (payment: Payment) => {
    // TODO: Navigate to payment detail screen
    Alert.alert(
      'Payment Details',
      `Amount: $${payment.amount}\nStatus: ${payment.status}\nDate: ${new Date(
        payment.paymentDate
      ).toLocaleDateString()}`,
      [{ text: 'OK' }]
    );
  };

  const filteredPayments = payments.filter((payment: Payment) => {
    if (filter === 'all') return true;
    return payment.status.toLowerCase() === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return theme.colors.success;
      case 'pending':
        return theme.colors.warning;
      case 'failed':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '✓';
      case 'pending':
        return '⏳';
      case 'failed':
        return '✗';
      default:
        return '○';
    }
  };

  if (isLoading && !payments.length) {
    return <Loading text="Loading payments..." fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Payments 💳</Text>
          <Text style={styles.subtitle}>Manage rent payments</Text>
        </View>

        {/* Payment Summary Card */}
        {paymentSummary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Current Balance</Text>
            <Text style={styles.summaryAmount}>
              ${paymentSummary.currentBalance || currentLease?.monthlyRent || 0}
            </Text>
            {paymentSummary.nextPaymentDue && (
              <Text style={styles.summaryDue}>
                Due {new Date(paymentSummary.nextPaymentDue).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="Make Payment"
            onPress={handleMakePayment}
            fullWidth
            style={styles.actionButton}
          />
          <View style={styles.actionRow}>
            <View style={styles.halfButton}>
              <Button
                title="Payment Methods"
                onPress={handleManagePaymentMethods}
                variant="outline"
              />
            </View>
            <View style={styles.halfButton}>
              <Button
                title="Auto-Pay"
                onPress={handleSetupAutoPay}
                variant="outline"
              />
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'all' && styles.filterTextActive,
              ]}
            >
              All ({payments.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filter === 'completed' && styles.filterTabActive,
            ]}
            onPress={() => setFilter('completed')}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'completed' && styles.filterTextActive,
              ]}
            >
              Completed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filter === 'pending' && styles.filterTabActive,
            ]}
            onPress={() => setFilter('pending')}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'pending' && styles.filterTextActive,
              ]}
            >
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'failed' && styles.filterTabActive]}
            onPress={() => setFilter('failed')}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'failed' && styles.filterTextActive,
              ]}
            >
              Failed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Payment History List */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Payment History</Text>

          {filteredPayments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No payments found</Text>
              <Text style={styles.emptySubtext}>
                {filter === 'all'
                  ? 'Your payment history will appear here'
                  : `No ${filter} payments`}
              </Text>
            </View>
          ) : (
            filteredPayments.map((payment: Payment) => (
              <TouchableOpacity
                key={payment.id}
                style={styles.paymentCard}
                onPress={() => handlePaymentPress(payment)}
              >
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentStatusBadge}>
                    <Text
                      style={[
                        styles.paymentStatusIcon,
                        { color: getStatusColor(payment.status) },
                      ]}
                    >
                      {getStatusIcon(payment.status)}
                    </Text>
                    <Text
                      style={[
                        styles.paymentStatus,
                        { color: getStatusColor(payment.status) },
                      ]}
                    >
                      {payment.status}
                    </Text>
                  </View>
                  <Text style={styles.paymentAmount}>${payment.amount}</Text>
                </View>

                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentDate}>
                    {new Date(payment.paymentDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                  {payment.paymentMethod && (
                    <Text style={styles.paymentMethod}>
                      {payment.paymentMethod}
                    </Text>
                  )}
                </View>

                {payment.lateFee && payment.lateFee > 0 && (
                  <View style={styles.lateFeeContainer}>
                    <Text style={styles.lateFeeText}>
                      Late Fee: ${payment.lateFee}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
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
    paddingBottom: theme.spacing.xl,
  },
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.large,
    ...theme.shadows.medium,
  },
  summaryTitle: {
    ...theme.typography.body2,
    color: theme.colors.surface,
    opacity: 0.9,
    marginBottom: theme.spacing.xs,
  },
  summaryAmount: {
    ...theme.typography.h1,
    fontSize: 36,
    color: theme.colors.surface,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  summaryDue: {
    ...theme.typography.body2,
    color: theme.colors.surface,
    opacity: 0.9,
  },
  actionsContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  actionButton: {
    marginBottom: theme.spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfButton: {
    flex: 0.48,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  filterTab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: theme.colors.primary,
  },
  filterText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: theme.colors.primary,
  },
  historySection: {
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h6,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  paymentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentStatusIcon: {
    fontSize: 16,
    marginRight: theme.spacing.xs,
  },
  paymentStatus: {
    ...theme.typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  paymentAmount: {
    ...theme.typography.h5,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  paymentDetails: {
    marginBottom: theme.spacing.xs,
  },
  paymentDate: {
    ...theme.typography.body2,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  paymentMethod: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  lateFeeContainer: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  lateFeeText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '600',
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
    ...theme.typography.h6,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
