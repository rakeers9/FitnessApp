// src/services/notifications.ts

import { supabase } from './supabase';

export interface CreateNotificationParams {
  recipientId: string;
  senderId?: string | null;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  metadata?: any;
}

// Core function to create a notification
export const createNotification = async (params: CreateNotificationParams) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: params.recipientId,
        sender_id: params.senderId,
        type: params.type,
        title: params.title,
        message: params.message,
        related_id: params.relatedId,
        related_type: params.relatedType,
        metadata: params.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    console.log('Notification created:', data.id);
    return data;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return null;
  }
};

// Get current user's coach/clients for notifications
export const getUserRelationships = async (userId: string) => {
  try {
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('coach_id, full_name')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error getting user profile:', userError);
      return { coachId: null, clientIds: [], userName: 'Unknown User' };
    }

    // Get clients if user is a coach
    const { data: clients, error: clientsError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('coach_id', userId);

    const clientIds = clients?.map(c => c.id) || [];

    return {
      coachId: userProfile?.coach_id || null,
      clientIds,
      userName: userProfile?.full_name || 'Unknown User',
    };
  } catch (error) {
    console.error('Error in getUserRelationships:', error);
    return { coachId: null, clientIds: [], userName: 'Unknown User' };
  }
};

// Specific notification creation functions

export const notifyWorkoutCompleted = async (
  userId: string,
  workoutSessionId: string,
  workoutName: string,
  durationMinutes: number,
  totalVolume: number
) => {
  const { coachId, userName } = await getUserRelationships(userId);

  // Notify coach if exists
  if (coachId) {
    await createNotification({
      recipientId: coachId,
      senderId: userId,
      type: 'workout_completed',
      title: 'Workout Completed',
      message: `${userName} completed: ${workoutName}`,
      relatedId: workoutSessionId,
      relatedType: 'workout_session',
      metadata: {
        duration_minutes: durationMinutes,
        total_volume: totalVolume,
      },
    });
  }

  // Self-congratulatory notification
  await createNotification({
    recipientId: userId,
    senderId: null,
    type: 'workout_completed_self',
    title: 'Great Workout!',
    message: `You completed ${workoutName} in ${durationMinutes} minutes`,
    relatedId: workoutSessionId,
    relatedType: 'workout_session',
    metadata: {
      duration_minutes: durationMinutes,
      total_volume: totalVolume,
    },
  });
};

export const notifyWorkoutCreated = async (
  userId: string,
  workoutTemplateId: string,
  workoutName: string,
  exerciseCount: number
) => {
  const { coachId, clientIds, userName } = await getUserRelationships(userId);

  if (coachId) {
    // Client created workout, notify coach
    await createNotification({
      recipientId: coachId,
      senderId: userId,
      type: 'workout_created',
      title: 'New Workout Created',
      message: `${userName} created a new workout: ${workoutName}`,
      relatedId: workoutTemplateId,
      relatedType: 'workout_template',
      metadata: { exercise_count: exerciseCount },
    });
  } else if (clientIds.length > 0) {
    // Coach created workout, notify all clients
    for (const clientId of clientIds) {
      await createNotification({
        recipientId: clientId,
        senderId: userId,
        type: 'workout_assigned',
        title: 'New Workout Available',
        message: `Your coach ${userName} created: ${workoutName}`,
        relatedId: workoutTemplateId,
        relatedType: 'workout_template',
        metadata: { exercise_count: exerciseCount },
      });
    }
  }
};

export const notifyWorkoutModified = async (
  userId: string,
  workoutTemplateId: string,
  workoutName: string,
  exerciseCount: number
) => {
  const { coachId, clientIds, userName } = await getUserRelationships(userId);

  if (coachId) {
    // Client modified workout, notify coach
    await createNotification({
      recipientId: coachId,
      senderId: userId,
      type: 'workout_modified',
      title: 'Workout Modified',
      message: `${userName} modified: ${workoutName}`,
      relatedId: workoutTemplateId,
      relatedType: 'workout_template',
      metadata: { exercise_count: exerciseCount },
    });
  } else if (clientIds.length > 0) {
    // Coach modified workout, notify all clients
    for (const clientId of clientIds) {
      await createNotification({
        recipientId: clientId,
        senderId: userId,
        type: 'workout_updated',
        title: 'Workout Updated',
        message: `Your coach ${userName} updated: ${workoutName}`,
        relatedId: workoutTemplateId,
        relatedType: 'workout_template',
        metadata: { exercise_count: exerciseCount },
      });
    }
  }
};

export const notifyExerciseComment = async (
  userId: string,
  exerciseId: string,
  exerciseName: string,
  commentText: string
) => {
  const { coachId, userName } = await getUserRelationships(userId);

  // Only notify coach for now (client -> coach notifications)
  if (coachId) {
    await createNotification({
      recipientId: coachId,
      senderId: userId,
      type: 'comment_added',
      title: 'New Exercise Comment',
      message: `${userName} commented on ${exerciseName}`,
      relatedId: exerciseId,
      relatedType: 'exercise',
      metadata: {
        exercise_name: exerciseName,
        comment_preview: commentText.slice(0, 50) + (commentText.length > 50 ? '...' : ''),
      },
    });
  }
};

export const notifyCoachConnected = async (
  clientId: string,
  coachId: string,
  clientName: string,
  coachName: string
) => {
  // Notify client
  await createNotification({
    recipientId: clientId,
    senderId: coachId,
    type: 'coach_connected',
    title: 'Coach Connected',
    message: `You are now connected with coach ${coachName}`,
    relatedId: coachId,
    relatedType: 'profile',
  });

  // Notify coach
  await createNotification({
    recipientId: coachId,
    senderId: clientId,
    type: 'client_connected',
    title: 'New Client',
    message: `${clientName} is now your client`,
    relatedId: clientId,
    relatedType: 'profile',
  });
};

export const notifyCoachDisconnected = async (
  clientId: string,
  coachId: string,
  clientName: string,
  coachName: string
) => {
  // Notify client
  await createNotification({
    recipientId: clientId,
    senderId: null, // System notification
    type: 'coach_disconnected',
    title: 'Coach Disconnected',
    message: `You are no longer connected with ${coachName}`,
    relatedId: coachId,
    relatedType: 'profile',
  });

  // Notify coach
  await createNotification({
    recipientId: coachId,
    senderId: clientId,
    type: 'client_disconnected',
    title: 'Client Disconnected',
    message: `${clientName} is no longer your client`,
    relatedId: clientId,
    relatedType: 'profile',
  });
};

// Function to get unread notification count
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)
      .eq('is_active', true);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadNotificationCount:', error);
    return 0;
  }
};

// Function to mark notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    return false;
  }
};

// Function to mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    return false;
  }
};