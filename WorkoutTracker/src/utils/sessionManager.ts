import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';

const SESSION_KEY = '@workout_tracker_session_id';
const SESSION_DATA_KEY = '@workout_tracker_session_data';

interface SessionData {
  sessionId: string;
  createdAt: string;
  lastActive: string;
  currentStep: number;
  completedSteps: number[];
  answers: Record<string, any>;
  personaId?: string;
}

export class SessionManager {
  private static instance: SessionManager;
  private sessionData: SessionData | null = null;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async initializeSession(): Promise<string> {
    try {
      // Check for existing session
      const existingSessionId = await AsyncStorage.getItem(SESSION_KEY);
      const existingData = await AsyncStorage.getItem(SESSION_DATA_KEY);

      if (existingSessionId && existingData) {
        this.sessionData = JSON.parse(existingData);

        // Update last active
        this.sessionData.lastActive = new Date().toISOString();
        await this.saveSession();

        // Sync with database
        await this.syncWithDatabase();

        return existingSessionId;
      }

      // Create new session
      const sessionId = uuidv4();
      this.sessionData = {
        sessionId,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        currentStep: 1,
        completedSteps: [],
        answers: {},
      };

      await AsyncStorage.setItem(SESSION_KEY, sessionId);
      await AsyncStorage.setItem(SESSION_DATA_KEY, JSON.stringify(this.sessionData));

      // Create database entry
      await this.createDatabaseSession();

      return sessionId;
    } catch (error) {
      console.error('Failed to initialize session:', error);
      throw error;
    }
  }

  async getSessionId(): Promise<string | null> {
    return AsyncStorage.getItem(SESSION_KEY);
  }

  async getSessionData(): Promise<SessionData | null> {
    if (this.sessionData) {
      return this.sessionData;
    }

    const data = await AsyncStorage.getItem(SESSION_DATA_KEY);
    if (data) {
      this.sessionData = JSON.parse(data);
      return this.sessionData;
    }

    return null;
  }

  async updateSessionData(updates: Partial<SessionData>): Promise<void> {
    if (!this.sessionData) {
      throw new Error('No active session');
    }

    this.sessionData = {
      ...this.sessionData,
      ...updates,
      lastActive: new Date().toISOString(),
    };

    await this.saveSession();
    await this.syncWithDatabase();
  }

  async saveAnswer(key: string, value: any): Promise<void> {
    if (!this.sessionData) {
      throw new Error('No active session');
    }

    this.sessionData.answers[key] = value;
    await this.saveSession();
    await this.syncWithDatabase();
  }

  async markStepCompleted(stepNumber: number): Promise<void> {
    if (!this.sessionData) {
      throw new Error('No active session');
    }

    if (!this.sessionData.completedSteps.includes(stepNumber)) {
      this.sessionData.completedSteps.push(stepNumber);
    }

    this.sessionData.currentStep = stepNumber + 1;
    await this.saveSession();
    await this.syncWithDatabase();
  }

  async setPersona(personaId: string): Promise<void> {
    if (!this.sessionData) {
      throw new Error('No active session');
    }

    this.sessionData.personaId = personaId;
    await this.saveSession();
    await this.syncWithDatabase();
  }

  async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      await AsyncStorage.removeItem(SESSION_DATA_KEY);
      this.sessionData = null;
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  async convertSessionToUser(userId: string): Promise<void> {
    if (!this.sessionData) {
      throw new Error('No active session');
    }

    try {
      // Update onboarding session with user_id
      const { error: sessionError } = await supabase
        .from('onboarding_sessions')
        .update({
          user_id: userId,
          completed_at: new Date().toISOString(),
        })
        .eq('session_id', this.sessionData.sessionId);

      if (sessionError) {
        console.error('Failed to link session to user:', sessionError);
      }

      // Convert temp workout plan if exists
      const { data: tempPlan, error: planError } = await supabase
        .from('temp_workout_plans')
        .select('*')
        .eq('session_id', this.sessionData.sessionId)
        .single();

      if (tempPlan && !planError) {
        // Create permanent workout plan
        const { error: createError } = await supabase
          .from('ai_workout_plans')
          .insert({
            user_id: userId,
            plan_name: tempPlan.generated_plan.name || 'Personalized Workout Plan',
            plan_data: tempPlan.generated_plan,
            start_date: new Date().toISOString(),
            length_weeks: tempPlan.generated_plan.lengthWeeks || 8,
            days_per_week: tempPlan.generated_plan.daysPerWeek || 3,
            is_active: true,
          });

        if (!createError) {
          // Update temp plan with conversion
          await supabase
            .from('temp_workout_plans')
            .update({ converted_to_user_id: userId })
            .eq('id', tempPlan.id);
        }
      }

      // Clear local session after successful conversion
      await this.clearSession();
    } catch (error) {
      console.error('Failed to convert session:', error);
      throw error;
    }
  }

  private async saveSession(): Promise<void> {
    if (this.sessionData) {
      await AsyncStorage.setItem(SESSION_DATA_KEY, JSON.stringify(this.sessionData));
    }
  }

  private async createDatabaseSession(): Promise<void> {
    if (!this.sessionData) return;

    try {
      const { error } = await supabase
        .from('onboarding_sessions')
        .insert({
          session_id: this.sessionData.sessionId,
          current_step: this.sessionData.currentStep,
          completed_steps: this.sessionData.completedSteps,
          answers: this.sessionData.answers,
          persona_id: this.sessionData.personaId,
        });

      if (error) {
        console.error('Failed to create database session:', error);
      }
    } catch (error) {
      console.error('Database session creation failed:', error);
    }
  }

  private async syncWithDatabase(): Promise<void> {
    if (!this.sessionData) return;

    try {
      const { error } = await supabase
        .from('onboarding_sessions')
        .update({
          current_step: this.sessionData.currentStep,
          completed_steps: this.sessionData.completedSteps,
          answers: this.sessionData.answers,
          persona_id: this.sessionData.personaId,
          last_active_at: this.sessionData.lastActive,
        })
        .eq('session_id', this.sessionData.sessionId);

      if (error) {
        console.error('Failed to sync with database:', error);
      }
    } catch (error) {
      console.error('Database sync failed:', error);
    }
  }
}

export const sessionManager = SessionManager.getInstance();