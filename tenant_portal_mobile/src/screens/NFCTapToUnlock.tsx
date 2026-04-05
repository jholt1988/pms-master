import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { enqueueRequest } from '../store/slices/offlineQueueSlice';

export const NFCTapToUnlock = () => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const pulseAnim = new Animated.Value(1);
  const dispatch = useDispatch();
  const isOnline = useSelector((state: any) => state.offlineQueue?.isOnline ?? false);

  useEffect(() => {
    if (status === 'scanning') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ])
      ).start();

      // Simulate NFC transaction
      setTimeout(() => {
        setStatus('success');
        
        // Log access event
        const accessLog = {
          id: Date.now().toString(),
          url: '/api/iot/access-logs',
          method: 'POST',
          body: { deviceId: 'door_001_main', action: 'unlock', timestamp: Date.now() },
          timestamp: Date.now()
        };

        if (!isOnline) {
          console.log('[IoT] Device offline. Queuing NFC handshake payload for RabbitMQ.');
          dispatch(enqueueRequest(accessLog));
        } else {
          console.log('[IoT] Device online. Pushing NFC handshake to RabbitMQ / Backend sync.');
        }

        setTimeout(() => setStatus('idle'), 3000);
      }, 2000);
    }
  }, [status]);

  const initiateScan = () => {
    if (status === 'idle') setStatus('scanning');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure Access</Text>
      <Text style={styles.subtitle}>Hold your phone near the reader</Text>

      <View style={styles.readerContainer}>
        <Animated.View style={[
          styles.nfcCircle, 
          { transform: [{ scale: pulseAnim }] },
          status === 'success' && styles.nfcCircleSuccess,
          status === 'scanning' && styles.nfcCircleScanning
        ]}>
          <TouchableOpacity onPress={initiateScan} disabled={status !== 'idle'}>
            <Text style={styles.nfcIconText}>
              {status === 'success' ? 'UNLOCKED' : status === 'scanning' ? 'READING...' : 'TAP'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {!isOnline && (
        <Text style={styles.offlineWarning}>
          *Offline cache active. Logs will sync over local BLE mesh or later when WiFi restores.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    marginBottom: 60,
  },
  readerContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfcCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#27272a',
    borderWidth: 4,
    borderColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  nfcCircleScanning: {
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.6,
  },
  nfcCircleSuccess: {
    borderColor: '#10b981',
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.8,
  },
  nfcIconText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 2,
  },
  offlineWarning: {
    position: 'absolute',
    bottom: 40,
    color: '#f59e0b',
    textAlign: 'center',
    fontSize: 12,
  }
});
