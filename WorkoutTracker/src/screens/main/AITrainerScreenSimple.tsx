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

// Simple types - no external dependencies
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface QuickReply {
  id: string;
  text: string;
  action: string;
  data?: any;
}

type ConversationState = 'IDLE' | 'PLAN_CONFIRM' | 'PLAN_INFO_GATHER' | 'PLAN_READY';

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

type AITrainerScreenSimpleProps = {
  navigation: StackNavigationProp<any>;
};

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
  const [existingPlansCount, setExistingPlansCount] = useState(0);
  
  const flatListRef = useRef<FlatList>(null);

  // Simple message ID generation
  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add message to chat
  const addMessage = (content: string, sender: 'user' | 'ai') => {
    const newMessage: ChatMessage = {
      id: generateMessageId(),
      content,
      sender,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Add welcome message when component mounts
  React.useEffect(() => {
    if (messages.length === 0) {
      addWelcomeMessage();
    }
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

  // Simple AI response logic - no external API calls
  const getAIResponse = (userMessage: string): { content: string; newState?: ConversationState; replies?: QuickReply[] } => {
    const message = userMessage.toLowerCase();
    
    // Plan creation intent
    if (message.includes('plan') || message.includes('workout') || message.includes('program') || message.includes('routine')) {
      if (conversationState === 'IDLE') {
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
      if (message.includes('yes') || message.includes('build') || message.includes('create')) {
        return {
          content: "Perfect! Let's build your personalized plan. I'll need to ask you a few questions to create the best program for you.\n\nFirst, what's your main fitness goal?",
          newState: 'PLAN_INFO_GATHER',
          replies: [
            { id: 'muscle', text: 'Build Muscle', action: 'SET_GOAL', data: 'muscle gain' },
            { id: 'strength', text: 'Get Stronger', action: 'SET_GOAL', data: 'strength' },
            { id: 'fat_loss', text: 'Lose Fat', action: 'SET_GOAL', data: 'fat loss' },
            { id: 'general', text: 'General Fitness', action: 'SET_GOAL', data: 'general fitness' }
          ]
        };
      } else {
        return {
          content: "No problem! I'm here to help with any fitness questions you have. Feel free to ask about exercises, nutrition, training tips, or anything else fitness-related.",
          newState: 'IDLE'
        };
      }
    }
    
    // Handle info gathering
    if (conversationState === 'PLAN_INFO_GATHER') {
      const missingInfo = getMissingInfo();
      
      if (missingInfo.length === 0) {
        // All info collected, generate structured plan and show modal
        const plan = generateStructuredPlan();
        setCurrentPlan(plan);
        setShowPlanModal(true);
        
        return {
          content: `🎉 Perfect! I've created your personalized workout plan. Take a look at the detailed plan that just appeared!\n\nYour plan includes ${plan.workouts.length} different workouts optimized for your ${userInfo.goal} goals. Each workout is designed to fit your ${userInfo.sessionLength}-minute sessions.\n\nReview the plan and let me know what you think!`,
          newState: 'PLAN_READY'
        };
      } else {
        return askForNextInfo(missingInfo[0]);
      }
    }
    
    // Handle plan ready state
    if (conversationState === 'PLAN_READY') {
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
    }
    
    // General fitness advice
    if (message.includes('exercise') || message.includes('workout') || message.includes('train')) {
      return {
        content: "I'd be happy to help with workout advice! Here are some general tips:\n\n" +
                 "• **Progressive Overload**: Gradually increase weight, reps, or sets over time\n" +
                 "• **Consistency**: Regular training is more important than perfect sessions\n" +
                 "• **Recovery**: Rest days are crucial for muscle growth and adaptation\n" +
                 "• **Form First**: Perfect your technique before adding weight\n\n" +
                 "Do you have any specific questions about exercises or training?"
      };
    }
    
    if (message.includes('nutrition') || message.includes('diet') || message.includes('eat')) {
      return {
        content: "Great question about nutrition! Here are some key principles:\n\n" +
                 "• **Protein**: Aim for 0.8-1g per lb of body weight for muscle building\n" +
                 "• **Hydration**: Drink plenty of water throughout the day\n" +
                 "• **Whole Foods**: Focus on minimally processed foods\n" +
                 "• **Balance**: Include all macronutrients (protein, carbs, fats)\n\n" +
                 "Remember, I'm not a nutritionist. For personalized diet advice, consult a qualified professional!"
      };
    }
    
    // Default response
    return {
      content: "I'm here to help with all things fitness! You can ask me about:\n\n" +
               "• Creating workout plans\n" +
               "• Exercise techniques and form\n" +
               "• Training principles\n" +
               "• General nutrition guidance\n" +
               "• Recovery and rest\n\n" +
               "What would you like to know more about?"
    };
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
      case 'experience':
        return {
          content: "What's your fitness experience level?",
          replies: [
            { id: 'beginner', text: 'Beginner', action: 'SET_EXPERIENCE', data: 'beginner' },
            { id: 'intermediate', text: 'Intermediate', action: 'SET_EXPERIENCE', data: 'intermediate' },
            { id: 'advanced', text: 'Advanced', action: 'SET_EXPERIENCE', data: 'advanced' }
          ]
        };
      case 'daysPerWeek':
        return {
          content: "How many days per week can you work out?",
          replies: [
            { id: '3days', text: '3 days', action: 'SET_DAYS', data: 3 },
            { id: '4days', text: '4 days', action: 'SET_DAYS', data: 4 },
            { id: '5days', text: '5 days', action: 'SET_DAYS', data: 5 },
            { id: '6days', text: '6 days', action: 'SET_DAYS', data: 6 }
          ]
        };
      case 'sessionLength':
        return {
          content: "How long do you want each workout session to be?",
          replies: [
            { id: '30min', text: '30 minutes', action: 'SET_DURATION', data: 30 },
            { id: '45min', text: '45 minutes', action: 'SET_DURATION', data: 45 },
            { id: '60min', text: '60 minutes', action: 'SET_DURATION', data: 60 },
            { id: '90min', text: '90 minutes', action: 'SET_DURATION', data: 90 }
          ]
        };
      case 'equipment':
        return {
          content: "What equipment do you have access to?",
          replies: [
            { id: 'gym', text: 'Full Gym', action: 'SET_EQUIPMENT', data: ['gym', 'barbell', 'dumbbells', 'machines'] },
            { id: 'home', text: 'Home (Dumbbells)', action: 'SET_EQUIPMENT', data: ['dumbbells', 'bodyweight'] },
            { id: 'bodyweight', text: 'Bodyweight Only', action: 'SET_EQUIPMENT', data: ['bodyweight'] }
          ]
        };
      default:
        return {
          content: "Let's continue with your plan setup!",
          replies: []
        };
    }
  };

  // Generate a structured workout plan
  const generateStructuredPlan = (): WorkoutPlan => {
    const { goal, experience, daysPerWeek, sessionLength, equipment } = userInfo;
    const hasGym = equipment?.includes('gym');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + ((1 + 7 - startDate.getDay()) % 7)); // Next Monday
    
    const planName = `${daysPerWeek}-Day ${goal === 'muscle gain' ? 'Hypertrophy' : 
                                       goal === 'strength' ? 'Strength' : 
                                       goal === 'fat loss' ? 'Fat Loss' : 'Fitness'} Plan`;
    
    const workouts: WorkoutDay[] = [];
    
    if (daysPerWeek === 3) {
      // Full body workouts
      workouts.push(
        {
          day_of_week: 'Monday',
          title: 'Full Body A',
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
        },
        {
          day_of_week: 'Wednesday',
          title: 'Full Body B',
          estimated_minutes: sessionLength || 60,
          exercises: hasGym ? [
            { name: 'Deadlift', sets: 3, reps: '6-10', rest_seconds: 150, muscle_groups: ['Hamstrings', 'Glutes', 'Back'], notes: 'Keep bar close to body, hinge at hips' },
            { name: 'Incline Dumbbell Press', sets: 3, reps: '8-12', rest_seconds: 120, muscle_groups: ['Chest', 'Shoulders', 'Triceps'], notes: 'Control weight, full range of motion' },
            { name: 'Lat Pulldown', sets: 3, reps: '10-15', rest_seconds: 90, muscle_groups: ['Back', 'Biceps'], notes: 'Pull to upper chest, lean back slightly' },
            { name: 'Dumbbell Shoulder Press', sets: 3, reps: '10-15', rest_seconds: 90, muscle_groups: ['Shoulders', 'Triceps'], notes: 'Press up and slightly back' },
            { name: 'Russian Twists', sets: 3, reps: '20-30', rest_seconds: 60, muscle_groups: ['Abs'], notes: 'Keep feet off ground, rotate torso' }
          ] : [
            { name: 'Single-Leg Glute Bridge', sets: 3, reps: '10-15 each', rest_seconds: 60, muscle_groups: ['Glutes', 'Hamstrings'], notes: 'Keep hips level' },
            { name: 'Decline Push-ups', sets: 3, reps: '5-12', rest_seconds: 60, muscle_groups: ['Chest', 'Shoulders', 'Triceps'], notes: 'Feet elevated on chair/couch' },
            { name: 'Superman', sets: 3, reps: '12-20', rest_seconds: 45, muscle_groups: ['Back'], notes: 'Lift chest and legs, hold briefly' },
            { name: 'Wall Handstand Hold', sets: 3, reps: '15-45s', rest_seconds: 90, muscle_groups: ['Shoulders', 'Triceps'], notes: 'Keep tight core, breathe normally' },
            { name: 'Mountain Climbers', sets: 3, reps: '20-30', rest_seconds: 60, muscle_groups: ['Abs'], notes: 'Keep hips level, quick feet' }
          ]
        },
        {
          day_of_week: 'Friday',
          title: 'Full Body C',
          estimated_minutes: sessionLength || 60,
          exercises: hasGym ? [
            { name: 'Front Squat', sets: 3, reps: '8-12', rest_seconds: 120, muscle_groups: ['Quads', 'Glutes'], notes: 'Keep elbows up, upright torso' },
            { name: 'Dumbbell Bench Press', sets: 3, reps: '10-15', rest_seconds: 120, muscle_groups: ['Chest', 'Triceps', 'Shoulders'], notes: 'Dumbbells allow deeper stretch' },
            { name: 'Cable Row', sets: 3, reps: '12-15', rest_seconds: 90, muscle_groups: ['Back', 'Biceps'], notes: 'Pull handle to lower ribs' },
            { name: 'Lateral Raises', sets: 3, reps: '12-20', rest_seconds: 75, muscle_groups: ['Shoulders'], notes: 'Lift to shoulder height, control down' },
            { name: 'Bicycle Crunches', sets: 3, reps: '20-30', rest_seconds: 60, muscle_groups: ['Abs'], notes: 'Slow and controlled, don\'t pull neck' }
          ] : [
            { name: 'Jump Squats', sets: 3, reps: '10-15', rest_seconds: 60, muscle_groups: ['Quads', 'Glutes'], notes: 'Land softly, full squat depth' },
            { name: 'Diamond Push-ups', sets: 3, reps: '5-12', rest_seconds: 60, muscle_groups: ['Triceps', 'Chest'], notes: 'Hands form diamond shape' },
            { name: 'Reverse Snow Angels', sets: 3, reps: '15-20', rest_seconds: 45, muscle_groups: ['Back', 'Shoulders'], notes: 'Lying face down, lift arms in arc' },
            { name: 'Pike Walks', sets: 3, reps: '8-12', rest_seconds: 60, muscle_groups: ['Shoulders', 'Abs'], notes: 'Walk feet toward hands in pike position' },
            { name: 'Dead Bug', sets: 3, reps: '10-15 each', rest_seconds: 60, muscle_groups: ['Abs'], notes: 'Keep lower back pressed to floor' }
          ]
        }
      );
    } else if (daysPerWeek >= 4) {
      // Upper/Lower split
      workouts.push(
        {
          day_of_week: 'Monday',
          title: 'Upper Body',
          estimated_minutes: sessionLength || 60,
          exercises: hasGym ? [
            { name: 'Bench Press', sets: 4, reps: '6-10', rest_seconds: 120, muscle_groups: ['Chest', 'Triceps', 'Shoulders'], notes: 'Focus on progressive overload' },
            { name: 'Bent-Over Row', sets: 4, reps: '8-12', rest_seconds: 90, muscle_groups: ['Back', 'Biceps'], notes: 'Pull to lower chest' },
            { name: 'Overhead Press', sets: 3, reps: '8-12', rest_seconds: 90, muscle_groups: ['Shoulders', 'Triceps'], notes: 'Press straight up' },
            { name: 'Lat Pulldown', sets: 3, reps: '10-15', rest_seconds: 75, muscle_groups: ['Back', 'Biceps'], notes: 'Lean back slightly' },
            { name: 'Dips', sets: 3, reps: '8-15', rest_seconds: 75, muscle_groups: ['Triceps', 'Chest'], notes: 'Use assist if needed' },
            { name: 'Barbell Curls', sets: 3, reps: '10-15', rest_seconds: 60, muscle_groups: ['Biceps'], notes: 'Control the weight' }
          ] : [
            { name: 'Push-ups', sets: 4, reps: '8-15', rest_seconds: 60, muscle_groups: ['Chest', 'Triceps', 'Shoulders'], notes: 'Modify difficulty as needed' },
            { name: 'Pike Push-ups', sets: 3, reps: '5-12', rest_seconds: 60, muscle_groups: ['Shoulders', 'Triceps'], notes: 'Target shoulders' },
            { name: 'Tricep Dips', sets: 3, reps: '8-15', rest_seconds: 60, muscle_groups: ['Triceps'], notes: 'Use chair or bench' }
          ]
        },
        {
          day_of_week: 'Tuesday',
          title: 'Lower Body',
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
            { name: 'Reverse Lunges', sets: 3, reps: '12-20 each', rest_seconds: 60, muscle_groups: ['Quads', 'Glutes'], notes: 'Step back with control' }
          ]
        }
      );
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

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    addMessage(userMessage, 'user');
    setInputText('');
    setQuickReplies([]);
    setIsLoading(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse = getAIResponse(userMessage);
      addMessage(aiResponse.content, 'ai');
      
      if (aiResponse.newState) {
        setConversationState(aiResponse.newState);
      }
      
      if (aiResponse.replies) {
        setQuickReplies(aiResponse.replies);
      }
      
      setIsLoading(false);
    }, 1000);
  };

  // Handle quick reply
  const handleQuickReply = (reply: QuickReply) => {
    // Update user info based on action
    if (reply.action === 'SET_GOAL') {
      setUserInfo(prev => ({ ...prev, goal: reply.data }));
    } else if (reply.action === 'SET_EXPERIENCE') {
      setUserInfo(prev => ({ ...prev, experience: reply.data }));
    } else if (reply.action === 'SET_DAYS') {
      setUserInfo(prev => ({ ...prev, daysPerWeek: reply.data }));
    } else if (reply.action === 'SET_DURATION') {
      setUserInfo(prev => ({ ...prev, sessionLength: reply.data }));
    } else if (reply.action === 'SET_EQUIPMENT') {
      setUserInfo(prev => ({ ...prev, equipment: reply.data }));
    }

    // Send the reply text as a message
    setInputText(reply.text);
    setTimeout(handleSendMessage, 100);
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
          onPress: () => {
            setMessages([]);
            setConversationState('IDLE');
            setQuickReplies([]);
            setUserInfo({});
            setTimeout(addWelcomeMessage, 500);
          }
        }
      ]
    );
  };

  // Render message
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    
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
    if (quickReplies.length === 0) return null;

    return (
      <View style={styles.quickRepliesContainer}>
        {quickReplies.map((reply) => (
          <TouchableOpacity
            key={reply.id}
            style={styles.quickReplyButton}
            onPress={() => handleQuickReply(reply)}
          >
            <Text style={styles.quickReplyText}>{reply.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
          <Text style={styles.title}>AI Trainer (Demo)</Text>
          <TouchableOpacity style={styles.clearButton} onPress={handleClearChat}>
            <Ionicons name="refresh" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
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
  clearButton: {
    padding: 4,
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
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    lineHeight: 20,
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

  // Quick Replies
  quickRepliesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickReplyButton: {
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickReplyText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#007AFF',
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
    backgroundColor: '#007AFF',
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
});

export default AITrainerScreenSimple;
