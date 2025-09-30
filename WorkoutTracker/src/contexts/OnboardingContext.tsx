import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AIPersonality, getPersonality } from '../config/aiPersonalities';

export interface OnboardingData {
  persona: string;
  name: string;
  age: string;
  currentWeight: string;
  targetWeight: string;
  mainFocus: string;
  trainingInspiration: string;
  biggestChallenge: string;
  experienceLevel: string;
  trainingStyle: string;
  hasInjuries: boolean;
  injuries: string[];
  workoutDays: string[];
  workoutDuration: string;
  referralCode?: string;
}

export type ConversationStep =
  | 'name'
  | 'age'
  | 'weight'
  | 'targetWeight'
  | 'focus'
  | 'inspiration'
  | 'challenge'
  | 'experience'
  | 'trainingStyle'
  | 'injuries'
  | 'frequency'
  | 'duration'
  | 'privacy'
  | 'healthSync'
  | 'referral'
  | 'share'
  | 'planGeneration'
  | 'signup';

interface OnboardingContextType {
  data: Partial<OnboardingData>;
  currentStep: ConversationStep;
  personality: AIPersonality | null;
  progress: number;

  setPersona: (persona: string) => void;
  updateData: (field: keyof OnboardingData, value: any) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: ConversationStep) => void;
  getProgressPercentage: () => number;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const CONVERSATION_STEPS: ConversationStep[] = [
  'name',
  'age',
  'weight',
  'targetWeight',
  'focus',
  'inspiration',
  'challenge',
  'experience',
  'trainingStyle',
  'injuries',
  'frequency',
  'duration',
  'privacy',
  'healthSync',
  'referral',
  'share',
  'planGeneration',
  'signup'
];

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<Partial<OnboardingData>>({});
  const [currentStep, setCurrentStep] = useState<ConversationStep>('name');
  const [personality, setPersonality] = useState<AIPersonality | null>(null);

  const setPersona = (persona: string) => {
    setData(prev => ({ ...prev, persona }));
    setPersonality(getPersonality(persona));
  };

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    const currentIndex = CONVERSATION_STEPS.indexOf(currentStep);
    if (currentIndex < CONVERSATION_STEPS.length - 1) {
      setCurrentStep(CONVERSATION_STEPS[currentIndex + 1]);
    }
  };

  const previousStep = () => {
    const currentIndex = CONVERSATION_STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(CONVERSATION_STEPS[currentIndex - 1]);
    }
  };

  const goToStep = (step: ConversationStep) => {
    setCurrentStep(step);
  };

  const getProgressPercentage = () => {
    const currentIndex = CONVERSATION_STEPS.indexOf(currentStep);
    return ((currentIndex + 1) / CONVERSATION_STEPS.length) * 100;
  };

  const progress = getProgressPercentage();

  return (
    <OnboardingContext.Provider
      value={{
        data,
        currentStep,
        personality,
        progress,
        setPersona,
        updateData,
        nextStep,
        previousStep,
        goToStep,
        getProgressPercentage
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};