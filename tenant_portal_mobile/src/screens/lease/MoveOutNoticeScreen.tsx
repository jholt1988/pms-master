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
import { Text, Button, TextInput, Card } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, addDays, parseISO, differenceInDays } from 'date-fns';

import { theme } from '../../theme';
import { submitMoveOutNotice } from '../../store/leaseSlice';
import { RootState, AppDispatch } from '../../store';

type MoveOutNoticeRouteProp = RouteProp<{ params: { leaseId: number } }, 'params'>;

/**
 * Move-Out Notice Screen
 * Submit intent to vacate with forwarding address
 */
export default function MoveOutNoticeScreen() {
  const navigation = useNavigation();
  const route = useRoute<MoveOutNoticeRouteProp>();
  const dispatch = useDispatch<AppDispatch>();

  const { leaseId } = route.params;
  const { currentLease, isSubmitting } = useSelector(
    (state: RootState) => state.lease
  );

  const minimumNoticeDate = currentLease
    ? addDays(new Date(), currentLease.noticeRequiredDays)
    : addDays(new Date(), 30);

  const [moveOutDate, setMoveOutDate] = useState(minimumNoticeDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [forwardingAddress, setForwardingAddress] = useState('');
  const [forwardingCity, setForwardingCity] = useState('');
  const [forwardingState, setForwardingState] = useState('');
  const [forwardingZip, setForwardingZip] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const formatDate = (date: Date): string => {
    return format(date, 'MMMM d, yyyy');
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (selectedDate < minimumNoticeDate) {
        Alert.alert(
          'Invalid Date',
          `Move-out date must be at least ${currentLease?.noticeRequiredDays || 30} days from today.`
        );
        return;
      }
      setMoveOutDate(selectedDate);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!forwardingAddress.trim()) {
      newErrors.forwardingAddress = 'Forwarding address is required';
    }

    if (!forwardingCity.trim()) {
      newErrors.forwardingCity = 'City is required';
    }

    if (!forwardingState.trim()) {
      newErrors.forwardingState = 'State is required';
    } else if (forwardingState.length !== 2) {
      newErrors.forwardingState = 'Please use 2-letter state code (e.g., CA)';
    }

    if (!forwardingZip.trim()) {
      newErrors.forwardingZip = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(forwardingZip)) {
      newErrors.forwardingZip = 'Please enter a valid ZIP code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const daysNotice = differenceInDays(moveOutDate, new Date());

    Alert.alert(
      'Confirm Move-Out Notice',
      `Submit notice to vacate on ${formatDate(moveOutDate)}?\n\nThis provides ${daysNotice} days notice as required.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await dispatch(
                submitMoveOutNotice({
                  leaseId,
                  intendedMoveOutDate: moveOutDate.toISOString(),
                  reason: reason.trim() || undefined,
                  forwardingAddress: forwardingAddress.trim(),
                  forwardingCity: forwardingCity.trim(),
                  forwardingState: forwardingState.trim().toUpperCase(),
                  forwardingZip: forwardingZip.trim(),
                })
              ).unwrap();

              Alert.alert(
                'Success',
                'Your move-out notice has been submitted. You will receive confirmation from property management.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              console.error('Failed to submit move-out notice:', error);
              Alert.alert(
                'Error',
                'Failed to submit move-out notice. Please try again.'
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

  const daysNotice = differenceInDays(moveOutDate, new Date());

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
            <Text style={styles.title}>Move-Out Notice</Text>
            <Text style={styles.subtitle}>
              Submit your intent to vacate the property
            </Text>
          </View>

          {/* Warning Card */}
          <Card style={styles.warningCard}>
            <Card.Content>
              <Text style={styles.warningTitle}>⚠️ Important</Text>
              <Text style={styles.warningText}>
                This lease requires {currentLease.noticeRequiredDays} days notice before
                moving out. Minimum move-out date: {formatDate(minimumNoticeDate)}
              </Text>
            </Card.Content>
          </Card>

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
                  <Text style={styles.infoLabel}>Lease End Date</Text>
                  <Text style={styles.infoValue}>
                    {format(parseISO(currentLease.endDate), 'MMM d, yyyy')}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Move-Out Date */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Intended Move-Out Date *</Text>
            <Text style={styles.sectionDescription}>
              Select the date you plan to vacate the property
            </Text>
            <Button
              mode="outlined"
              onPress={() => setShowDatePicker(true)}
              style={styles.dateButton}
              contentStyle={styles.dateButtonContent}
              icon="calendar"
            >
              {formatDate(moveOutDate)}
            </Button>
            {showDatePicker && (
              <DateTimePicker
                value={moveOutDate}
                mode="date"
                display="default"
                minimumDate={minimumNoticeDate}
                onChange={handleDateChange}
              />
            )}
            <Text style={styles.helperText}>
              Provides {daysNotice} days notice
              {daysNotice < currentLease.noticeRequiredDays && (
                <Text style={styles.errorText}>
                  {' '}(Minimum {currentLease.noticeRequiredDays} days required)
                </Text>
              )}
            </Text>
          </View>

          {/* Reason (Optional) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reason for Moving (Optional)</Text>
            <TextInput
              mode="outlined"
              value={reason}
              onChangeText={setReason}
              placeholder="E.g., Relocating for work, purchasing a home..."
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea]}
              maxLength={500}
            />
            <Text style={styles.helperText}>{reason.length}/500 characters</Text>
          </View>

          {/* Forwarding Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Forwarding Address *</Text>
            <Text style={styles.sectionDescription}>
              Where should we send your security deposit and final documents?
            </Text>

            <TextInput
              mode="outlined"
              label="Street Address"
              value={forwardingAddress}
              onChangeText={(text) => {
                setForwardingAddress(text);
                if (errors.forwardingAddress) {
                  setErrors({ ...errors, forwardingAddress: '' });
                }
              }}
              placeholder="123 Main Street"
              style={styles.input}
              error={!!errors.forwardingAddress}
            />
            {errors.forwardingAddress && (
              <Text style={styles.errorText}>{errors.forwardingAddress}</Text>
            )}

            <TextInput
              mode="outlined"
              label="City"
              value={forwardingCity}
              onChangeText={(text) => {
                setForwardingCity(text);
                if (errors.forwardingCity) {
                  setErrors({ ...errors, forwardingCity: '' });
                }
              }}
              placeholder="Los Angeles"
              style={styles.input}
              error={!!errors.forwardingCity}
            />
            {errors.forwardingCity && (
              <Text style={styles.errorText}>{errors.forwardingCity}</Text>
            )}

            <View style={styles.rowInputs}>
              <View style={styles.stateInput}>
                <TextInput
                  mode="outlined"
                  label="State"
                  value={forwardingState}
                  onChangeText={(text) => {
                    setForwardingState(text.toUpperCase());
                    if (errors.forwardingState) {
                      setErrors({ ...errors, forwardingState: '' });
                    }
                  }}
                  placeholder="CA"
                  maxLength={2}
                  autoCapitalize="characters"
                  style={styles.input}
                  error={!!errors.forwardingState}
                />
                {errors.forwardingState && (
                  <Text style={styles.errorText}>{errors.forwardingState}</Text>
                )}
              </View>

              <View style={styles.zipInput}>
                <TextInput
                  mode="outlined"
                  label="ZIP Code"
                  value={forwardingZip}
                  onChangeText={(text) => {
                    setForwardingZip(text);
                    if (errors.forwardingZip) {
                      setErrors({ ...errors, forwardingZip: '' });
                    }
                  }}
                  placeholder="90210"
                  keyboardType="number-pad"
                  maxLength={10}
                  style={styles.input}
                  error={!!errors.forwardingZip}
                />
                {errors.forwardingZip && (
                  <Text style={styles.errorText}>{errors.forwardingZip}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Information Card */}
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text style={styles.infoCardTitle}>📋 What Happens Next?</Text>
              <Text style={styles.infoCardText}>
                1. Your notice will be reviewed within 1-2 business days{'\n'}
                2. Property management will schedule a move-out inspection{'\n'}
                3. You’ll receive information about the final walk-through{'\n'}
                4. Security deposit will be processed per state law{'\n'}
                5. Final utility bills and lease obligations must be settled
              </Text>
            </Card.Content>
          </Card>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting || daysNotice < currentLease.noticeRequiredDays}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
            >
              Submit Move-Out Notice
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
  warningCard: {
    backgroundColor: theme.colors.warning + '15',
    marginBottom: theme.spacing.lg,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  warningText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
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
  section: {
    marginBottom: theme.spacing.xl,
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
  dateButton: {
    borderRadius: theme.borderRadius.medium,
  },
  dateButtonContent: {
    paddingVertical: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  stateInput: {
    flex: 1,
  },
  zipInput: {
    flex: 2,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.sm,
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
