/**
 * NotificationsScreen
 * Main notifications list view with filtering, grouping, and actions
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Searchbar, Button, Card, Chip, IconButton, Badge, Menu } from 'react-native-paper';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { format, isToday, isYesterday, parseISO, differenceInDays } from 'date-fns';
import { AppDispatch, RootState } from '../../store';
import {
  fetchNotifications,
  refreshNotifications,
  loadMoreNotifications,
  fetchUnreadCount,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  setFilters,
  clearFilters,
} from '../../store/notificationSlice';
import {
  Notification,
  NotificationCategory,
  NotificationStatus,
  NotificationPriority,
} from '../../types/notification';
import { theme } from '../../theme';

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    filters,
    page,
  } = useSelector((state: RootState) => state.notification);

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | null>(null);
  const [menuVisible, setMenuVisible] = useState<{ [key: number]: boolean }>({});

  // Load notifications on mount
  useEffect(() => {
    dispatch(fetchNotifications(filters));
    dispatch(fetchUnreadCount());
  }, [dispatch, filters]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    dispatch(refreshNotifications());
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      dispatch(loadMoreNotifications(page + 1));
    }
  }, [dispatch, isLoadingMore, hasMore, page]);

  // Handle category filter
  const handleCategoryFilter = useCallback(
    (category: NotificationCategory | null) => {
      setSelectedCategory(category);
      if (category) {
        dispatch(setFilters({ category, page: 1 }));
      } else {
        dispatch(clearFilters());
      }
    },
    [dispatch]
  );

  // Handle notification press
  const handleNotificationPress = useCallback(
    async (notification: Notification) => {
      // Mark as read if unread
      if (notification.status === NotificationStatus.UNREAD) {
        await dispatch(markAsRead(notification.id));
        dispatch(fetchUnreadCount());
      }

      // Navigate based on action type
      if (notification.action) {
        switch (notification.action.type) {
          case 'VIEW_PAYMENT':
            // Navigate to payment details
            break;
          case 'MAKE_PAYMENT':
            navigation.navigate('PaymentsStack');
            break;
          case 'VIEW_MAINTENANCE_REQUEST':
            if (notification.action.params?.requestId) {
              navigation.navigate('MaintenanceStack', {
                screen: 'MaintenanceDetail',
                params: { requestId: notification.action.params.requestId },
              });
            }
            break;
          case 'VIEW_LEASE':
            navigation.navigate('Lease');
            break;
          case 'VIEW_DOCUMENTS':
            navigation.navigate('Lease', {
              screen: 'Documents',
            });
            break;
          default:
            break;
        }
      }
    },
    [dispatch, navigation]
  );

  // Handle mark as read/unread
  const handleToggleReadStatus = useCallback(
    async (notification: Notification) => {
      if (notification.status === NotificationStatus.UNREAD) {
        await dispatch(markAsRead(notification.id));
      } else {
        await dispatch(markAsUnread(notification.id));
      }
      dispatch(fetchUnreadCount());
      setMenuVisible({ ...menuVisible, [notification.id]: false });
    },
    [dispatch, menuVisible]
  );

  // Handle delete notification
  const handleDeleteNotification = useCallback(
    (notification: Notification) => {
      Alert.alert(
        'Delete Notification',
        'Are you sure you want to delete this notification?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await dispatch(deleteNotification(notification.id));
              dispatch(fetchUnreadCount());
              setMenuVisible({ ...menuVisible, [notification.id]: false });
            },
          },
        ]
      );
    },
    [dispatch, menuVisible]
  );

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(() => {
    if (unreadCount === 0) {
      Alert.alert('No Unread Notifications', 'All notifications are already marked as read.');
      return;
    }

    Alert.alert(
      'Mark All as Read',
      `Mark all ${unreadCount} unread notifications as read?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          onPress: async () => {
            await dispatch(markAllAsRead());
            dispatch(fetchUnreadCount());
          },
        },
      ]
    );
  }, [dispatch, unreadCount]);

  // Handle clear read notifications
  const handleClearRead = useCallback(() => {
    const readCount = notifications.filter((n: Notification) => n.status === NotificationStatus.READ).length;
    
    if (readCount === 0) {
      Alert.alert('No Read Notifications', 'There are no read notifications to clear.');
      return;
    }

    Alert.alert(
      'Clear Read Notifications',
      `Delete all ${readCount} read notifications?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            dispatch(clearReadNotifications());
          },
        },
      ]
    );
  }, [dispatch, notifications]);

  // Toggle menu visibility
  const toggleMenu = useCallback((notificationId: number) => {
    setMenuVisible((prev) => ({ ...prev, [notificationId]: !prev[notificationId] }));
  }, []);

  // Filter notifications by search query and selected category
  const filteredNotifications = (notifications ?? []).filter((notification: Notification) => {
    if (selectedCategory && notification.category !== selectedCategory) {
      return false;
    }

    if (!searchQuery.trim()) {
      return true;
    }

    const query = searchQuery.trim().toLowerCase();
    return (
      notification.title.toLowerCase().includes(query) ||
      notification.message.toLowerCase().includes(query)
    );
  });

  // Group notifications into date buckets for the section list
  const groupedNotifications = filteredNotifications.reduce(
    (groups: Record<string, Notification[]>, notification: Notification) => {
      const date = parseISO(notification.createdAt);
      let dateKey: string;

      if (isToday(date)) {
        dateKey = 'Today';
      } else if (isYesterday(date)) {
        dateKey = 'Yesterday';
      } else {
        const daysAgo = differenceInDays(new Date(), date);
        dateKey = daysAgo < 7 ? format(date, 'EEEE') : format(date, 'MMM d, yyyy');
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(notification);
      return groups;
    },
    {} as Record<string, Notification[]>
  );

  // Convert grouped notifications to flat list with section headers
  const listData: ({ type: 'header'; title: string } | { type: 'notification'; data: Notification })[] = [];
  (Object.entries(groupedNotifications) as [string, Notification[]][]).forEach(([dateKey, notificationGroup]) => {
    listData.push({ type: 'header', title: dateKey });
    notificationGroup.forEach((notification: Notification) => {
      listData.push({ type: 'notification', data: notification });
    });
  });

  // Get category icon and color
  const getCategoryConfig = (category: NotificationCategory) => {
    const configs = {
      [NotificationCategory.PAYMENT]: { icon: 'credit-card', color: theme.colors.success },
      [NotificationCategory.MAINTENANCE]: { icon: 'hammer-wrench', color: theme.colors.warning },
      [NotificationCategory.LEASE]: { icon: 'file-document', color: theme.colors.info },
      [NotificationCategory.DOCUMENT]: { icon: 'file-multiple', color: theme.colors.primary },
      [NotificationCategory.SYSTEM]: { icon: 'cog', color: theme.colors.secondary },
      [NotificationCategory.ANNOUNCEMENT]: { icon: 'bullhorn', color: theme.colors.warning },
    };
    return configs[category];
  };

  // Get priority badge color
  const getPriorityColor = (priority: NotificationPriority) => {
    const colors = {
      [NotificationPriority.LOW]: theme.colors.disabled,
      [NotificationPriority.MEDIUM]: theme.colors.info,
      [NotificationPriority.HIGH]: theme.colors.warning,
      [NotificationPriority.URGENT]: theme.colors.error,
    };
    return colors[priority];
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = parseISO(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return format(date, 'MMM d');
  };

  // Render notification item
  const renderNotificationItem = (notification: Notification) => {
    const categoryConfig = getCategoryConfig(notification.category);
    const isUnread = notification.status === NotificationStatus.UNREAD;

    return (
      <Card
        style={[
          styles.notificationCard,
          isUnread && styles.unreadCard,
        ]}
        onPress={() => handleNotificationPress(notification)}
      >
        <View style={styles.notificationContent}>
          {/* Left: Category Icon */}
          <View
            style={[
              styles.categoryIcon,
              { backgroundColor: categoryConfig.color + '20' },
            ]}
          >
            <IconButton
              icon={categoryConfig.icon}
              size={24}
              iconColor={categoryConfig.color}
              style={styles.iconButton}
            />
          </View>

          {/* Center: Content */}
          <View style={styles.notificationBody}>
            <View style={styles.notificationHeader}>
              <Text
                style={[styles.notificationTitle, isUnread && styles.unreadText]}
                numberOfLines={1}
              >
                {notification.title}
              </Text>
              {isUnread && <Badge size={8} style={styles.unreadBadge} />}
            </View>

            <Text style={styles.notificationMessage} numberOfLines={2}>
              {notification.message}
            </Text>

            <View style={styles.notificationFooter}>
              <Text style={styles.timeText}>{formatTimeAgo(notification.createdAt)}</Text>
              {notification.priority !== NotificationPriority.LOW && (
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(notification.priority) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      { color: getPriorityColor(notification.priority) },
                    ]}
                  >
                    {notification.priority}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Right: Menu */}
          <Menu
            visible={menuVisible[notification.id] || false}
            onDismiss={() => toggleMenu(notification.id)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={() => toggleMenu(notification.id)}
              />
            }
          >
            <Menu.Item
              onPress={() => handleToggleReadStatus(notification)}
              title={isUnread ? 'Mark as Read' : 'Mark as Unread'}
              leadingIcon={isUnread ? 'email-open' : 'email'}
            />
            <Menu.Item
              onPress={() => handleDeleteNotification(notification)}
              title="Delete"
              leadingIcon="delete"
            />
          </Menu>
        </View>
      </Card>
    );
  };

  // Render section header
  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  // Render list item
  const renderItem = ({ item }: { item: typeof listData[0] }) => {
    if (item.type === 'header') {
      return renderSectionHeader(item.title);
    }
    return renderNotificationItem(item.data);
  };

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <IconButton icon="bell-outline" size={64} iconColor={theme.colors.disabled} />
        <Text style={styles.emptyTitle}>No Notifications</Text>
        <Text style={styles.emptyMessage}>
          {searchQuery
            ? 'No notifications match your search.'
            : selectedCategory
            ? `No ${selectedCategory.toLowerCase()} notifications.`
            : "You're all caught up! New notifications will appear here."}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Badge size={24} style={styles.headerBadge}>
              {unreadCount}
            </Badge>
          )}
        </View>

        {/* Search Bar */}
        <Searchbar
          placeholder="Search notifications..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
        />

        {/* Category Filters */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { label: 'All', value: null },
              { label: 'Payments', value: NotificationCategory.PAYMENT },
              { label: 'Maintenance', value: NotificationCategory.MAINTENANCE },
              { label: 'Lease', value: NotificationCategory.LEASE },
              { label: 'Documents', value: NotificationCategory.DOCUMENT },
              { label: 'System', value: NotificationCategory.SYSTEM },
            ]}
            keyExtractor={(item) => item.label}
            renderItem={({ item }) => (
              <Chip
                selected={selectedCategory === item.value}
                onPress={() => handleCategoryFilter(item.value)}
                style={styles.filterChip}
                textStyle={styles.filterChipText}
              >
                {item.label}
              </Chip>
            )}
            contentContainerStyle={styles.filterList}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="text"
            onPress={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            compact
          >
            Mark All Read
          </Button>
          <Button mode="text" onPress={handleClearRead} compact>
            Clear Read
          </Button>
        </View>
      </View>

      {/* Notifications List */}
      <FlatList
        data={listData}
        keyExtractor={(item, index) =>
          item.type === 'header' ? `header-${item.title}` : `notification-${item.data.id}`
        }
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          listData.length === 0 ? styles.emptyListContainer : styles.listContainer
        }
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
    backgroundColor: theme.colors.error,
    color: theme.colors.textOnPrimary,
  },
  searchBar: {
    marginBottom: theme.spacing.sm,
    elevation: 0,
    backgroundColor: theme.colors.background,
  },
  filterContainer: {
    marginBottom: theme.spacing.sm,
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  listContainer: {
    paddingBottom: theme.spacing.lg,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  sectionHeader: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
  },
  notificationCard: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    elevation: 1,
    backgroundColor: theme.colors.surface,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  notificationContent: {
    flexDirection: 'row',
    padding: theme.spacing.sm,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  iconButton: {
    margin: 0,
  },
  notificationBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  notificationMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.disabled,
  },
  priorityBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.small,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
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
  },
});

export default NotificationsScreen;
