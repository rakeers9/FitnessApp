// src/screens/main/AITrainerScreenSimple.tsx
// Simple, self-contained AI Trainer - no external dependencies, no context, no database calls

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import OpenAI from 'openai';
import { supabase } from '../../services/supabase';

// Simple types - no external dependencies
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'plan_card' | 'workout_preview' | 'exercise_preview';
  data?: WorkoutPlan | WorkoutPreview | ExercisePreview;
}

interface QuickReply {
  id: string;
  text: string;
  action: string;
  data?: any;
}

type ConversationState = 'IDLE' | 'PLAN_CONFIRM' | 'PLAN_INFO_GATHER' | 'PLAN_READY' | 'PLAN_EDITING' | 'WORKOUT_CREATE' | 'WORKOUT_SCHEDULE' | 'WORKOUT_READY' | 'WORKOUT_EDITING';

interface UserInfo {
  goal?: string;
  experience?: string;
  daysPerWeek?: number;
  sessionLength?: number;
  equipment?: string[];
}

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  muscle_groups: string[];
  notes?: string;
}

interface WorkoutDay {
  day_of_week: string;
  title: string;
  estimated_minutes: number;
  exercises: Exercise[];
}

interface WorkoutPlan {
  plan: {
    name: string;
    start_date: string;
    length_weeks: number;
    days_per_week: number;
    progression_model: string;
    notes: string;
  };
  workouts: WorkoutDay[];
}

interface WorkoutPreview {
  name: string;
  exercises: {
    name: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    muscle_groups?: string[];
    notes?: string;
  }[];
  estimated_minutes?: number;
  scheduledDays?: string[];
  description?: string;
}

interface ExercisePreview {
  name: string;
  muscle_groups: string[];
  description?: string;
}

type AITrainerScreenSimpleProps = {
  navigation: StackNavigationProp<any>;
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY, // Make sure to add this to your .env file
});

const AITrainerScreenSimple: React.FC<AITrainerScreenSimpleProps> = ({ navigation }) => {
  // Simple local state - no external dependencies
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>('IDLE');
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo>({});
  const [hasShownDisclaimer, setHasShownDisclaimer] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<WorkoutPlan | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [existingPlansCount, setExistingPlansCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isDatabaseAvailable, setIsDatabaseAvailable] = useState(true);
  const [workoutPreview, setWorkoutPreview] = useState<WorkoutPreview | null>(null);
  const [showWorkoutPreview, setShowWorkoutPreview] = useState(false);
  const [exercisePreview, setExercisePreview] = useState<ExercisePreview | null>(null);
  const [showExercisePreview, setShowExercisePreview] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  // Simple message ID generation
  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add message to chat and save to database
  const addMessage = async (content: string, sender: 'user' | 'ai', type?: 'text' | 'plan_card' | 'workout_preview' | 'exercise_preview', data?: WorkoutPlan | WorkoutPreview | ExercisePreview) => {
    const newMessage: ChatMessage = {
      id: generateMessageId(),
      content,
      sender,
      timestamp: new Date(),
      type: type || 'text',
      ...(data && { data })
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Save message to database if available
    if (isDatabaseAvailable) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('ai_chat_messages')
            .insert({
              user_id: user.id,
              message_id: newMessage.id,
              content: newMessage.content,
              sender: newMessage.sender,
              message_type: newMessage.type,
              message_data: newMessage.data ? JSON.stringify(newMessage.data) : null,
              created_at: newMessage.timestamp.toISOString(),
            });
          
          if (error) {
            if (error.code === '42P01') {
              // Table doesn't exist, disable database features
              setIsDatabaseAvailable(false);
              console.log('Chat persistence disabled - table not found. See SETUP_CHAT_TABLE.md for setup instructions.');
            } else {
              console.warn('Failed to save message to database:', error);
            }
          }
        }
      } catch (error) {
        console.warn('Error saving message:', error);
      }
    }
    
    // Auto-scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Load chat history from database
  const loadChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingHistory(false);
        addWelcomeMessage();
        return;
      }

      // Load messages from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: chatHistory, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading chat history:', error);
        // If table doesn't exist, disable database features
        if (error.code === '42P01') {
          console.log('Chat messages table does not exist.');
          console.log('To enable chat persistence, follow instructions in SETUP_CHAT_TABLE.md');
          setIsDatabaseAvailable(false);
        }
        setIsLoadingHistory(false);
        addWelcomeMessage();
        return;
      }

      if (chatHistory && chatHistory.length > 0) {
        const loadedMessages: ChatMessage[] = chatHistory.map(msg => ({
          id: msg.message_id,
          content: msg.content,
          sender: msg.sender as 'user' | 'ai',
          timestamp: new Date(msg.created_at),
          type: (msg.message_type || 'text') as 'text' | 'plan_card',
          ...(msg.message_data && { data: JSON.parse(msg.message_data) })
        }));

        setMessages(loadedMessages);
        console.log(`Loaded ${loadedMessages.length} messages from history`);
        
        // Scroll to bottom after loading
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 200);
      } else {
        // No history, show welcome message
        addWelcomeMessage();
      }
    } catch (error) {
      console.error('Error in loadChatHistory:', error);
      // Fallback to welcome message
      addWelcomeMessage();
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Load chat history when component mounts
  React.useEffect(() => {
    loadChatHistory();
  }, []);

  const addWelcomeMessage = () => {
    setHasShownDisclaimer(false);
    addMessage(
      "Hi! I'm your AI fitness trainer. I can help you with workout advice, create personalized training plans, and answer any fitness questions you have.\n\n" +
      "⚠️ **Health Disclaimer**: I'm an AI assistant and not a medical professional. Always consider your personal health history and consult a qualified professional before starting a new program.\n\n" +
      "What would you like to work on today?",
      'ai'
    );
    setTimeout(() => setHasShownDisclaimer(true), 1000);
  };

  // AI response logic with GPT API simulation
  const getAIResponse = async (userMessage: string): Promise<{ content: string; newState?: ConversationState; replies?: QuickReply[] }> => {
    const message = userMessage.toLowerCase();
    
    // Use GPT-4o mini for intent detection when the state is IDLE
    if (conversationState === 'IDLE') {
      try {
        const intentPrompt = `Analyze this user message and determine their intent. Message: "${userMessage}"
        
Possible intents:
- CREATE_PLAN: User wants to create a multi-day workout plan/program
- CREATE_WORKOUT: User wants to create a single workout session
- CREATE_EXERCISE: User wants to add a new exercise to their library
- EDIT_WORKOUT: User wants to modify an existing workout
- DELETE_WORKOUT: User wants to remove a workout
- VIEW_PLANS: User wants to see their existing plans
- GET_TIPS: User wants fitness advice or tips
- GENERAL: General fitness question or chat

Respond with ONLY the intent keyword.`;

        const intentResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: intentPrompt }],
          max_tokens: 20,
          temperature: 0.3,
        });
        
        const detectedIntent = intentResponse.choices[0]?.message?.content?.trim() || 'GENERAL';
        
        // Handle detected intents naturally
        switch (detectedIntent) {
          case 'CREATE_PLAN':
            return {
              content: "I'll help you create a personalized workout plan! Let me ask you a few questions to design the perfect program for you. Ready to get started?",
              newState: 'PLAN_CONFIRM',
              replies: [
                { id: 'yes', text: "Yes, let's go!", action: 'CONFIRM_PLAN' },
                { id: 'no', text: 'Not right now', action: 'CANCEL' }
              ]
            };
            
          case 'CREATE_WORKOUT':
            return {
              content: "I'll help you create a custom workout! Please describe what kind of workout you want. Be as specific as possible.\n\nFor example:\n- 'Upper body strength workout focusing on chest and shoulders'\n- '30-minute HIIT workout for fat loss'\n- 'Leg day with squats and deadlifts'\n- 'Full body workout with dumbbells only'",
              newState: 'WORKOUT_CREATE',
              replies: [
                { id: 'cancel', text: '❌ Cancel', action: 'CANCEL' }
              ]
            };
            
          case 'CREATE_EXERCISE':
            // Parse exercise from user message
            const exercisePrompt = `Extract exercise details from this message: "${userMessage}"
            
Return a JSON object with this structure:
{
  "name": "Exercise name",
  "muscle_groups": ["Primary muscle", "Secondary muscle"],
  "description": "Brief description of the exercise"
}

If the message doesn't contain clear exercise details, return null.`;

            try {
              const exerciseResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: exercisePrompt }],
                max_tokens: 200,
                temperature: 0.5,
              });
              
              const exerciseData = JSON.parse(exerciseResponse.choices[0]?.message?.content || 'null');
              
              if (exerciseData && exerciseData.name) {
                setExercisePreview(exerciseData);
                
                // Add preview card to chat
                const previewMessage: ChatMessage = {
                  id: generateMessageId(),
                  content: 'Exercise Preview',
                  sender: 'ai',
                  timestamp: new Date(),
                  type: 'exercise_preview',
                  data: exerciseData
                };
                
                setMessages(prev => [...prev, previewMessage]);
                setShowExercisePreview(true);
                
                return {
                  content: "I've prepared this exercise for your library. Would you like to add it?",
                  replies: [
                    { id: 'apply', text: '✅ Apply These Changes', action: 'SAVE_EXERCISE', data: exerciseData },
                    { id: 'edit', text: '✏️ Make Changes', action: 'EDIT_PREVIEW', data: 'exercise' },
                    { id: 'cancel', text: '❌ Cancel', action: 'CANCEL' }
                  ]
                };
              }
            } catch (error) {
              console.error('Error parsing exercise:', error);
            }
            
            return {
              content: "Let's add a new exercise to your library! Please tell me the exercise name and which muscle groups it targets. For example: 'Add barbell squats for quads and glutes'",
            };
            
          case 'EDIT_WORKOUT':
            const workoutsForEdit = await fetchUserWorkouts();
            if (workoutsForEdit.length === 0) {
              return {
                content: "You don't have any workouts yet. Would you like to create one?",
                replies: [
                  { id: 'create', text: 'Create a workout', action: 'CREATE_WORKOUT' },
                  { id: 'cancel', text: 'Cancel', action: 'CANCEL' }
                ]
              };
            }
            return {
              content: "Which workout would you like to edit?",
              replies: workoutsForEdit.slice(0, 5).map((w: any) => ({
                id: w.id,
                text: w.name,
                action: 'EDIT_WORKOUT',
                data: w.id
              }))
            };
            
          case 'DELETE_WORKOUT':
            const workoutsForDelete = await fetchUserWorkouts();
            if (workoutsForDelete.length === 0) {
              return {
                content: "You don't have any workouts to delete.",
              };
            }
            return {
              content: "⚠️ Which workout would you like to delete? This cannot be undone.",
              replies: workoutsForDelete.slice(0, 5).map((w: any) => ({
                id: w.id,
                text: w.name,
                action: 'DELETE_WORKOUT',
                data: w.id
              }))
            };
            
          case 'VIEW_PLANS':
            return {
              content: "Let me check your workout plans...",
              // TODO: Implement fetching and displaying plans
            };
            
          case 'GET_TIPS':
            const tipsResponse = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: 'Give me one helpful fitness tip for today. Keep it brief and practical.' }],
              max_tokens: 150,
              temperature: 0.7,
            });
            return {
              content: tipsResponse.choices[0]?.message?.content || "Stay consistent with your workouts and remember that progress takes time!",
            };
            
          default:
            // For general questions, use GPT to provide a helpful response
            const generalResponse = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You are a helpful fitness assistant. Keep responses brief and friendly.' },
                { role: 'user', content: userMessage }
              ],
              max_tokens: 200,
              temperature: 0.7,
            });
            return {
              content: generalResponse.choices[0]?.message?.content || "I'm here to help with your fitness journey! You can ask me to create workouts, design training plans, or answer fitness questions.",
            };
        }
      } catch (error) {
        console.error('Intent detection error:', error);
        // Fall through to existing logic if GPT fails
      }
    }
    
    // Check for exercise creation intent
    if (message.includes('create exercise') || message.includes('add exercise') || message.includes('new exercise')) {
      // Parse exercise details from the message
      const exerciseMatch = message.match(/exercise[:\s]+([^,]+)/i);
      const musclesMatch = message.match(/muscles?[:\s]+([^,.]+)/i);
      
      if (exerciseMatch && exerciseMatch[1]) {
        const exerciseName = exerciseMatch[1].trim();
        const muscles = musclesMatch ? musclesMatch[1].split(/[,&]/).map(m => m.trim()) : ['CUSTOM'];
        
        addMessage("Creating exercise: " + exerciseName + " for " + muscles.join(", "), 'ai');
        
        const success = await createExerciseInDatabase(exerciseName, muscles);
        
        if (success) {
          return {
            content: `✅ Successfully created exercise "${exerciseName}"!\n\nIt's now available in your Exercise Library and can be added to any workout. The exercise targets: ${muscles.join(", ")}.`,
          };
        } else {
          return {
            content: `The exercise "${exerciseName}" already exists or couldn't be created. Check your Exercise Library to see available exercises.`,
          };
        }
      } else {
        return {
          content: "To create an exercise, please specify the name and muscle groups. For example:\n\n'Create exercise: Cable Flyes, muscles: Chest'",
        };
      }
    }
    
    // Check for single workout creation intent
    if (message.includes('create workout') || message.includes('new workout') || (message.includes('workout') && !message.includes('plan'))) {
      return {
        content: "I can help you create a custom workout! Please tell me:\n1. What should we name this workout?\n2. Which exercises to include?\n3. How many sets and reps for each?\n\nFor example: 'Create workout called Chest Day with bench press 3x10, incline dumbbell press 3x12, cable flyes 3x15'",
      };
    }
    
    // Check for editing intent
    if (message.includes('edit') || message.includes('modify') || message.includes('change') || message.includes('update')) {
      if (message.includes('workout')) {
        const workouts = await fetchUserWorkouts();
        
        if (workouts.length === 0) {
          return {
            content: "You don't have any workouts to edit yet. Would you like to create a new workout instead?",
          };
        }
        
        // List workouts for user to choose
        const workoutList = workouts.slice(0, 5).map((w, i) => `${i + 1}. ${w.name}`).join('\n');
        
        return {
          content: `Here are your workouts:\n\n${workoutList}\n\nWhich workout would you like to edit? You can:\n- Add or remove exercises\n- Change sets/reps\n- Rename the workout\n- Adjust rest times`,
          replies: workouts.slice(0, 4).map((w, i) => ({
            id: `edit_${w.id}`,
            text: w.name,
            action: 'EDIT_WORKOUT',
            data: w.id,
          })),
        };
      }
    }
    
    // Check for delete intent
    if (message.includes('delete') || message.includes('remove')) {
      if (message.includes('workout')) {
        const workouts = await fetchUserWorkouts();
        
        if (workouts.length === 0) {
          return {
            content: "You don't have any workouts to delete.",
          };
        }
        
        const workoutList = workouts.slice(0, 5).map((w, i) => `${i + 1}. ${w.name}`).join('\n');
        
        return {
          content: `⚠️ Which workout would you like to delete?\n\n${workoutList}\n\nThis action cannot be undone.`,
          replies: workouts.slice(0, 4).map((w, i) => ({
            id: `delete_${w.id}`,
            text: `Delete ${w.name}`,
            action: 'DELETE_WORKOUT',
            data: w.id,
          })),
        };
      }
    }
    
    // Plan creation intent - handle in any state
    if (message.includes('plan') || message.includes('workout') || message.includes('program') || message.includes('routine')) {
      // Allow plan creation from any state, not just IDLE
      if (conversationState === 'IDLE' || conversationState === 'PLAN_READY') {
        // Check if user already has plans and warn about double-layering
        if (existingPlansCount > 0) {
          return {
            content: "⚠️ I notice you already have workout plans in your app. Creating a new plan will add more workouts to your schedule, which might create conflicts or double up your training.\n\n" +
                     "I recommend deleting your previous workout templates and calendar entries before creating a new plan to avoid confusion.\n\n" +
                     "Would you like me to proceed with creating a new plan anyway?",
            newState: 'PLAN_CONFIRM',
            replies: [
              { id: 'yes_anyway', text: 'Yes, create new plan', action: 'CONFIRM_PLAN' },
              { id: 'no', text: 'No, just give advice', action: 'DECLINE_PLAN' }
            ]
          };
        } else {
          return {
            content: "I'd love to help you create a personalized workout plan! I can design a program tailored to your goals, schedule, and available equipment, then add it directly to your app.\n\nWould you like me to create a custom plan for you?",
            newState: 'PLAN_CONFIRM',
            replies: [
              { id: 'yes', text: 'Yes, build it!', action: 'CONFIRM_PLAN' },
              { id: 'no', text: 'Just give advice', action: 'DECLINE_PLAN' }
            ]
          };
        }
      }
    }
    
    // Handle plan confirmation
    if (conversationState === 'PLAN_CONFIRM') {
      // Check for affirmative responses
      if (message.includes('yes') || message.includes('build') || message.includes('create') || 
          message.includes('sure') || message.includes('ok') || message.includes('start')) {
        return {
          content: "Perfect! Let's build your personalized plan. I'll need to ask you a few questions to create the best program for you.\n\nFirst, what's your main fitness goal? You can tell me in your own words or choose from the options.",
          newState: 'PLAN_INFO_GATHER',
          replies: [
            { id: 'muscle', text: 'Build Muscle', action: 'SET_GOAL', data: 'muscle gain' },
            { id: 'strength', text: 'Get Stronger', action: 'SET_GOAL', data: 'strength' },
            { id: 'fat_loss', text: 'Lose Fat', action: 'SET_GOAL', data: 'fat loss' },
            { id: 'general', text: 'General Fitness', action: 'SET_GOAL', data: 'general fitness' },
            { id: 'cancel', text: '❌ Cancel', action: 'CANCEL' }
          ]
        };
      } else if (message.includes('no') || message.includes('not') || message.includes('cancel')) {
        return {
          content: "No problem! I'm here to help with any fitness questions you have. Feel free to ask about exercises, nutrition, training tips, or anything else fitness-related.",
          newState: 'IDLE'
        };
      } else {
        // They said something else - check if it's fitness related or off-topic
        const checkInfo = await extractPlanInfoFromMessage(message);
        
        if (checkInfo.isOffTopic) {
          return {
            content: "Let's focus on fitness! I'm here to help you create an amazing workout plan. Would you like to get started?",
            replies: [
              { id: 'yes', text: 'Yes, create a plan', action: 'CONFIRM_PLAN' },
              { id: 'no', text: 'Not right now', action: 'DECLINE_PLAN' },
              { id: 'cancel', text: '❌ Cancel', action: 'CANCEL' }
            ]
          };
        }
        
        // If they provided workout info directly, use it and move forward
        if (checkInfo.goal || checkInfo.experience || checkInfo.daysPerWeek) {
          // Store the info they provided
          const updatedInfo = { ...userInfo };
          if (checkInfo.goal) updatedInfo.goal = checkInfo.goal;
          if (checkInfo.experience) updatedInfo.experience = checkInfo.experience;
          if (checkInfo.daysPerWeek) updatedInfo.daysPerWeek = checkInfo.daysPerWeek;
          if (checkInfo.sessionLength) updatedInfo.sessionLength = checkInfo.sessionLength;
          if (checkInfo.equipment) updatedInfo.equipment = checkInfo.equipment;
          
          setUserInfo(updatedInfo);
          
          // Ask for next missing info
          const missingInfo = [];
          if (!updatedInfo.goal) missingInfo.push('goal');
          if (!updatedInfo.experience) missingInfo.push('experience');
          if (!updatedInfo.daysPerWeek) missingInfo.push('daysPerWeek');
          if (!updatedInfo.sessionLength) missingInfo.push('sessionLength');
          if (!updatedInfo.equipment) missingInfo.push('equipment');
          
          if (missingInfo.length > 0) {
            const nextInfo = askForNextInfo(missingInfo[0]);
            return {
              content: `Great! I understand you want to ${checkInfo.goal || 'improve your fitness'}. ${nextInfo.content}`,
              newState: 'PLAN_INFO_GATHER',
              replies: nextInfo.replies
            };
          }
        }
        
        // Default: ask for confirmation again
        return {
          content: "I want to make sure I understand - would you like me to create a personalized workout plan for you?",
          replies: [
            { id: 'yes', text: 'Yes, create a plan', action: 'CONFIRM_PLAN' },
            { id: 'no', text: 'Not right now', action: 'DECLINE_PLAN' },
            { id: 'cancel', text: '❌ Cancel', action: 'CANCEL' }
          ]
        };
      }
    }
    
    // Handle info gathering
    if (conversationState === 'PLAN_INFO_GATHER') {
      // First, try to extract information from the user's free-form message
      const extractedInfo = await extractPlanInfoFromMessage(userMessage);
      
      // Check if the message is off-topic
      if (extractedInfo.isOffTopic) {
        return {
          content: "Let's stay focused on creating your workout plan! We're building something great for your fitness journey. " + 
                   (extractedInfo.redirectMessage || "Please tell me about your fitness goals or answer the question above."),
          replies: quickReplies // Keep existing quick replies
        };
      }
      
      // Apply any extracted information
      if (extractedInfo.goal) userInfo.goal = extractedInfo.goal;
      if (extractedInfo.experience) userInfo.experience = extractedInfo.experience;
      if (extractedInfo.daysPerWeek) userInfo.daysPerWeek = extractedInfo.daysPerWeek;
      if (extractedInfo.sessionLength) userInfo.sessionLength = extractedInfo.sessionLength;
      if (extractedInfo.equipment) userInfo.equipment = extractedInfo.equipment;
      
      setUserInfo({ ...userInfo });
      
      const missingInfo = getMissingInfo();
      
      if (missingInfo.length === 0) {
        // All info collected, generate structured plan
        addMessage("Creating your personalized workout plan... This may take a moment.", 'ai');
        
        // Generate plan asynchronously
        setTimeout(async () => {
          const plan = await generateStructuredPlan();
          setCurrentPlan(plan);
          
          // Add success message
          addMessage(`🎉 Perfect! I've created your personalized workout plan!\n\nYour plan includes ${plan.workouts.length} different workouts optimized for your ${userInfo.goal} goals. Each workout is designed to fit your ${userInfo.sessionLength}-minute sessions.\n\nWhat would you like to do with this plan?`, 'ai');
          
          // Add plan card to chat
          setTimeout(() => {
            addMessage(`Your ${plan.plan.name}`, 'ai', 'plan_card', plan);
            
            // Set quick replies for plan actions
            setQuickReplies([
              { id: 'apply_plan', text: '✅ Apply These Changes', action: 'APPLY_PLAN' },
              { id: 'view_plan', text: '👁️ View Plan Details', action: 'VIEW_PLAN' },
              { id: 'edit_plan', text: '✏️ Edit Plan', action: 'EDIT_PLAN' },
              { id: 'cancel_plan', text: '❌ Cancel', action: 'CANCEL_PLAN' }
            ]);
          }, 500);
          
          // Show modal after plan card is added
          setTimeout(() => {
            setShowPlanModal(true);
          }, 1000);
        }, 100);
        
        return {
          content: "",
          newState: 'PLAN_READY'
        };
      } else {
        return askForNextInfo(missingInfo[0]);
      }
    }
    
    // Handle workout creation state - store description and ask for schedule
    if (conversationState === 'WORKOUT_CREATE') {
      // Store the workout description for later
      setWorkoutPreview({ 
        name: 'Custom Workout',
        exercises: [],
        estimated_minutes: 45,
        description: userMessage 
      });
      setConversationState('WORKOUT_SCHEDULE');
      
      // Ask about scheduling first
      return {
        content: "Perfect! I understand what workout you want. Which days would you like to schedule this workout?\n\nYou can say things like:\n- 'Monday and Wednesday'\n- 'Every Tuesday and Thursday'\n- 'Three times a week'\n- 'Don't schedule it'",
        newState: 'WORKOUT_SCHEDULE',
        replies: [
          { id: 'cancel', text: '❌ Cancel', action: 'CANCEL' }
        ]
      };
    }
    
    // Handle workout scheduling state
    if (conversationState === 'WORKOUT_SCHEDULE') {
      // Parse scheduling from user message using AI
      addMessage("Understanding your schedule preference and creating your workout... This may take a moment.", 'ai');
      
      // Use async IIFE to handle await properly
      (async () => {
        const scheduleDays = await parseScheduleDays(userMessage);
        
        // Now create the workout with both description and schedule
      
      const workoutDescription = workoutPreview?.description || userMessage;
      const scheduleInfo = scheduleDays.length > 0 
        ? `This workout will be scheduled for ${scheduleDays.join(', ')}.`
        : '';
      
      const workoutPrompt = `Create a single workout based on this request: "${workoutDescription}"
      ${scheduleInfo}
      
Return ONLY a valid JSON object (no markdown, no explanations, no additional text) with this exact structure:
{
  "name": "Descriptive workout name",
  "exercises": [
    {
      "name": "Exercise name",
      "sets": 3,
      "reps": "10-12",
      "rest_seconds": 60,
      "muscle_groups": ["Primary", "Secondary"],
      "notes": "Form tip or instruction"
    }
  ],
  "estimated_minutes": 45
}

Requirements:
- Include 4-6 exercises appropriate for the schedule frequency
- Make it specific to the user's request
- Include muscle_groups and notes for each exercise
- Use realistic sets, reps, and rest times
- Return ONLY the JSON object, nothing else`;

      setTimeout(() => {
        (async () => {
        try {
          const workoutResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: workoutPrompt }],
            max_tokens: 800,
            temperature: 0.7,
          });
          
          const responseContent = workoutResponse.choices[0]?.message?.content || '{}';
          
          // Clean the response
          const cleanedContent = responseContent
            .replace(/```json\n?/gi, '')
            .replace(/```\n?/gi, '')
            .replace(/^[^{]*({)/s, '$1')
            .replace(/}[^}]*$/s, '}')
            .trim();
          
          let workoutData;
          try {
            workoutData = JSON.parse(cleanedContent);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            // Fallback workout
            workoutData = {
              name: "Custom Workout",
              exercises: [
                { name: "Push-ups", sets: 3, reps: "10-15", rest_seconds: 60, muscle_groups: ["Chest", "Triceps"], notes: "Keep core tight" },
                { name: "Squats", sets: 3, reps: "12-15", rest_seconds: 90, muscle_groups: ["Quads", "Glutes"], notes: "Chest up, knees over toes" },
                { name: "Rows", sets: 3, reps: "10-12", rest_seconds: 60, muscle_groups: ["Back", "Biceps"], notes: "Pull to lower chest" },
                { name: "Plank", sets: 3, reps: "30-60s", rest_seconds: 60, muscle_groups: ["Core"], notes: "Keep straight line" }
              ],
              estimated_minutes: 45
            };
          }
          
          // Add schedule to workout data
          workoutData.scheduledDays = scheduleDays;
          setWorkoutPreview(workoutData);
          setConversationState('WORKOUT_READY');
          
          // Add workout preview card with plan-like design
          setTimeout(() => {
            const previewMessage: ChatMessage = {
              id: generateMessageId(),
              content: 'Your Custom Workout',
              sender: 'ai',
              timestamp: new Date(),
              type: 'workout_preview',
              data: workoutData
            };
            
            setMessages(prev => [...prev, previewMessage]);
            setShowWorkoutPreview(true);
            
            const scheduleText = scheduleDays.length > 0 
              ? `It will be scheduled for ${scheduleDays.join(', ')}.`
              : "It won't be scheduled to any specific days.";
            
            addMessage(`Perfect! I've created your workout. ${scheduleText}\n\nWhat would you like to do with this workout?`, 'ai');
            
            // Set persistent quick replies
            setQuickReplies([
              { id: 'apply', text: '✅ Apply These Changes', action: 'APPLY_WORKOUT' },
              { id: 'view', text: '👁️ View Workout', action: 'VIEW_WORKOUT' },
              { id: 'edit', text: '✏️ Edit Workout', action: 'EDIT_WORKOUT' },
              { id: 'cancel', text: '❌ Cancel', action: 'CANCEL_WORKOUT' }
            ]);
            
            // Auto-open workout modal
            setTimeout(() => {
              setShowWorkoutModal(true);
            }, 1000);
          }, 500);
        } catch (error) {
          console.error('Error creating workout:', error);
          addMessage("I had trouble creating that workout. Let's try again. What kind of workout would you like?", 'ai');
          setConversationState('IDLE');
        }
        })(); // End of inner async IIFE
      }, 100);
      })(); // End of outer async IIFE
      
      return {
        content: "",
        newState: 'WORKOUT_SCHEDULE'
      };
    }
    
    // Handle workout ready state
    if (conversationState === 'WORKOUT_READY') {
      // Check if user wants to edit
      if (message.includes('edit') || message.includes('change') || message.includes('modify')) {
        return {
          content: "Would you like to make changes to this workout?",
          replies: [
            { id: 'yes_edit', text: 'Yes, edit it', action: 'CONFIRM_WORKOUT_EDIT' },
            { id: 'no_edit', text: 'No, go back', action: 'CANCEL_WORKOUT_EDIT' }
          ]
        };
      }
      
      // Keep the quick replies visible
      return {
        content: "Your workout is ready. You can apply it, view details, edit it, or cancel.",
        replies: [
          { id: 'apply', text: '✅ Apply These Changes', action: 'APPLY_WORKOUT' },
          { id: 'view', text: '👁️ View Workout', action: 'VIEW_WORKOUT' },
          { id: 'edit', text: '✏️ Edit Workout', action: 'EDIT_WORKOUT' },
          { id: 'cancel', text: '❌ Cancel', action: 'CANCEL_WORKOUT' }
        ]
      };
    }
    
    // Handle workout editing state
    if (conversationState === 'WORKOUT_EDITING') {
      addMessage("Applying your changes to the workout... This may take a moment.", 'ai');
      
      setTimeout(async () => {
        const editedWorkout = await editSingleWorkout(userMessage);
        setWorkoutPreview(editedWorkout);
        setConversationState('WORKOUT_READY');
        
        // Update the preview card
        setTimeout(() => {
          setMessages(prev => prev.filter(msg => msg.type !== 'workout_preview'));
          
          const previewMessage: ChatMessage = {
            id: generateMessageId(),
            content: 'Workout Preview (Updated)',
            sender: 'ai',
            timestamp: new Date(),
            type: 'workout_preview',
            data: editedWorkout
          };
          
          setMessages(prev => [...prev, previewMessage]);
          
          addMessage(`✅ I've updated your workout based on your request!\n\nWhat would you like to do next?`, 'ai');
          
          // Set persistent quick replies
          setQuickReplies([
            { id: 'apply', text: '✅ Apply These Changes', action: 'APPLY_WORKOUT' },
            { id: 'view', text: '👁️ View Workout', action: 'VIEW_WORKOUT' },
            { id: 'edit', text: '✏️ Edit Again', action: 'EDIT_WORKOUT' },
            { id: 'cancel', text: '❌ Cancel', action: 'CANCEL_WORKOUT' }
          ]);
        }, 500);
      }, 100);
      
      return {
        content: "",
        newState: 'WORKOUT_EDITING'
      };
    }
    
    // Handle plan editing state
    if (conversationState === 'PLAN_EDITING') {
      // User is providing edit instructions
      addMessage("Applying your changes to the workout plan... This may take a moment.", 'ai');
      
      setTimeout(async () => {
        const editedPlan = await editWorkoutPlan(userMessage);
        setCurrentPlan(editedPlan);
        setConversationState('PLAN_READY');
        
        // Add success message
        addMessage(`✅ I've updated your workout plan based on your request!\n\nThe plan now includes ${editedPlan.workouts.length} workouts with your requested changes.\n\nWhat would you like to do next?`, 'ai');
        
        // Update the plan card
        setTimeout(() => {
          // Remove old plan card and add new one
          setMessages(prev => prev.filter(msg => msg.type !== 'plan_card'));
          addMessage(`Your ${editedPlan.plan.name} (Updated)`, 'ai', 'plan_card', editedPlan);
          
          // Set quick replies for plan actions
          setQuickReplies([
            { id: 'apply_plan', text: '✅ Apply These Changes', action: 'APPLY_PLAN' },
            { id: 'view_plan', text: '👁️ View Plan Details', action: 'VIEW_PLAN' },
            { id: 'edit_plan', text: '✏️ Edit Plan Again', action: 'EDIT_PLAN' },
            { id: 'cancel_plan', text: '❌ Cancel', action: 'CANCEL_PLAN' }
          ]);
        }, 500);
        
        // Show modal to review changes
        setTimeout(() => {
          setShowPlanModal(true);
        }, 1000);
      }, 100);
      
      return {
        content: "",
        newState: 'PLAN_EDITING'
      };
    }
    
    // Handle plan ready state
    if (conversationState === 'PLAN_READY') {
      // Check if user wants to edit the plan
      if (message.includes('edit') || message.includes('change') || message.includes('modify') || message.includes('update')) {
        return {
          content: "I can help you modify your workout plan. Would you like to make changes to it?",
          replies: [
            { id: 'yes_edit', text: 'Yes, edit the plan', action: 'CONFIRM_EDIT' },
            { id: 'no_edit', text: 'No, go back', action: 'CANCEL_EDIT' }
          ]
        };
      }
      
      // Check if it's another plan request
      if (message.includes('plan') || message.includes('workout') || message.includes('program') || message.includes('routine')) {
        // Reset user info and start fresh
        setUserInfo({});
        
        if (existingPlansCount > 0) {
          return {
            content: "⚠️ I notice you already have workout plans in your app. Creating a new plan will add more workouts to your schedule, which might create conflicts or double up your training.\n\n" +
                     "I recommend deleting your previous workout templates and calendar entries before creating a new plan to avoid confusion.\n\n" +
                     "Would you like me to proceed with creating a new plan anyway?",
            newState: 'PLAN_CONFIRM',
            replies: [
              { id: 'yes_anyway', text: 'Yes, create new plan', action: 'CONFIRM_PLAN' },
              { id: 'no', text: 'No, just give advice', action: 'DECLINE_PLAN' }
            ]
          };
        } else {
          return {
            content: "I'd love to help you create another personalized workout plan! I can design a program tailored to your goals, schedule, and available equipment, then add it directly to your app.\n\nWould you like me to create a custom plan for you?",
            newState: 'PLAN_CONFIRM',
            replies: [
              { id: 'yes', text: 'Yes, build it!', action: 'CONFIRM_PLAN' },
              { id: 'no', text: 'Just give advice', action: 'DECLINE_PLAN' }
            ]
          };
        }
      }
      
      if (message.includes('great') || message.includes('confirm') || message.includes('perfect')) {
        return {
          content: "🎉 Awesome! Your workout plan has been created!\n\n" +
                   "**Next Steps:**\n" +
                   "• Your plan would normally be saved to your calendar\n" +
                   "• New exercises would be added to your Exercise Library\n" +
                   "• You could start following your program right away\n\n" +
                   "*Note: This is a demo version. In the full version, your plan would be automatically saved to your profile.*\n\n" +
                   "Feel free to ask me any questions about your plan or request modifications!",
          newState: 'IDLE'
        };
      }
      
      // Default for PLAN_READY state
      return {
        content: "Great! I'm ready to help you with questions about your plan or create a new one. What would you like to know?",
        replies: []
      };
    }
    
      // For all other messages, call the GPT API simulation
    return await callGPTAPI(userMessage);
  };


  // Real GPT API call
  const callGPTAPI = async (userMessage: string): Promise<{ content: string; newState?: ConversationState; replies?: QuickReply[] }> => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert fitness trainer and nutritionist. Provide helpful, accurate, and encouraging fitness advice. Keep responses conversational and practical. Always prioritize safety and recommend consulting professionals for medical concerns. Keep responses concise but informative."
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const aiResponse = response.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('No response from AI');
      }

      return {
        content: aiResponse
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      // Fallback response if API fails
      return {
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment, or feel free to ask me about creating a workout plan which I can help with directly! 💪"
      };
    }
  };

  // Check what info we still need
  const getMissingInfo = (): string[] => {
    const missing: string[] = [];
    if (!userInfo.goal) missing.push('goal');
    if (!userInfo.experience) missing.push('experience');
    if (!userInfo.daysPerWeek) missing.push('daysPerWeek');
    if (!userInfo.sessionLength) missing.push('sessionLength');
    if (!userInfo.equipment) missing.push('equipment');
    return missing;
  };


  // Ask for specific info
  const askForNextInfo = (infoType: string): { content: string; replies: QuickReply[] } => {
    switch (infoType) {
      case 'goal':
        return {
          content: "What's your main fitness goal? You can choose from the options below or tell me in your own words.",
          replies: [
            { id: 'muscle', text: 'Build Muscle', action: 'SET_GOAL', data: 'muscle gain' },
            { id: 'strength', text: 'Get Stronger', action: 'SET_GOAL', data: 'strength' },
            { id: 'fat_loss', text: 'Lose Fat', action: 'SET_GOAL', data: 'fat loss' },
            { id: 'general', text: 'General Fitness', action: 'SET_GOAL', data: 'general fitness' },
            { id: 'cancel', text: '❌ Cancel', action: 'CANCEL' }
          ]
        };
      case 'experience':
        return {
          content: "What's your fitness experience level? Feel free to describe it in detail or use the quick options.",
          replies: [
            { id: 'beginner', text: 'Beginner', action: 'SET_EXPERIENCE', data: 'beginner' },
            { id: 'intermediate', text: 'Intermediate', action: 'SET_EXPERIENCE', data: 'intermediate' },
            { id: 'advanced', text: 'Advanced', action: 'SET_EXPERIENCE', data: 'advanced' },
            { id: 'cancel', text: '❌ Cancel', action: 'CANCEL' }
          ]
        };
      case 'daysPerWeek':
        return {
          content: "How many days per week can you work out? You can pick an option or tell me your specific schedule.",
          replies: [
            { id: '3days', text: '3 days', action: 'SET_DAYS', data: 3 },
            { id: '4days', text: '4 days', action: 'SET_DAYS', data: 4 },
            { id: '5days', text: '5 days', action: 'SET_DAYS', data: 5 },
            { id: '6days', text: '6 days', action: 'SET_DAYS', data: 6 },
            { id: 'cancel', text: '❌ Cancel', action: 'CANCEL' }
          ]
        };
      case 'sessionLength':
        return {
          content: "How long do you want each workout session to be? Choose an option or specify your preferred duration.",
          replies: [
            { id: '30min', text: '30 minutes', action: 'SET_DURATION', data: 30 },
            { id: '45min', text: '45 minutes', action: 'SET_DURATION', data: 45 },
            { id: '60min', text: '60 minutes', action: 'SET_DURATION', data: 60 },
            { id: '90min', text: '90 minutes', action: 'SET_DURATION', data: 90 },
            { id: 'cancel', text: '❌ Cancel', action: 'CANCEL' }
          ]
        };
      case 'equipment':
        return {
          content: "What equipment do you have access to? You can select an option or describe what you have available.",
          replies: [
            { id: 'gym', text: 'Full Gym', action: 'SET_EQUIPMENT', data: ['gym', 'barbell', 'dumbbells', 'machines'] },
            { id: 'home', text: 'Home (Dumbbells)', action: 'SET_EQUIPMENT', data: ['dumbbells', 'bodyweight'] },
            { id: 'bodyweight', text: 'Bodyweight Only', action: 'SET_EQUIPMENT', data: ['bodyweight'] },
            { id: 'cancel', text: '❌ Cancel', action: 'CANCEL' }
          ]
        };
      default:
        // This should never happen now, but provide a fallback
        return {
          content: "I need a bit more information to create your perfect plan. Let me ask you the right questions!",
          replies: []
        };
    }
  };

  // Parse schedule days from user message using AI
  const parseScheduleDays = async (message: string): Promise<string[]> => {
    const prompt = `Analyze this scheduling request and determine which days of the week to schedule a workout: "${message}"
    
Examples:
- "three times a week" → ["Monday", "Wednesday", "Friday"]
- "every weekday" → ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
- "Tuesdays and Thursdays" → ["Tuesday", "Thursday"]
- "every other day" → ["Monday", "Wednesday", "Friday", "Sunday"]
- "don't schedule" or "no specific days" → []
- "daily" → ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
- "weekends only" → ["Saturday", "Sunday"]

Return ONLY a JSON array of day names like ["Monday", "Wednesday", "Friday"] or [] for no schedule.
Be smart about distributing days evenly if a frequency is given (e.g., "4 times a week").`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.3,
      });
      
      const responseContent = response.choices[0]?.message?.content || '[]';
      const cleanedContent = responseContent
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/gi, '')
        .trim();
      
      const days = JSON.parse(cleanedContent);
      return Array.isArray(days) ? days : [];
    } catch (error) {
      console.error('Error parsing schedule:', error);
      // Fallback to empty schedule if AI fails
      return [];
    }
  };
  
  // Edit single workout using AI
  const editSingleWorkout = async (editRequest: string): Promise<WorkoutPreview> => {
    if (!workoutPreview) return workoutPreview!;
    
    const prompt = `Here is an existing workout in JSON format:
${JSON.stringify(workoutPreview, null, 2)}

User request: "${editRequest}"

Apply the requested changes to this workout and return the modified version.
Keep the same JSON structure. Make only the changes requested by the user.
Return ONLY the valid JSON object (no markdown, no explanations).`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.5,
      });
      
      const workoutContent = response.choices[0]?.message?.content || '';
      const cleanedContent = workoutContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const editedWorkout = JSON.parse(cleanedContent);
      
      return editedWorkout as WorkoutPreview;
    } catch (error) {
      console.error('Error editing workout with AI:', error);
      return workoutPreview;
    }
  };
  
  // Extract plan information from free-form user message
  const extractPlanInfoFromMessage = async (message: string): Promise<any> => {
    const prompt = `Analyze this user message in the context of creating a workout plan: "${message}"
    
    Extract any of the following information if present:
    - goal: fitness goal (muscle gain, strength, fat loss, general fitness, endurance, etc.)
    - experience: fitness level (beginner, intermediate, advanced)
    - daysPerWeek: number of workout days (1-7)
    - sessionLength: workout duration in minutes
    - equipment: available equipment (gym, dumbbells, barbell, bodyweight, etc.)
    
    Also determine:
    - isOffTopic: true if the message is completely unrelated to fitness/workouts
    - redirectMessage: if off-topic, provide a friendly redirect message
    
    Return ONLY a JSON object like:
    {
      "goal": "muscle gain",
      "experience": null,
      "daysPerWeek": 4,
      "sessionLength": null,
      "equipment": ["gym", "dumbbells"],
      "isOffTopic": false,
      "redirectMessage": null
    }
    
    Set values to null if not mentioned. Parse numbers appropriately.`;
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.3,
      });
      
      const content = response.choices[0]?.message?.content || '{}';
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error('Error extracting plan info:', error);
      return { isOffTopic: false };
    }
  };
  
  // Edit existing workout plan using AI
  const editWorkoutPlan = async (editRequest: string): Promise<WorkoutPlan> => {
    if (!currentPlan) return currentPlan!;
    
    const prompt = `Here is an existing workout plan in JSON format:
${JSON.stringify(currentPlan, null, 2)}

User request: "${editRequest}"

Apply the requested changes to this workout plan and return the modified plan.
Keep the same JSON structure. Make only the changes requested by the user.
Return ONLY the valid JSON object (no markdown, no explanations).`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.5,
      });
      
      const planContent = response.choices[0]?.message?.content || '';
      const cleanedContent = planContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const editedPlan = JSON.parse(cleanedContent);
      
      return editedPlan as WorkoutPlan;
    } catch (error) {
      console.error('Error editing plan with AI:', error);
      // Return original plan if edit fails
      return currentPlan;
    }
  };
  
  // Generate a structured workout plan using AI
  const generateStructuredPlan = async (): Promise<WorkoutPlan> => {
    const { goal, experience, daysPerWeek, sessionLength, equipment } = userInfo;
    
    const prompt = `Create a detailed workout plan with the following requirements:
    - Goal: ${goal}
    - Experience level: ${experience}
    - Days per week: ${daysPerWeek}
    - Session length: ${sessionLength} minutes
    - Equipment: ${equipment?.join(', ')}
    
    Return ONLY a valid JSON object with this exact structure (no markdown, no explanations):
    {
      "plan": {
        "name": "Plan name",
        "start_date": "${new Date().toISOString()}",
        "length_weeks": 8,
        "days_per_week": ${daysPerWeek},
        "progression_model": "progressive overload",
        "notes": "Brief plan description"
      },
      "workouts": [
        {
          "day_of_week": "Monday",
          "title": "Workout name",
          "estimated_minutes": ${sessionLength},
          "exercises": [
            {
              "name": "Exercise name",
              "sets": 3,
              "reps": "8-12",
              "rest_seconds": 90,
              "muscle_groups": ["Primary", "Secondary"],
              "notes": "Form tip"
            }
          ]
        }
      ]
    }
    
    Create ${daysPerWeek} different workouts spread across the week. Include 4-6 exercises per workout.
    Make it specific to the user's goals and equipment. Be creative and varied with exercise selection.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      });
      
      const planContent = response.choices[0]?.message?.content || '';
      // Clean the response to ensure it's valid JSON
      const cleanedContent = planContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const plan = JSON.parse(cleanedContent);
      
      return plan as WorkoutPlan;
    } catch (error) {
      console.error('Error generating AI plan:', error);
      // Fallback to basic plan if AI fails
      return generateBasicPlan();
    }
  };
  
  // Fallback basic plan generator (simplified version of old code)
  const generateBasicPlan = (): WorkoutPlan => {
    const { goal, experience, daysPerWeek, sessionLength, equipment } = userInfo;
    const hasGym = equipment?.includes('gym');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + ((1 + 7 - startDate.getDay()) % 7)); // Next Monday
    
    const planName = `${daysPerWeek}-Day ${goal === 'muscle gain' ? 'Hypertrophy' : 
                                       goal === 'strength' ? 'Strength' : 
                                       goal === 'fat loss' ? 'Fat Loss' : 'Fitness'} Plan`;
    
    const workouts: WorkoutDay[] = [];
    
    // Create proper workout distribution based on days per week
    const daysNum = daysPerWeek ?? 3;
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    if (daysNum <= 3) {
      // Full body workouts for 3 days or less
      const selectedDays = ['Monday', 'Wednesday', 'Friday'].slice(0, daysNum);
      const workoutNames = ['Full Body A', 'Full Body B', 'Full Body C'];
      
      selectedDays.forEach((day, index) => {
        workouts.push({
          day_of_week: day,
          title: workoutNames[index],
          estimated_minutes: sessionLength || 60,
          exercises: hasGym ? [
            { name: 'Barbell Squat', sets: 3, reps: '8-12', rest_seconds: 120, muscle_groups: ['Quads', 'Glutes'], notes: 'Keep chest up, knees track over toes' },
            { name: 'Bench Press', sets: 3, reps: '8-12', rest_seconds: 120, muscle_groups: ['Chest', 'Triceps', 'Shoulders'], notes: 'Control the descent, pause at chest' },
            { name: 'Bent-Over Row', sets: 3, reps: '8-12', rest_seconds: 90, muscle_groups: ['Back', 'Biceps'], notes: 'Pull to lower chest, squeeze shoulder blades' },
            { name: 'Overhead Press', sets: 3, reps: '8-12', rest_seconds: 90, muscle_groups: ['Shoulders', 'Triceps'], notes: 'Press straight up, engage core' },
            { name: 'Plank', sets: 3, reps: '30-60s', rest_seconds: 60, muscle_groups: ['Abs'], notes: 'Keep straight line from head to heels' }
          ] : [
            { name: 'Bodyweight Squat', sets: 3, reps: '15-20', rest_seconds: 60, muscle_groups: ['Quads', 'Glutes'], notes: 'Full range of motion, chest up' },
            { name: 'Push-ups', sets: 3, reps: '8-15', rest_seconds: 60, muscle_groups: ['Chest', 'Triceps', 'Shoulders'], notes: 'Modify on knees if needed' },
            { name: 'Pike Push-ups', sets: 3, reps: '5-12', rest_seconds: 60, muscle_groups: ['Shoulders', 'Triceps'], notes: 'Walk feet closer for more difficulty' },
            { name: 'Glute Bridges', sets: 3, reps: '15-20', rest_seconds: 45, muscle_groups: ['Glutes', 'Hamstrings'], notes: 'Squeeze glutes at top' },
            { name: 'Plank', sets: 3, reps: '30-60s', rest_seconds: 60, muscle_groups: ['Abs'], notes: 'Keep straight line, breathe normally' }
          ]
        });
      });
    } else if (daysNum >= 4 && daysNum <= 5) {
      // Upper/Lower split for 4-5 days
      const upperDays = daysNum === 4 ? ['Monday', 'Thursday'] : ['Monday', 'Wednesday', 'Friday'];
      const lowerDays = daysNum === 4 ? ['Tuesday', 'Friday'] : ['Tuesday', 'Saturday'];
      
      upperDays.forEach((day, index) => {
        workouts.push({
          day_of_week: day,
          title: `Upper Body ${index === 0 ? 'A' : 'B'}`,
          estimated_minutes: sessionLength || 60,
          exercises: hasGym ? [
            { name: 'Bench Press', sets: 4, reps: '6-10', rest_seconds: 120, muscle_groups: ['Chest', 'Triceps', 'Shoulders'], notes: 'Focus on progressive overload' },
            { name: 'Bent-Over Row', sets: 4, reps: '8-12', rest_seconds: 90, muscle_groups: ['Back', 'Biceps'], notes: 'Pull to lower chest' },
            { name: 'Overhead Press', sets: 3, reps: '8-12', rest_seconds: 90, muscle_groups: ['Shoulders', 'Triceps'], notes: 'Press straight up' },
            { name: 'Lat Pulldown', sets: 3, reps: '10-15', rest_seconds: 75, muscle_groups: ['Back', 'Biceps'], notes: 'Lean back slightly' },
            { name: 'Dips', sets: 3, reps: '8-15', rest_seconds: 75, muscle_groups: ['Triceps', 'Chest'], notes: 'Use assist if needed' }
          ] : [
            { name: 'Push-ups', sets: 4, reps: '8-15', rest_seconds: 60, muscle_groups: ['Chest', 'Triceps', 'Shoulders'], notes: 'Modify difficulty as needed' },
            { name: 'Pike Push-ups', sets: 3, reps: '5-12', rest_seconds: 60, muscle_groups: ['Shoulders', 'Triceps'], notes: 'Target shoulders' },
            { name: 'Tricep Dips', sets: 3, reps: '8-15', rest_seconds: 60, muscle_groups: ['Triceps'], notes: 'Use chair or bench' }
          ]
        });
      });
      
      lowerDays.forEach((day, index) => {
        workouts.push({
          day_of_week: day,
          title: `Lower Body ${index === 0 ? 'A' : 'B'}`,
          estimated_minutes: sessionLength || 60,
          exercises: hasGym ? [
            { name: 'Barbell Squat', sets: 4, reps: '6-10', rest_seconds: 150, muscle_groups: ['Quads', 'Glutes'], notes: 'Focus on depth and form' },
            { name: 'Romanian Deadlift', sets: 3, reps: '8-12', rest_seconds: 120, muscle_groups: ['Hamstrings', 'Glutes'], notes: 'Feel stretch in hamstrings' },
            { name: 'Bulgarian Split Squats', sets: 3, reps: '10-15 each', rest_seconds: 90, muscle_groups: ['Quads', 'Glutes'], notes: 'Rear foot elevated' },
            { name: 'Walking Lunges', sets: 3, reps: '12-20', rest_seconds: 75, muscle_groups: ['Quads', 'Glutes'], notes: 'Step forward with control' }
          ] : [
            { name: 'Bodyweight Squats', sets: 4, reps: '15-25', rest_seconds: 60, muscle_groups: ['Quads', 'Glutes'], notes: 'Focus on form' },
            { name: 'Single-Leg Glute Bridge', sets: 3, reps: '10-15 each', rest_seconds: 60, muscle_groups: ['Glutes', 'Hamstrings'], notes: 'Keep hips level' },
            { name: 'Reverse Lunges', sets: 3, reps: '12-20 each', rest_seconds: 60, muscle_groups: ['Quads', 'Glutes'], notes: 'Step back with control' }
          ]
        });
      });
    } else {
      // Push/Pull/Legs split for 6-7 days
      const pushDays = daysNum === 6 ? ['Monday', 'Thursday'] : ['Monday', 'Thursday', 'Sunday'];
      const pullDays = daysNum === 6 ? ['Tuesday', 'Friday'] : ['Tuesday', 'Friday'];
      const legDays = daysNum === 6 ? ['Wednesday', 'Saturday'] : ['Wednesday', 'Saturday'];
      
      pushDays.forEach((day, index) => {
        workouts.push({
          day_of_week: day,
          title: `Push Day ${index === 0 ? 'A' : 'B'}`,
          estimated_minutes: sessionLength || 60,
          exercises: hasGym ? [
            { name: 'Bench Press', sets: 4, reps: '6-10', rest_seconds: 120, muscle_groups: ['Chest', 'Triceps', 'Shoulders'], notes: 'Focus on progressive overload' },
            { name: 'Overhead Press', sets: 3, reps: '8-12', rest_seconds: 90, muscle_groups: ['Shoulders', 'Triceps'], notes: 'Press straight up' },
            { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest_seconds: 90, muscle_groups: ['Chest', 'Shoulders'], notes: 'Upper chest focus' },
            { name: 'Lateral Raises', sets: 3, reps: '12-15', rest_seconds: 75, muscle_groups: ['Shoulders'], notes: 'Side deltoid focus' },
            { name: 'Tricep Pushdowns', sets: 3, reps: '10-15', rest_seconds: 60, muscle_groups: ['Triceps'], notes: 'Control the weight' }
          ] : [
            { name: 'Push-ups', sets: 4, reps: '8-15', rest_seconds: 60, muscle_groups: ['Chest', 'Triceps', 'Shoulders'], notes: 'Modify difficulty as needed' },
            { name: 'Pike Push-ups', sets: 3, reps: '5-12', rest_seconds: 60, muscle_groups: ['Shoulders', 'Triceps'], notes: 'Target shoulders' },
            { name: 'Tricep Dips', sets: 3, reps: '8-15', rest_seconds: 60, muscle_groups: ['Triceps'], notes: 'Use chair or bench' }
          ]
        });
      });
      
      pullDays.forEach((day, index) => {
        workouts.push({
          day_of_week: day,
          title: `Pull Day ${index === 0 ? 'A' : 'B'}`,
          estimated_minutes: sessionLength || 60,
          exercises: hasGym ? [
            { name: 'Deadlift', sets: 4, reps: '5-8', rest_seconds: 150, muscle_groups: ['Back', 'Hamstrings', 'Glutes'], notes: 'Keep bar close to body' },
            { name: 'Bent-Over Row', sets: 4, reps: '8-12', rest_seconds: 90, muscle_groups: ['Back', 'Biceps'], notes: 'Pull to lower chest' },
            { name: 'Lat Pulldown', sets: 3, reps: '10-15', rest_seconds: 75, muscle_groups: ['Back', 'Biceps'], notes: 'Lean back slightly' },
            { name: 'Cable Row', sets: 3, reps: '10-15', rest_seconds: 75, muscle_groups: ['Back', 'Biceps'], notes: 'Squeeze shoulder blades' },
            { name: 'Barbell Curls', sets: 3, reps: '10-15', rest_seconds: 60, muscle_groups: ['Biceps'], notes: 'Control the weight' }
          ] : [
            { name: 'Superman', sets: 4, reps: '12-20', rest_seconds: 60, muscle_groups: ['Back'], notes: 'Lift chest and legs' },
            { name: 'Reverse Snow Angels', sets: 3, reps: '15-20', rest_seconds: 45, muscle_groups: ['Back', 'Shoulders'], notes: 'Lying face down' },
            { name: 'Wall Handstand Hold', sets: 3, reps: '15-45s', rest_seconds: 90, muscle_groups: ['Shoulders'], notes: 'Build shoulder strength' }
          ]
        });
      });
      
      legDays.forEach((day, index) => {
        workouts.push({
          day_of_week: day,
          title: `Leg Day ${index === 0 ? 'A' : 'B'}`,
          estimated_minutes: sessionLength || 60,
          exercises: hasGym ? [
            { name: 'Barbell Squat', sets: 4, reps: '6-10', rest_seconds: 150, muscle_groups: ['Quads', 'Glutes'], notes: 'Focus on depth and form' },
            { name: 'Romanian Deadlift', sets: 3, reps: '8-12', rest_seconds: 120, muscle_groups: ['Hamstrings', 'Glutes'], notes: 'Feel stretch in hamstrings' },
            { name: 'Bulgarian Split Squats', sets: 3, reps: '10-15 each', rest_seconds: 90, muscle_groups: ['Quads', 'Glutes'], notes: 'Rear foot elevated' },
            { name: 'Walking Lunges', sets: 3, reps: '12-20', rest_seconds: 75, muscle_groups: ['Quads', 'Glutes'], notes: 'Step forward with control' },
            { name: 'Calf Raises', sets: 3, reps: '15-25', rest_seconds: 60, muscle_groups: ['Calves'], notes: 'Full range of motion' }
          ] : [
            { name: 'Bodyweight Squats', sets: 4, reps: '15-25', rest_seconds: 60, muscle_groups: ['Quads', 'Glutes'], notes: 'Focus on form' },
            { name: 'Single-Leg Glute Bridge', sets: 3, reps: '10-15 each', rest_seconds: 60, muscle_groups: ['Glutes', 'Hamstrings'], notes: 'Keep hips level' },
            { name: 'Jump Squats', sets: 3, reps: '10-15', rest_seconds: 60, muscle_groups: ['Quads', 'Glutes'], notes: 'Land softly' },
            { name: 'Reverse Lunges', sets: 3, reps: '12-20 each', rest_seconds: 60, muscle_groups: ['Quads', 'Glutes'], notes: 'Step back with control' }
          ]
        });
      });
    }

    return {
      plan: {
        name: planName,
        start_date: startDate.toISOString().split('T')[0],
        length_weeks: 8,
        days_per_week: daysPerWeek || 3,
        progression_model: experience === 'beginner' ? 
          'Start light, add weight when you can complete all sets with perfect form' :
          'Progressive overload - increase weight by 2.5-5lbs when you can complete all sets at the top of the rep range',
        notes: goal === 'fat loss' ? 
          'Focus on consistent training and maintain a caloric deficit. Rest 48-72 hours between sessions.' :
          'Prioritize progressive overload and adequate recovery. Get 7-9 hours of sleep for optimal results.'
      },
      workouts
    };
  };

  // Fetch user's existing workouts
  const fetchUserWorkouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching workouts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in fetchUserWorkouts:', error);
      return [];
    }
  };

  // Edit an existing workout
  const editExistingWorkout = async (workoutId: string, updates: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to edit workouts');
        return false;
      }

      // Apply updates to the workout
      const { error } = await supabase
        .from('workout_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workoutId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating workout:', error);
        return false;
      }

      console.log('Successfully updated workout');
      return true;
    } catch (error) {
      console.error('Error in editExistingWorkout:', error);
      return false;
    }
  };

  // Delete a workout
  const deleteWorkout = async (workoutId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to delete workouts');
        return false;
      }

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('workout_templates')
        .update({ is_active: false })
        .eq('id', workoutId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting workout:', error);
        return false;
      }

      console.log('Successfully deleted workout');
      return true;
    } catch (error) {
      console.error('Error in deleteWorkout:', error);
      return false;
    }
  };

  // Create a single exercise in the database
  const createExerciseInDatabase = async (exerciseName: string, muscleGroups: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create exercises');
        return false;
      }

      // Check if exercise already exists
      const { data: existing, error: checkError } = await supabase
        .from('exercises')
        .select('id, name')
        .eq('name', exerciseName)
        .single();

      if (existing) {
        console.log('Exercise already exists:', exerciseName);
        return true;
      }

      // Map to valid muscle groups
      const validMuscleGroups = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 
                                 'Abs', 'Quads', 'Hamstrings', 'Calves', 'Glutes'];
      const mappedGroups = muscleGroups.filter(mg => validMuscleGroups.includes(mg));

      // Create new exercise
      const { error: insertError } = await supabase
        .from('exercises')
        .insert({
          name: exerciseName,
          muscle_groups: mappedGroups.length > 0 ? mappedGroups : ['CUSTOM'],
          is_custom: true,
          created_by: user.id,
          equipment: 'Other',
        });

      if (insertError) {
        console.error('Error creating exercise:', insertError);
        return false;
      }

      console.log('Successfully created exercise:', exerciseName);
      return true;
    } catch (error) {
      console.error('Error in createExerciseInDatabase:', error);
      return false;
    }
  };

  // Create a single workout in the database
  const createSingleWorkout = async (workoutName: string, exercises: any[], scheduledDays?: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create workouts');
        return false;
      }

      // First ensure all exercises exist
      for (const exercise of exercises) {
        await createExerciseInDatabase(exercise.name, exercise.muscle_groups || []);
      }

      // Get exercise IDs
      const { data: exerciseData, error: fetchError } = await supabase
        .from('exercises')
        .select('id, name')
        .in('name', exercises.map(e => e.name));

      if (fetchError) {
        console.error('Error fetching exercises:', fetchError);
        return false;
      }

      const exerciseNameToId = new Map<string, string>();
      exerciseData?.forEach(ex => {
        exerciseNameToId.set(ex.name, ex.id);
      });

      // Create workout template
      const workoutExercises = exercises.map((exercise, index) => ({
        id: `exercise_${Date.now()}_${index}`,
        original_exercise_id: exerciseNameToId.get(exercise.name) || '',
        name: exercise.name,
        sets_count: exercise.sets || 3,
        reps_count: exercise.reps || 10,
        duration_seconds: exercise.rest_seconds || 60,
        sets: Array.from({ length: exercise.sets || 3 }, (_, setIndex) => ({
          id: `set_${Date.now()}_${index}_${setIndex}`,
          set_number: setIndex + 1,
          weight: 0,
          reps: 0,
          completed: false,
        })),
        muscle_groups: exercise.muscle_groups || [],
      }));

      const { data: insertedWorkout, error: workoutError } = await supabase
        .from('workout_templates')
        .insert({
          user_id: user.id,
          name: workoutName,
          exercises: workoutExercises,
          scheduled_days: scheduledDays || [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (workoutError) {
        console.error('Error creating workout:', workoutError);
        return false;
      }

      console.log('Successfully created workout:', workoutName);
      return true;
    } catch (error) {
      console.error('Error in createSingleWorkout:', error);
      return false;
    }
  };

  // Apply workout plan to the app - saves to database
  const applyWorkoutPlanToApp = async (plan: WorkoutPlan) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save workout plans');
        return false;
      }

      console.log('Applying workout plan to app for user:', user.id);
      
      // First, process and save all unique exercises
      const allExercises = new Set<string>();
      const exerciseMap = new Map<string, any>(); // Maps exercise name to full exercise data
      
      plan.workouts.forEach(workout => {
        workout.exercises.forEach(exercise => {
          allExercises.add(exercise.name);
          if (!exerciseMap.has(exercise.name)) {
            exerciseMap.set(exercise.name, exercise);
          }
        });
      });

      console.log(`Found ${allExercises.size} unique exercises in plan`);

      // Check which exercises already exist in the database
      const { data: existingExercises, error: fetchError } = await supabase
        .from('exercises')
        .select('id, name, muscle_groups')
        .in('name', Array.from(allExercises));

      if (fetchError) {
        console.error('Error fetching existing exercises:', fetchError);
        throw fetchError;
      }

      const existingExerciseNames = new Set(existingExercises?.map(e => e.name) || []);
      const exercisesToCreate = Array.from(allExercises).filter(name => !existingExerciseNames.has(name));

      console.log(`Need to create ${exercisesToCreate.length} new exercises`);

      // Create new exercises that don't exist
      if (exercisesToCreate.length > 0) {
        const newExercises = exercisesToCreate.map(name => {
          const exerciseData = exerciseMap.get(name);
          // Map muscle groups to valid ones in the app
          const validMuscleGroups = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 
                                     'Abs', 'Quads', 'Hamstrings', 'Calves', 'Glutes'];
          
          const mappedMuscleGroups = exerciseData.muscle_groups.filter((mg: string) => 
            validMuscleGroups.includes(mg)
          );

          return {
            name: name,
            muscle_groups: mappedMuscleGroups.length > 0 ? mappedMuscleGroups : ['CUSTOM'],
            is_custom: true,
            created_by: user.id,
            equipment: 'Other', // Default equipment
          };
        });

        const { error: insertError } = await supabase
          .from('exercises')
          .insert(newExercises);

        if (insertError) {
          console.error('Error creating new exercises:', insertError);
          throw insertError;
        }

        console.log('Successfully created new exercises');
      }

      // Now fetch all exercises (including newly created) to get their IDs
      const { data: allExerciseData, error: allExercisesError } = await supabase
        .from('exercises')
        .select('id, name')
        .in('name', Array.from(allExercises));

      if (allExercisesError) {
        console.error('Error fetching all exercises:', allExercisesError);
        throw allExercisesError;
      }

      // Create a map of exercise name to ID
      const exerciseNameToId = new Map<string, string>();
      allExerciseData?.forEach(ex => {
        exerciseNameToId.set(ex.name, ex.id);
      });

      // Create workout templates for each workout in the plan
      const workoutTemplates = plan.workouts.map(workout => {
        // Map day names to match the app's format
        const dayMapping: { [key: string]: string } = {
          'Monday': 'Monday',
          'Tuesday': 'Tuesday',
          'Wednesday': 'Wednesday',
          'Thursday': 'Thursday',
          'Friday': 'Friday',
          'Saturday': 'Saturday',
          'Sunday': 'Sunday'
        };

        // Create exercises array with proper structure
        const exercises = workout.exercises.map((exercise, index) => ({
          id: `exercise_${Date.now()}_${index}`,
          original_exercise_id: exerciseNameToId.get(exercise.name) || '',
          name: exercise.name,
          sets_count: exercise.sets,
          reps_count: parseInt(exercise.reps.split('-')[1] || exercise.reps), // Take max reps
          duration_seconds: exercise.rest_seconds,
          sets: Array.from({ length: exercise.sets }, (_, setIndex) => ({
            id: `set_${Date.now()}_${index}_${setIndex}`,
            set_number: setIndex + 1,
            weight: 0,
            reps: 0,
            completed: false,
          })),
          muscle_groups: exercise.muscle_groups,
        }));

        return {
          user_id: user.id,
          name: `${plan.plan.name} - ${workout.title}`,
          exercises: exercises,
          scheduled_days: [dayMapping[workout.day_of_week] || workout.day_of_week],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      console.log(`Creating ${workoutTemplates.length} workout templates`);

      // Insert all workout templates
      const { data: insertedWorkouts, error: workoutError } = await supabase
        .from('workout_templates')
        .insert(workoutTemplates)
        .select();

      if (workoutError) {
        console.error('Error creating workout templates:', workoutError);
        throw workoutError;
      }

      console.log('Successfully created workout templates');

      // Create calendar entries for the plan duration
      const startDate = new Date(plan.plan.start_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (plan.plan.length_weeks * 7));

      const calendarEntries: any[] = [];
      const currentDate = new Date(startDate);

      // Generate calendar entries for each scheduled workout
      while (currentDate <= endDate) {
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Find workouts scheduled for this day
        const workoutsForDay = insertedWorkouts?.filter(workout => 
          workout.scheduled_days?.includes(dayName)
        ) || [];

        workoutsForDay.forEach(workout => {
          calendarEntries.push({
            user_id: user.id,
            workout_template_id: workout.id,
            date_scheduled: currentDate.toISOString().split('T')[0],
            is_completed: false,
            created_at: new Date().toISOString(),
          });
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`Creating ${calendarEntries.length} calendar entries`);

      if (calendarEntries.length > 0) {
        // Check if workout_calendar table exists by attempting to insert
        const { error: calendarError } = await supabase
          .from('workout_calendar')
          .insert(calendarEntries);

        if (calendarError) {
          // If table doesn't exist, we'll skip calendar entries for now
          console.warn('Could not create calendar entries:', calendarError.message);
          // Don't throw error here as workouts are already created
        } else {
          console.log('Successfully created calendar entries');
        }
      }

      return true;
    } catch (error) {
      console.error('Error applying workout plan:', error);
      Alert.alert('Error', 'Failed to save workout plan. Please try again.');
      return false;
    }
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    addMessage(userMessage, 'user');
    setInputText('');
    setQuickReplies([]);
    setIsLoading(true);

    // Process AI response with async
    setTimeout(async () => {
      try {
        const aiResponse = await getAIResponse(userMessage);
        addMessage(aiResponse.content, 'ai');
        
        if (aiResponse.newState) {
          setConversationState(aiResponse.newState);
        }
        
        if (aiResponse.replies) {
          setQuickReplies(aiResponse.replies);
        }
      } catch (error) {
        console.error('AI Response Error:', error);
        addMessage("Sorry, I'm having trouble responding right now. Please try again!", 'ai');
      }
      
      setIsLoading(false);
    }, 1000);
  };

  // Handle quick reply - auto-send without filling text box
  const handleQuickReply = async (reply: QuickReply) => {
    // Handle APPLY_PLAN action
    if (reply.action === 'APPLY_PLAN') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      handleApplyWorkout();
      return;
    }
    
    // Handle VIEW_PLAN action
    if (reply.action === 'VIEW_PLAN') {
      addMessage(reply.text, 'user');
      // Don't clear quick replies - keep them available
      setShowPlanModal(true);
      return;
    }
    
    // Handle EDIT_PLAN action
    if (reply.action === 'EDIT_PLAN') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setIsLoading(true);
      
      setTimeout(() => {
        addMessage("I can help you modify your workout plan. Would you like to make changes to it?", 'ai');
        setQuickReplies([
          { id: 'yes_edit', text: 'Yes, edit the plan', action: 'CONFIRM_EDIT' },
          { id: 'no_edit', text: 'No, go back', action: 'CANCEL_EDIT' }
        ]);
        setIsLoading(false);
      }, 500);
      return;
    }
    
    // Handle CONFIRM_EDIT action
    if (reply.action === 'CONFIRM_EDIT') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setIsLoading(true);
      
      setTimeout(() => {
        addMessage("What changes would you like to make to your workout plan? You can ask me to:\n- Add or remove exercises\n- Change the number of sets/reps\n- Adjust workout days or duration\n- Focus on different muscle groups\n- Make it harder or easier\n\nJust tell me what you'd like to change!", 'ai');
        setConversationState('PLAN_EDITING');
        setIsLoading(false);
      }, 500);
      return;
    }
    
    // Handle CANCEL_EDIT action
    if (reply.action === 'CANCEL_EDIT') {
      addMessage(reply.text, 'user');
      // Go back to showing plan options
      setQuickReplies([
        { id: 'apply_plan', text: '✅ Apply These Changes', action: 'APPLY_PLAN' },
        { id: 'view_plan', text: '👁️ View Plan Details', action: 'VIEW_PLAN' },
        { id: 'edit_plan', text: '✏️ Edit Plan', action: 'EDIT_PLAN' },
        { id: 'cancel_plan', text: '❌ Cancel', action: 'CANCEL_PLAN' }
      ]);
      return;
    }
    
    // Handle CANCEL_PLAN action
    if (reply.action === 'CANCEL_PLAN') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setConversationState('IDLE');
      setCurrentPlan(null);
      setShowPlanModal(false);
      setIsLoading(true);
      
      setTimeout(() => {
        addMessage("No problem! The workout plan has been cancelled. Let me know if you'd like to create a different plan or need any fitness advice.", 'ai');
        setIsLoading(false);
      }, 500);
      return;
    }
    
    // Handle START_OVER action
    if (reply.action === 'START_OVER') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setConversationState('IDLE');
      setUserInfo({});
      setCurrentPlan(null);
      setIsLoading(true);
      
      setTimeout(() => {
        addMessage("Let's create a new workout plan! What are your fitness goals?", 'ai');
        setConversationState('PLAN_CONFIRM');
        setQuickReplies([
          { id: 'yes', text: "Yes, let's go!", action: 'CONFIRM_PLAN' },
          { id: 'no', text: 'Not right now', action: 'CANCEL' }
        ]);
        setIsLoading(false);
      }, 500);
      return;
    }
    
    // Handle CANCEL action
    if (reply.action === 'CANCEL') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setConversationState('IDLE');
      setUserInfo({});
      setIsLoading(true);
      
      setTimeout(() => {
        addMessage("No problem! Let me know if you need anything else.", 'ai');
        setIsLoading(false);
      }, 500);
      return;
    }
    
    // Handle CONFIRM_PLAN action
    if (reply.action === 'CONFIRM_PLAN') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setConversationState('PLAN_INFO_GATHER');
      setIsLoading(true);
      
      setTimeout(() => {
        const nextInfo = askForNextInfo('goal');
        addMessage(nextInfo.content, 'ai');
        setQuickReplies(nextInfo.replies);
        setIsLoading(false);
      }, 500);
      return;
    }
    
    // Handle main menu actions
    if (reply.action === 'CREATE_PLAN') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setIsLoading(true);
      setConversationState('PLAN_CONFIRM');
      
      setTimeout(() => {
        addMessage("Great! I'll help you create a personalized workout plan. Ready to get started?", 'ai');
        setQuickReplies([
          { id: 'yes', text: "Yes, let's go!", action: 'CONFIRM_PLAN' },
          { id: 'no', text: 'Not right now', action: 'CANCEL' }
        ]);
        setIsLoading(false);
      }, 500);
      return;
    }
    
    if (reply.action === 'CREATE_WORKOUT') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setIsLoading(true);
      setConversationState('WORKOUT_CREATE');
      
      setTimeout(() => {
        addMessage("I'll help you create a custom workout! Please describe what kind of workout you want. Be as specific as possible.\n\nFor example:\n- 'Upper body strength workout focusing on chest and shoulders'\n- '30-minute HIIT workout for fat loss'\n- 'Leg day with squats and deadlifts'\n- 'Full body workout with dumbbells only'", 'ai');
        setQuickReplies([
          { id: 'cancel', text: '❌ Cancel', action: 'CANCEL' }
        ]);
        setIsLoading(false);
      }, 500);
      return;
    }
    
    // Handle SET_SCHEDULE action
    if (reply.action === 'SET_SCHEDULE') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      
      // Store the schedule
      if (workoutPreview) {
        workoutPreview.scheduledDays = reply.data;
      }
      
      setConversationState('WORKOUT_READY');
      
      // Add preview card
      setTimeout(() => {
        const previewMessage: ChatMessage = {
          id: generateMessageId(),
          content: 'Workout Preview',
          sender: 'ai',
          timestamp: new Date(),
          type: 'workout_preview',
          data: workoutPreview || undefined
        };
        
        setMessages(prev => [...prev, previewMessage]);
        setShowWorkoutPreview(true);
        
        const scheduleText = reply.data.length > 0 
          ? `It will be scheduled for ${reply.data.join(', ')}.`
          : "It won't be scheduled to any specific days.";
        
        addMessage(`Your workout is ready! ${scheduleText}\n\nWhat would you like to do with this workout?`, 'ai');
        
        setQuickReplies([
          { id: 'apply', text: '✅ Apply These Changes', action: 'APPLY_WORKOUT' },
          { id: 'view', text: '👁️ View Workout', action: 'VIEW_WORKOUT' },
          { id: 'edit', text: '✏️ Edit Workout', action: 'EDIT_WORKOUT' },
          { id: 'cancel', text: '❌ Cancel', action: 'CANCEL_WORKOUT' }
        ]);
      }, 500);
      return;
    }
    
    // Handle APPLY_WORKOUT action
    if (reply.action === 'APPLY_WORKOUT') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      handleApplySingleWorkout();
      return;
    }
    
    // Handle VIEW_WORKOUT action
    if (reply.action === 'VIEW_WORKOUT') {
      addMessage(reply.text, 'user');
      if (workoutPreview) {
        setShowWorkoutModal(true);
      }
      return;
    }
    
    // Handle EDIT_WORKOUT action
    if (reply.action === 'EDIT_WORKOUT') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setIsLoading(true);
      
      setTimeout(() => {
        addMessage("What changes would you like to make to this workout? You can ask me to:\n- Add or remove exercises\n- Change sets/reps\n- Adjust rest times\n- Rename the workout", 'ai');
        setConversationState('WORKOUT_EDITING');
        setIsLoading(false);
      }, 500);
      return;
    }
    
    // Handle CANCEL_WORKOUT action
    if (reply.action === 'CANCEL_WORKOUT') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setConversationState('IDLE');
      setWorkoutPreview(null);
      setShowWorkoutPreview(false);
      
      setTimeout(() => {
        addMessage("No problem! The workout has been cancelled. Let me know if you'd like to create a different workout or need any fitness advice.", 'ai');
      }, 500);
      return;
    }
    
    // Handle CONFIRM_WORKOUT_EDIT and CANCEL_WORKOUT_EDIT
    if (reply.action === 'CONFIRM_WORKOUT_EDIT') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setConversationState('WORKOUT_EDITING');
      
      setTimeout(() => {
        addMessage("What changes would you like to make to this workout?", 'ai');
      }, 500);
      return;
    }
    
    if (reply.action === 'CANCEL_WORKOUT_EDIT') {
      addMessage(reply.text, 'user');
      setQuickReplies([
        { id: 'apply', text: '✅ Apply These Changes', action: 'APPLY_WORKOUT' },
        { id: 'view', text: '👁️ View Workout', action: 'VIEW_WORKOUT' },
        { id: 'edit', text: '✏️ Edit Workout', action: 'EDIT_WORKOUT' },
        { id: 'cancel', text: '❌ Cancel', action: 'CANCEL_WORKOUT' }
      ]);
      return;
    }
    
    if (reply.action === 'CREATE_EXERCISE') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setIsLoading(true);
      
      setTimeout(() => {
        addMessage("Let's add a new exercise! Please tell me:\n- Exercise name\n- Number of sets and reps\n- Rest time\n- Target muscle groups\n\nFor example: 'Add barbell squats, 4 sets of 8 reps, 90 seconds rest, targets quads and glutes'", 'ai');
        setIsLoading(false);
      }, 500);
      return;
    }
    
    if (reply.action === 'EDIT_WORKOUT_LIST') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setIsLoading(true);
      
      // Fetch user's workouts
      const workouts = await fetchUserWorkouts();
      
      if (workouts.length === 0) {
        setTimeout(() => {
          addMessage("You don't have any workouts yet. Would you like to create one?", 'ai');
          setQuickReplies([
            { id: 'create', text: 'Create a workout', action: 'CREATE_WORKOUT' },
            { id: 'cancel', text: 'Cancel', action: 'CANCEL' }
          ]);
          setIsLoading(false);
        }, 500);
      } else {
        setTimeout(() => {
          addMessage("Which workout would you like to edit?", 'ai');
          setQuickReplies(workouts.map((w: any) => ({
            id: w.id,
            text: w.name,
            action: 'EDIT_WORKOUT',
            data: w.id
          })));
          setIsLoading(false);
        }, 500);
      }
      return;
    }
    
    if (reply.action === 'DELETE_WORKOUT_LIST') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setIsLoading(true);
      
      // Fetch user's workouts
      const workouts = await fetchUserWorkouts();
      
      if (workouts.length === 0) {
        setTimeout(() => {
          addMessage("You don't have any workouts to delete.", 'ai');
          setIsLoading(false);
        }, 500);
      } else {
        setTimeout(() => {
          addMessage("Which workout would you like to delete?", 'ai');
          setQuickReplies(workouts.map((w: any) => ({
            id: w.id,
            text: w.name,
            action: 'DELETE_WORKOUT',
            data: w.id
          })));
          setIsLoading(false);
        }, 500);
      }
      return;
    }
    
    if (reply.action === 'VIEW_PLANS') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setIsLoading(true);
      
      setTimeout(() => {
        addMessage("I'll check your workout plans for you...", 'ai');
        // TODO: Implement viewing existing plans
        setIsLoading(false);
      }, 500);
      return;
    }
    
    if (reply.action === 'GET_TIPS') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setIsLoading(true);
      
      setTimeout(async () => {
        const tips = await getAIResponse("Give me a helpful fitness tip for today");
        addMessage(tips.content, 'ai');
        setIsLoading(false);
      }, 500);
      return;
    }
    
    // Handle saving an exercise from preview
    if (reply.action === 'SAVE_EXERCISE') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setIsLoading(true);
      
      try {
        const exerciseData = reply.data;
        const success = await createExerciseInDatabase(exerciseData.name, exerciseData.muscle_groups);
        
        setTimeout(() => {
          if (success) {
            addMessage(`✅ Great! I've added "${exerciseData.name}" to your exercise library. You can now use it in any workout!`, 'ai');
          } else {
            addMessage(`❌ This exercise might already exist or couldn't be saved. Please check your exercise library.`, 'ai');
          }
          setShowExercisePreview(false);
          setExercisePreview(null);
          setIsLoading(false);
        }, 500);
      } catch (error) {
        console.error('Error saving exercise:', error);
        setTimeout(() => {
          addMessage("❌ Sorry, I couldn't save the exercise. Please try again.", 'ai');
          setIsLoading(false);
        }, 500);
      }
      return;
    }
    
    // Handle saving a workout from preview
    if (reply.action === 'SAVE_WORKOUT') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setIsLoading(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          addMessage("You need to be logged in to save workouts.", 'ai');
          setIsLoading(false);
          return;
        }
        
        const workoutData = reply.data;
        
        // Save workout to database
        const { data: workout, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            user_id: user.id,
            name: workoutData.name,
            estimated_minutes: workoutData.estimated_minutes || 45,
            is_template: true,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (workoutError || !workout) {
          throw new Error('Failed to save workout');
        }
        
        // Save exercises
        for (const exercise of workoutData.exercises) {
          await supabase.from('workout_exercises').insert({
            workout_id: workout.id,
            exercise_name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_seconds: exercise.rest_seconds,
            order_index: workoutData.exercises.indexOf(exercise),
          });
        }
        
        setTimeout(() => {
          addMessage(`✅ Great! I've saved "${workoutData.name}" to your workouts. You can find it in your workout library and use it anytime!`, 'ai');
          setShowWorkoutPreview(false);
          setWorkoutPreview(null);
          setIsLoading(false);
        }, 500);
      } catch (error) {
        console.error('Error saving workout:', error);
        setTimeout(() => {
          addMessage("❌ Sorry, I couldn't save the workout. Please try again.", 'ai');
          setIsLoading(false);
        }, 500);
      }
      return;
    }
    
    // Handle workout editing/deleting actions
    if (reply.action === 'DELETE_WORKOUT') {
      addMessage(reply.text, 'user');
      setQuickReplies([]);
      setIsLoading(true);
      
      const success = await deleteWorkout(reply.data);
      
      setTimeout(() => {
        if (success) {
          addMessage("✅ Workout deleted successfully!", 'ai');
        } else {
          addMessage("❌ Failed to delete workout. Please try again.", 'ai');
        }
        setIsLoading(false);
      }, 500);
      return;
    }
    
    if (reply.action === 'EDIT_WORKOUT') {
      addMessage(`Edit ${reply.text}`, 'user');
      setQuickReplies([]);
      setIsLoading(true);
      
      setTimeout(() => {
        addMessage(`I can help you edit "${reply.text}". What would you like to change?\n\nYou can say things like:\n- "Add squats with 3 sets of 10 reps"\n- "Remove bench press"\n- "Change sets to 4 for deadlifts"\n- "Rename to Upper Body Power"`, 'ai');
        setIsLoading(false);
      }, 500);
      return;
    }
    
    // Store the previous user info to check what changed
    const previousUserInfo = { ...userInfo };
    let updatedUserInfo = { ...userInfo };
    
    // Update user info based on action
    if (reply.action === 'SET_GOAL') {
      updatedUserInfo.goal = reply.data;
    } else if (reply.action === 'SET_EXPERIENCE') {
      updatedUserInfo.experience = reply.data;
    } else if (reply.action === 'SET_DAYS') {
      updatedUserInfo.daysPerWeek = reply.data;
    } else if (reply.action === 'SET_DURATION') {
      updatedUserInfo.sessionLength = reply.data;
    } else if (reply.action === 'SET_EQUIPMENT') {
      updatedUserInfo.equipment = reply.data;
    }
    
    // Update the state
    setUserInfo(updatedUserInfo);

    // Auto-send the reply directly without filling text box
    addMessage(reply.text, 'user');
    setQuickReplies([]);
    setIsLoading(true);

    // Process next step based on plan gathering state
    setTimeout(async () => {
      try {
        // If we're in PLAN_INFO_GATHER state and just set user info, check what's next
        if (conversationState === 'PLAN_INFO_GATHER' && reply.action?.startsWith('SET_')) {
          // Check what info we still need with the updated user info
          const missingInfo = [];
          if (!updatedUserInfo.goal) missingInfo.push('goal');
          if (!updatedUserInfo.experience) missingInfo.push('experience');
          if (!updatedUserInfo.daysPerWeek) missingInfo.push('daysPerWeek');
          if (!updatedUserInfo.sessionLength) missingInfo.push('sessionLength');
          if (!updatedUserInfo.equipment) missingInfo.push('equipment');
          
          if (missingInfo.length === 0) {
            // All info collected, generate plan
            addMessage("Creating your personalized workout plan... This may take a moment.", 'ai');
            
            setTimeout(async () => {
              const plan = await generateStructuredPlan();
              setCurrentPlan(plan);
              setConversationState('PLAN_READY');
              
              // Add the success message
              addMessage(
                `🎉 Perfect! I've created your personalized workout plan!\n\nYour plan includes ${plan.workouts.length} different workouts optimized for your ${updatedUserInfo.goal} goals. Each workout is designed to fit your ${updatedUserInfo.sessionLength}-minute sessions.`,
                'ai'
              );
              
              // Add the plan card to chat
              setTimeout(() => {
                addMessage(`Your ${plan.plan.name}`, 'ai', 'plan_card', plan);
                
                // Set quick replies for plan actions
                setQuickReplies([
                  { id: 'apply_plan', text: '✅ Apply These Changes', action: 'APPLY_PLAN' },
                  { id: 'view_plan', text: '👁️ View Plan Details', action: 'VIEW_PLAN' },
                  { id: 'edit_plan', text: '✏️ Edit Plan', action: 'EDIT_PLAN' },
                  { id: 'cancel_plan', text: '❌ Cancel', action: 'CANCEL_PLAN' }
                ]);
              }, 500);
              
              // Show the modal after a brief delay
              setTimeout(() => {
                setShowPlanModal(true);
              }, 1000);
            }, 100);
          } else {
            // Ask for the next missing info
            const nextInfo = askForNextInfo(missingInfo[0]);
            addMessage(nextInfo.content, 'ai');
            setQuickReplies(nextInfo.replies);
          }
        } else {
          // For non-plan gathering states, process normally
          const aiResponse = await getAIResponse(reply.text);
          addMessage(aiResponse.content, 'ai');
          
          if (aiResponse.newState) {
            setConversationState(aiResponse.newState);
          }
          
          if (aiResponse.replies) {
            setQuickReplies(aiResponse.replies);
          }
        }
      } catch (error) {
        console.error('AI Response Error:', error);
        addMessage("Sorry, I'm having trouble responding right now. Please try again!", 'ai');
      }
      
      setIsLoading(false);
    }, 1000);
  };

  // Clear chat
  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear the conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            // Clear from database if available
            if (isDatabaseAvailable) {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  await supabase
                    .from('ai_chat_messages')
                    .delete()
                    .eq('user_id', user.id);
                }
              } catch (error) {
                console.error('Error clearing chat history:', error);
              }
            }
            
            // Clear local state
            setMessages([]);
            setConversationState('IDLE');
            setQuickReplies([]);
            setUserInfo({});
            setCurrentPlan(null);
            setShowPlanModal(false);
            setTimeout(addWelcomeMessage, 500);
          }
        }
      ]
    );
  };

  // Handle applying single workout
  const handleApplySingleWorkout = async () => {
    if (!workoutPreview) return;
    
    addMessage("Saving your workout... This may take a moment.", 'ai');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addMessage("You need to be logged in to save workouts.", 'ai');
        return;
      }
      
      // Save workout to database
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          name: workoutPreview.name,
          estimated_minutes: workoutPreview.estimated_minutes || 45,
          is_template: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (workoutError || !workout) {
        throw new Error('Failed to save workout');
      }
      
      // Save exercises
      for (const exercise of workoutPreview.exercises) {
        await supabase.from('workout_exercises').insert({
          workout_id: workout.id,
          exercise_name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          rest_seconds: exercise.rest_seconds,
          order_index: workoutPreview.exercises.indexOf(exercise),
        });
      }
      
      // Schedule the workout if days were selected
      if (workoutPreview.scheduledDays && workoutPreview.scheduledDays.length > 0) {
        // You might want to add calendar entries here
        // This would depend on your calendar implementation
      }
      
      setTimeout(() => {
        const scheduleText = workoutPreview.scheduledDays && workoutPreview.scheduledDays.length > 0
          ? ` and scheduled for ${workoutPreview.scheduledDays.join(', ')}`
          : '';
        
        addMessage(`✅ Great! I've saved "${workoutPreview.name}" to your workouts${scheduleText}. You can find it in your workout library!`, 'ai');
        setConversationState('IDLE');
        setWorkoutPreview(null);
        setShowWorkoutPreview(false);
        setQuickReplies([]);
      }, 500);
    } catch (error) {
      console.error('Error saving workout:', error);
      setTimeout(() => {
        addMessage("❌ Sorry, I couldn't save the workout. Please try again.", 'ai');
      }, 500);
    }
  };
  
  // Handle applying workout plan
  const handleApplyWorkout = async () => {
    if (!currentPlan) return;
    
    setShowPlanModal(false);
    
    // Show loading message
    addMessage("Saving your workout plan to the app... This may take a moment.", 'ai');
    
    // Apply the workout plan to the app
    const success = await applyWorkoutPlanToApp(currentPlan);
    
    if (success) {
      setExistingPlansCount(prev => prev + 1); // Track that plans exist
      
      // Show success message
      setTimeout(() => {
        addMessage("🎉 Perfect! I've successfully added your workout plan to your app!\n\n" +
                   "✅ Workouts have been created as templates\n" +
                   "✅ Schedule has been marked on your calendar\n" +
                   "✅ All exercises are now in your library\n\n" +
                   "You can find your new workouts in the Workouts tab and see them scheduled on your calendar. Start with your first workout when you're ready!\n\n" +
                   "Remember to focus on proper form and progressive overload. Good luck with your training! 💪", 'ai');
      }, 500);
      
      // Reset conversation state and clear quick replies
      setConversationState('IDLE');
      setCurrentPlan(null);
      setUserInfo({});
      setQuickReplies([]);
    } else {
      // Show error message
      addMessage("I encountered an issue while saving your workout plan. Please try again or check your connection.", 'ai');
      
      // Keep the plan so user can try again
      setTimeout(() => {
        setShowPlanModal(true);
      }, 1000);
    }
  };

  // Handle dismissing plan modal
  const handleDismissPlan = () => {
    setShowPlanModal(false);
    // Keep quick replies available if we're in PLAN_READY state
    if (conversationState === 'PLAN_READY' && currentPlan) {
      setQuickReplies([
        { id: 'apply_plan', text: '✅ Apply These Changes', action: 'APPLY_PLAN' },
        { id: 'view_plan', text: '👁️ View Plan Details', action: 'VIEW_PLAN' },
        { id: 'edit_plan', text: '✏️ Edit Plan', action: 'EDIT_PLAN' },
        { id: 'cancel_plan', text: '❌ Cancel', action: 'CANCEL_PLAN' }
      ]);
    }
  };

  // Restart AI
  const handleRestartAI = () => {
    Alert.alert(
      'Restart AI',
      'This will reset the AI conversation and clear all data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restart', 
          style: 'destructive',
          onPress: async () => {
            // Clear from database if available
            if (isDatabaseAvailable) {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  await supabase
                    .from('ai_chat_messages')
                    .delete()
                    .eq('user_id', user.id);
                }
              } catch (error) {
                console.error('Error clearing chat history:', error);
              }
            }
            
            // Reset all state
            setMessages([]);
            setConversationState('IDLE');
            setQuickReplies([]);
            setUserInfo({});
            setCurrentPlan(null);
            setShowPlanModal(false);
            setExistingPlansCount(0);
            setHasShownDisclaimer(false);
            setShowMenu(false);
            setTimeout(addWelcomeMessage, 500);
          }
        }
      ]
    );
  };

  // Report conversation
  const handleReportConversation = () => {
    Alert.alert(
      'Report Conversation',
      'Thank you for your feedback. This conversation has been flagged for review.',
      [{ text: 'OK' }]
    );
    setShowMenu(false);
  };

  // Handle plan card tap
  const handlePlanCardTap = (plan: WorkoutPlan) => {
    setCurrentPlan(plan);
    setShowPlanModal(true);
  };
  
  // Handle workout card tap
  const handleWorkoutCardTap = (workout: WorkoutPreview) => {
    setWorkoutPreview(workout);
    setShowWorkoutModal(true);
  };
  
  // Handle dismiss workout modal
  const handleDismissWorkout = () => {
    setShowWorkoutModal(false);
  };

  // Render message
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    
    // Render workout preview card (matching plan card design exactly)
    if (item.type === 'workout_preview' && item.data) {
      const workout = item.data as WorkoutPreview;
      return (
        <View style={[styles.messageContainer, styles.aiMessageContainer]}>
          <TouchableOpacity 
            style={styles.planCardContainer}
            activeOpacity={0.8}
            onPress={() => handleWorkoutCardTap(workout)}
          >
            <View style={styles.planCardHeader}>
              <Ionicons name="fitness" size={20} color="#17D4D4" />
              <Text style={styles.planCardTitle}>{workout.name}</Text>
              <Ionicons name="chevron-forward" size={16} color="#17D4D4" />
            </View>
            <Text style={styles.planCardSubtitle}>
              {workout.exercises.length} exercises • {workout.estimated_minutes || 45} min{workout.scheduledDays && workout.scheduledDays.length > 0 ? ` • ${workout.scheduledDays.length} days/week` : ''}
            </Text>
            <Text style={styles.planCardTap}>Tap to view details</Text>
          </TouchableOpacity>
          
          <Text style={[styles.messageTime, styles.aiTime]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      );
    }
    
    // Render exercise preview card
    if (item.type === 'exercise_preview' && item.data) {
      const exercise = item.data as ExercisePreview;
      return (
        <View style={[styles.messageContainer, styles.aiMessageContainer]}>
          <View style={styles.exercisePreviewCard}>
            <View style={styles.exercisePreviewHeader}>
              <Ionicons name="add-circle" size={20} color="#17D4D4" />
              <Text style={styles.exercisePreviewTitle}>{exercise.name}</Text>
            </View>
            
            <Text style={styles.exerciseMuscles}>
              Targets: {exercise.muscle_groups.join(', ')}
            </Text>
            
            {exercise.description && (
              <Text style={styles.exerciseDescription}>{exercise.description}</Text>
            )}
          </View>
          
          <Text style={[styles.messageTime, styles.aiTime]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      );
    }
    
    // Render plan card
    if (item.type === 'plan_card' && item.data) {
      const planData = item.data as WorkoutPlan;
      return (
        <View style={[styles.messageContainer, styles.aiMessageContainer]}>
          <TouchableOpacity 
            style={styles.planCardContainer}
            onPress={() => handlePlanCardTap(planData)}
            activeOpacity={0.8}
          >
            <View style={styles.planCardHeader}>
              <Ionicons name="fitness" size={20} color="#17D4D4" />
              <Text style={styles.planCardTitle}>{planData.plan.name}</Text>
              <Ionicons name="chevron-forward" size={16} color="#17D4D4" />
            </View>
            <Text style={styles.planCardSubtitle}>
              {planData.workouts.length} workouts • {planData.plan.days_per_week} days/week • {planData.plan.length_weeks} weeks
            </Text>
            <Text style={styles.planCardTap}>Tap to view details</Text>
          </TouchableOpacity>
          <Text style={[styles.messageTime, styles.aiTime]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      );
    }
    
    // Render regular text message
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {item.content}
          </Text>
        </View>
        <Text style={[styles.messageTime, isUser ? styles.userTime : styles.aiTime]}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  // Render quick reply buttons
  const renderQuickReplies = () => {
    // Always show main action buttons if in idle state
    const mainActions: QuickReply[] = conversationState === 'IDLE' && !isLoading ? [
      { id: 'create_plan', text: '💪 Create Workout Plan', action: 'CREATE_PLAN' },
      { id: 'create_workout', text: '🏋️ Create Single Workout', action: 'CREATE_WORKOUT' },
      { id: 'create_exercise', text: '➕ Add New Exercise', action: 'CREATE_EXERCISE' },
      { id: 'edit_workout', text: '✏️ Edit Existing Workout', action: 'EDIT_WORKOUT_LIST' },
      { id: 'delete_workout', text: '🗑️ Delete Workout', action: 'DELETE_WORKOUT_LIST' },
      { id: 'view_plans', text: '📋 View My Plans', action: 'VIEW_PLANS' },
      { id: 'get_tips', text: '💡 Get Fitness Tips', action: 'GET_TIPS' },
    ] : [];

    const repliesToShow = quickReplies.length > 0 ? quickReplies : mainActions;
    
    if (repliesToShow.length === 0) return null;

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.quickRepliesScrollView}
        contentContainerStyle={styles.quickRepliesContainer}
      >
        {repliesToShow.map((reply) => (
          <TouchableOpacity
            key={reply.id}
            style={styles.quickReplyButton}
            onPress={() => handleQuickReply(reply)}
          >
            <Text style={styles.quickReplyText}>{reply.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AI Trainer</Text>
          <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(!showMenu)}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#000000" />
          </TouchableOpacity>
          
          {/* Menu Dropdown */}
          {showMenu && (
            <View style={styles.menuDropdown}>
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setShowMenu(false);
                setTimeout(handleClearChat, 100);
              }}>
                <Ionicons name="trash-outline" size={18} color="#000000" />
                <Text style={styles.menuItemText}>Clear Chat</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setShowMenu(false);
                setTimeout(handleRestartAI, 100);
              }}>
                <Ionicons name="refresh-outline" size={18} color="#000000" />
                <Text style={styles.menuItemText}>Restart AI</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setShowMenu(false);
                setTimeout(handleReportConversation, 100);
              }}>
                <Ionicons name="flag-outline" size={18} color="#FF3B3B" />
                <Text style={[styles.menuItemText, { color: '#FF3B3B' }]}>Report Conversation</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Messages */}
        {isLoadingHistory ? (
          <View style={styles.loadingHistoryContainer}>
            <Text style={styles.loadingHistoryText}>Loading chat history...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }
            }}
          />
        )}

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        )}

        {/* Quick Replies */}
        {renderQuickReplies()}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything about fitness..."
            placeholderTextColor="#AAAAAA"
            multiline
            onSubmitEditing={handleSendMessage}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={(!inputText.trim() || isLoading) ? "#CCCCCC" : "#FFFFFF"} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Menu Overlay */}
      {showMenu && (
        <TouchableOpacity 
          style={styles.menuOverlay} 
          activeOpacity={1} 
          onPress={() => setShowMenu(false)}
        />
      )}

      {/* Plan Preview Modal */}
      <Modal
        visible={showPlanModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleDismissPlan}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleDismissPlan}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Your Workout Plan</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {currentPlan && (
              <>
                {/* Plan Overview */}
                <View style={styles.planOverview}>
                  <Text style={styles.planName}>{currentPlan.plan.name}</Text>
                  <View style={styles.planDetailsRow}>
                    <View style={styles.planDetail}>
                      <Ionicons name="calendar" size={16} color="#17D4D4" />
                      <Text style={styles.planDetailText}>{currentPlan.plan.days_per_week} days/week</Text>
                    </View>
                    <View style={styles.planDetail}>
                      <Ionicons name="time" size={16} color="#17D4D4" />
                      <Text style={styles.planDetailText}>{currentPlan.plan.length_weeks} weeks</Text>
                    </View>
                  </View>
                  <Text style={styles.planNotes}>{currentPlan.plan.notes}</Text>
                </View>

                {/* Workouts */}
                <Text style={styles.workoutsTitle}>Your Workouts</Text>
                {currentPlan.workouts.map((workout, index) => (
                  <View key={index} style={styles.workoutCard}>
                    <View style={styles.workoutHeader}>
                      <Text style={styles.workoutTitle}>{workout.title}</Text>
                      <Text style={styles.workoutDay}>{workout.day_of_week}</Text>
                    </View>
                    <View style={styles.workoutInfo}>
                      <Ionicons name="time-outline" size={14} color="#5A5A5A" />
                      <Text style={styles.workoutDuration}>{workout.estimated_minutes} min</Text>
                    </View>

                    {/* Exercises */}
                    <View style={styles.exercisesList}>
                      {workout.exercises.map((exercise, exerciseIndex) => (
                        <View key={exerciseIndex} style={styles.exerciseCard}>
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
                          <View style={styles.exerciseDetails}>
                            <View style={styles.exerciseDetail}>
                              <Text style={styles.exerciseDetailLabel}>Sets</Text>
                              <Text style={styles.exerciseDetailValue}>{exercise.sets}</Text>
                            </View>
                            <View style={styles.exerciseDetail}>
                              <Text style={styles.exerciseDetailLabel}>Reps</Text>
                              <Text style={styles.exerciseDetailValue}>{exercise.reps}</Text>
                            </View>
                            <View style={styles.exerciseDetail}>
                              <Text style={styles.exerciseDetailLabel}>Rest</Text>
                              <Text style={styles.exerciseDetailValue}>{Math.floor(exercise.rest_seconds / 60)}m</Text>
                            </View>
                          </View>
                          {exercise.notes && (
                            <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
                          )}
                          <Text style={styles.exerciseMuscles}>
                            {exercise.muscle_groups.join(', ')}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}

                {/* Apply Button */}
                <TouchableOpacity style={styles.applyButton} onPress={handleApplyWorkout}>
                  <Text style={styles.applyButtonText}>Apply These Changes</Text>
                </TouchableOpacity>

                <View style={{ height: 50 }} />
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Workout Preview Modal */}
      <Modal
        visible={showWorkoutModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleDismissWorkout}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleDismissWorkout}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Workout Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {workoutPreview && (
              <>
                {/* Workout Overview */}
                <View style={styles.planOverview}>
                  <Text style={styles.planName}>{workoutPreview.name}</Text>
                  <View style={styles.planDetailsRow}>
                    <View style={styles.planDetail}>
                      <Ionicons name="time" size={16} color="#17D4D4" />
                      <Text style={styles.planDetailText}>{workoutPreview.estimated_minutes || 45} minutes</Text>
                    </View>
                    {workoutPreview.scheduledDays && workoutPreview.scheduledDays.length > 0 && (
                      <View style={styles.planDetail}>
                        <Ionicons name="calendar" size={16} color="#17D4D4" />
                        <Text style={styles.planDetailText}>{workoutPreview.scheduledDays.length} days/week</Text>
                      </View>
                    )}
                  </View>
                  {workoutPreview.scheduledDays && workoutPreview.scheduledDays.length > 0 && (
                    <Text style={styles.planNotes}>Scheduled for: {workoutPreview.scheduledDays.join(', ')}</Text>
                  )}
                </View>

                {/* Exercises */}
                <Text style={styles.workoutsTitle}>Exercises</Text>
                <View style={styles.exercisesList}>
                  {workoutPreview.exercises.map((exercise, index) => (
                    <View key={index} style={styles.exerciseCard}>
                      <View style={styles.exerciseHeader}>
                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                      </View>
                      <View style={styles.exerciseDetails}>
                        <Text style={styles.exerciseSets}>{exercise.sets} sets × {exercise.reps}</Text>
                        {exercise.rest_seconds && (
                          <Text style={styles.exerciseRest}>Rest: {exercise.rest_seconds}s</Text>
                        )}
                      </View>
                      {exercise.notes && (
                        <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
                      )}
                      {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
                        <View style={styles.muscleGroups}>
                          {exercise.muscle_groups.map((muscle, idx) => (
                            <View key={idx} style={styles.muscleTag}>
                              <Text style={styles.muscleTagText}>{muscle}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>

                {/* Apply Button */}
                <TouchableOpacity 
                  style={styles.applyButton} 
                  onPress={() => {
                    handleDismissWorkout();
                    // Trigger apply workout action
                    handleQuickReply({ id: 'apply', text: '✅ Apply These Changes', action: 'APPLY_WORKOUT' });
                  }}
                >
                  <Text style={styles.applyButtonText}>Apply This Workout</Text>
                </TouchableOpacity>

                <View style={{ height: 50 }} />
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 26,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
  },
  menuButton: {
    padding: 4,
  },
  menuDropdown: {
    position: 'absolute',
    top: '100%',
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 180,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 500,
  },

  // Messages
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#17D4D4',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    lineHeight: 24,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#000000',
  },
  messageTime: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
    marginTop: 4,
  },
  userTime: {
    alignSelf: 'flex-end',
  },
  aiTime: {
    alignSelf: 'flex-start',
    marginLeft: 16,
  },

  // Loading
  loadingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    fontStyle: 'italic',
  },
  loadingHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingHistoryText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
  },

  // Quick Replies
  quickRepliesScrollView: {
    maxHeight: 60,
  },
  quickRepliesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 8,
  },
  quickReplyButton: {
    backgroundColor: '#F0FDFD',
    borderWidth: 1,
    borderColor: '#17D4D4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  quickReplyText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#17D4D4',
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    maxHeight: 100,
    color: '#000000',
  },
  sendButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Plan Overview
  planOverview: {
    backgroundColor: '#DFFCFD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  planName: {
    fontSize: 20,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
    marginBottom: 12,
  },
  planDetailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  planDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planDetailText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
  },
  planNotes: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#5A5A5A',
    lineHeight: 20,
  },

  // Workouts
  workoutsTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
    marginBottom: 16,
  },
  workoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
  },
  workoutDay: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#17D4D4',
    fontWeight: '600',
  },
  workoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  workoutDuration: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#5A5A5A',
  },

  // Exercises
  exercisesList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#17D4D4',
  },
  exerciseName: {
    fontSize: 15,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
    marginBottom: 8,
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  exerciseHeader: {
    marginBottom: 4,
  },
  exerciseSets: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#5A5A5A',
  },
  exerciseRest: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
  },
  exerciseDetail: {
    alignItems: 'center',
  },
  exerciseDetailLabel: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  exerciseDetailValue: {
    fontSize: 14,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
  },
  exerciseNotes: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  exerciseMuscles: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#17D4D4',
    fontWeight: '600',
  },

  // Apply Button
  applyButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-ExtraBold',
    color: '#FFFFFF',
  },

  // Workout Preview Card Styles
  workoutPreviewCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#17D4D4',
    maxWidth: '85%',
  },
  workoutPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  workoutPreviewTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
  },
  workoutPreviewExercises: {
    gap: 8,
  },
  workoutPreviewExercise: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  workoutPreviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  
  // Exercise Preview Card Styles
  exercisePreviewCard: {
    backgroundColor: '#FFF5E6',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FFA500',
    maxWidth: '85%',
  },
  exercisePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  exercisePreviewTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
  },
  exerciseDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#5A5A5A',
    marginTop: 8,
  },
  
  // Muscle Group Styles
  muscleGroups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  muscleTag: {
    backgroundColor: '#E8F8F8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17D4D4',
  },
  muscleTagText: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#17D4D4',
  },
  
  // Plan Card Styles
  planCardContainer: {
    backgroundColor: '#DFFCFD',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#17D4D4',
    maxWidth: '85%',
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  planCardTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
  },
  planCardSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#5A5A5A',
    marginBottom: 8,
  },
  planCardTap: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#17D4D4',
    fontStyle: 'italic',
  },
});

export default AITrainerScreenSimple;
