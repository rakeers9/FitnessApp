#!/bin/bash

# List of files that need updating
files=(
  "src/screens/onboarding/WorkoutFrequencyScreen.tsx"
  "src/screens/onboarding/WorkoutDurationScreen.tsx"
  "src/screens/onboarding/InjuriesScreen.tsx"
  "src/screens/onboarding/ReferralCodeScreen.tsx"
  "src/screens/onboarding/PlanSummaryScreen.tsx"
  "src/screens/onboarding/AppleHealthScreen.tsx"
  "src/screens/onboarding/PrivacyConsentScreen.tsx"
  "src/screens/onboarding/TrainingStyleScreen.tsx"
  "src/screens/onboarding/ExperienceScreen.tsx"
  "src/screens/onboarding/ChallengeScreen.tsx"
  "src/screens/onboarding/MotivationScreen.tsx"
  "src/screens/onboarding/MainFocusScreen.tsx"
)

echo "Files to update:"
for file in "${files[@]}"; do
  echo "  - $file"
done