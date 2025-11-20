import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Searchbar, Chip } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { format, parseISO } from 'date-fns';

import { theme } from '../../theme';
import { DocumentCategory, Document as LeaseDocument } from '../../types/lease';
import {
  fetchDocuments,
  downloadDocument,
  clearError,
} from '../../store/leaseSlice';
import { RootState, AppDispatch } from '../../store';

/**
 * Documents Screen
 * Display and manage lease-related documents
 */
export default function DocumentsScreen() {
  const dispatch = useDispatch<AppDispatch>();

  const { documents, isLoading, error } = useSelector(
    (state: RootState) => state.lease
  );

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'ALL'>('ALL');
  const [isDownloading, setIsDownloading] = useState<number | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [dispatch, error]);

  const loadDocuments = useCallback(async () => {
    try {
      await dispatch(fetchDocuments(undefined)).unwrap();
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }, [dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  const getCategoryIcon = (category: DocumentCategory): string => {
    const icons: Record<DocumentCategory, string> = {
      [DocumentCategory.LEASE_AGREEMENT]: '📋',
      [DocumentCategory.ADDENDUM]: '📝',
      [DocumentCategory.MOVE_IN_CHECKLIST]: '✅',
      [DocumentCategory.INSPECTION_REPORT]: '🔍',
      [DocumentCategory.NOTICE]: '📢',
      [DocumentCategory.RECEIPT]: '🧾',
      [DocumentCategory.POLICY]: '📖',
      [DocumentCategory.OTHER]: '📄',
    };
    return icons[category] || '📄';
  };

  const getCategoryColor = (category: DocumentCategory): string => {
    const colors: Record<DocumentCategory, string> = {
      [DocumentCategory.LEASE_AGREEMENT]: theme.colors.primary,
      [DocumentCategory.ADDENDUM]: theme.colors.info,
      [DocumentCategory.MOVE_IN_CHECKLIST]: theme.colors.success,
      [DocumentCategory.INSPECTION_REPORT]: theme.colors.warning,
      [DocumentCategory.NOTICE]: theme.colors.error,
      [DocumentCategory.RECEIPT]: theme.colors.success,
      [DocumentCategory.POLICY]: theme.colors.info,
      [DocumentCategory.OTHER]: theme.colors.textSecondary,
    };
    return colors[category] || theme.colors.textSecondary;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const handleDownload = async (doc: LeaseDocument) => {
    setIsDownloading(doc.id);
    try {
      const result = await dispatch(downloadDocument(doc.id)).unwrap();
      const blobUrl = result.blobUrl;
      
      if (Platform.OS === 'web') {
        // For web, create a temporary link and click it
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = doc.fileName;
        link.click();
      } else {
        // For mobile, open the document
        const canOpen = await Linking.canOpenURL(doc.fileUrl);
        if (canOpen) {
          await Linking.openURL(doc.fileUrl);
        } else {
          Alert.alert('Error', 'Cannot open this document type');
        }
      }
    } catch (err) {
      console.error('Failed to download document:', err);
      Alert.alert('Error', 'Failed to download document. Please try again.');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleViewDocument = (doc: LeaseDocument) => {
    // In a real app, would navigate to a document viewer screen
    Alert.alert(
      doc.title,
      `File: ${doc.fileName}\nSize: ${formatFileSize(doc.fileSize)}\nUploaded: ${formatDate(doc.uploadedAt)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Download', onPress: () => handleDownload(doc) },
      ]
    );
  };

  const filteredDocuments = documents.filter((doc: LeaseDocument) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { label: 'All', value: 'ALL' as const },
    { label: 'Lease', value: DocumentCategory.LEASE_AGREEMENT },
    { label: 'Notices', value: DocumentCategory.NOTICE },
    { label: 'Receipts', value: DocumentCategory.RECEIPT },
    { label: 'Reports', value: DocumentCategory.INSPECTION_REPORT },
    { label: 'Other', value: DocumentCategory.OTHER },
  ];

  const getDocumentCounts = () => {
    const counts: Record<string, number> = { ALL: documents.length };
    documents.forEach((doc: LeaseDocument) => {
      counts[doc.category] = (counts[doc.category] || 0) + 1;
    });
    return counts;
  };

  const counts = getDocumentCounts();

  if (isLoading && documents.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <Text style={styles.subtitle}>
          {documents.length} {documents.length === 1 ? 'document' : 'documents'} available
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search documents..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {categories.map((cat) => (
          <Chip
            key={cat.value}
            selected={selectedCategory === cat.value}
            onPress={() => setSelectedCategory(cat.value)}
            style={[
              styles.filterChip,
              selectedCategory === cat.value && styles.filterChipSelected,
            ]}
            textStyle={[
              styles.filterChipText,
              selectedCategory === cat.value && styles.filterChipTextSelected,
            ]}
          >
            {cat.label} ({counts[cat.value] || 0})
          </Chip>
        ))}
      </ScrollView>

      {/* Documents List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredDocuments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyTitle}>No Documents Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory !== 'ALL'
                ? 'Try adjusting your filters'
                : 'Your documents will appear here'}
            </Text>
          </View>
        ) : (
          <View style={styles.documentsList}>
            {filteredDocuments.map((doc: LeaseDocument) => (
              <TouchableOpacity
                key={doc.id}
                style={styles.documentCard}
                onPress={() => handleViewDocument(doc)}
                disabled={isDownloading === doc.id}
              >
                <View
                  style={[
                    styles.documentIconContainer,
                    { backgroundColor: getCategoryColor(doc.category) + '20' },
                  ]}
                >
                  <Text style={styles.documentIcon}>
                    {getCategoryIcon(doc.category)}
                  </Text>
                </View>

                <View style={styles.documentContent}>
                  <Text style={styles.documentTitle} numberOfLines={1}>
                    {doc.title}
                  </Text>
                  <Text style={styles.documentMeta}>
                    {doc.fileName} • {formatFileSize(doc.fileSize)}
                  </Text>
                  <View style={styles.documentFooter}>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: getCategoryColor(doc.category) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          { color: getCategoryColor(doc.category) },
                        ]}
                      >
                        {doc.category.replace('_', ' ')}
                      </Text>
                    </View>
                    <Text style={styles.documentDate}>
                      {formatDate(doc.uploadedAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.documentActions}>
                  {isDownloading === doc.id ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={() => handleDownload(doc)}
                    >
                      <Text style={styles.downloadIcon}>⬇️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
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
  searchContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  searchBar: {
    backgroundColor: theme.colors.surface,
    elevation: 0,
  },
  filtersScroll: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  filtersContent: {
    gap: theme.spacing.sm,
  },
  filterChip: {
    backgroundColor: theme.colors.surface,
  },
  filterChipSelected: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    color: theme.colors.text,
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  documentsList: {
    gap: theme.spacing.sm,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    ...theme.shadows.small,
  },
  documentIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  documentIcon: {
    fontSize: 24,
  },
  documentContent: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  documentMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  documentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.small,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  documentDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  documentActions: {
    marginLeft: theme.spacing.sm,
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadIcon: {
    fontSize: 20,
  },
});
