// src/context/AITrainerContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

// Conversation states based on the state machine from the requirements
export type ConversationState = 
  | 'IDLE' 
  | 'PLAN_CONFIRM' 
  | 'PLAN_INFO_GATHER' 
  | 'PLAN_BUILDING' 
  | 'PLAN_PERSISTING' 
  | 'PLAN_EXPLAINED'
  | 'STOP_PLAN_CONFIRM';

// Message types
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  metadata?: any;
}

// User information collected for plan generation
export interface UserPlanInfo {
  goal?: string; // fat loss, muscle gain, strength, endurance, general fitness
  experience?: string; // beginner, intermediate, advanced
  daysPerWeek?: number; // 2-6
  availableDays?: string[]; // ['Monday', 'Wednesday', 'Friday']
  sessionLength?: number; // 30, 45, 60, 90 minutes
  equipment?: string[]; // ['gym', 'barbell', 'dumbbells', 'machines', 'bands', 'bodyweight']
  constraints?: string[]; // injuries, movements to avoid
  preferences?: {
    splitType?: string; // full-body, upper-lower, PPL, body-part
    favoriteExercises?: string[];
    avoidExercises?: string[];
  };
  startDate?: string; // ISO date string
  planLength?: number; // weeks, default 8
}

// Generated workout plan structure
export interface WorkoutPlan {
  plan: {
    name: string;
    start_date: string;
    length_weeks: number;
    days_per_week: number;
    progression_model: string;
    notes: string;
  };
  workouts: WorkoutTemplate[];
  calendar_assignments: CalendarAssignment[];
}

export interface WorkoutTemplate {
  day_of_week: string;
  title: string;
  estimated_minutes: number;
  exercises: Exercise[];
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rir?: number;
  rest_seconds: number;
  tempo?: string;
  notes?: string;
}

export interface CalendarAssignment {
  date: string;
  workout_title: string;
}

// Context state interface
interface AITrainerState {
  conversationState: ConversationState;
  messages: ChatMessage[];
  userPlanInfo: UserPlanInfo;
  currentPlanDraft: WorkoutPlan | null;
  planVersion: number;
  isLoading: boolean;
  hasShownHealthDisclaimer: boolean;
}

// Context actions interface
interface AITrainerContextType extends AITrainerState {
  // Message management
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  
  // State management
  setConversationState: (state: ConversationState) => void;
  updateUserPlanInfo: (info: Partial<UserPlanInfo>) => void;
  
  // Plan management
  setPlanDraft: (plan: WorkoutPlan) => void;
  clearPlanDraft: () => void;
  incrementPlanVersion: () => void;
  
  // Loading state
  setIsLoading: (loading: boolean) => void;
  
  // Disclaimer
  dismissHealthDisclaimer: () => void;
  
  // Persistence
  saveConversation: () => Promise<void>;
  loadConversation: () => Promise<void>;
  savePlan: (plan: WorkoutPlan) => Promise<boolean>;
  
  // Reset
  resetConversation: () => void;
  clearChat: () => void;
  restartAI: () => void;
}

const AITrainerContext = createContext<AITrainerContextType>({
  // Default state
  conversationState: 'IDLE',
  messages: [],
  userPlanInfo: {},
  currentPlanDraft: null,
  planVersion: 0,
  isLoading: false,
  hasShownHealthDisclaimer: false,
  
  // Default functions
  addMessage: () => {},
  clearMessages: () => {},
  setConversationState: () => {},
  updateUserPlanInfo: () => {},
  setPlanDraft: () => {},
  clearPlanDraft: () => {},
  incrementPlanVersion: () => {},
  setIsLoading: () => {},
  dismissHealthDisclaimer: () => {},
  saveConversation: async () => {},
  loadConversation: async () => {},
  savePlan: async () => false,
  resetConversation: () => {},
  clearChat: () => {},
  restartAI: () => {},
});

export const useAITrainer = () => {
  const context = useContext(AITrainerContext);
  if (!context) {
    throw new Error('useAITrainer must be used within an AITrainerProvider');
  }
  return context;
};

export const AITrainerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AITrainerState>({
    conversationState: 'IDLE',
    messages: [],
    userPlanInfo: {},
    currentPlanDraft: null,
    planVersion: 0,
    isLoading: false,
    hasShownHealthDisclaimer: false,
  });

  // Add a new message
  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }));
  };

  // Clear all messages
  const clearMessages = () => {
    setState(prev => ({
      ...prev,
      messages: [],
    }));
  };

  // Set conversation state
  const setConversationState = (conversationState: ConversationState) => {
    setState(prev => ({
      ...prev,
      conversationState,
    }));
  };

  // Update user plan information
  const updateUserPlanInfo = (info: Partial<UserPlanInfo>) => {
    setState(prev => ({
      ...prev,
      userPlanInfo: {
        ...prev.userPlanInfo,
        ...info,
      },
    }));
  };

  // Set plan draft
  const setPlanDraft = (plan: WorkoutPlan) => {
    setState(prev => ({
      ...prev,
      currentPlanDraft: plan,
    }));
  };

  // Clear plan draft
  const clearPlanDraft = () => {
    setState(prev => ({
      ...prev,
      currentPlanDraft: null,
      planVersion: 0,
    }));
  };

  // Increment plan version for edits
  const incrementPlanVersion = () => {
    setState(prev => ({
      ...prev,
      planVersion: prev.planVersion + 1,
    }));
  };

  // Set loading state
  const setIsLoading = (isLoading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading,
    }));
  };

  // Dismiss health disclaimer
  const dismissHealthDisclaimer = () => {
    setState(prev => ({
      ...prev,
      hasShownHealthDisclaimer: true,
    }));
  };

  // Save conversation to database
  const saveConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const messagesForDb = state.messages.map(msg => ({
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp.toISOString(),
        metadata: msg.metadata,
      }));

      // Check if conversation exists
      const { data: existingConversation } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (existingConversation && existingConversation.length > 0) {
        // Update existing conversation
        await supabase
          .from('ai_conversations')
          .update({
            messages: messagesForDb,
            conversation_state: state.conversationState,
            current_plan_draft: state.currentPlanDraft,
            plan_version: state.planVersion,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } else {
        // Create new conversation
        await supabase
          .from('ai_conversations')
          .insert({
            user_id: user.id,
            messages: messagesForDb,
            conversation_state: state.conversationState,
            current_plan_draft: state.currentPlanDraft,
            plan_version: state.planVersion,
          });
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  // Load conversation from database
  const loadConversation = async () => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database timeout')), 5000);
      });

      const { data: { user } } = await Promise.race([
        supabase.auth.getUser(),
        timeoutPromise
      ]) as any;
      
      if (!user) return;

      const { data, error } = await Promise.race([
        supabase
          .from('ai_conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1),
        timeoutPromise
      ]) as any;

      if (error) {
        console.error('Error loading conversation:', error);
        return;
      }

      if (data && data.length > 0) {
        const conversation = data[0];
        
        const loadedMessages = conversation.messages?.map((msg: any, index: number) => ({
          id: `loaded-${index}-${Date.now()}`,
          content: msg.content,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp),
          metadata: msg.metadata,
        })) || [];

        setState(prev => ({
          ...prev,
          messages: loadedMessages,
          conversationState: conversation.conversation_state || 'IDLE',
          currentPlanDraft: conversation.current_plan_draft,
          planVersion: conversation.plan_version || 0,
        }));
      }
    } catch (error) {
      console.error('Error in loadConversation:', error);
    }
  };

  // Save workout plan to database
  const savePlan = async (plan: WorkoutPlan): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Save the plan to ai_workout_plans
      const { data: planData, error: planError } = await supabase
        .from('ai_workout_plans')
        .insert({
          user_id: user.id,
          plan_name: plan.plan.name,
          plan_data: plan,
          start_date: plan.plan.start_date,
          length_weeks: plan.plan.length_weeks,
          days_per_week: plan.plan.days_per_week,
        })
        .select()
        .single();

      if (planError) {
        console.error('Error saving plan:', planError);
        return false;
      }

      // Save individual planned workout sessions
      const plannedSessions = plan.calendar_assignments.map(assignment => ({
        user_id: user.id,
        ai_plan_id: planData.id,
        workout_title: assignment.workout_title,
        workout_data: plan.workouts.find(w => w.title === assignment.workout_title),
        scheduled_date: assignment.date,
      }));

      const { error: sessionsError } = await supabase
        .from('planned_workout_sessions')
        .insert(plannedSessions);

      if (sessionsError) {
        console.error('Error saving planned sessions:', sessionsError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in savePlan:', error);
      return false;
    }
  };

  // Reset conversation
  const resetConversation = () => {
    setState({
      conversationState: 'IDLE',
      messages: [],
      userPlanInfo: {},
      currentPlanDraft: null,
      planVersion: 0,
      isLoading: false,
      hasShownHealthDisclaimer: true, // Keep disclaimer dismissed
    });
  };

  // Clear chat (keeping user info but clearing messages)
  const clearChat = () => {
    setState(prev => ({
      ...prev,
      messages: [],
      conversationState: 'IDLE',
      isLoading: false,
    }));
  };

  // Restart AI (full reset including user info)
  const restartAI = () => {
    setState({
      conversationState: 'IDLE',
      messages: [],
      userPlanInfo: {},
      currentPlanDraft: null,
      planVersion: 0,
      isLoading: false,
      hasShownHealthDisclaimer: false, // Show disclaimer again
    });
  };

  // Load conversation on mount (non-blocking) - after all functions are defined
  useEffect(() => {
    const loadConversationSafely = async () => {
      try {
        await loadConversation();
      } catch (error) {
        console.error('Failed to load conversation on mount:', error);
        // Continue without conversation history
      }
    };
    
    // Don't block app startup - load conversation in background
    setTimeout(loadConversationSafely, 1000);
  }, []);

  const contextValue: AITrainerContextType = {
    ...state,
    addMessage,
    clearMessages,
    setConversationState,
    updateUserPlanInfo,
    setPlanDraft,
    clearPlanDraft,
    incrementPlanVersion,
    setIsLoading,
    dismissHealthDisclaimer,
    saveConversation,
    loadConversation,
    savePlan,
    resetConversation,
    clearChat,
    restartAI,
  };

  return (
    <AITrainerContext.Provider value={contextValue}>
      {children}
    </AITrainerContext.Provider>
  );
};

export default AITrainerContext;
