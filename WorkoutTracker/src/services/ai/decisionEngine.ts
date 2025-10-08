import { CompleteContext } from './contextManager';
import { supabase } from '../supabase';

export interface Decision {
  type: 'workout_adjustment' | 'plan_modification' | 'rest_recommendation' | 'intensity_change' | 'exercise_swap' | 'schedule_change';
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  reasoning: string[];
  impact_on_goals: string;
  alternatives?: string[];
  confidence: number;
  requires_user_approval: boolean;
}

export interface WorkoutAdjustment {
  original_workout: any;
  adjusted_workout: any;
  changes: string[];
  reason: string;
  goal_alignment: string;
}

export class DecisionEngine {
  async makeDecision(context: CompleteContext, situation: string): Promise<Decision> {
    const readinessScore = context.health.readiness.overall_score;
    const primaryGoal = context.goals.primary_goal;
    const currentWorkout = context.workout.todaysWorkout;
    const muscleRecovery = context.workout.muscleGroupRecovery;

    const decisions: Decision[] = [];

    if (readinessScore < 60 && currentWorkout) {
      decisions.push(this.createRestOrRecoveryDecision(context));
    }

    if (readinessScore >= 60 && readinessScore < 80 && currentWorkout) {
      decisions.push(this.createModerateIntensityDecision(context));
    }

    if (!primaryGoal.on_track && readinessScore >= 80) {
      decisions.push(this.createIntensityBoostDecision(context));
    }

    const fatiguredMuscles = Object.entries(muscleRecovery)
      .filter(([_, status]) => status.recovery_status === 'fatigued' || status.recovery_status === 'overworked');

    if (fatiguredMuscles.length > 0 && currentWorkout) {
      decisions.push(this.createMuscleRecoveryDecision(context, fatiguredMuscles));
    }

    if (context.health.stress.level === 'high') {
      decisions.push(this.createStressManagementDecision(context));
    }

    const bestDecision = this.prioritizeDecisions(decisions, context);

    await this.logDecision(context.user.userId, bestDecision);

    return bestDecision;
  }

  async adjustTodaysWorkout(context: CompleteContext): Promise<WorkoutAdjustment> {
    const readiness = context.health.readiness.overall_score;
    const workout = context.workout.todaysWorkout;
    const goal = context.goals.primary_goal;

    if (!workout) {
      return this.createRestDayAdjustment(context);
    }

    let adjustment: WorkoutAdjustment = {
      original_workout: { ...workout },
      adjusted_workout: { ...workout },
      changes: [],
      reason: '',
      goal_alignment: '',
    };

    if (readiness < 40) {
      adjustment = this.convertToRestDay(workout, goal);
    } else if (readiness < 60) {
      adjustment = this.convertToRecoveryWorkout(workout, goal, context);
    } else if (readiness < 80) {
      adjustment = this.reduceIntensity(workout, goal, context);
    } else if (readiness > 90 && !goal.on_track) {
      adjustment = this.increaseIntensity(workout, goal, context);
    }

    const muscleConflicts = this.checkMuscleRecoveryConflicts(
      workout.muscle_groups,
      context.workout.muscleGroupRecovery
    );

    if (muscleConflicts.length > 0) {
      adjustment = this.swapExercisesForRecovery(adjustment.adjusted_workout, muscleConflicts, goal);
    }

    if (context.user.history.current_streak === 0 && context.user.history.total_workouts > 0) {
      adjustment = this.makeComeback Workout(adjustment.adjusted_workout, goal);
    }

    adjustment.goal_alignment = this.assessGoalAlignment(adjustment, goal);

    await this.saveAdjustment(context.user.userId, adjustment);

    return adjustment;
  }

  async suggestPlanModification(context: CompleteContext): Promise<any> {
    const plan = context.workout.currentPlan;
    const goal = context.goals.primary_goal;
    const adherence = plan?.adherence_rate || 0;

    const modifications = [];

    if (adherence < 70) {
      modifications.push({
        type: 'reduce_frequency',
        reason: 'Low adherence suggests current frequency is unsustainable',
        suggestion: 'Reduce from ' + context.user.preferences.workout_frequency + ' to ' + (context.user.preferences.workout_frequency - 1) + ' days per week',
        impact: 'More sustainable progress toward ' + goal.type,
      });
    }

    if (!goal.on_track && adherence > 85) {
      modifications.push({
        type: 'increase_intensity',
        reason: 'High adherence but slow progress suggests need for greater stimulus',
        suggestion: 'Add progressive overload or increase volume',
        impact: 'Accelerate progress toward ' + goal.type,
      });
    }

    if (context.health.readiness.hrv_trend === 'declining') {
      modifications.push({
        type: 'add_deload_week',
        reason: 'Declining HRV indicates accumulated fatigue',
        suggestion: 'Insert recovery week with 50% volume reduction',
        impact: 'Prevent overtraining while maintaining goal progress',
      });
    }

    const bestModification = modifications.sort((a, b) => {
      const priorityMap: any = {
        'add_deload_week': 3,
        'reduce_frequency': 2,
        'increase_intensity': 1,
      };
      return priorityMap[b.type] - priorityMap[a.type];
    })[0];

    if (bestModification) {
      await this.savePlanModification(context.user.userId, plan.id, bestModification);
    }

    return bestModification;
  }

  private createRestOrRecoveryDecision(context: CompleteContext): Decision {
    return {
      type: 'rest_recommendation',
      priority: 'high',
      action: 'Replace today\'s workout with active recovery or complete rest',
      reasoning: [
        `Readiness score is ${context.health.readiness.overall_score}% (below 60%)`,
        `Sleep quality: ${context.health.sleep.quality_score}%`,
        `Recovery needed for optimal progress toward ${context.goals.primary_goal.type}`,
      ],
      impact_on_goals: 'Short-term rest enables long-term progress by preventing overtraining',
      alternatives: ['Light yoga', '20-minute walk', 'Mobility work'],
      confidence: 0.95,
      requires_user_approval: true,
    };
  }

  private createModerateIntensityDecision(context: CompleteContext): Decision {
    return {
      type: 'intensity_change',
      priority: 'medium',
      action: 'Reduce workout intensity to 70-80% of planned',
      reasoning: [
        `Moderate readiness (${context.health.readiness.overall_score}%)`,
        'Maintaining consistency while allowing recovery',
        `Protecting progress toward ${context.goals.primary_goal.type}`,
      ],
      impact_on_goals: 'Maintains workout consistency while respecting recovery needs',
      confidence: 0.85,
      requires_user_approval: false,
    };
  }

  private createIntensityBoostDecision(context: CompleteContext): Decision {
    const daysToTarget = Math.floor(
      (new Date(context.goals.primary_goal.projected_completion).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return {
      type: 'intensity_change',
      priority: 'medium',
      action: 'Increase workout intensity to accelerate progress',
      reasoning: [
        `Currently off-track for ${context.goals.primary_goal.type} goal`,
        `High readiness (${context.health.readiness.overall_score}%) allows for increased effort`,
        `${daysToTarget} days to target date`,
      ],
      impact_on_goals: 'Directly accelerates progress toward primary goal',
      confidence: 0.8,
      requires_user_approval: true,
    };
  }

  private createMuscleRecoveryDecision(context: CompleteContext, fatigued: any[]): Decision {
    const muscleGroups = fatigued.map(([muscle]) => muscle).join(', ');

    return {
      type: 'exercise_swap',
      priority: 'high',
      action: `Swap exercises targeting ${muscleGroups} for alternative muscle groups`,
      reasoning: [
        `${muscleGroups} still recovering from recent training`,
        'Preventing overtraining and potential injury',
        'Maintaining workout frequency for goal progress',
      ],
      impact_on_goals: 'Maintains training consistency while optimizing recovery',
      alternatives: fatigued.map(([muscle]) => `Replace ${muscle} exercises with complementary movements`),
      confidence: 0.9,
      requires_user_approval: false,
    };
  }

  private createStressManagementDecision(context: CompleteContext): Decision {
    return {
      type: 'workout_adjustment',
      priority: 'medium',
      action: 'Modify workout to include stress-reducing elements',
      reasoning: [
        'High stress levels detected',
        'Stress impacts recovery and performance',
        'Lower intensity exercise can reduce cortisol',
      ],
      impact_on_goals: 'Supports long-term progress by managing overall stress load',
      alternatives: ['Yoga flow', 'Swimming', 'Nature walk with bodyweight exercises'],
      confidence: 0.75,
      requires_user_approval: true,
    };
  }

  private prioritizeDecisions(decisions: Decision[], context: CompleteContext): Decision {
    if (decisions.length === 0) {
      return {
        type: 'workout_adjustment',
        priority: 'low',
        action: 'Proceed with planned workout',
        reasoning: ['All systems optimal for training'],
        impact_on_goals: 'On track for goal achievement',
        confidence: 1.0,
        requires_user_approval: false,
      };
    }

    const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };

    decisions.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      return b.confidence - a.confidence;
    });

    const topDecision = decisions[0];

    if (!context.goals.primary_goal.on_track) {
      topDecision.reasoning.push('Adjusted to align with goal timeline');
      topDecision.impact_on_goals = `Critical for achieving ${context.goals.primary_goal.type} by ${context.goals.primary_goal.projected_completion}`;
    }

    return topDecision;
  }

  private convertToRestDay(workout: any, goal: any): WorkoutAdjustment {
    return {
      original_workout: workout,
      adjusted_workout: {
        ...workout,
        name: 'Active Recovery Day',
        duration_minutes: 30,
        exercises: [],
        intensity: 'low',
      },
      changes: ['Converted to rest day due to low readiness'],
      reason: 'Recovery is essential for progress',
      goal_alignment: `Strategic rest prevents setback in ${goal.type} progress`,
    };
  }

  private convertToRecoveryWorkout(workout: any, goal: any, context: CompleteContext): WorkoutAdjustment {
    return {
      original_workout: workout,
      adjusted_workout: {
        ...workout,
        name: workout.name + ' (Recovery)',
        duration_minutes: Math.round(workout.duration_minutes * 0.7),
        intensity: 'moderate',
        exercises: workout.exercises?.map((ex: any) => ({
          ...ex,
          sets: Math.max(2, Math.round(ex.sets * 0.7)),
          intensity_percentage: 60,
        })),
      },
      changes: [
        'Reduced volume by 30%',
        'Lowered intensity to 60%',
        'Focus on movement quality',
      ],
      reason: 'Moderate readiness requires adjusted training load',
      goal_alignment: `Maintains consistency for ${goal.type} while respecting recovery`,
    };
  }

  private reduceIntensity(workout: any, goal: any, context: CompleteContext): WorkoutAdjustment {
    return {
      original_workout: workout,
      adjusted_workout: {
        ...workout,
        name: workout.name + ' (Modified)',
        intensity: 'moderate-high',
        exercises: workout.exercises?.map((ex: any) => ({
          ...ex,
          intensity_percentage: 75,
          rest_seconds: ex.rest_seconds ? ex.rest_seconds + 15 : 75,
        })),
      },
      changes: [
        'Reduced intensity to 75%',
        'Increased rest periods',
      ],
      reason: 'Optimizing training stimulus for current readiness',
      goal_alignment: `Sustainable progress toward ${goal.type}`,
    };
  }

  private increaseIntensity(workout: any, goal: any, context: CompleteContext): WorkoutAdjustment {
    return {
      original_workout: workout,
      adjusted_workout: {
        ...workout,
        name: workout.name + ' (Intensified)',
        exercises: workout.exercises?.map((ex: any) => ({
          ...ex,
          sets: ex.sets + 1,
          intensity_percentage: 85,
        })),
      },
      changes: [
        'Added 1 set per exercise',
        'Increased intensity to 85%',
      ],
      reason: 'High readiness allows for increased training stimulus',
      goal_alignment: `Accelerating progress toward ${goal.type} target`,
    };
  }

  private swapExercisesForRecovery(workout: any, conflicts: string[], goal: any): WorkoutAdjustment {
    const swapMap: any = {
      'chest': ['shoulders', 'triceps'],
      'back': ['biceps', 'rear delts'],
      'legs': ['core', 'calves'],
      'shoulders': ['chest', 'triceps'],
      'arms': ['shoulders', 'chest', 'back'],
    };

    const adjustedExercises = workout.exercises?.filter((ex: any) =>
      !conflicts.some(muscle => ex.muscle_groups?.includes(muscle))
    );

    return {
      original_workout: workout,
      adjusted_workout: {
        ...workout,
        exercises: adjustedExercises,
        muscle_groups: workout.muscle_groups.filter((m: string) => !conflicts.includes(m)),
      },
      changes: conflicts.map(m => `Removed ${m} exercises due to insufficient recovery`),
      reason: 'Preventing overtraining of fatigued muscle groups',
      goal_alignment: `Strategic recovery maintains long-term ${goal.type} progress`,
    };
  }

  private makeComeback Workout(workout: any, goal: any): WorkoutAdjustment {
    return {
      original_workout: workout,
      adjusted_workout: {
        ...workout,
        name: 'Welcome Back Workout',
        duration_minutes: Math.min(45, workout.duration_minutes),
        exercises: workout.exercises?.map((ex: any) => ({
          ...ex,
          sets: Math.max(2, ex.sets - 1),
          intensity_percentage: 70,
        })),
      },
      changes: [
        'Reduced volume for return to training',
        'Moderate intensity to rebuild momentum',
      ],
      reason: 'Easing back into training after break',
      goal_alignment: `Rebuilding consistency for ${goal.type} achievement`,
    };
  }

  private checkMuscleRecoveryConflicts(muscleGroups: string[], recovery: any): string[] {
    return muscleGroups.filter(muscle =>
      recovery[muscle]?.recovery_status === 'fatigued' ||
      recovery[muscle]?.recovery_status === 'overworked'
    );
  }

  private assessGoalAlignment(adjustment: WorkoutAdjustment, goal: any): string {
    const alignmentFactors = [];

    if (goal.type.includes('strength')) {
      const maintainsVolume = adjustment.adjusted_workout.exercises?.length >= adjustment.original_workout.exercises?.length * 0.7;
      if (maintainsVolume) {
        alignmentFactors.push('Maintains adequate volume for strength gains');
      }
    }

    if (goal.type.includes('endurance')) {
      const maintainsDuration = adjustment.adjusted_workout.duration_minutes >= 30;
      if (maintainsDuration) {
        alignmentFactors.push('Preserves cardiovascular stimulus');
      }
    }

    if (goal.type.includes('weight')) {
      alignmentFactors.push('Supports consistent calorie expenditure');
    }

    if (alignmentFactors.length === 0) {
      return 'Prioritizes recovery for sustainable long-term progress';
    }

    return alignmentFactors.join('. ');
  }

  private async logDecision(userId: string, decision: Decision): Promise<void> {
    try {
      await supabase
        .from('ai_adjustments')
        .insert({
          user_id: userId,
          adjustment_type: decision.type,
          original_value: decision,
          adjusted_value: decision.action,
          reason: decision.reasoning.join('. '),
          confidence_score: decision.confidence,
          applied: !decision.requires_user_approval,
        });
    } catch (error) {
      console.error('Error logging decision:', error);
    }
  }

  private async saveAdjustment(userId: string, adjustment: WorkoutAdjustment): Promise<void> {
    try {
      await supabase
        .from('ai_plan_modifications')
        .insert({
          user_id: userId,
          workout_plan_id: adjustment.original_workout?.id,
          modification_type: 'workout_adjustment',
          original_config: adjustment.original_workout,
          modified_config: adjustment.adjusted_workout,
          reason: adjustment.reason,
          goal_impact: adjustment.goal_alignment,
          approved: false,
        });
    } catch (error) {
      console.error('Error saving adjustment:', error);
    }
  }

  private async savePlanModification(userId: string, planId: string, modification: any): Promise<void> {
    try {
      await supabase
        .from('ai_plan_modifications')
        .insert({
          user_id: userId,
          workout_plan_id: planId,
          modification_type: modification.type,
          original_config: {},
          modified_config: { suggestion: modification.suggestion },
          reason: modification.reason,
          goal_impact: modification.impact,
          approved: false,
        });
    } catch (error) {
      console.error('Error saving plan modification:', error);
    }
  }
}

export const decisionEngine = new DecisionEngine();