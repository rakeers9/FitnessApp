import { CompleteContext } from './contextManager';
import { supabase } from '../supabase';

export interface Exercise {
  id: string;
  name: string;
  muscle_groups: string[];
  equipment: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  movement_type: 'compound' | 'isolation';
  force_type: 'push' | 'pull' | 'static';
}

export interface WorkoutExercise {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps?: number;
  duration_seconds?: number;
  rest_seconds: number;
  intensity_percentage?: number;
  notes?: string;
  order: number;
}

export interface GeneratedWorkout {
  name: string;
  description: string;
  duration_minutes: number;
  difficulty: string;
  muscle_groups: string[];
  equipment_needed: string[];
  exercises: WorkoutExercise[];
  warmup: WorkoutExercise[];
  cooldown: WorkoutExercise[];
  goal_alignment: string;
  readiness_adjusted: boolean;
}

export interface WorkoutParameters {
  goal_type: string;
  duration_minutes: number;
  equipment_available: string[];
  muscle_groups?: string[];
  difficulty?: string;
  workout_type?: 'strength' | 'hypertrophy' | 'endurance' | 'power' | 'mixed';
  avoid_muscles?: string[];
}

export class WorkoutGenerator {
  private exerciseCache: Map<string, Exercise[]> = new Map();

  async generateWorkout(
    context: CompleteContext,
    parameters?: Partial<WorkoutParameters>
  ): Promise<GeneratedWorkout> {
    const goal = context.goals.primary_goal;
    const readiness = context.health.readiness.overall_score;
    const recovery = context.workout.muscleGroupRecovery;
    const preferences = context.user.preferences;

    const workoutParams: WorkoutParameters = {
      goal_type: goal?.type || 'general_fitness',
      duration_minutes: parameters?.duration_minutes || preferences.workout_duration,
      equipment_available: parameters?.equipment_available || preferences.equipment_available,
      muscle_groups: parameters?.muscle_groups || this.selectMuscleGroups(context),
      difficulty: parameters?.difficulty || context.user.profile.fitnessLevel,
      workout_type: this.determineWorkoutType(goal?.type),
      avoid_muscles: this.getMusclesToAvoid(recovery),
    };

    const exercises = await this.selectExercises(workoutParams, context);
    const warmup = this.generateWarmup(exercises, workoutParams);
    const cooldown = this.generateCooldown(exercises, workoutParams);

    const adjustedExercises = this.adjustForReadiness(exercises, readiness);
    const finalExercises = this.adjustForGoal(adjustedExercises, goal);

    const workout: GeneratedWorkout = {
      name: this.generateWorkoutName(workoutParams, context),
      description: this.generateWorkoutDescription(workoutParams, goal, readiness),
      duration_minutes: workoutParams.duration_minutes,
      difficulty: this.calculateDifficulty(finalExercises, readiness),
      muscle_groups: this.extractMuscleGroups(finalExercises),
      equipment_needed: this.extractEquipment(finalExercises),
      exercises: finalExercises,
      warmup,
      cooldown,
      goal_alignment: this.assessGoalAlignment(finalExercises, goal),
      readiness_adjusted: readiness < 80,
    };

    await this.saveGeneratedWorkout(context.user.userId, workout);

    return workout;
  }

  async generatePlanWorkouts(
    context: CompleteContext,
    weeks: number,
    workoutsPerWeek: number
  ): Promise<GeneratedWorkout[][]> {
    const workouts: GeneratedWorkout[][] = [];
    const goal = context.goals.primary_goal;
    const muscleGroups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];

    for (let week = 0; week < weeks; week++) {
      const weekWorkouts: GeneratedWorkout[] = [];
      const progressionFactor = 1 + (week * 0.05); // 5% progression per week

      for (let day = 0; day < workoutsPerWeek; day++) {
        const focusMuscles = this.getPlanMuscleRotation(day, workoutsPerWeek, muscleGroups);

        const parameters: Partial<WorkoutParameters> = {
          muscle_groups: focusMuscles,
          workout_type: this.getPlanWorkoutType(week, day, goal?.type),
        };

        const workout = await this.generateWorkout(context, parameters);

        // Apply progressive overload
        workout.exercises = workout.exercises.map(ex => ({
          ...ex,
          sets: Math.round(ex.sets * progressionFactor),
          intensity_percentage: ex.intensity_percentage
            ? Math.min(95, ex.intensity_percentage * progressionFactor)
            : undefined,
        }));

        weekWorkouts.push(workout);
      }

      workouts.push(weekWorkouts);
    }

    return workouts;
  }

  private determineWorkoutType(goalType?: string): 'strength' | 'hypertrophy' | 'endurance' | 'power' | 'mixed' {
    if (!goalType) return 'mixed';

    if (goalType.includes('strength')) return 'strength';
    if (goalType.includes('muscle') || goalType.includes('size')) return 'hypertrophy';
    if (goalType.includes('endurance') || goalType.includes('cardio')) return 'endurance';
    if (goalType.includes('power') || goalType.includes('athletic')) return 'power';

    return 'mixed';
  }

  private selectMuscleGroups(context: CompleteContext): string[] {
    const recovery = context.workout.muscleGroupRecovery;
    const lastWorkout = context.workout.recentWorkouts[0];
    const availableMuscles = [];

    for (const [muscle, status] of Object.entries(recovery)) {
      if (status.recovery_status === 'fresh' || status.recovery_status === 'recovered') {
        availableMuscles.push(muscle);
      }
    }

    if (availableMuscles.length === 0) {
      // All muscles need recovery, select least fatigued
      return ['core', 'arms'];
    }

    // Smart muscle pairing based on training style
    const trainingStyle = context.user.profile.trainingStyle;
    if (trainingStyle === 'bodybuilding') {
      return this.selectBodybuildingSplit(availableMuscles, lastWorkout);
    } else if (trainingStyle === 'powerlifting') {
      return this.selectPowerliftingSplit(availableMuscles, lastWorkout);
    } else {
      return this.selectBalancedSplit(availableMuscles, lastWorkout);
    }
  }

  private selectBodybuildingSplit(available: string[], lastWorkout: any): string[] {
    const splits = [
      ['chest', 'triceps'],
      ['back', 'biceps'],
      ['legs'],
      ['shoulders', 'abs'],
    ];

    for (const split of splits) {
      if (split.every(muscle => available.includes(muscle))) {
        if (!lastWorkout || !split.some(m => lastWorkout.muscle_groups?.includes(m))) {
          return split;
        }
      }
    }

    return available.slice(0, 2);
  }

  private selectPowerliftingSplit(available: string[], lastWorkout: any): string[] {
    const splits = [
      ['chest', 'shoulders', 'triceps'], // Bench day
      ['legs', 'core'], // Squat day
      ['back', 'biceps'], // Deadlift day
    ];

    for (const split of splits) {
      if (split.every(muscle => available.includes(muscle))) {
        if (!lastWorkout || !split.some(m => lastWorkout.muscle_groups?.includes(m))) {
          return split;
        }
      }
    }

    return available.slice(0, 2);
  }

  private selectBalancedSplit(available: string[], lastWorkout: any): string[] {
    const upperBody = ['chest', 'back', 'shoulders', 'arms'];
    const lowerBody = ['legs', 'glutes'];

    const availableUpper = available.filter(m => upperBody.includes(m));
    const availableLower = available.filter(m => lowerBody.includes(m));

    if (lastWorkout?.muscle_groups?.some((m: string) => upperBody.includes(m))) {
      // Last was upper, do lower if available
      if (availableLower.length > 0) {
        return [...availableLower, 'core'];
      }
    } else if (lastWorkout?.muscle_groups?.some((m: string) => lowerBody.includes(m))) {
      // Last was lower, do upper if available
      if (availableUpper.length >= 2) {
        return availableUpper.slice(0, 2);
      }
    }

    // Default to most recovered muscles
    return available.slice(0, 3);
  }

  private getMusclesToAvoid(recovery: any): string[] {
    return Object.entries(recovery)
      .filter(([_, status]: [string, any]) =>
        status.recovery_status === 'fatigued' ||
        status.recovery_status === 'overworked'
      )
      .map(([muscle]) => muscle);
  }

  private async selectExercises(
    params: WorkoutParameters,
    context: CompleteContext
  ): Promise<WorkoutExercise[]> {
    const exercises = await this.getExercisesFromDatabase(params);
    const selected: WorkoutExercise[] = [];

    // Calculate exercise count based on duration
    const exerciseCount = Math.floor(params.duration_minutes / 8); // ~8 minutes per exercise

    // Select compound movements first
    const compounds = exercises.filter(e => e.movement_type === 'compound');
    const isolations = exercises.filter(e => e.movement_type === 'isolation');

    const compoundCount = Math.ceil(exerciseCount * 0.6); // 60% compounds
    const isolationCount = exerciseCount - compoundCount;

    // Add compound exercises
    for (let i = 0; i < Math.min(compoundCount, compounds.length); i++) {
      selected.push(this.createWorkoutExercise(compounds[i], i, params.workout_type!));
    }

    // Add isolation exercises
    for (let i = 0; i < Math.min(isolationCount, isolations.length); i++) {
      selected.push(this.createWorkoutExercise(
        isolations[i],
        compoundCount + i,
        params.workout_type!
      ));
    }

    return selected;
  }

  private createWorkoutExercise(
    exercise: Exercise,
    order: number,
    workoutType: string
  ): WorkoutExercise {
    const setsRepsMap: any = {
      'strength': { sets: 5, reps: 5, rest: 180, intensity: 85 },
      'hypertrophy': { sets: 4, reps: 10, rest: 90, intensity: 75 },
      'endurance': { sets: 3, reps: 15, rest: 60, intensity: 65 },
      'power': { sets: 4, reps: 3, rest: 240, intensity: 90 },
      'mixed': { sets: 3, reps: 8, rest: 120, intensity: 80 },
    };

    const config = setsRepsMap[workoutType] || setsRepsMap['mixed'];

    return {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      sets: config.sets,
      reps: config.reps,
      rest_seconds: config.rest,
      intensity_percentage: config.intensity,
      order: order + 1,
    };
  }

  private generateWarmup(exercises: WorkoutExercise[], params: WorkoutParameters): WorkoutExercise[] {
    const warmup: WorkoutExercise[] = [];

    // Dynamic stretching
    warmup.push({
      exercise_id: 'warmup-1',
      exercise_name: 'Dynamic Stretching',
      sets: 1,
      duration_seconds: 180,
      rest_seconds: 0,
      order: 1,
    });

    // Light cardio
    warmup.push({
      exercise_id: 'warmup-2',
      exercise_name: 'Light Cardio',
      sets: 1,
      duration_seconds: 300,
      rest_seconds: 0,
      order: 2,
    });

    // Movement-specific warmup
    if (exercises.length > 0) {
      const firstExercise = exercises[0];
      warmup.push({
        exercise_id: 'warmup-3',
        exercise_name: `${firstExercise.exercise_name} (Warmup)`,
        sets: 2,
        reps: 10,
        rest_seconds: 60,
        intensity_percentage: 50,
        order: 3,
      });
    }

    return warmup;
  }

  private generateCooldown(exercises: WorkoutExercise[], params: WorkoutParameters): WorkoutExercise[] {
    const cooldown: WorkoutExercise[] = [];

    // Light cardio
    cooldown.push({
      exercise_id: 'cooldown-1',
      exercise_name: 'Light Walking',
      sets: 1,
      duration_seconds: 300,
      rest_seconds: 0,
      order: 1,
    });

    // Static stretching
    cooldown.push({
      exercise_id: 'cooldown-2',
      exercise_name: 'Static Stretching',
      sets: 1,
      duration_seconds: 420,
      rest_seconds: 0,
      order: 2,
    });

    return cooldown;
  }

  private adjustForReadiness(exercises: WorkoutExercise[], readiness: number): WorkoutExercise[] {
    if (readiness >= 80) {
      return exercises; // No adjustment needed
    }

    const adjustmentFactor = readiness / 100;

    return exercises.map(ex => ({
      ...ex,
      sets: Math.max(2, Math.round(ex.sets * adjustmentFactor)),
      intensity_percentage: ex.intensity_percentage
        ? Math.round(ex.intensity_percentage * adjustmentFactor)
        : undefined,
      rest_seconds: Math.round(ex.rest_seconds * (1 + (1 - adjustmentFactor))),
    }));
  }

  private adjustForGoal(exercises: WorkoutExercise[], goal: any): WorkoutExercise[] {
    if (!goal || goal.on_track) {
      return exercises;
    }

    // Increase intensity if behind on goal
    return exercises.map(ex => ({
      ...ex,
      sets: ex.sets + 1,
      intensity_percentage: ex.intensity_percentage
        ? Math.min(95, ex.intensity_percentage + 5)
        : undefined,
    }));
  }

  private generateWorkoutName(params: WorkoutParameters, context: CompleteContext): string {
    const muscleGroups = params.muscle_groups?.join(' & ') || 'Full Body';
    const workoutType = params.workout_type || 'Training';

    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    return `${dayOfWeek} ${muscleGroups} ${workoutType.charAt(0).toUpperCase() + workoutType.slice(1)}`;
  }

  private generateWorkoutDescription(params: WorkoutParameters, goal: any, readiness: number): string {
    const descriptions = [];

    descriptions.push(`${params.workout_type || 'Mixed'} workout targeting ${params.muscle_groups?.join(', ')}.`);

    if (goal) {
      descriptions.push(`Designed to support your ${goal.type} goal.`);
    }

    if (readiness < 80) {
      descriptions.push(`Adjusted for ${readiness}% readiness.`);
    }

    return descriptions.join(' ');
  }

  private calculateDifficulty(exercises: WorkoutExercise[], readiness: number): string {
    const avgIntensity = exercises.reduce((acc, ex) =>
      acc + (ex.intensity_percentage || 70), 0
    ) / exercises.length;

    const totalSets = exercises.reduce((acc, ex) => acc + ex.sets, 0);

    if (avgIntensity > 85 || totalSets > 20) {
      return 'hard';
    } else if (avgIntensity > 70 || totalSets > 15) {
      return 'moderate';
    } else {
      return 'easy';
    }
  }

  private extractMuscleGroups(exercises: WorkoutExercise[]): string[] {
    // This would need to query the exercise database for muscle groups
    // For now, returning placeholder
    return ['chest', 'shoulders', 'triceps'];
  }

  private extractEquipment(exercises: WorkoutExercise[]): string[] {
    // This would need to query the exercise database for equipment
    // For now, returning placeholder
    return ['barbell', 'dumbbells', 'bench'];
  }

  private assessGoalAlignment(exercises: WorkoutExercise[], goal: any): string {
    if (!goal) return 'General fitness workout';

    const alignments = [];

    if (goal.type.includes('strength')) {
      const avgReps = exercises.reduce((acc, ex) => acc + (ex.reps || 0), 0) / exercises.length;
      if (avgReps <= 6) {
        alignments.push('Optimal rep range for strength gains');
      }
    }

    if (goal.type.includes('muscle')) {
      const totalVolume = exercises.reduce((acc, ex) => acc + ex.sets * (ex.reps || 0), 0);
      if (totalVolume > 100) {
        alignments.push('High volume for muscle growth');
      }
    }

    if (goal.type.includes('endurance')) {
      const avgReps = exercises.reduce((acc, ex) => acc + (ex.reps || 0), 0) / exercises.length;
      if (avgReps >= 12) {
        alignments.push('High reps for endurance development');
      }
    }

    return alignments.join('. ') || `Supporting ${goal.type} development`;
  }

  private async getExercisesFromDatabase(params: WorkoutParameters): Promise<Exercise[]> {
    const cacheKey = `${params.muscle_groups?.join(',')}_${params.equipment_available.join(',')}`;

    if (this.exerciseCache.has(cacheKey)) {
      return this.exerciseCache.get(cacheKey)!;
    }

    const { data: exercises } = await supabase
      .from('exercises')
      .select('*')
      .in('equipment', params.equipment_available)
      .contains('muscle_groups', params.muscle_groups || []);

    const filtered = (exercises || []).filter(ex =>
      !params.avoid_muscles?.some(muscle => ex.muscle_groups?.includes(muscle))
    );

    // If no exercises found, use default set
    if (filtered.length === 0) {
      return this.getDefaultExercises(params);
    }

    this.exerciseCache.set(cacheKey, filtered);
    return filtered;
  }

  private getDefaultExercises(params: WorkoutParameters): Exercise[] {
    // Return a default set of bodyweight exercises
    return [
      {
        id: 'default-1',
        name: 'Push-ups',
        muscle_groups: ['chest', 'triceps', 'shoulders'],
        equipment: 'bodyweight',
        difficulty: 'beginner',
        movement_type: 'compound',
        force_type: 'push',
      },
      {
        id: 'default-2',
        name: 'Pull-ups',
        muscle_groups: ['back', 'biceps'],
        equipment: 'pull-up bar',
        difficulty: 'intermediate',
        movement_type: 'compound',
        force_type: 'pull',
      },
      {
        id: 'default-3',
        name: 'Squats',
        muscle_groups: ['legs', 'glutes'],
        equipment: 'bodyweight',
        difficulty: 'beginner',
        movement_type: 'compound',
        force_type: 'push',
      },
      {
        id: 'default-4',
        name: 'Plank',
        muscle_groups: ['core'],
        equipment: 'bodyweight',
        difficulty: 'beginner',
        movement_type: 'isolation',
        force_type: 'static',
      },
    ];
  }

  private getPlanMuscleRotation(day: number, workoutsPerWeek: number, muscleGroups: string[]): string[] {
    if (workoutsPerWeek === 3) {
      // Full body split
      return muscleGroups;
    } else if (workoutsPerWeek === 4) {
      // Upper/Lower split
      const splits = [
        ['chest', 'back', 'shoulders'],
        ['legs', 'glutes', 'core'],
        ['chest', 'arms', 'shoulders'],
        ['legs', 'back', 'core'],
      ];
      return splits[day % 4];
    } else if (workoutsPerWeek >= 5) {
      // Push/Pull/Legs split
      const splits = [
        ['chest', 'shoulders', 'triceps'],
        ['back', 'biceps'],
        ['legs', 'glutes'],
        ['chest', 'shoulders', 'triceps'],
        ['back', 'biceps', 'core'],
      ];
      return splits[day % 5];
    }

    return muscleGroups.slice(0, 3);
  }

  private getPlanWorkoutType(week: number, day: number, goalType?: string): string {
    if (!goalType) return 'mixed';

    // Periodization based on week
    const weekPhase = week % 4;

    if (goalType.includes('strength')) {
      if (weekPhase === 3) return 'power'; // Deload week
      return 'strength';
    }

    if (goalType.includes('muscle')) {
      if (weekPhase === 0) return 'strength';
      if (weekPhase === 3) return 'endurance'; // Metabolic week
      return 'hypertrophy';
    }

    return 'mixed';
  }

  private async saveGeneratedWorkout(userId: string, workout: GeneratedWorkout): Promise<void> {
    try {
      await supabase
        .from('ai_generated_workouts')
        .insert({
          user_id: userId,
          workout_name: workout.name,
          workout_config: workout,
          generated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error saving generated workout:', error);
    }
  }
}

export const workoutGenerator = new WorkoutGenerator();