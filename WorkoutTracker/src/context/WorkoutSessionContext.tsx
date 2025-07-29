// src/context/WorkoutSessionContext.tsx

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface WorkoutSessionState {
  id?: string;
  template_id?: string;
  workout_name: string;
  exercises: any[];
  start_time: Date;
  current_exercise_index: number;
  current_set_index: number;
  total_duration: number; // in seconds
  is_rest_active: boolean;
  rest_remaining: number; // in seconds
  is_active: boolean;
}

interface WorkoutSessionContextType {
  activeSession: WorkoutSessionState | null;
  startWorkoutSession: (workout: any) => void;
  endWorkoutSession: () => void;
  updateSession: (updates: Partial<WorkoutSessionState>) => void;
  isWorkoutActive: boolean;
  workoutTime: number;
  restTime: number;
  startRestTimer: (duration: number) => void;
  endRestPeriod: () => void;
  adjustRestTime: (seconds: number) => void;
}

const WorkoutSessionContext = createContext<WorkoutSessionContextType>({
  activeSession: null,
  startWorkoutSession: () => {},
  endWorkoutSession: () => {},
  updateSession: () => {},
  isWorkoutActive: false,
  workoutTime: 0,
  restTime: 0,
  startRestTimer: () => {},
  endRestPeriod: () => {},
  adjustRestTime: () => {},
});

export const useWorkoutSession = () => {
  const context = useContext(WorkoutSessionContext);
  if (!context) {
    throw new Error('useWorkoutSession must be used within a WorkoutSessionProvider');
  }
  return context;
};

export const WorkoutSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSession, setActiveSession] = useState<WorkoutSessionState | null>(null);
  const [workoutTime, setWorkoutTime] = useState(0);
  const [restTime, setRestTime] = useState(0);

  // Timer refs for persistent timing
  const workoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoEndTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start workout session
  const startWorkoutSession = (workout: any) => {
    console.log('Starting workout session for:', workout.name);
    
    const newSession: WorkoutSessionState = {
      template_id: workout.id,
      workout_name: workout.name,
      exercises: workout.exercises,
      start_time: new Date(),
      current_exercise_index: 0,
      current_set_index: 0,
      total_duration: 0,
      is_rest_active: false,
      rest_remaining: 0,
      is_active: true,
    };
    
    setActiveSession(newSession);
    setWorkoutTime(0);
    
    // Start workout timer (updates every second)
    if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
    workoutTimerRef.current = setInterval(() => {
      setWorkoutTime(prev => prev + 1);
    }, 1000);
    
    // Set auto-end timer for 12 hours (43200 seconds)
    if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
    autoEndTimerRef.current = setTimeout(() => {
      console.log('Auto-ending workout after 12 hours');
      endWorkoutSession();
    }, 12 * 60 * 60 * 1000); // 12 hours in milliseconds
  };

  // End workout session
  const endWorkoutSession = () => {
    console.log('Ending workout session');
    
    // Clear all timers
    if (workoutTimerRef.current) {
      clearInterval(workoutTimerRef.current);
      workoutTimerRef.current = null;
    }
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    if (autoEndTimerRef.current) {
      clearTimeout(autoEndTimerRef.current);
      autoEndTimerRef.current = null;
    }
    
    // Reset state
    setActiveSession(null);
    setWorkoutTime(0);
    setRestTime(0);
  };

  // Update session
  const updateSession = (updates: Partial<WorkoutSessionState>) => {
    setActiveSession(prev => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  };

  // Start rest timer
  const startRestTimer = (duration: number) => {
    console.log('Starting rest timer for', duration, 'seconds');
    setRestTime(duration);
    
    // Update session to rest active state
    updateSession({
      is_rest_active: true,
      rest_remaining: duration,
    });
    
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = setInterval(() => {
      setRestTime(prev => {
        if (prev <= 1) {
          // Rest timer finished
          endRestPeriod();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // End rest period
  const endRestPeriod = () => {
    console.log('Ending rest period');
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    
    updateSession({
      is_rest_active: false,
      rest_remaining: 0,
    });
    
    setRestTime(0);
  };

  // Adjust rest time
  const adjustRestTime = (seconds: number) => {
    setRestTime(prev => Math.max(0, prev + seconds));
    updateSession(prev => ({
      ...prev,
      rest_remaining: Math.max(0, (prev?.rest_remaining || 0) + seconds),
    }));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
    };
  }, []);

  const contextValue: WorkoutSessionContextType = {
    activeSession,
    startWorkoutSession,
    endWorkoutSession,
    updateSession,
    isWorkoutActive: activeSession?.is_active || false,
    workoutTime,
    restTime,
    startRestTimer,
    endRestPeriod,
    adjustRestTime,
  };

  return (
    <WorkoutSessionContext.Provider value={contextValue}>
      {children}
    </WorkoutSessionContext.Provider>
  );
};

export default WorkoutSessionContext;