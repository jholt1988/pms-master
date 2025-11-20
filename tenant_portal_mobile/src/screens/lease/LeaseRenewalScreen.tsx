import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, TextInput, RadioButton, Card } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { theme } from '../../theme';
import { requestRenewal } from '../../store/leaseSlice';
import { RootState, AppDispatch } from '../../store';

type LeaseRenewalRouteProp = RouteProp<{ params: { leaseId: number } }, 'params'>;

/**
 * Lease Renewal Screen
 * Request lease renewal with term selection and optional counter-offer
 */
export default function LeaseRenewalScreen() {
  const navigation = useNavigation();
  const route = useRoute<LeaseRenewalRouteProp>();
  const dispatch = useDispatch<AppDispatch>();

  const { leaseId } = route.params;
  const { currentLease, isSubmitting } = useSelector(
    (state: RootState) => state.lease
  );

  const [selectedTerm, setSelectedTerm] = useState<number>(12);
  const [comments, setComments] = useState('');
  const [wantsCounterOffer, setWantsCounterOffer] = useState(false);
  const [counterOfferRent, setCounterOfferRent] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const termOptions = [
    { label: '6 Months', value: 6, recommended: false },
    { label: '12 Months', value: 12, recommended: true },
    { label: '18 Months', value: 18, recommended: false },
    { label: '24 Months', value: 24, recommended: false },
  ];

  const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (wantsCounterOffer && !counterOfferRent) {
      newErrors.counterOfferRent = 'Please enter your proposed rent amount';
    }

    if (wantsCounterOffer && counterOfferRent) {
      const amount = parseFloat(counterOfferRent);
      if (isNaN(amount) || amount <= 0) {
        newErrors.counterOfferRent = 'Please enter a valid amount';
      } else if (currentLease && amount > currentLease.monthlyRent * 1.5) {
        newErrors.counterOfferRent = 'Counter-offer seems unusually high';
      } else if (currentLease && amount < currentLease.monthlyRent * 0.5) {
        newErrors.counterOfferRent = 'Counter-offer seems unusually low';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    Alert.alert(
      'Confirm Renewal Request',
              `Submit renewal request for ${selectedTerm} months?${
        wantsCounterOffer ? `\nProposed rent: ${formatCurrency(parseFloat(counterOfferRent))}` : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await dispatch(
                requestRenewal({
                  leaseId,
                  desiredTermMonths: selectedTerm,
                  comments: comments.trim() || undefined,
                  counterOfferRent: wantsCounterOffer
                    ? parseFloat(counterOfferRent)
                    : undefined,
                })
              ).unwrap();

              Alert.alert(
                'Success',
                'Your renewal request has been submitted. You will be notified when the property manager responds.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              console.error('Failed to submit renewal request:', error);
              Alert.alert(
                'Error',
                'Failed to submit renewal request. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  if (!currentLease) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Lease information not available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Lease Renewal</Text>
            <Text style={styles.subtitle}>
              Request to renew your lease agreement
            </Text>
          </View>

          {/* Current Lease Info */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Current Lease</Text>
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
                  <Text style={styles.infoLabel}>Current Monthly Rent</Text>
                  <Text style={[styles.infoValue, styles.rentText]}>
                    {formatCurrency(currentLease.monthlyRent)}
                  </Text>
                </View>
                {currentLease.renewalOfferedRent && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Offered Renewal Rent</Text>
                    <Text style={[styles.infoValue, styles.rentText]}>
                      {formatCurrency(currentLease.renewalOfferedRent)}
                    </Text>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>

          {/* Lease Term Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Desired Lease Term</Text>
            <Text style={styles.sectionDescription}>
              Select how long you’d like to renew your lease
            </Text>
            <RadioButton.Group
              onValueChange={(value) => setSelectedTerm(parseInt(value))}
              value={selectedTerm.toString()}
            >
              {termOptions.map((option) => (
                <View key={option.value} style={styles.radioItem}>
                  <RadioButton.Item
                    label={option.label}
                    value={option.value.toString()}
                    position="leading"
                    style={styles.radioButton}
                  />
                  {option.recommended && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>Recommended</Text>
                    </View>
                  )}
                </View>
              ))}
            </RadioButton.Group>
          </View>

          {/* Counter-Offer Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Counter-Offer (Optional)</Text>
                <Text style={styles.sectionDescription}>
                  Propose a different monthly rent amount
                </Text>
              </View>
            </View>

            <View style={styles.checkboxContainer}>
              <RadioButton.Android
                value="counter"
                status={wantsCounterOffer ? 'checked' : 'unchecked'}
                onPress={() => setWantsCounterOffer(!wantsCounterOffer)}
                color={theme.colors.primary}
              />
              <Text
                style={styles.checkboxLabel}
                onPress={() => setWantsCounterOffer(!wantsCounterOffer)}
              >
                I would like to propose a different rent amount
              </Text>
            </View>

            {wantsCounterOffer && (
              <View style={styles.counterOfferInput}>
                <TextInput
                  mode="outlined"
                  label="Proposed Monthly Rent"
                  value={counterOfferRent}
                  onChangeText={(text) => {
                    setCounterOfferRent(text);
                    if (errors.counterOfferRent) {
                      setErrors({ ...errors, counterOfferRent: '' });
                    }
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  left={<TextInput.Affix text="$" />}
                  error={!!errors.counterOfferRent}
                  style={styles.input}
                />
                {errors.counterOfferRent && (
                  <Text style={styles.errorText}>{errors.counterOfferRent}</Text>
                )}
                <Text style={styles.helperText}>
                  Current rent: {formatCurrency(currentLease.monthlyRent)}
                  {currentLease.renewalOfferedRent && (
                    <Text>
                      {'\n'}Offered rent: {formatCurrency(currentLease.renewalOfferedRent)}
                    </Text>
                  )}
                </Text>
              </View>
            )}
          </View>

          {/* Comments Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Comments (Optional)</Text>
            <Text style={styles.sectionDescription}>
              Any additional information or requests
            </Text>
            <TextInput
              mode="outlined"
              value={comments}
              onChangeText={setComments}
              placeholder="Enter any comments or special requests..."
              multiline
              numberOfLines={4}
              style={[styles.input, styles.textArea]}
            />
            <Text style={styles.helperText}>
              {comments.length}/500 characters
            </Text>
          </View>

          {/* Important Information */}
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text style={styles.infoCardTitle}>📋 Important Information</Text>
              <Text style={styles.infoCardText}>
                • Your renewal request will be reviewed by property management
                {'\n'}• You will receive a response within 5-7 business days
                {'\n'}• Counter-offers may require negotiation
                {'\n'}• Current lease terms remain in effect until renewal is finalized
                {'\n'}• You may be required to sign a new lease agreement
              </Text>
            </Card.Content>
          </Card>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
            >
              Submit Renewal Request
            </Button>
            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
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
  infoItem: {
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
  },
  rentText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  radioButton: {
    flex: 1,
  },
  recommendedBadge: {
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.small,
    marginLeft: theme.spacing.sm,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.success,
    textTransform: 'uppercase',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  counterOfferInput: {
    marginTop: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  helperText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  infoCard: {
    backgroundColor: theme.colors.info + '15',
    marginBottom: theme.spacing.lg,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  infoCardText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 22,
  },
  submitSection: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  submitButton: {
    borderRadius: theme.borderRadius.medium,
  },
  submitButtonContent: {
    paddingVertical: theme.spacing.sm,
  },
  cancelButton: {
    borderRadius: theme.borderRadius.medium,
  },
});
