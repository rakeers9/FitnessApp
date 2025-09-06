// src/services/aiService.ts

import { ConversationState, ChatMessage, UserPlanInfo, WorkoutPlan } from '../context/AITrainerContext';

// OpenAI API configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini'; // Using GPT-4o mini for production

// Rate limiting and retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

interface AIServiceResponse {
  content: string;
  newState?: ConversationState;
  quickReplies?: QuickReply[];
  planData?: WorkoutPlan;
  userInfoUpdates?: Partial<UserPlanInfo>;
  metadata?: any;
}

interface QuickReply {
  id: string;
  text: string;
  action: string;
  data?: any;
}

// System prompts for different conversation states
const SYSTEM_PROMPTS = {
  IDLE: `You are an AI personal trainer in a fitness app. You're knowledgeable, encouraging, and professional.

Key behaviors:
- Give helpful fitness advice, workout tips, and answer questions naturally
- When users ask about creating workout plans (like "make me a plan", "I need a routine", "create a program"), detect this intent and offer to build a personalized plan
- For plan requests, be encouraging and explain what you'll create
- Keep responses conversational and supportive
- Don't be overly formal - sound like a knowledgeable fitness coach

If you detect a plan creation request, respond with enthusiasm and explain you can build a personalized plan for their goals.`,

  PLAN_CONFIRM: `You are confirming whether to create a workout plan. Be clear about what you'll do:

1. Explain you'll collect their fitness info
2. Generate a personalized workout plan  
3. Add it to their app calendar
4. Be encouraging about the process

Keep the tone supportive and professional.`,

  PLAN_INFO_GATHER: `You are collecting workout plan information. Be efficient but friendly.

Collect this info step by step:
- Fitness goal (fat loss, muscle gain, strength, general fitness)
- Experience level (beginner, intermediate, advanced) 
- Schedule (days per week 2-6, which days)
- Session length (30, 45, 60, or 90 minutes)
- Equipment available
- Injuries or limitations
- Training preferences

Ask 1-2 questions at a time. Be encouraging and explain why you need each piece of info.`,

  PLAN_BUILDING: `You are generating a workout plan. Stay encouraging while working.`,

  PLAN_PERSISTING: `You are saving the workout plan. Keep the user informed of progress.`,

  PLAN_EXPLAINED: `You have successfully created and saved a workout plan. Now explain how to use it:

1. Overview of their plan structure
2. How to progress (add weight, reps, etc.)
3. Warm-up recommendations
4. How to modify if needed
5. General tips for success

Be encouraging and emphasize they can always ask questions.`
};

// Intent detection patterns
const PLAN_INTENT_PATTERNS = [
  /create.*plan/i,
  /make.*plan/i,
  /build.*routine/i,
  /workout.*plan/i,
  /training.*program/i,
  /need.*routine/i,
  /design.*workout/i,
  /custom.*plan/i,
  /personalized.*routine/i,
  /program.*for.*me/i,
  /\b(ppl|push.*pull.*legs)\b/i,
  /upper.*lower/i,
  /full.*body/i,
  /split.*routine/i,
];

const STOP_PLAN_INTENT_PATTERNS = [
  /stop.*plan/i,
  /cancel.*plan/i,
  /stop.*building/i,
  /cancel.*building/i,
  /quit.*plan/i,
  /abort.*plan/i,
  /stop.*this/i,
  /cancel.*this/i,
  /never.*mind/i,
  /forget.*it/i,
  /don't.*want.*plan/i,
  /stop.*creating/i,
  /cancel.*creation/i,
];

class AIService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAI API key not found. AI features will be disabled.');
    }
  }

  // Main method to process user messages
  async processMessage(
    message: string,
    currentState: ConversationState,
    conversationHistory: ChatMessage[],
    userPlanInfo: UserPlanInfo
  ): Promise<AIServiceResponse> {
    try {
      // Detect intent if in IDLE state
      if (currentState === 'IDLE' && this.detectPlanIntent(message)) {
        return this.handlePlanIntentDetected();
      }

      // Detect stop intent during plan creation states
      if (['PLAN_CONFIRM', 'PLAN_INFO_GATHER', 'PLAN_BUILDING'].includes(currentState) && this.detectStopPlanIntent(message)) {
        return this.handleStopPlanIntentDetected();
      }

      // Handle different conversation states
      switch (currentState) {
        case 'IDLE':
          return await this.handleIdleChat(message, conversationHistory);
          
        case 'PLAN_CONFIRM':
          return this.handlePlanConfirmation(message);
          
        case 'PLAN_INFO_GATHER':
          return await this.handleInfoGathering(message, userPlanInfo);
          
        case 'PLAN_BUILDING':
          return await this.handlePlanBuilding(userPlanInfo);
          
        case 'PLAN_EXPLAINED':
          return await this.handlePostPlanQuestions(message, userPlanInfo);
          
        case 'STOP_PLAN_CONFIRM':
          return this.handleStopPlanConfirmation(message);
          
        default:
          return await this.handleIdleChat(message, conversationHistory);
      }
    } catch (error) {
      console.error('AI Service Error:', error);
      return this.getErrorResponse();
    }
  }

  // Detect if user wants to create a workout plan
  private detectPlanIntent(message: string): boolean {
    return PLAN_INTENT_PATTERNS.some(pattern => pattern.test(message));
  }

  // Detect if user wants to stop creating a workout plan
  private detectStopPlanIntent(message: string): boolean {
    return STOP_PLAN_INTENT_PATTERNS.some(pattern => pattern.test(message));
  }

  // Handle plan intent detection
  private handlePlanIntentDetected(): AIServiceResponse {
    return {
      content: "I'd love to help you create a personalized workout plan! I can design a program tailored to your goals, schedule, and available equipment, then add it directly to your app calendar.\n\nWould you like me to create a custom plan for you?",
      newState: 'PLAN_CONFIRM',
      quickReplies: [
        { id: 'confirm_yes', text: 'Yes, build it!', action: 'CONFIRM_PLAN' },
        { id: 'confirm_no', text: 'Just give advice', action: 'DECLINE_PLAN' }
      ]
    };
  }

  // Handle stop plan intent detection
  private handleStopPlanIntentDetected(): AIServiceResponse {
    return {
      content: "I understand you'd like to stop creating the workout plan. Are you sure you want to cancel the plan creation process?\n\nI can return to general fitness advice instead.",
      newState: 'STOP_PLAN_CONFIRM',
      quickReplies: [
        { id: 'stop_yes', text: 'Yes, stop building', action: 'CONFIRM_STOP' },
        { id: 'stop_no', text: 'Continue with plan', action: 'DECLINE_STOP' }
      ]
    };
  }

  // Handle plan confirmation response
  private handlePlanConfirmation(message: string): AIServiceResponse {
    const isConfirming = /yes|build|create|go|sure|okay|ok/i.test(message);
    
    if (isConfirming) {
      return {
        content: "Perfect! Let's build your personalized plan. I'll need to ask you a few questions to create the best program for you.\n\nFirst, what's your main fitness goal?",
        newState: 'PLAN_INFO_GATHER',
        quickReplies: [
          { id: 'goal_muscle', text: 'Build Muscle', action: 'SET_GOAL', data: 'muscle gain' },
          { id: 'goal_strength', text: 'Get Stronger', action: 'SET_GOAL', data: 'strength' },
          { id: 'goal_fat_loss', text: 'Lose Fat', action: 'SET_GOAL', data: 'fat loss' },
          { id: 'goal_general', text: 'General Fitness', action: 'SET_GOAL', data: 'general fitness' }
        ]
      };
    } else {
      return {
        content: "No problem! I'm here to help with any fitness questions you have. Feel free to ask about exercises, nutrition, training tips, or anything else fitness-related.",
        newState: 'IDLE'
      };
    }
  }

  // Handle stop plan confirmation response
  private handleStopPlanConfirmation(message: string): AIServiceResponse {
    const isConfirmingStop = /yes|stop|cancel|quit|abort/i.test(message);
    
    if (isConfirmingStop) {
      return {
        content: "No problem! I've cancelled the workout plan creation. I'm here whenever you want to chat about fitness, ask questions, or if you change your mind about creating a plan later.",
        newState: 'IDLE',
        userInfoUpdates: {
          // Clear any collected plan info
          goal: undefined,
          experience: undefined,
          daysPerWeek: undefined,
          sessionLength: undefined,
          equipment: undefined,
          constraints: undefined,
          preferences: undefined,
        }
      };
    } else {
      return {
        content: "Great! Let's continue building your workout plan. Where were we...",
        newState: 'PLAN_INFO_GATHER'
      };
    }
  }

  // Handle information gathering process
  private async handleInfoGathering(message: string, userPlanInfo: UserPlanInfo): Promise<AIServiceResponse> {
    // Determine what info we still need
    const missingInfo = this.getMissingPlanInfo(userPlanInfo);
    
    if (missingInfo.length === 0) {
      // We have all the info, move to plan building
      return {
        content: "Perfect! I have everything I need. Let me create your personalized workout plan now...",
        newState: 'PLAN_BUILDING'
      };
    }

    // Ask for the next piece of information
    const nextInfo = missingInfo[0];
    return await this.askForSpecificInfo(nextInfo, message, userPlanInfo);
  }

  // Generate workout plan
  private async handlePlanBuilding(userPlanInfo: UserPlanInfo): Promise<AIServiceResponse> {
    try {
      const planData = await this.generateWorkoutPlan(userPlanInfo);
      
      return {
        content: `Great! I've created your ${planData.plan.name}. This ${planData.plan.length_weeks}-week program will help you achieve your ${userPlanInfo.goal} goals with ${planData.plan.days_per_week} workouts per week.\n\nTake a look at your plan and let me know if you'd like any adjustments!`,
        newState: 'PLAN_PERSISTING',
        planData
      };
    } catch (error) {
      console.error('Plan generation error:', error);
      return {
        content: "I encountered an issue creating your plan. Let me try again with a simplified approach.",
        newState: 'PLAN_INFO_GATHER'
      };
    }
  }

  // Handle general fitness chat
  private async handleIdleChat(message: string, conversationHistory: ChatMessage[]): Promise<AIServiceResponse> {
    const response = await this.callOpenAI(
      SYSTEM_PROMPTS.IDLE,
      message,
      conversationHistory
    );

    return {
      content: response
    };
  }

  // Handle post-plan questions
  private async handlePostPlanQuestions(message: string, userPlanInfo: UserPlanInfo): Promise<AIServiceResponse> {
    const response = await this.callOpenAI(
      SYSTEM_PROMPTS.PLAN_EXPLAINED + `\n\nUser's plan context: ${JSON.stringify(userPlanInfo)}`,
      message,
      []
    );

    return {
      content: response
    };
  }

  // Ask for specific information with appropriate quick replies
  private async askForSpecificInfo(
    infoType: string,
    userMessage: string,
    userPlanInfo: UserPlanInfo
  ): Promise<AIServiceResponse> {
    switch (infoType) {
      case 'goal':
        return {
          content: "What's your main fitness goal?",
          quickReplies: [
            { id: 'goal_muscle', text: 'Build Muscle', action: 'SET_GOAL', data: 'muscle gain' },
            { id: 'goal_strength', text: 'Get Stronger', action: 'SET_GOAL', data: 'strength' },
            { id: 'goal_fat_loss', text: 'Lose Fat', action: 'SET_GOAL', data: 'fat loss' },
            { id: 'goal_general', text: 'General Fitness', action: 'SET_GOAL', data: 'general fitness' }
          ]
        };

      case 'experience':
        return {
          content: "What's your experience level with resistance training?",
          quickReplies: [
            { id: 'exp_beginner', text: 'Beginner', action: 'SET_EXPERIENCE', data: 'beginner' },
            { id: 'exp_intermediate', text: 'Intermediate', action: 'SET_EXPERIENCE', data: 'intermediate' },
            { id: 'exp_advanced', text: 'Advanced', action: 'SET_EXPERIENCE', data: 'advanced' }
          ]
        };

      case 'daysPerWeek':
        return {
          content: "How many days per week can you work out?",
          quickReplies: [
            { id: 'days_2', text: '2 days', action: 'SET_DAYS', data: 2 },
            { id: 'days_3', text: '3 days', action: 'SET_DAYS', data: 3 },
            { id: 'days_4', text: '4 days', action: 'SET_DAYS', data: 4 },
            { id: 'days_5', text: '5 days', action: 'SET_DAYS', data: 5 },
            { id: 'days_6', text: '6 days', action: 'SET_DAYS', data: 6 }
          ]
        };

      case 'sessionLength':
        return {
          content: "How long do you want each workout session to be?",
          quickReplies: [
            { id: 'time_30', text: '30 min', action: 'SET_SESSION_LENGTH', data: 30 },
            { id: 'time_45', text: '45 min', action: 'SET_SESSION_LENGTH', data: 45 },
            { id: 'time_60', text: '60 min', action: 'SET_SESSION_LENGTH', data: 60 },
            { id: 'time_90', text: '90 min', action: 'SET_SESSION_LENGTH', data: 90 }
          ]
        };

      case 'equipment':
        return {
          content: "What equipment do you have access to?",
          quickReplies: [
            { id: 'eq_gym', text: 'Full Gym', action: 'SET_EQUIPMENT', data: ['gym', 'barbell', 'dumbbells', 'machines'] },
            { id: 'eq_home_db', text: 'Home + Dumbbells', action: 'SET_EQUIPMENT', data: ['dumbbells', 'bodyweight'] },
            { id: 'eq_bodyweight', text: 'Bodyweight Only', action: 'SET_EQUIPMENT', data: ['bodyweight'] },
            { id: 'eq_bands', text: 'Bands + Bodyweight', action: 'SET_EQUIPMENT', data: ['bands', 'bodyweight'] }
          ]
        };

      default:
        return {
          content: "Let me know if you have any injuries or movements you'd like to avoid (or just say 'none'):",
        };
    }
  }

  // Determine what information is still missing
  private getMissingPlanInfo(userPlanInfo: UserPlanInfo): string[] {
    const missing: string[] = [];
    
    if (!userPlanInfo.goal) missing.push('goal');
    if (!userPlanInfo.experience) missing.push('experience');
    if (!userPlanInfo.daysPerWeek) missing.push('daysPerWeek');
    if (!userPlanInfo.sessionLength) missing.push('sessionLength');
    if (!userPlanInfo.equipment || userPlanInfo.equipment.length === 0) missing.push('equipment');
    
    return missing;
  }

  // Generate workout plan using AI
  private async generateWorkoutPlan(userPlanInfo: UserPlanInfo): Promise<WorkoutPlan> {
    const planPrompt = this.buildPlanGenerationPrompt(userPlanInfo);
    
    try {
      const response = await this.callOpenAI(
        `You are a professional workout plan generator. Generate a detailed workout plan in JSON format.`,
        planPrompt,
        []
      );

      // Try to parse JSON from the response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response;
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Plan generation parsing error:', error);
      // Return a fallback plan
      return this.generateFallbackPlan(userPlanInfo);
    }
  }

  // Build prompt for plan generation
  private buildPlanGenerationPrompt(userPlanInfo: UserPlanInfo): string {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + ((1 + 7 - startDate.getDay()) % 7)); // Next Monday
    
    return `Generate a workout plan with these specifications:

User Info:
- Goal: ${userPlanInfo.goal}
- Experience: ${userPlanInfo.experience}
- Days per week: ${userPlanInfo.daysPerWeek}
- Session length: ${userPlanInfo.sessionLength} minutes
- Equipment: ${userPlanInfo.equipment?.join(', ')}
- Constraints: ${userPlanInfo.constraints?.join(', ') || 'none'}

Requirements:
- Return ONLY valid JSON matching this exact schema
- Start date: ${startDate.toISOString().split('T')[0]}
- Plan length: 8 weeks
- Include proper exercise progression
- Include rest times for each exercise
- Assign specific calendar dates

\`\`\`json
{
  "plan": {
    "name": "Plan Name",
    "start_date": "${startDate.toISOString().split('T')[0]}",
    "length_weeks": 8,
    "days_per_week": ${userPlanInfo.daysPerWeek},
    "progression_model": "Progression description",
    "notes": "Important notes"
  },
  "workouts": [
    {
      "day_of_week": "Mon",
      "title": "Workout Name",
      "estimated_minutes": ${userPlanInfo.sessionLength},
      "exercises": [
        {
          "name": "Exercise Name",
          "sets": 3,
          "reps": "8-12",
          "rest_seconds": 90,
          "notes": "Exercise notes"
        }
      ]
    }
  ],
  "calendar_assignments": [
    {"date": "2025-01-06", "workout_title": "Workout Name"}
  ]
}
\`\`\``;
  }

  // Call OpenAI API with retry logic
  private async callOpenAI(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ];

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages,
            max_tokens: 1500,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'I apologize, but I encountered an error processing your request.';
      } catch (error) {
        console.error(`OpenAI API attempt ${attempt + 1} failed:`, error);
        
        if (attempt === MAX_RETRIES - 1) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
      }
    }

    throw new Error('Max retries exceeded');
  }

  // Generate a fallback plan if AI generation fails
  private generateFallbackPlan(userPlanInfo: UserPlanInfo): WorkoutPlan {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + ((1 + 7 - startDate.getDay()) % 7));
    
    const isBodyweight = userPlanInfo.equipment?.includes('bodyweight') && !userPlanInfo.equipment.includes('gym');
    
    return {
      plan: {
        name: `${userPlanInfo.daysPerWeek}-Day ${userPlanInfo.goal === 'muscle gain' ? 'Hypertrophy' : 'Fitness'} Plan`,
        start_date: startDate.toISOString().split('T')[0],
        length_weeks: 8,
        days_per_week: userPlanInfo.daysPerWeek || 3,
        progression_model: "Increase reps by 1-2 each week, or add resistance when you can complete the maximum reps",
        notes: "Start conservatively and focus on proper form. Rest 48 hours between sessions."
      },
      workouts: [
        {
          day_of_week: "Mon",
          title: "Full Body A",
          estimated_minutes: userPlanInfo.sessionLength || 45,
          exercises: isBodyweight ? [
            { name: "Push-ups", sets: 3, reps: "8-15", rest_seconds: 90 },
            { name: "Bodyweight Squats", sets: 3, reps: "12-20", rest_seconds: 90 },
            { name: "Pike Push-ups", sets: 3, reps: "5-12", rest_seconds: 90 },
            { name: "Lunges", sets: 3, reps: "10-16 each leg", rest_seconds: 90 },
            { name: "Plank", sets: 3, reps: "30-60 seconds", rest_seconds: 60 }
          ] : [
            { name: "Goblet Squats", sets: 3, reps: "8-12", rest_seconds: 90 },
            { name: "Dumbbell Press", sets: 3, reps: "8-12", rest_seconds: 90 },
            { name: "Dumbbell Rows", sets: 3, reps: "8-12", rest_seconds: 90 },
            { name: "Romanian Deadlift", sets: 3, reps: "8-12", rest_seconds: 90 }
          ]
        }
      ],
      calendar_assignments: [
        { date: startDate.toISOString().split('T')[0], workout_title: "Full Body A" }
      ]
    };
  }

  // Error response
  private getErrorResponse(): AIServiceResponse {
    return {
      content: "I'm experiencing some technical difficulties right now. Please try again in a moment, or feel free to ask me any fitness questions!"
    };
  }
}

export default new AIService();
export type { AIServiceResponse, QuickReply };
