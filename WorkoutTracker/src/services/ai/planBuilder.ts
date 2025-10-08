import { CompleteContext } from './contextManager';
import { workoutGenerator, GeneratedWorkout } from './workoutGenerator';
import { supabase } from '../supabase';

export interface TrainingPhase {
  name: string;
  weeks: number;
  focus: string;
  intensity_level: 'low' | 'moderate' | 'high' | 'very_high';
  volume_modifier: number;
}

export interface WorkoutPlan {
  id?: string;
  name: string;
  description: string;
  goal_type: string;
  total_weeks: number;
  workouts_per_week: number;
  phases: TrainingPhase[];
  start_date: string;
  end_date: string;
  difficulty_level: string;
  equipment_required: string[];
  estimated_completion_rate: number;
  goal_alignment_score: number;
  created_at?: string;
}

export interface ScheduledWorkout {
  workout_plan_id: string;
  workout_template_id: string;
  scheduled_date: string;
  scheduled_time?: string;
  week_number: number;
  day_number: number;
  workout_config: GeneratedWorkout;
}

export class PlanBuilder {
  async buildPersonalizedPlan(
    context: CompleteContext,
    duration_weeks?: number,
    startDate?: Date
  ): Promise<WorkoutPlan> {
    const goal = context.goals.primary_goal;
    const preferences = context.user.preferences;
    const profile = context.user.profile;

    // Determine optimal plan duration
    const weeks = duration_weeks || this.calculateOptimalDuration(goal, context);

    // Design training phases based on goal
    const phases = this.designTrainingPhases(goal, weeks, profile.fitnessLevel);

    // Calculate workouts per week based on preferences and readiness
    const workoutsPerWeek = this.calculateOptimalFrequency(
      preferences.workout_frequency,
      context.user.history.average_session_duration,
      profile.fitnessLevel
    );

    // Generate plan metadata
    const plan: WorkoutPlan = {
      name: this.generatePlanName(goal, weeks),
      description: this.generatePlanDescription(goal, phases, context),
      goal_type: goal?.type || 'general_fitness',
      total_weeks: weeks,
      workouts_per_week: workoutsPerWeek,
      phases,
      start_date: (startDate || new Date()).toISOString().split('T')[0],
      end_date: this.calculateEndDate(startDate || new Date(), weeks),
      difficulty_level: this.calculatePlanDifficulty(phases, profile.fitnessLevel),
      equipment_required: preferences.equipment_available,
      estimated_completion_rate: this.estimateCompletionRate(context, workoutsPerWeek),
      goal_alignment_score: this.calculateGoalAlignment(phases, goal),
    };

    // Save plan to database
    const savedPlan = await this.savePlan(context.user.userId, plan);

    // Generate and schedule all workouts
    await this.generateAndScheduleWorkouts(context, savedPlan, phases);

    return savedPlan;
  }

  async adjustExistingPlan(
    context: CompleteContext,
    planId: string,
    reason: string
  ): Promise<WorkoutPlan> {
    const { data: existingPlan } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!existingPlan) {
      throw new Error('Plan not found');
    }

    const adherence = context.workout.currentPlan?.adherence_rate || 0;
    const goal = context.goals.primary_goal;

    let adjustedPlan = { ...existingPlan };

    if (reason === 'low_adherence' && adherence < 60) {
      adjustedPlan = this.reduceIntensity(adjustedPlan);
    } else if (reason === 'too_easy' && adherence > 95) {
      adjustedPlan = this.increaseIntensity(adjustedPlan);
    } else if (reason === 'goal_change') {
      adjustedPlan = this.realignToNewGoal(adjustedPlan, goal);
    } else if (reason === 'injury') {
      adjustedPlan = this.adjustForInjury(adjustedPlan, context);
    } else if (reason === 'plateau') {
      adjustedPlan = this.breakPlateau(adjustedPlan);
    }

    // Log the modification
    await this.logPlanModification(context.user.userId, planId, reason, adjustedPlan);

    return adjustedPlan;
  }

  private calculateOptimalDuration(goal: any, context: CompleteContext): number {
    if (!goal) return 12; // Default 12 weeks

    const targetDate = new Date(goal.target_date);
    const today = new Date();
    const weeksAvailable = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7));

    // Consider goal type and current progress
    const progressRate = goal.on_track ? 1.0 : 0.8;

    if (goal.type.includes('strength')) {
      // Strength goals need longer cycles
      return Math.min(16, Math.max(8, weeksAvailable * progressRate));
    } else if (goal.type.includes('weight_loss')) {
      // Weight loss can be shorter cycles
      return Math.min(12, Math.max(4, weeksAvailable * progressRate));
    } else if (goal.type.includes('muscle')) {
      // Hypertrophy needs moderate cycles
      return Math.min(12, Math.max(6, weeksAvailable * progressRate));
    }

    return Math.min(12, Math.max(4, weeksAvailable));
  }

  private designTrainingPhases(goal: any, weeks: number, fitnessLevel: string): TrainingPhase[] {
    const phases: TrainingPhase[] = [];

    if (!goal) {
      // Generic balanced plan
      return this.createGenericPhases(weeks);
    }

    if (goal.type.includes('strength')) {
      return this.createStrengthPhases(weeks, fitnessLevel);
    } else if (goal.type.includes('muscle')) {
      return this.createHypertrophyPhases(weeks, fitnessLevel);
    } else if (goal.type.includes('endurance')) {
      return this.createEndurancePhases(weeks, fitnessLevel);
    } else if (goal.type.includes('weight_loss')) {
      return this.createWeightLossPhases(weeks, fitnessLevel);
    }

    return this.createGenericPhases(weeks);
  }

  private createStrengthPhases(weeks: number, fitnessLevel: string): TrainingPhase[] {
    const phases: TrainingPhase[] = [];
    const phaseDuration = Math.floor(weeks / 4);

    phases.push({
      name: 'Anatomical Adaptation',
      weeks: phaseDuration,
      focus: 'Building foundation and technique',
      intensity_level: 'moderate',
      volume_modifier: 1.0,
    });

    phases.push({
      name: 'Hypertrophy',
      weeks: phaseDuration,
      focus: 'Building muscle mass for strength base',
      intensity_level: 'moderate',
      volume_modifier: 1.2,
    });

    phases.push({
      name: 'Maximum Strength',
      weeks: phaseDuration,
      focus: 'Peak strength development',
      intensity_level: 'high',
      volume_modifier: 0.8,
    });

    phases.push({
      name: 'Power & Peaking',
      weeks: weeks - (phaseDuration * 3),
      focus: 'Power development and testing',
      intensity_level: 'very_high',
      volume_modifier: 0.6,
    });

    return phases;
  }

  private createHypertrophyPhases(weeks: number, fitnessLevel: string): TrainingPhase[] {
    const phases: TrainingPhase[] = [];
    const phaseDuration = Math.floor(weeks / 3);

    phases.push({
      name: 'Foundation',
      weeks: phaseDuration,
      focus: 'Building work capacity',
      intensity_level: 'moderate',
      volume_modifier: 1.0,
    });

    phases.push({
      name: 'Volume Accumulation',
      weeks: phaseDuration,
      focus: 'Progressive overload through volume',
      intensity_level: 'moderate',
      volume_modifier: 1.3,
    });

    phases.push({
      name: 'Intensity & Definition',
      weeks: weeks - (phaseDuration * 2),
      focus: 'Higher intensity for muscle definition',
      intensity_level: 'high',
      volume_modifier: 1.0,
    });

    return phases;
  }

  private createEndurancePhases(weeks: number, fitnessLevel: string): TrainingPhase[] {
    const phases: TrainingPhase[] = [];
    const phaseDuration = Math.floor(weeks / 3);

    phases.push({
      name: 'Base Building',
      weeks: phaseDuration,
      focus: 'Aerobic capacity development',
      intensity_level: 'low',
      volume_modifier: 1.0,
    });

    phases.push({
      name: 'Threshold Development',
      weeks: phaseDuration,
      focus: 'Lactate threshold improvement',
      intensity_level: 'moderate',
      volume_modifier: 1.2,
    });

    phases.push({
      name: 'Race Preparation',
      weeks: weeks - (phaseDuration * 2),
      focus: 'Speed and race-specific training',
      intensity_level: 'high',
      volume_modifier: 0.9,
    });

    return phases;
  }

  private createWeightLossPhases(weeks: number, fitnessLevel: string): TrainingPhase[] {
    const phases: TrainingPhase[] = [];
    const phaseDuration = Math.floor(weeks / 3);

    phases.push({
      name: 'Metabolic Conditioning',
      weeks: phaseDuration,
      focus: 'Building metabolic efficiency',
      intensity_level: 'moderate',
      volume_modifier: 1.0,
    });

    phases.push({
      name: 'Intensity Progression',
      weeks: phaseDuration,
      focus: 'Increasing caloric expenditure',
      intensity_level: 'high',
      volume_modifier: 1.1,
    });

    phases.push({
      name: 'Maintenance & Toning',
      weeks: weeks - (phaseDuration * 2),
      focus: 'Preserving muscle while losing fat',
      intensity_level: 'moderate',
      volume_modifier: 1.0,
    });

    return phases;
  }

  private createGenericPhases(weeks: number): TrainingPhase[] {
    const phases: TrainingPhase[] = [];
    const phaseDuration = Math.floor(weeks / 2);

    phases.push({
      name: 'Foundation Building',
      weeks: phaseDuration,
      focus: 'General fitness improvement',
      intensity_level: 'moderate',
      volume_modifier: 1.0,
    });

    phases.push({
      name: 'Progressive Development',
      weeks: weeks - phaseDuration,
      focus: 'Continued improvement',
      intensity_level: 'moderate',
      volume_modifier: 1.1,
    });

    return phases;
  }

  private calculateOptimalFrequency(
    preferredFrequency: number,
    avgSessionDuration: number,
    fitnessLevel: string
  ): number {
    let optimal = preferredFrequency;

    // Adjust based on fitness level
    if (fitnessLevel === 'beginner' && optimal > 4) {
      optimal = 4; // Cap at 4 for beginners
    } else if (fitnessLevel === 'advanced' && optimal < 4) {
      optimal = 4; // Minimum 4 for advanced
    }

    // Adjust based on session duration
    if (avgSessionDuration > 90 && optimal > 4) {
      optimal = optimal - 1; // Reduce frequency for very long sessions
    } else if (avgSessionDuration < 30 && optimal < 6) {
      optimal = optimal + 1; // Increase frequency for short sessions
    }

    return Math.min(6, Math.max(3, optimal));
  }

  private generatePlanName(goal: any, weeks: number): string {
    if (!goal) {
      return `${weeks}-Week Fitness Journey`;
    }

    const goalTypeNames: any = {
      'strength': 'Strength Builder',
      'muscle': 'Muscle Growth',
      'endurance': 'Endurance Master',
      'weight_loss': 'Transformation',
      'athletic': 'Athletic Performance',
    };

    const baseName = Object.entries(goalTypeNames).find(([key, _]) =>
      goal.type.includes(key)
    )?.[1] || 'Custom Training';

    return `${weeks}-Week ${baseName} Program`;
  }

  private generatePlanDescription(goal: any, phases: TrainingPhase[], context: CompleteContext): string {
    const descriptions = [];

    descriptions.push(`Personalized ${phases.length}-phase training program`);

    if (goal) {
      descriptions.push(`designed to achieve your ${goal.type} goal`);

      if (goal.target_value) {
        descriptions.push(`(target: ${goal.target_value})`);
      }
    }

    descriptions.push(`tailored for ${context.user.profile.fitnessLevel} level.`);

    const phaseNames = phases.map(p => p.name).join(', ');
    descriptions.push(`Includes: ${phaseNames}.`);

    return descriptions.join(' ');
  }

  private calculateEndDate(startDate: Date, weeks: number): string {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (weeks * 7));
    return endDate.toISOString().split('T')[0];
  }

  private calculatePlanDifficulty(phases: TrainingPhase[], fitnessLevel: string): string {
    const avgIntensity = phases.reduce((acc, phase) => {
      const intensityMap: any = { 'low': 1, 'moderate': 2, 'high': 3, 'very_high': 4 };
      return acc + intensityMap[phase.intensity_level];
    }, 0) / phases.length;

    if (fitnessLevel === 'beginner') {
      if (avgIntensity > 2) return 'challenging';
      return 'appropriate';
    } else if (fitnessLevel === 'intermediate') {
      if (avgIntensity > 3) return 'challenging';
      if (avgIntensity < 2) return 'easy';
      return 'appropriate';
    } else {
      if (avgIntensity < 2.5) return 'easy';
      return 'appropriate';
    }
  }

  private estimateCompletionRate(context: CompleteContext, workoutsPerWeek: number): number {
    const history = context.user.history;

    // Base estimation on past performance
    if (history.total_workouts > 10) {
      const weeksActive = Math.max(1, Math.floor(history.total_workouts / workoutsPerWeek));
      const actualFrequency = history.total_workouts / weeksActive;
      const adherenceRate = (actualFrequency / workoutsPerWeek) * 100;
      return Math.min(95, Math.max(50, adherenceRate));
    }

    // For new users, estimate based on fitness level and frequency
    const levelMultiplier: any = {
      'beginner': 0.7,
      'intermediate': 0.8,
      'advanced': 0.9,
    };

    const frequencyMultiplier = Math.max(0.5, 1 - (workoutsPerWeek - 4) * 0.1);

    return Math.round(
      (levelMultiplier[context.user.profile.fitnessLevel] || 0.75) *
      frequencyMultiplier * 100
    );
  }

  private calculateGoalAlignment(phases: TrainingPhase[], goal: any): number {
    if (!goal) return 75;

    let alignmentScore = 0;
    const goalKeywords = goal.type.toLowerCase().split('_');

    for (const phase of phases) {
      const phaseFocus = phase.focus.toLowerCase();
      const matchCount = goalKeywords.filter(keyword =>
        phaseFocus.includes(keyword)
      ).length;

      alignmentScore += (matchCount / goalKeywords.length) * 100;
    }

    return Math.round(alignmentScore / phases.length);
  }

  private async generateAndScheduleWorkouts(
    context: CompleteContext,
    plan: WorkoutPlan,
    phases: TrainingPhase[]
  ): Promise<void> {
    const startDate = new Date(plan.start_date);
    let currentDate = new Date(startDate);
    let weekNumber = 1;

    for (const phase of phases) {
      for (let phaseWeek = 0; phaseWeek < phase.weeks; phaseWeek++) {
        const weekWorkouts = await workoutGenerator.generatePlanWorkouts(
          context,
          1, // Generate one week at a time
          plan.workouts_per_week
        );

        for (let day = 0; day < plan.workouts_per_week; day++) {
          const workout = weekWorkouts[0][day];

          // Apply phase modifiers
          workout.exercises = workout.exercises.map(ex => ({
            ...ex,
            sets: Math.round(ex.sets * phase.volume_modifier),
            intensity_percentage: this.adjustIntensityForPhase(
              ex.intensity_percentage || 70,
              phase.intensity_level
            ),
          }));

          const scheduledWorkout: ScheduledWorkout = {
            workout_plan_id: plan.id!,
            workout_template_id: `${plan.id}_week${weekNumber}_day${day + 1}`,
            scheduled_date: currentDate.toISOString().split('T')[0],
            week_number: weekNumber,
            day_number: day + 1,
            workout_config: workout,
          };

          await this.saveScheduledWorkout(context.user.userId, scheduledWorkout);

          // Move to next workout day (skip rest days)
          currentDate.setDate(currentDate.getDate() + this.calculateRestDays(day, plan.workouts_per_week));
        }

        weekNumber++;
      }
    }
  }

  private adjustIntensityForPhase(baseIntensity: number, phaseIntensity: string): number {
    const modifiers: any = {
      'low': 0.8,
      'moderate': 1.0,
      'high': 1.1,
      'very_high': 1.2,
    };

    return Math.min(95, Math.round(baseIntensity * (modifiers[phaseIntensity] || 1.0)));
  }

  private calculateRestDays(currentDay: number, workoutsPerWeek: number): number {
    if (workoutsPerWeek === 7) return 1;
    if (workoutsPerWeek === 6) return currentDay % 3 === 2 ? 2 : 1;
    if (workoutsPerWeek === 5) return currentDay % 2 === 1 ? 2 : 1;
    if (workoutsPerWeek === 4) return currentDay % 2 === 1 ? 2 : 1;
    if (workoutsPerWeek === 3) return 2;
    return 3;
  }

  private reduceIntensity(plan: any): any {
    return {
      ...plan,
      workouts_per_week: Math.max(3, plan.workouts_per_week - 1),
      phases: plan.phases.map((phase: TrainingPhase) => ({
        ...phase,
        intensity_level: this.lowerIntensity(phase.intensity_level),
        volume_modifier: phase.volume_modifier * 0.85,
      })),
    };
  }

  private increaseIntensity(plan: any): any {
    return {
      ...plan,
      phases: plan.phases.map((phase: TrainingPhase) => ({
        ...phase,
        intensity_level: this.raiseIntensity(phase.intensity_level),
        volume_modifier: Math.min(1.5, phase.volume_modifier * 1.1),
      })),
    };
  }

  private lowerIntensity(level: string): 'low' | 'moderate' | 'high' | 'very_high' {
    const levels: any = {
      'very_high': 'high',
      'high': 'moderate',
      'moderate': 'low',
      'low': 'low',
    };
    return levels[level];
  }

  private raiseIntensity(level: string): 'low' | 'moderate' | 'high' | 'very_high' {
    const levels: any = {
      'low': 'moderate',
      'moderate': 'high',
      'high': 'very_high',
      'very_high': 'very_high',
    };
    return levels[level];
  }

  private realignToNewGoal(plan: any, newGoal: any): any {
    return {
      ...plan,
      goal_type: newGoal.type,
      phases: this.designTrainingPhases(newGoal, plan.total_weeks, 'intermediate'),
    };
  }

  private adjustForInjury(plan: any, context: CompleteContext): any {
    return {
      ...plan,
      workouts_per_week: Math.max(2, plan.workouts_per_week - 2),
      phases: plan.phases.map((phase: TrainingPhase) => ({
        ...phase,
        intensity_level: 'low',
        volume_modifier: phase.volume_modifier * 0.5,
        focus: phase.focus + ' (injury-modified)',
      })),
    };
  }

  private breakPlateau(plan: any): any {
    // Add variation to break through plateau
    return {
      ...plan,
      phases: plan.phases.map((phase: TrainingPhase, index: number) => ({
        ...phase,
        intensity_level: index % 2 === 0 ? 'high' : 'moderate',
        volume_modifier: index % 2 === 0 ? phase.volume_modifier * 0.8 : phase.volume_modifier * 1.2,
        focus: phase.focus + ' (plateau-breaking variation)',
      })),
    };
  }

  private async savePlan(userId: string, plan: WorkoutPlan): Promise<WorkoutPlan> {
    const { data, error } = await supabase
      .from('workout_plans')
      .insert({
        user_id: userId,
        name: plan.name,
        description: plan.description,
        goal_type: plan.goal_type,
        total_weeks: plan.total_weeks,
        workouts_per_week: plan.workouts_per_week,
        phases: plan.phases,
        start_date: plan.start_date,
        end_date: plan.end_date,
        difficulty_level: plan.difficulty_level,
        equipment_required: plan.equipment_required,
        is_active: true,
        created_by: 'ai',
      })
      .select()
      .single();

    if (error) throw error;

    return { ...plan, id: data.id, created_at: data.created_at };
  }

  private async saveScheduledWorkout(userId: string, workout: ScheduledWorkout): Promise<void> {
    await supabase
      .from('scheduled_workouts')
      .insert({
        user_id: userId,
        workout_plan_id: workout.workout_plan_id,
        workout_template_id: workout.workout_template_id,
        scheduled_date: workout.scheduled_date,
        scheduled_time: workout.scheduled_time,
        week_number: workout.week_number,
        day_number: workout.day_number,
        workout_config: workout.workout_config,
      });
  }

  private async logPlanModification(
    userId: string,
    planId: string,
    reason: string,
    adjustedPlan: any
  ): Promise<void> {
    await supabase
      .from('ai_plan_modifications')
      .insert({
        user_id: userId,
        workout_plan_id: planId,
        modification_type: reason,
        original_config: {},
        modified_config: adjustedPlan,
        reason: reason,
        goal_impact: `Plan adjusted for ${reason}`,
        approved: false,
        created_at: new Date().toISOString(),
      });
  }
}

export const planBuilder = new PlanBuilder();