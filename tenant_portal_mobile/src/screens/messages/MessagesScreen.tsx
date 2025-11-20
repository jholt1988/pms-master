/**
 * MessagesScreen
 * Message threads list with search and new message functionality
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Searchbar, Button, Card, Chip, IconButton, Badge, FAB } from 'react-native-paper';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { AppDispatch, RootState } from '../../store';
import {
  fetchThreads,
  loadMoreThreads,
  fetchUnreadCount,
  archiveThread,
  setFilters,
} from '../../store/messageSlice';
import { MessageThread, ThreadStatus } from '../../types/message';
import { theme } from '../../theme';

const MessagesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const {
    threads,
    unreadCount,
    isLoading,
    hasMoreThreads,
    threadsPage,
    filters,
  } = useSelector((state: RootState) => state.message);

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ThreadStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load threads on mount
  useEffect(() => {
    dispatch(fetchThreads(filters));
    dispatch(fetchUnreadCount());
  }, [dispatch, filters]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await dispatch(fetchThreads({ ...filters, page: 1 }));
    await dispatch(fetchUnreadCount());
    setIsRefreshing(false);
  }, [dispatch, filters]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMoreThreads) {
      dispatch(loadMoreThreads(threadsPage + 1));
    }
  }, [dispatch, isLoading, hasMoreThreads, threadsPage]);

  // Handle status filter
  const handleStatusFilter = useCallback(
    (status: ThreadStatus | null) => {
      setSelectedStatus(status);
      if (status) {
        dispatch(setFilters({ status, page: 1 }));
      } else {
        dispatch(setFilters({ page: 1 }));
      }
    },
    [dispatch]
  );

  // Handle thread press
  const handleThreadPress = useCallback(
    (thread: MessageThread) => {
      navigation.navigate('MessageThread', { threadId: thread.id });
    },
    [navigation]
  );

  // Handle archive thread
  const handleArchiveThread = useCallback(
    (thread: MessageThread) => {
      Alert.alert('Archive Thread', 'Archive this conversation?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            await dispatch(archiveThread(thread.id));
            dispatch(fetchUnreadCount());
          },
        },
      ]);
    },
    [dispatch]
  );

  // Handle new message
  const handleNewMessage = useCallback(() => {
    navigation.navigate('NewMessage');
  }, [navigation]);

  // Filter threads by search query
  const filteredThreads = threads.filter((thread: MessageThread) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      thread.subject.toLowerCase().includes(query) ||
      thread.participantName.toLowerCase().includes(query) ||
      thread.lastMessage?.content.toLowerCase().includes(query)
    );
  });

  // Format time
  const formatTime = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  // Get status color
  const getStatusColor = (status: ThreadStatus) => {
    const colors = {
      [ThreadStatus.ACTIVE]: theme.colors.success,
      [ThreadStatus.ARCHIVED]: theme.colors.disabled,
      [ThreadStatus.CLOSED]: theme.colors.error,
    };
    return colors[status];
  };

  // Render thread item
  const renderThreadItem = ({ item }: { item: MessageThread }) => {
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity onPress={() => handleThreadPress(item)}>
        <Card style={[styles.threadCard, hasUnread && styles.unreadCard]}>
          <View style={styles.threadContent}>
            {/* Left: Avatar placeholder */}
            <View
              style={[
                styles.avatar,
                { backgroundColor: theme.colors.primary + '20' },
              ]}
            >
              <Text style={styles.avatarText}>
                {item.participantName.charAt(0).toUpperCase()}
              </Text>
            </View>

            {/* Center: Thread info */}
            <View style={styles.threadBody}>
              <View style={styles.threadHeader}>
                <Text
                  style={[styles.participantName, hasUnread && styles.unreadText]}
                  numberOfLines={1}
                >
                  {item.participantName}
                </Text>
                <Text style={styles.timeText}>
                  {item.lastMessage ? formatTime(item.lastMessage.createdAt) : ''}
                </Text>
              </View>

              <Text style={styles.subject} numberOfLines={1}>
                {item.subject}
              </Text>

              {item.lastMessage && (
                <Text
                  style={[styles.lastMessage, hasUnread && styles.unreadMessageText]}
                  numberOfLines={2}
                >
                  {item.lastMessage.content}
                </Text>
              )}

              <View style={styles.threadFooter}>
                <Chip
                  style={[
                    styles.statusChip,
                    { backgroundColor: getStatusColor(item.status) + '20' },
                  ]}
                  textStyle={[
                    styles.statusChipText,
                    { color: getStatusColor(item.status) },
                  ]}
                >
                  {item.status}
                </Chip>
                {hasUnread && (
                  <Badge size={20} style={styles.unreadBadge}>
                    {item.unreadCount}
                  </Badge>
                )}
              </View>
            </View>

            {/* Right: Archive button */}
            {item.status === ThreadStatus.ACTIVE && (
              <IconButton
                icon="archive"
                size={20}
                onPress={() => handleArchiveThread(item)}
              />
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <IconButton icon="message-outline" size={64} iconColor={theme.colors.disabled} />
        <Text style={styles.emptyTitle}>No Messages</Text>
        <Text style={styles.emptyMessage}>
          {searchQuery
            ? 'No messages match your search.'
            : selectedStatus
            ? `No ${selectedStatus.toLowerCase()} conversations.`
            : 'Start a conversation with your property manager.'}
        </Text>
        <Button
          mode="contained"
          onPress={handleNewMessage}
          style={styles.emptyButton}
        >
          New Message
        </Button>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Messages</Text>
          {unreadCount > 0 && (
            <Badge size={24} style={styles.headerBadge}>
              {unreadCount}
            </Badge>
          )}
        </View>

        {/* Search Bar */}
        <Searchbar
          placeholder="Search messages..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
        />

        {/* Status Filters */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { label: 'All', value: null },
              { label: 'Active', value: ThreadStatus.ACTIVE },
              { label: 'Archived', value: ThreadStatus.ARCHIVED },
              { label: 'Closed', value: ThreadStatus.CLOSED },
            ]}
            keyExtractor={(item) => item.label}
            renderItem={({ item }) => (
              <Chip
                selected={selectedStatus === item.value}
                onPress={() => handleStatusFilter(item.value)}
                style={styles.filterChip}
                textStyle={styles.filterChipText}
              >
                {item.label}
              </Chip>
            )}
            contentContainerStyle={styles.filterList}
          />
        </View>
      </View>

      {/* Threads List */}
      <FlatList
        data={filteredThreads}
        keyExtractor={(item) => `thread-${item.id}`}
        renderItem={renderThreadItem}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          filteredThreads.length === 0 ? styles.emptyListContainer : styles.listContainer
        }
      />

      {/* Floating Action Button - New Message */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleNewMessage}
        label="New Message"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  headerBadge: {
    backgroundColor: theme.colors.primary,
    color: theme.colors.textOnPrimary,
  },
  searchBar: {
    marginBottom: theme.spacing.sm,
    elevation: 0,
    backgroundColor: theme.colors.background,
  },
  filterContainer: {
    marginBottom: theme.spacing.xs,
  },
  filterList: {
    paddingRight: theme.spacing.md,
  },
  filterChip: {
    marginRight: theme.spacing.xs,
  },
  filterChipText: {
    fontSize: 12,
  },
  listContainer: {
    paddingBottom: 80, // Space for FAB
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  threadCard: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    elevation: 1,
    backgroundColor: theme.colors.surface,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight + '10',
  },
  threadContent: {
    flexDirection: 'row',
    padding: theme.spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  threadBody: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.disabled,
    marginLeft: theme.spacing.xs,
  },
  subject: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  lastMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
  unreadMessageText: {
    fontWeight: '600',
    color: theme.colors.text,
  },
  threadFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusChip: {
    height: 24,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  emptyButton: {
    paddingHorizontal: theme.spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    backgroundColor: theme.colors.primary,
  },
});

export default MessagesScreen;
