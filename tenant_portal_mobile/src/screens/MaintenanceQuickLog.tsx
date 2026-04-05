import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { enqueueRequest } from '../store/slices/offlineQueueSlice';

export const MaintenanceQuickLog = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  // Note: in a real app, this selector would come from a Redux store configured at the app root
  // We'll mock the state shape for now
  const isOnline = useSelector((state: any) => state.offlineQueue?.isOnline ?? false);

  const handleSubmit = () => {
    if (!title || !description) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    const payload = {
      id: Date.now().toString(),
      url: '/api/maintenance/requests',
      method: 'POST',
      body: { title, description, priority: 'normal', timestamp: Date.now() },
      timestamp: Date.now(),
    };

    if (isOnline) {
      // Execute direct background fetch
      console.log('Online! Sending request immediately', payload);
      // apiFetch(payload.url, { method: payload.method, body: JSON.stringify(payload.body) })
    } else {
      // Device is offline - cache via Redux Queue / WatermelonDB
      console.log('Offline! Queuing maintenance request to sync later.');
      dispatch(enqueueRequest(payload));
      Alert.alert(
        'Saved Offline', 
        'Your request has been cached and will sync automatically when your connection is restored.'
      );
    }

    setTitle('');
    setDescription('');
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Report Issue</Text>
      
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline Mode: Submissions will be synced upon reconnection.</Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="What's the issue? (e.g. Leaky Faucet)"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor="#666"
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Provide more details..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        placeholderTextColor="#666"
      />

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
        <Text style={styles.submitText}>Submit Request</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0a0a0a',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  offlineBanner: {
    backgroundColor: '#3f3f46',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  offlineText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    padding: 12,
    color: '#f4f4f5',
    marginBottom: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
