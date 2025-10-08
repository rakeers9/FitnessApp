import { supabase } from '../supabase';

export interface UserContext {
  userId: string;
  profile: {
    name: string;
    age: number;
    gender?: string;
    height?: number;
    weight?: number;
    fitnessLevel: string;
    trainingStyle: string;
    persona: string;
    onboardingComplete: boolean;
  };
  goals: {
    primary: {
      id: string;
      type: string;
      target_value: any;
      target_date: string;
      priority: number;
    }[];
    secondary: any[];
  };
  preferences: {
    workout_duration: number;
    workout_frequency: number;
    preferred_times: string[];
    equipment_available: string[];
    restrictions: string[];
  };
  history: {
    total_workouts: number;
    current_streak: number;
    last_workout_date: string;
    average_session_duration: number;
  };
}

export interface WorkoutContext {
  currentPlan: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    weeks_completed: number;
    total_weeks: number;
    adherence_rate: number;
  };
  todaysWorkout: {
    id: string;
    name: string;
    scheduled_time: string;
    duration_minutes: number;
    muscle_groups: string[];
    exercises: any[];
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  };
  recentWorkouts: {
    date: string;
    name: string;
    duration: number;
    muscle_groups: string[];
    performance_score: number;
  }[];
  upcomingWorkouts: any[];
  muscleGroupRecovery: {
    [key: string]: {
      last_trained: string;
      recovery_status: 'fresh' | 'recovered' | 'fatigued' | 'overworked';
      recommended_rest_days: number;
    };
  };
}

export interface HealthContext {
  readiness: {
    overall_score: number;
    sleep_score: number;
    recovery_score: number;
    strain_score: number;
    hrv_trend: 'improving' | 'stable' | 'declining';
    recommendation: 'full_intensity' | 'moderate' | 'recovery' | 'rest';
  };
  sleep: {
    last_night_hours: number;
    quality_score: number;
    debt_hours: number;
    weekly_average: number;
  };
  metrics: {
    resting_hr: number;
    hrv: number;
    steps_today: number;
    calories_burned: number;
    active_minutes: number;
  };
  stress: {
    level: 'low' | 'moderate' | 'high';
    recovery_needed: boolean;
  };
  injuries: {
    active: any[];
    recovering: any[];
  };
}

export interface GoalContext {
  primary_goal: {
    type: string;
    current_progress: number;
    target: any;
    projected_completion: string;
    on_track: boolean;
    required_adjustments: string[];
  };
  milestones: {
    upcoming: any[];
    completed: any[];
  };
  performance_trends: {
    strength: 'increasing' | 'maintaining' | 'decreasing';
    endurance: 'increasing' | 'maintaining' | 'decreasing';
    consistency: 'increasing' | 'maintaining' | 'decreasing';
  };
  recommendations: string[];
}

export interface CompleteContext {
  user: UserContext;
  workout: WorkoutContext;
  health: HealthContext;
  goals: GoalContext;
  timestamp: string;
  cached: boolean;
}

class ContextManager {
  private cache: Map<string, { context: CompleteContext; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getCompleteContext(userId: string, forceRefresh = false): Promise<CompleteContext> {
    const cacheKey = userId;
    const cached = this.cache.get(cacheKey);

    if (!forceRefresh && cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return { ...cached.context, cached: true };
    }

    const [userContext, workoutContext, healthContext, goalContext] = await Promise.all([
      this.getUserContext(userId),
      this.getWorkoutContext(userId),
      this.getHealthContext(userId),
      this.getGoalContext(userId),
    ]);

    const completeContext: CompleteContext = {
      user: userContext,
      workout: workoutContext,
      health: healthContext,
      goals: goalContext,
      timestamp: new Date().toISOString(),
      cached: false,
    };

    this.cache.set(cacheKey, {
      context: completeContext,
      timestamp: Date.now(),
    });

    await this.saveContextToDatabase(userId, completeContext);

    return completeContext;
  }

  private async getUserContext(userId: string): Promise<UserContext> {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: goals } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: true });

    const { data: workoutStats } = await supabase
      .from('workout_sessions')
      .select('id, created_at, duration_minutes')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const totalWorkouts = workoutStats?.length || 0;
    const lastWorkout = workoutStats?.[0];
    const avgDuration = workoutStats?.length
      ? workoutStats.reduce((acc, w) => acc + (w.duration_minutes || 0), 0) / workoutStats.length
      : 0;

    return {
      userId,
      profile: {
        name: profile?.name || '',
        age: profile?.age || 0,
        gender: profile?.gender,
        height: profile?.height_cm,
        weight: profile?.current_weight_kg,
        fitnessLevel: profile?.fitness_level || 'intermediate',
        trainingStyle: profile?.training_style || 'balanced',
        persona: profile?.selected_persona || 'calm',
        onboardingComplete: profile?.onboarding_complete || false,
      },
      goals: {
        primary: goals?.filter(g => g.priority <= 3) || [],
        secondary: goals?.filter(g => g.priority > 3) || [],
      },
      preferences: {
        workout_duration: profile?.workout_duration || 60,
        workout_frequency: profile?.workout_frequency || 4,
        preferred_times: profile?.preferred_workout_times || [],
        equipment_available: profile?.available_equipment || [],
        restrictions: profile?.injuries || [],
      },
      history: {
        total_workouts: totalWorkouts,
        current_streak: this.calculateStreak(workoutStats || []),
        last_workout_date: lastWorkout?.created_at || '',
        average_session_duration: Math.round(avgDuration),
      },
    };
  }

  private async getWorkoutContext(userId: string): Promise<WorkoutContext> {
    const { data: currentPlan } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    const today = new Date().toISOString().split('T')[0];
    const { data: todaysWorkout } = await supabase
      .from('scheduled_workouts')
      .select(`
        *,
        workout_templates (
          name,
          muscle_groups,
          duration_minutes
        )
      `)
      .eq('user_id', userId)
      .eq('scheduled_date', today)
      .single();

    const { data: recentWorkouts } = await supabase
      .from('workout_sessions')
      .select(`
        *,
        session_exercises (
          exercise_id,
          sets_completed
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(7);

    const muscleGroupRecovery = await this.calculateMuscleGroupRecovery(userId, recentWorkouts || []);

    return {
      currentPlan: currentPlan ? {
        id: currentPlan.id,
        name: currentPlan.name,
        start_date: currentPlan.start_date,
        end_date: currentPlan.end_date,
        weeks_completed: this.calculateWeeksCompleted(currentPlan.start_date),
        total_weeks: currentPlan.total_weeks,
        adherence_rate: await this.calculateAdherenceRate(userId, currentPlan.id),
      } : null as any,
      todaysWorkout: todaysWorkout ? {
        id: todaysWorkout.id,
        name: todaysWorkout.workout_templates?.name || '',
        scheduled_time: todaysWorkout.scheduled_time,
        duration_minutes: todaysWorkout.workout_templates?.duration_minutes || 60,
        muscle_groups: todaysWorkout.workout_templates?.muscle_groups || [],
        exercises: [],
        status: todaysWorkout.completion_status || 'pending',
      } : null as any,
      recentWorkouts: (recentWorkouts || []).map(w => ({
        date: w.created_at,
        name: w.name || '',
        duration: w.duration_minutes || 0,
        muscle_groups: w.muscle_groups || [],
        performance_score: w.performance_score || 0,
      })),
      upcomingWorkouts: [],
      muscleGroupRecovery,
    };
  }

  private async getHealthContext(userId: string): Promise<HealthContext> {
    const { data: readiness } = await supabase
      .from('daily_readiness_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('date', new Date().toISOString().split('T')[0])
      .single();

    const { data: healthMetrics } = await supabase
      .from('user_health_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(7);

    const latestMetrics = healthMetrics?.[0];
    const avgSleep = healthMetrics?.reduce((acc, m) => acc + (m.sleep_hours || 0), 0) / (healthMetrics?.length || 1);

    return {
      readiness: {
        overall_score: readiness?.overall_score || 75,
        sleep_score: readiness?.sleep_score || 75,
        recovery_score: readiness?.recovery_score || 75,
        strain_score: readiness?.strain_balance_score || 75,
        hrv_trend: this.calculateHRVTrend(healthMetrics || []),
        recommendation: this.getReadinessRecommendation(readiness?.overall_score || 75),
      },
      sleep: {
        last_night_hours: latestMetrics?.sleep_hours || 7,
        quality_score: latestMetrics?.sleep_quality || 75,
        debt_hours: Math.max(0, 56 - (avgSleep * 7)), // Weekly target of 56 hours
        weekly_average: avgSleep,
      },
      metrics: {
        resting_hr: latestMetrics?.resting_hr || 60,
        hrv: latestMetrics?.hrv || 50,
        steps_today: latestMetrics?.steps || 0,
        calories_burned: latestMetrics?.calories_burned || 0,
        active_minutes: latestMetrics?.active_minutes || 0,
      },
      stress: {
        level: this.calculateStressLevel(latestMetrics),
        recovery_needed: (readiness?.overall_score || 75) < 60,
      },
      injuries: {
        active: [],
        recovering: [],
      },
    };
  }

  private async getGoalContext(userId: string): Promise<GoalContext> {
    const { data: goals } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .limit(1);

    const primaryGoal = goals?.[0];
    if (!primaryGoal) {
      return {
        primary_goal: null as any,
        milestones: { upcoming: [], completed: [] },
        performance_trends: {
          strength: 'maintaining',
          endurance: 'maintaining',
          consistency: 'maintaining',
        },
        recommendations: [],
      };
    }

    const { data: metrics } = await supabase
      .from('performance_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_id', primaryGoal.id)
      .order('recorded_at', { ascending: false })
      .limit(30);

    return {
      primary_goal: {
        type: primaryGoal.goal_type,
        current_progress: primaryGoal.current_value || 0,
        target: primaryGoal.target_value,
        projected_completion: this.projectCompletion(primaryGoal, metrics || []),
        on_track: this.isOnTrack(primaryGoal, metrics || []),
        required_adjustments: this.getRequiredAdjustments(primaryGoal, metrics || []),
      },
      milestones: {
        upcoming: [],
        completed: [],
      },
      performance_trends: this.calculatePerformanceTrends(metrics || []),
      recommendations: this.generateRecommendations(primaryGoal, metrics || []),
    };
  }

  private calculateStreak(workouts: any[]): number {
    if (!workouts.length) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < workouts.length; i++) {
      const workoutDate = new Date(workouts[i].created_at);
      workoutDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private calculateWeeksCompleted(startDate: string): number {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks;
  }

  private async calculateAdherenceRate(userId: string, planId: string): Promise<number> {
    const { data: scheduled } = await supabase
      .from('scheduled_workouts')
      .select('id')
      .eq('user_id', userId)
      .eq('workout_plan_id', planId)
      .lte('scheduled_date', new Date().toISOString());

    const { data: completed } = await supabase
      .from('scheduled_workouts')
      .select('id')
      .eq('user_id', userId)
      .eq('workout_plan_id', planId)
      .eq('completion_status', 'completed')
      .lte('scheduled_date', new Date().toISOString());

    const total = scheduled?.length || 0;
    const done = completed?.length || 0;

    return total > 0 ? Math.round((done / total) * 100) : 100;
  }

  private async calculateMuscleGroupRecovery(userId: string, recentWorkouts: any[]): Promise<any> {
    const recovery: any = {};
    const muscleGroups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];

    for (const group of muscleGroups) {
      const lastWorkout = recentWorkouts.find(w =>
        w.muscle_groups?.includes(group)
      );

      if (lastWorkout) {
        const daysSince = Math.floor(
          (Date.now() - new Date(lastWorkout.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        recovery[group] = {
          last_trained: lastWorkout.created_at,
          recovery_status: this.getRecoveryStatus(daysSince, group),
          recommended_rest_days: this.getRecommendedRestDays(group) - daysSince,
        };
      } else {
        recovery[group] = {
          last_trained: null,
          recovery_status: 'fresh',
          recommended_rest_days: 0,
        };
      }
    }

    return recovery;
  }

  private getRecoveryStatus(daysSince: number, muscleGroup: string): string {
    const restDays = this.getRecommendedRestDays(muscleGroup);

    if (daysSince < 1) return 'fatigued';
    if (daysSince < restDays) return 'recovering';
    if (daysSince < restDays + 2) return 'recovered';
    return 'fresh';
  }

  private getRecommendedRestDays(muscleGroup: string): number {
    const restDays: any = {
      legs: 3,
      back: 2,
      chest: 2,
      shoulders: 2,
      arms: 1,
      core: 1,
    };
    return restDays[muscleGroup] || 2;
  }

  private calculateHRVTrend(metrics: any[]): 'improving' | 'stable' | 'declining' {
    if (metrics.length < 3) return 'stable';

    const recent = metrics.slice(0, 3).map(m => m.hrv || 50);
    const older = metrics.slice(3, 6).map(m => m.hrv || 50);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    if (recentAvg > olderAvg * 1.05) return 'improving';
    if (recentAvg < olderAvg * 0.95) return 'declining';
    return 'stable';
  }

  private getReadinessRecommendation(score: number): string {
    if (score >= 80) return 'full_intensity';
    if (score >= 60) return 'moderate';
    if (score >= 40) return 'recovery';
    return 'rest';
  }

  private calculateStressLevel(metrics: any): 'low' | 'moderate' | 'high' {
    if (!metrics) return 'moderate';

    const hrv = metrics.hrv || 50;
    const restingHR = metrics.resting_hr || 60;

    if (hrv > 60 && restingHR < 60) return 'low';
    if (hrv < 40 || restingHR > 75) return 'high';
    return 'moderate';
  }

  private projectCompletion(goal: any, metrics: any[]): string {
    if (!metrics.length) return 'Unable to project';

    const progressRate = this.calculateProgressRate(goal, metrics);
    const remaining = goal.target_value - (goal.current_value || 0);
    const daysToComplete = remaining / progressRate;

    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + daysToComplete);

    return completionDate.toISOString().split('T')[0];
  }

  private calculateProgressRate(goal: any, metrics: any[]): number {
    if (metrics.length < 2) return 0.1;

    const firstMetric = metrics[metrics.length - 1];
    const lastMetric = metrics[0];
    const daysDiff = Math.max(1,
      Math.floor((new Date(lastMetric.recorded_at).getTime() -
                  new Date(firstMetric.recorded_at).getTime()) / (1000 * 60 * 60 * 24))
    );

    const progress = (lastMetric.value || 0) - (firstMetric.value || 0);
    return progress / daysDiff;
  }

  private isOnTrack(goal: any, metrics: any[]): boolean {
    const targetDate = new Date(goal.target_date);
    const today = new Date();
    const totalDays = Math.floor((targetDate.getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.floor((today.getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24));

    const expectedProgress = (goal.target_value - goal.starting_value) * (daysElapsed / totalDays);
    const actualProgress = (goal.current_value || goal.starting_value) - goal.starting_value;

    return actualProgress >= expectedProgress * 0.9;
  }

  private getRequiredAdjustments(goal: any, metrics: any[]): string[] {
    const adjustments = [];

    if (!this.isOnTrack(goal, metrics)) {
      adjustments.push('Increase workout frequency or intensity');
    }

    const progressRate = this.calculateProgressRate(goal, metrics);
    if (progressRate < 0.1) {
      adjustments.push('Progressive overload needed');
    }

    return adjustments;
  }

  private calculatePerformanceTrends(metrics: any[]): any {
    return {
      strength: 'maintaining',
      endurance: 'maintaining',
      consistency: 'maintaining',
    };
  }

  private generateRecommendations(goal: any, metrics: any[]): string[] {
    const recommendations = [];

    if (!this.isOnTrack(goal, metrics)) {
      recommendations.push(`Increase focus on ${goal.goal_type} to meet target`);
    }

    return recommendations;
  }

  private async saveContextToDatabase(userId: string, context: CompleteContext): Promise<void> {
    try {
      await supabase
        .from('ai_context_cache')
        .upsert({
          user_id: userId,
          context_type: 'complete',
          context_data: context,
          computed_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error saving context to database:', error);
    }
  }

  async invalidateCache(userId: string): Promise<void> {
    this.cache.delete(userId);
  }

  async preloadContext(userId: string): Promise<void> {
    await this.getCompleteContext(userId, true);
  }
}

export const contextManager = new ContextManager();