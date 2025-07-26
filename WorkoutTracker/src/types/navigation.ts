// src/types/navigation.ts

// Navigation type definitions for the entire app
export type RootStackParamList = {
  GetStarted: undefined;
  Auth: undefined;
  PostAuthSetup: { 
    onSetupComplete?: () => void;
  };
  Main: undefined;
};

export type PostAuthSetupStackParamList = {
  Preferences: undefined;
  CoachConnection: undefined;
};