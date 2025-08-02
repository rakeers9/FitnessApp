// src/screens/main/NotificationsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';

// Types
type NotificationsScreenProps = {
  navigation: StackNavigationProp<any>;
};

interface NotificationItem {
  id: string;
  created_at: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  related_id?: string;
  related_type?: string;
  metadata?: any;
  sender?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface NotificationTypeConfig {
  icon: string;
  color: string;
  allowNavigation: boolean;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Configuration for different notification types
  const notificationTypes: { [key: string]: NotificationTypeConfig } = {
    comment_added: { icon: 'chatbubble', color: '#17D4D4', allowNavigation: true },
    workout_completed: { icon: 'checkmark-circle', color: '#4CAF50', allowNavigation: true },
    workout_completed_self: { icon: 'trophy', color: '#FFD700', allowNavigation: true },
    workout_created: { icon: 'add-circle', color: '#17D4D4', allowNavigation: true },
    workout_assigned: { icon: 'fitness', color: '#2196F3', allowNavigation: true },
    workout_modified: { icon: 'create', color: '#FF9800', allowNavigation: true },
    workout_updated: { icon: 'refresh', color: '#FF9800', allowNavigation: true },
    coach_connected: { icon: 'people', color: '#4CAF50', allowNavigation: false },
    client_connected: { icon: 'person-add', color: '#4CAF50', allowNavigation: false },
    coach_disconnected: { icon: 'people', color: '#F44336', allowNavigation: false },
    client_disconnected: { icon: 'person-remove', color: '#F44336', allowNavigation: false },
  };

  // Load notifications when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
    }, [])
  );

  // Load notifications from database
  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      // First, get notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select(`
          id,
          created_at,
          type,
          title,
          message,
          is_read,
          related_id,
          related_type,
          metadata,
          sender_id
        `)
        .eq('recipient_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notificationsError) {
        console.error('Error loading notifications:', notificationsError);
        Alert.alert('Error', 'Failed to load notifications');
        return;
      }

      if (notificationsData) {
        // Get unique sender IDs
        const senderIds = [...new Set(
          notificationsData
            .map(n => n.sender_id)
            .filter(id => id !== null)
        )];

        // Get sender profiles
        let sendersData: any[] = [];
        if (senderIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', senderIds);

          if (!profilesError && profiles) {
            sendersData = profiles;
          }
        }

        // Transform notifications with sender data
        const transformedNotifications: NotificationItem[] = notificationsData.map(notification => {
          const sender = sendersData.find(s => s.id === notification.sender_id);
          
          return {
            id: notification.id,
            created_at: notification.created_at,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            is_read: notification.is_read,
            related_id: notification.related_id,
            related_type: notification.related_type,
            metadata: notification.metadata,
            sender: sender ? {
              id: sender.id,
              full_name: sender.full_name,
              avatar_url: sender.avatar_url,
            } : undefined,
          };
        });

        setNotifications(transformedNotifications);
        
        // Count unread notifications
        const unread = transformedNotifications.filter(n => !n.is_read).length;
        setUnreadCount(unread);
        
        console.log(`Loaded ${transformedNotifications.length} notifications, ${unread} unread`);
      }
    } catch (error) {
      console.error('Error in loadNotifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true }
            : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
      
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
    }
  };

  // Handle notification tap
  const handleNotificationTap = (notification: NotificationItem) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    const typeConfig = notificationTypes[notification.type];
    if (!typeConfig?.allowNavigation) {
      return; // Don't navigate for non-navigable notifications
    }

    // Navigate based on notification type and related content
    switch (notification.type) {
      case 'comment_added':
        if (notification.metadata?.exercise_id) {
          navigation.navigate('ExerciseComments', {
            exerciseId: notification.metadata.exercise_id,
            exerciseName: notification.metadata.exercise_name || 'Exercise',
          });
        }
        break;
        
      case 'workout_completed':
      case 'workout_completed_self':
        if (notification.related_id) {
          navigation.navigate('ViewWorkoutSession', {
            sessionId: notification.related_id,
          });
        }
        break;
        
      case 'workout_created':
      case 'workout_assigned':
      case 'workout_modified':
      case 'workout_updated':
        if (notification.related_id) {
          // Navigate to workout template
          navigation.navigate('EditWorkout', {
            workoutId: notification.related_id,
          });
        }
        break;
        
      default:
        console.log('No navigation defined for notification type:', notification.type);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Navigation handlers
  const handleBack = () => {
    navigation.goBack();
  };

  const handleSettings = () => {
    Alert.alert(
      'Notification Settings',
      'Manage your notification preferences',
      [
        { text: 'Mark All Read', onPress: markAllAsRead },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Render notification item
  const renderNotificationItem = ({ item }: { item: NotificationItem }) => {
    const typeConfig = notificationTypes[item.type] || { 
      icon: 'notifications', 
      color: '#666666', 
      allowNavigation: false 
    };

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.is_read && styles.unreadNotification
        ]}
        onPress={() => handleNotificationTap(item)}
        activeOpacity={0.7}
      >
        {/* Profile Picture or Icon */}
        <View style={styles.avatarContainer}>
          {item.sender?.avatar_url ? (
            <Image 
              source={{ uri: item.sender.avatar_url }} 
              style={styles.avatar}
            />
          ) : item.sender ? (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {item.sender.full_name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          ) : (
            <View style={[styles.avatar, styles.systemAvatar]}>
              <Ionicons 
                name={typeConfig.icon as any} 
                size={20} 
                color={typeConfig.color} 
              />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <View style={styles.messageContainer}>
            <Text style={styles.message}>
              {item.sender?.full_name && (
                <Text style={styles.senderName}>
                  {item.sender.full_name}
                </Text>
              )}
              {item.message}
            </Text>
            <Text style={styles.timestamp}>
              {formatRelativeTime(item.created_at)}
            </Text>
          </View>
          
          {/* Notification type icon */}
          <View style={[styles.typeIcon, { backgroundColor: typeConfig.color }]}>
            <Ionicons 
              name={typeConfig.icon as any} 
              size={12} 
              color="#FFFFFF" 
            />
          </View>
        </View>

        {/* Unread indicator */}
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-outline" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptySubtitle}>
        You'll see notifications here when you have activity
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={handleSettings}>
          <Ionicons name="settings-outline" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#17D4D4"
              colors={['#17D4D4']}
            />
          }
        />
      ) : (
        renderEmptyState()
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerButton: {
    padding: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
  },
  unreadBadge: {
    backgroundColor: '#FF3B3B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  
  // Content
  listContainer: {
    paddingHorizontal: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
  },
  
  // Notification Items
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  unreadNotification: {
    backgroundColor: '#FAFFFE', // Very light cyan tint
  },
  
  // Avatar
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  systemAvatar: {
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  avatarInitial: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#666666',
  },
  
  // Content
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  messageContainer: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    lineHeight: 20,
    marginBottom: 4,
  },
  senderName: {
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
  },
  timestamp: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
  },
  
  // Type icon
  typeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  
  // Unread indicator
  unreadDot: {
    position: 'absolute',
    top: 20,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#17D4D4',
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationsScreen;