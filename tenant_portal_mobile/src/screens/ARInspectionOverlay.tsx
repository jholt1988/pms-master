import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

export const ARInspectionOverlay = () => {
  const [photoTaken, setPhotoTaken] = useState(false);

  // In a real app, we'd use expo-camera and potentially a vision module.
  // For the simulator, we provide the UI overlay mock.
  
  return (
    <View style={styles.container}>
      {!photoTaken ? (
        <View style={styles.cameraFrame}>
           <View style={styles.arGuidelineTopList}>
              <Text style={styles.arText}>Scanning Floor Integrity...</Text>
           </View>

           {/* Mock AR overlay box */}
           <View style={styles.arTargetBox}>
             <View style={[styles.corner, styles.tl]} />
             <View style={[styles.corner, styles.tr]} />
             <View style={[styles.corner, styles.bl]} />
             <View style={[styles.corner, styles.br]} />
           </View>

           <View style={styles.arGuidelineBottom}>
              <Text style={styles.arSubText}>Align damage within the frame</Text>
           </View>

           <TouchableOpacity style={styles.captureBtn} onPress={() => setPhotoTaken(true)}>
             <View style={styles.captureBtnInner} />
           </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.reviewPhase}>
          <Text style={styles.title}>Damage Recorded</Text>
          <View style={styles.mockImagePreview}>
            <Text style={styles.previewText}>AR Metadata Captured</Text>
            <Text style={styles.previewMetadata}>Timestamp: {new Date().toISOString()}</Text>
            <Text style={styles.previewMetadata}>Coords: 34.0522° N, 118.2437° W</Text>
            <Text style={styles.previewMetadata}>Estimated Size: 4x2 inches</Text>
          </View>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => setPhotoTaken(false)}>
            <Text style={styles.uploadBtnText}>Upload to Blockchain Ledger</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraFrame: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arGuidelineTopList: {
    position: 'absolute',
    top: 60,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  arText: {
    color: '#0ea5e9',
    fontWeight: 'bold',
  },
  arTargetBox: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#0ea5e9',
  },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  arGuidelineBottom: {
    position: 'absolute',
    bottom: 140,
  },
  arSubText: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 4,
  },
  captureBtn: {
    position: 'absolute',
    bottom: 40,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
  reviewPhase: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  mockImagePreview: {
    width: '100%',
    height: 300,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 24,
    justifyContent: 'center',
  },
  previewText: {
    color: '#34d399',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  previewMetadata: {
    color: '#a1a1aa',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  uploadBtn: {
    marginTop: 32,
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  uploadBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
