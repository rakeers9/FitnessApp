// src/screens/main/ExerciseCommentsScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../services/supabase';

// Types for navigation
type ExerciseCommentsScreenProps = {
  navigation: StackNavigationProp<any>;
  route: RouteProp<any>;
};

// Types for comments
interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  parent_comment_id: string | null;
  // Joined from profiles
  username?: string;
  avatar_url?: string | null;
  // Nested replies
  replies?: Comment[];
}

interface CommentUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

const ExerciseCommentsScreen: React.FC<ExerciseCommentsScreenProps> = ({ navigation, route }) => {
  const { exerciseId, exerciseName } = route.params || {};
  
  // Validate required params
  useEffect(() => {
    if (!exerciseId || !exerciseName) {
      Alert.alert('Error', 'Missing exercise information', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  }, [exerciseId, exerciseName, navigation]);
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [currentUser, setCurrentUser] = useState<CommentUser | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadCurrentUser();
    loadComments();
  }, [exerciseId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCurrentUser({
          id: profile.id,
          full_name: profile.full_name || 'Anonymous',
          avatar_url: profile.avatar_url,
        });
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadComments = async () => {
    if (!exerciseId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('exercise_comments')
        .select(`
          *,
          profiles!exercise_comments_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('exercise_id', exerciseId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading comments:', error);
        return;
      }

      // Transform and nest comments
      const transformedComments: Comment[] = (data || []).map(comment => ({
        id: comment.id,
        user_id: comment.user_id,
        comment_text: comment.comment_text,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        parent_comment_id: comment.parent_comment_id,
        username: comment.profiles?.full_name || 'Anonymous',
        avatar_url: comment.profiles?.avatar_url,
        replies: [],
      }));

      // Nest replies under parent comments
      const nestedComments: Comment[] = [];
      const repliesMap: { [key: string]: Comment[] } = {};

      transformedComments.forEach(comment => {
        if (comment.parent_comment_id) {
          // This is a reply
          if (!repliesMap[comment.parent_comment_id]) {
            repliesMap[comment.parent_comment_id] = [];
          }
          repliesMap[comment.parent_comment_id].push(comment);
        } else {
          // This is a top-level comment
          nestedComments.push(comment);
        }
      });

      // Attach replies to parent comments
      nestedComments.forEach(comment => {
        comment.replies = repliesMap[comment.id] || [];
      });

      setComments(nestedComments);
    } catch (error) {
      console.error('Error in loadComments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUser || submitting || !exerciseId) return;

    try {
      setSubmitting(true);

      const { data, error } = await supabase
        .from('exercise_comments')
        .insert([
          {
            exercise_id: exerciseId,
            user_id: currentUser.id,
            comment_text: newComment.trim(),
            parent_comment_id: replyingTo?.id || null,
          }
        ])
        .select(`
          *,
          profiles!exercise_comments_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        Alert.alert('Error', 'Failed to post comment. Please try again.');
        return;
      }

      const newCommentObj: Comment = {
        id: data.id,
        user_id: data.user_id,
        comment_text: data.comment_text,
        created_at: data.created_at,
        updated_at: data.updated_at,
        parent_comment_id: data.parent_comment_id,
        username: data.profiles?.full_name || currentUser.full_name,
        avatar_url: data.profiles?.avatar_url || currentUser.avatar_url,
        replies: [],
      };

      if (replyingTo) {
        // Add as reply to existing comment
        setComments(prev => prev.map(comment => 
          comment.id === replyingTo.id
            ? { ...comment, replies: [...(comment.replies || []), newCommentObj] }
            : comment
        ));
      } else {
        // Add as new top-level comment
        setComments(prev => [...prev, newCommentObj]);
      }

      setNewComment('');
      setReplyingTo(null);
      Keyboard.dismiss();

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (comment: Comment) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('exercise_comments')
                .update({ is_active: false })
                .eq('id', comment.id);

              if (error) {
                Alert.alert('Error', 'Failed to delete comment.');
                return;
              }

              // Remove from local state
              if (comment.parent_comment_id) {
                // Remove reply
                setComments(prev => prev.map(c => ({
                  ...c,
                  replies: c.replies?.filter(r => r.id !== comment.id) || []
                })));
              } else {
                // Remove top-level comment
                setComments(prev => prev.filter(c => c.id !== comment.id));
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete comment.');
            }
          }
        }
      ]
    );
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return `${Math.floor(diffDays / 7)}w`;
  };

  const renderAvatar = (avatarUrl?: string | null, size: number = 32) => (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {avatarUrl ? (
        <Image 
          source={{ uri: avatarUrl }} 
          style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]} 
        />
      ) : (
        <Ionicons name="person" size={size * 0.6} color="#888888" />
      )}
    </View>
  );

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const isOwn = currentUser?.id === comment.user_id;
    
    return (
      <View key={comment.id} style={[styles.commentContainer, isReply && styles.replyContainer]}>
        <View style={styles.commentHeader}>
          {renderAvatar(comment.avatar_url)}
          <View style={styles.commentContent}>
            <View style={styles.commentRow}>
              <Text style={styles.username}>{comment.username}</Text>
              <Text style={styles.commentText}>{comment.comment_text}</Text>
            </View>
            
            <View style={styles.commentActions}>
              <Text style={styles.timeText}>{formatTimeAgo(comment.created_at)}</Text>
              {!isReply && (
                <TouchableOpacity 
                  style={styles.replyButton}
                  onPress={() => {
                    setReplyingTo(comment);
                    inputRef.current?.focus();
                  }}
                >
                  <Text style={styles.replyText}>Reply</Text>
                </TouchableOpacity>
              )}
              {isOwn && (
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => handleDeleteComment(comment)}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map(reply => renderComment(reply, true))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#000000" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Comments</Text>
            <Text style={styles.subtitle}>{exerciseName || 'Exercise'}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Comments List */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.commentsScrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#17D4D4" />
              <Text style={styles.loadingText}>Loading comments...</Text>
            </View>
          ) : comments.length > 0 ? (
            comments.map(comment => renderComment(comment))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Be the first to add a comment!</Text>
            </View>
          )}
        </ScrollView>

        {/* Reply indicator */}
        {replyingTo && (
          <View style={styles.replyIndicator}>
            <Text style={styles.replyIndicatorText}>
              Replying to {replyingTo.username}
            </Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close" size={20} color="#888888" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          {renderAvatar(currentUser?.avatar_url)}
          <TextInput
            ref={inputRef}
            style={styles.commentInput}
            value={newComment}
            onChangeText={setNewComment}
            placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : "Add a comment..."}
            placeholderTextColor="#888888"
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (newComment.trim() && !submitting) && styles.sendButtonActive]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons 
                name="send" 
                size={16} 
                color={newComment.trim() ? "#FFFFFF" : "#CCCCCC"} 
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 36, // Balance the back button
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
    marginTop: 2,
  },
  commentsScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
    marginTop: 12,
  },
  commentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyContainer: {
    paddingLeft: 48,
    paddingTop: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    backgroundColor: '#F4F4F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    // Styles applied dynamically
  },
  commentContent: {
    flex: 1,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  username: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginRight: 6,
  },
  commentText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    flex: 1,
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
    marginRight: 16,
  },
  replyButton: {
    marginRight: 16,
  },
  replyText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#888888',
  },
  deleteButton: {
    // No margin needed if it's last
  },
  deleteText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#FF4444',
  },
  repliesContainer: {
    marginTop: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
    marginLeft: 22,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#888888',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#CCCCCC',
  },
  replyIndicator: {
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  replyIndicatorText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    minHeight: 36,
    maxHeight: 100,
    marginHorizontal: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#17D4D4',
  },
});

export default ExerciseCommentsScreen;