import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { propertiesApi, PropertySummary } from '../../api/properties';
import { Loading } from '../../components/common';
import * as theme from '../../theme';

export function PropertiesListScreen() {
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadProperties = async (isPull = false) => {
    if (isPull) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const data = await propertiesApi.list();
      setProperties(data);
    } catch (err) {
      console.error('Failed to load properties', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  if (isLoading) return <Loading fullScreen text="Loading properties..." />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadProperties(true)} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Properties</Text>
            <Text style={styles.subtitle}>{properties.length} Active Properties</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={styles.iconBox}>
              <Text style={{ fontSize: 20 }}>🏢</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.propName}>{item.name}</Text>
              <Text style={styles.propAddr}>{item.address}, {item.city}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{item.units?.length || 0} Units</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  header: { marginBottom: theme.spacing.lg },
  title: { ...theme.typography.h2, color: theme.colors.text },
  subtitle: { ...theme.typography.body1, color: theme.colors.textSecondary },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  propName: { ...theme.typography.h6, color: theme.colors.text },
  propAddr: { ...theme.typography.body2, color: theme.colors.textSecondary, marginBottom: 4 },
  metaRow: { flexDirection: 'row', gap: 8 },
  metaText: { fontSize: 12, color: theme.colors.primary, fontWeight: '600', backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
});
