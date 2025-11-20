import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { format, formatDistanceToNow } from 'date-fns';

import { theme } from '../../theme';
import {
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceCategory,
  MaintenancePhoto,
  MaintenanceStatusHistory,
} from '../../types/maintenance';
import {
  fetchMaintenanceRequest,
  cancelMaintenanceRequest,
  signMaintenanceRequest,
  clearSelectedRequest,
} from '../../store/maintenanceSlice';
import { RootState, AppDispatch } from '../../store';
import { useAppSelector } from '../../store/hooks';
import { MaintenanceStackParamList } from '../../navigation/types';

type MaintenanceDetailRouteProp = RouteProp<MaintenanceStackParamList, 'MaintenanceDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const MaintenanceDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<MaintenanceDetailRouteProp>();
  const dispatch = useDispatch<AppDispatch>();

  const { requestId } = route.params;
  const { selectedRequest, isLoading } = useAppSelector(
    (state: RootState) => state.maintenance
  );

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const loadRequest = useCallback(async () => {
    try {
      await dispatch(fetchMaintenanceRequest(requestId)).unwrap();
    } catch (error) {
      console.error('Failed to load maintenance request:', error);
      Alert.alert('Error', 'Failed to load maintenance request');
      navigation.goBack();
    }
  }, [dispatch, navigation, requestId]);

  useEffect(() => {
    loadRequest();

    return () => {
      dispatch(clearSelectedRequest());
    };
  }, [dispatch, loadRequest]);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this maintenance request? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await dispatch(cancelMaintenanceRequest(requestId)).unwrap();
              Alert.alert('Success', 'Maintenance request has been cancelled', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              console.error('Failed to cancel maintenance request:', error);
              Alert.alert('Error', 'Failed to cancel request. Please try again.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleSign = () => {
    Alert.alert(
      'Sign Completion',
      'By signing, you confirm that the maintenance work has been completed to your satisfaction.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign',
          onPress: async () => {
            setIsSigning(true);
            try {
              await dispatch(
                signMaintenanceRequest({
                  id: requestId,
                  signature: 'Tenant Signature', // In real app, would collect actual signature
                })
              ).unwrap();
              Alert.alert('Success', 'Maintenance request has been signed off');
              await loadRequest();
            } catch (error) {
              console.error('Failed to sign maintenance request:', error);
              Alert.alert('Error', 'Failed to sign request. Please try again.');
            } finally {
              setIsSigning(false);
            }
          },
        },
      ]
    );
  };

  const getCategoryIcon = (cat: MaintenanceCategory): string => {
    const icons: Record<MaintenanceCategory, string> = {
      [MaintenanceCategory.PLUMBING]: '🚰',
      [MaintenanceCategory.ELECTRICAL]: '⚡',
      [MaintenanceCategory.HVAC]: '❄️',
      [MaintenanceCategory.APPLIANCE]: '🔌',
      [MaintenanceCategory.STRUCTURAL]: '🏗️',
      [MaintenanceCategory.PEST_CONTROL]: '🐛',
      [MaintenanceCategory.LOCKS_KEYS]: '🔑',
      [MaintenanceCategory.LANDSCAPING]: '🌿',
      [MaintenanceCategory.GENERAL]: '🔧',
      [MaintenanceCategory.OTHER]: '❓',
    };
    return icons[cat] || '❓';
  };

  const getPriorityColor = (priority: MaintenancePriority): string => {
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

  const getStatusColor = (status: MaintenanceStatus): string => {
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

  const getStatusIcon = (status: MaintenanceStatus): string => {
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
        return '⏳';
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  const canCancel = (): boolean => {
    if (!selectedRequest) return false;
    return (
      selectedRequest.status === MaintenanceStatus.PENDING ||
      selectedRequest.status === MaintenanceStatus.ASSIGNED
    );
  };

  const canSign = (): boolean => {
    if (!selectedRequest) return false;
    return (
      selectedRequest.status === MaintenanceStatus.COMPLETED &&
      !selectedRequest.tenantSignature
    );
  };

  if (isLoading || !selectedRequest) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading request...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.categoryIconContainer}>
              <Text style={styles.categoryIconLarge}>
                {getCategoryIcon(selectedRequest.category)}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.requestId}>Request #{selectedRequest.id}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(selectedRequest.status) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.statusIcon,
                    { color: getStatusColor(selectedRequest.status) },
                  ]}
                >
                  {getStatusIcon(selectedRequest.status)}
                </Text>
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(selectedRequest.status) },
                  ]}
                >
                  {selectedRequest.status.replace('_', ' ')}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.title}>{selectedRequest.title}</Text>

          <View
            style={[
              styles.priorityBadge,
              {
                backgroundColor: getPriorityColor(selectedRequest.priority) + '20',
                borderColor: getPriorityColor(selectedRequest.priority),
              },
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                { color: getPriorityColor(selectedRequest.priority) },
              ]}
            >
              {selectedRequest.priority} Priority
            </Text>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{selectedRequest.description}</Text>
        </View>

        {/* Photos Section */}
        {selectedRequest.photos && selectedRequest.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Photos ({selectedRequest.photos.length})
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photosScroll}
            >
              {selectedRequest.photos.map((photo: MaintenancePhoto, index: number) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoThumbnail}
                  onPress={() => setSelectedPhotoIndex(index)}
                >
                  <Image
                    source={{ uri: photo.photoUrl }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Details Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>
                {getCategoryIcon(selectedRequest.category)}{' '}
                {selectedRequest.category.replace('_', ' ')}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>
                {formatDate(selectedRequest.createdAt)}
              </Text>
            </View>

            {selectedRequest.preferredDate && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Preferred Date</Text>
                <Text style={styles.detailValue}>
                  {formatDate(selectedRequest.preferredDate)}
                </Text>
              </View>
            )}

            {selectedRequest.preferredTimeSlot && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Preferred Time</Text>
                <Text style={styles.detailValue}>
                  {selectedRequest.preferredTimeSlot.replace('_', ' ')}
                </Text>
              </View>
            )}

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Permission to Enter</Text>
              <Text style={styles.detailValue}>
                {selectedRequest.permissionToEnter ? '✓ Yes' : '✗ No'}
              </Text>
            </View>

            {selectedRequest.responseDeadline && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Response Deadline</Text>
                <Text style={styles.detailValue}>
                  {formatDate(selectedRequest.responseDeadline)}
                </Text>
              </View>
            )}

            {selectedRequest.resolutionDeadline && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Resolution Deadline</Text>
                <Text style={styles.detailValue}>
                  {formatDate(selectedRequest.resolutionDeadline)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Technician Section */}
        {selectedRequest.technician && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assigned Technician</Text>
            <View style={styles.technicianCard}>
              <Text style={styles.technicianIcon}>👷</Text>
              <View style={styles.technicianInfo}>
                <Text style={styles.technicianName}>
                  {selectedRequest.technician.name}
                </Text>
                {selectedRequest.technician.specialty && (
                  <Text style={styles.technicianSpecialty}>
                    {selectedRequest.technician.specialty}
                  </Text>
                )}
                {selectedRequest.technician.phone && (
                  <Text style={styles.technicianContact}>
                    📞 {selectedRequest.technician.phone}
                  </Text>
                )}
                {selectedRequest.technician.email && (
                  <Text style={styles.technicianContact}>
                    ✉️ {selectedRequest.technician.email}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Status History */}
        {selectedRequest.statusHistory && selectedRequest.statusHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status Timeline</Text>
            <View style={styles.timeline}>
              {selectedRequest.statusHistory
                .slice()
                .reverse()
                .map((history: MaintenanceStatusHistory, index: number) => (
                  <View key={history.id} style={styles.timelineItem}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: getStatusColor(history.status) },
                      ]}
                    />
                    {index < selectedRequest.statusHistory!.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <Text
                          style={[
                            styles.timelineStatus,
                            { color: getStatusColor(history.status) },
                          ]}
                        >
                          {getStatusIcon(history.status)}{' '}
                          {history.status.replace('_', ' ')}
                        </Text>
                        <Text style={styles.timelineDate}>
                          {formatDistanceToNow(new Date(history.changedAt), {
                            addSuffix: true,
                          })}
                        </Text>
                      </View>
                      {history.notes && (
                        <Text style={styles.timelineNotes}>{history.notes}</Text>
                      )}
                      <Text style={styles.timelineUser}>by {history.changedBy}</Text>
                    </View>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Completion Info */}
        {selectedRequest.status === MaintenanceStatus.COMPLETED && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completion Details</Text>
            <View style={styles.completionCard}>
              {selectedRequest.completedAt && (
                <View style={styles.completionItem}>
                  <Text style={styles.completionLabel}>Completed On</Text>
                  <Text style={styles.completionValue}>
                    {formatDate(selectedRequest.completedAt)}
                  </Text>
                </View>
              )}
              {selectedRequest.completionNotes && (
                <View style={styles.completionItem}>
                  <Text style={styles.completionLabel}>Completion Notes</Text>
                  <Text style={styles.completionValue}>
                    {selectedRequest.completionNotes}
                  </Text>
                </View>
              )}
              {selectedRequest.tenantSignature && (
                <View style={styles.completionItem}>
                  <Text style={styles.completionLabel}>Tenant Signature</Text>
                  <Text style={styles.completionValue}>✓ Signed</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {canCancel() && (
            <Button
              mode="outlined"
              onPress={handleCancel}
              loading={isCancelling}
              disabled={isCancelling}
              style={styles.cancelButton}
              contentStyle={styles.buttonContent}
              textColor={theme.colors.error}
            >
              Cancel Request
            </Button>
          )}

          {canSign() && (
            <Button
              mode="contained"
              onPress={handleSign}
              loading={isSigning}
              disabled={isSigning}
              style={styles.signButton}
              contentStyle={styles.buttonContent}
            >
              Sign Off Completion
            </Button>
          )}
        </View>
      </ScrollView>

      {/* Photo Viewer Modal */}
      <Modal
        visible={selectedPhotoIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhotoIndex(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedPhotoIndex(null)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedPhotoIndex !== null &&
            selectedRequest.photos &&
            selectedRequest.photos[selectedPhotoIndex] && (
              <Image
                source={{
                  uri: selectedRequest.photos[selectedPhotoIndex].url,
                }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          {selectedPhotoIndex !== null && selectedRequest.photos && (
            <Text style={styles.modalCounter}>
              {selectedPhotoIndex + 1} / {selectedRequest.photos.length}
            </Text>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  categoryIconLarge: {
    fontSize: 32,
  },
  headerInfo: {
    flex: 1,
  },
  requestId: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.small,
    gap: theme.spacing.xs,
  },
  statusIcon: {
    fontSize: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.small,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
  },
  photosScroll: {
    marginHorizontal: -theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  photoThumbnail: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
    marginRight: theme.spacing.sm,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  detailsGrid: {
    gap: theme.spacing.md,
  },
  detailItem: {
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  technicianCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    gap: theme.spacing.md,
  },
  technicianIcon: {
    fontSize: 40,
  },
  technicianInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  technicianName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  technicianSpecialty: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  technicianContact: {
    fontSize: 14,
    color: theme.colors.text,
  },
  timeline: {
    position: 'relative',
  },
  timelineItem: {
    flexDirection: 'row',
    position: 'relative',
    paddingBottom: theme.spacing.lg,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: theme.spacing.md,
  },
  timelineLine: {
    position: 'absolute',
    left: 5.5,
    top: 16,
    bottom: 0,
    width: 1,
    backgroundColor: theme.colors.border,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timelineDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  timelineNotes: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  timelineUser: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  completionCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    gap: theme.spacing.md,
  },
  completionItem: {
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  completionLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  completionValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  actionSection: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  cancelButton: {
    borderRadius: theme.borderRadius.medium,
    borderColor: theme.colors.error,
  },
  signButton: {
    borderRadius: theme.borderRadius.medium,
  },
  buttonContent: {
    paddingVertical: theme.spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  modalCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
