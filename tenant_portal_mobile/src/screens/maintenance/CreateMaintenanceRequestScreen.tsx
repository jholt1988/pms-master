import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';

import { theme } from '../../theme';
import {
  MaintenanceCategory,
  MaintenancePriority,
  CreateMaintenanceRequest,
} from '../../types/maintenance';
import { createMaintenanceRequest, uploadMaintenancePhoto } from '../../store/maintenanceSlice';
import { RootState, AppDispatch } from '../../store';

// Category display mapping
const CATEGORY_OPTIONS = [
  { value: MaintenanceCategory.PLUMBING, label: '🚰 Plumbing', icon: '🚰' },
  { value: MaintenanceCategory.ELECTRICAL, label: '⚡ Electrical', icon: '⚡' },
  { value: MaintenanceCategory.HVAC, label: '❄️ HVAC', icon: '❄️' },
  { value: MaintenanceCategory.APPLIANCE, label: '🔌 Appliance', icon: '🔌' },
  { value: MaintenanceCategory.STRUCTURAL, label: '🏗️ Structural', icon: '🏗️' },
  { value: MaintenanceCategory.PEST_CONTROL, label: '🐛 Pest Control', icon: '🐛' },
  { value: MaintenanceCategory.LOCKS_KEYS, label: '🔑 Locks/Keys', icon: '🔑' },
  { value: MaintenanceCategory.LANDSCAPING, label: '🌿 Landscaping', icon: '🌿' },
  { value: MaintenanceCategory.GENERAL, label: '🔧 General Maintenance', icon: '🔧' },
  { value: MaintenanceCategory.OTHER, label: '❓ Other', icon: '❓' },
];

const PRIORITY_OPTIONS = [
  { value: MaintenancePriority.EMERGENCY, label: 'Emergency', color: theme.colors.error, description: 'Requires immediate attention' },
  { value: MaintenancePriority.HIGH, label: 'High Priority', color: theme.colors.warning, description: 'Urgent but not emergency' },
  { value: MaintenancePriority.MEDIUM, label: 'Medium Priority', color: theme.colors.info, description: 'Normal maintenance issue' },
  { value: MaintenancePriority.LOW, label: 'Low Priority', color: theme.colors.textSecondary, description: 'Can wait for scheduled maintenance' },
];

const TIME_SLOTS = [
  { value: 'MORNING', label: 'Morning (8 AM - 12 PM)' },
  { value: 'AFTERNOON', label: 'Afternoon (12 PM - 5 PM)' },
  { value: 'EVENING', label: 'Evening (5 PM - 8 PM)' },
  { value: 'ANYTIME', label: 'Anytime' },
];

interface PhotoAsset {
  uri: string;
  fileName: string;
  mimeType: string;
}

export const CreateMaintenanceRequestScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  
  const { isLoading } = useSelector((state: RootState) => state.maintenance);
  const { leases = [] } = useSelector((state: RootState) => state.lease);

  // Form state
  const [category, setCategory] = useState<MaintenanceCategory>(MaintenanceCategory.GENERAL);
  const [priority, setPriority] = useState<MaintenancePriority>(MaintenancePriority.MEDIUM);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [permissionToEnter, setPermissionToEnter] = useState(false);
  const [preferredDate, setPreferredDate] = useState<Date | null>(null);
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANYTIME'>('ANYTIME');
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  
  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Request camera permissions
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Sorry, we need camera roll permissions to upload photos.'
          );
        }
      }
    })();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length < 20) {
      newErrors.description = 'Please provide more details (at least 20 characters)';
    }

    if (priority === MaintenancePriority.EMERGENCY && !description.includes('emergency')) {
      Alert.alert(
        'Emergency Request',
        'For emergency requests, please explain the emergency in your description.',
        [{ text: 'OK' }]
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newPhotos: PhotoAsset[] = result.assets.map((asset) => ({
          uri: asset.uri,
          fileName: asset.fileName || `photo_${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
        }));

        setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5)); // Max 5 photos
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const newPhoto: PhotoAsset = {
          uri: asset.uri,
          fileName: asset.fileName || `photo_${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
        };

        setPhotos((prev) => [...prev, newPhoto].slice(0, 5)); // Max 5 photos
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const showPhotoOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose a photo source',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handlePickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setPreferredDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Get the active lease's unit ID
      const activeLease = leases.find((lease) => lease.status === 'ACTIVE');
      if (!activeLease?.unitId) {
        Alert.alert('Error', 'No active lease found. Please contact property management.');
        return;
      }

      const requestData: CreateMaintenanceRequest = {
        unitId: activeLease.unitId,
        category,
        priority,
        title: title.trim(),
        description: description.trim(),
        permissionToEnter,
        preferredDate: preferredDate ? preferredDate.toISOString() : undefined,
        preferredTimeSlot: preferredTimeSlot !== 'ANYTIME' ? preferredTimeSlot : undefined,
      };

      // Create the request
      const resultAction = await dispatch(createMaintenanceRequest(requestData));

      if (createMaintenanceRequest.fulfilled.match(resultAction)) {
        const newRequest = resultAction.payload;

        // Upload photos if any
        if (photos.length > 0 && newRequest.id) {
          const uploadPromises = photos.map((photo) =>
            dispatch(
              uploadMaintenancePhoto({
                requestId: newRequest.id,
                photoUri: photo.uri,
                caption: undefined,
              })
            )
          );

          await Promise.all(uploadPromises);
        }

        Alert.alert(
          'Success',
          'Your maintenance request has been submitted successfully.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        throw new Error('Failed to create maintenance request');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert(
        'Error',
        'Failed to submit maintenance request. Please try again.'
      );
    }
  };

  const getCategoryIcon = (cat: MaintenanceCategory): string => {
    const option = CATEGORY_OPTIONS.find((opt) => opt.value === cat);
    return option?.icon || '❓';
  };

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
            <Text style={styles.title}>New Maintenance Request</Text>
            <Text style={styles.subtitle}>
              Provide details about the issue you’re experiencing
            </Text>
          </View>

          {/* Category Selector */}
          <View style={styles.section}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerIcon}>{getCategoryIcon(category)}</Text>
              <Picker
                selectedValue={category}
                onValueChange={(value: MaintenanceCategory) => setCategory(value)}
                style={styles.picker}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Priority Selector */}
          <View style={styles.section}>
            <Text style={styles.label}>Priority *</Text>
            <View style={styles.priorityContainer}>
              {PRIORITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.priorityButton,
                    priority === option.value && styles.priorityButtonActive,
                    priority === option.value && {
                      borderColor: option.color,
                      backgroundColor: option.color + '15',
                    },
                  ]}
                  onPress={() => setPriority(option.value)}
                >
                  <Text
                    style={[
                      styles.priorityLabel,
                      priority === option.value && { color: option.color },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.priorityDescription}>
                    {option.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Title Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              mode="outlined"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (errors.title) {
                  setErrors({ ...errors, title: '' });
                }
              }}
              placeholder="Brief summary of the issue"
              style={styles.input}
              error={!!errors.title}
            />
            {errors.title && (
              <Text style={styles.errorText}>{errors.title}</Text>
            )}
          </View>

          {/* Description Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              mode="outlined"
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (errors.description) {
                  setErrors({ ...errors, description: '' });
                }
              }}
              placeholder="Detailed description of the problem..."
              multiline
              numberOfLines={6}
              style={[styles.input, styles.textArea]}
              error={!!errors.description}
            />
            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
            <Text style={styles.helperText}>
              {description.length}/500 characters
            </Text>
          </View>

          {/* Photos Section */}
          <View style={styles.section}>
            <Text style={styles.label}>Photos (Optional)</Text>
            <Text style={styles.helperText}>
              Add up to 5 photos to help describe the issue
            </Text>
            
            <View style={styles.photosGrid}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              
              {photos.length < 5 && (
                <TouchableOpacity
                  style={styles.photoAddButton}
                  onPress={showPhotoOptions}
                >
                  <Text style={styles.photoAddIcon}>📷</Text>
                  <Text style={styles.photoAddText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Permission to Enter */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setPermissionToEnter(!permissionToEnter)}
            >
              <View
                style={[
                  styles.checkbox,
                  permissionToEnter && styles.checkboxChecked,
                ]}
              >
                {permissionToEnter && (
                  <Text style={styles.checkboxIcon}>✓</Text>
                )}
              </View>
              <View style={styles.checkboxTextContainer}>
                <Text style={styles.checkboxLabel}>
                  Permission to enter if not home
                </Text>
                <Text style={styles.checkboxDescription}>
                  Allow maintenance staff to enter your unit if you’re not available
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Preferred Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Preferred Date (Optional)</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonIcon}>📅</Text>
              <Text style={styles.dateButtonText}>
                {preferredDate
                  ? format(preferredDate, 'MMMM d, yyyy')
                  : 'Select a date'}
              </Text>
              {preferredDate && (
                <TouchableOpacity
                  onPress={() => setPreferredDate(null)}
                  style={styles.dateClearButton}
                >
                  <Text style={styles.dateClearText}>✕</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={preferredDate || new Date()}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Preferred Time Slot */}
          <View style={styles.section}>
            <Text style={styles.label}>Preferred Time Slot (Optional)</Text>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerIcon}>⏰</Text>
              <Picker
                selectedValue={preferredTimeSlot}
                onValueChange={(value: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANYTIME') => setPreferredTimeSlot(value)}
                style={styles.picker}
              >
                {TIME_SLOTS.map((slot) => (
                  <Picker.Item
                    key={slot.value}
                    label={slot.label}
                    value={slot.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
            >
              Submit Request
            </Button>
            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              disabled={isLoading}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
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
    lineHeight: 20,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
  textArea: {
    minHeight: 120,
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
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingLeft: theme.spacing.md,
  },
  pickerIcon: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  priorityContainer: {
    gap: theme.spacing.sm,
  },
  priorityButton: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: theme.colors.surface,
  },
  priorityButtonActive: {
    borderWidth: 2,
  },
  priorityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  priorityDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoAddButton: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  photoAddText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.small,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  checkboxIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
    marginBottom: theme.spacing.xs,
  },
  checkboxDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: theme.spacing.md,
  },
  dateButtonIcon: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  dateClearButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateClearText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
  },
  submitSection: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
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
