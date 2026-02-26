import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as theme from '../../theme';

interface PhotoPickerProps {
  onSelected: (photo: { uri: string; name?: string; type?: string }) => void;
}

export function PhotoPicker({ onSelected }: PhotoPickerProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const handlePick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      console.warn('Permission denied');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
    });

    if (result.canceled || !result.assets.length) return;

    const asset = result.assets[0];
    setPreview(asset.uri);
    onSelected({ uri: asset.uri, name: asset.fileName ?? 'photo.jpg', type: asset.mimeType ?? 'image/jpeg' });
  };

  return (
    <TouchableOpacity style={styles.picker} onPress={handlePick}>
      {preview ? <Image source={{ uri: preview }} style={styles.preview} /> : <Text style={styles.pickerText}>Add photo</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  picker: {
    height: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  pickerText: {
    color: theme.colors.textSecondary,
  },
  preview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});
