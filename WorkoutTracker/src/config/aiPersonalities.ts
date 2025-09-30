export interface AIPersonality {
  id: string;
  name: string;
  color: string;
  progressBarColor: string;
  chatStyle: 'analytical' | 'concise' | 'supportive' | 'energetic';
  useEmojis: boolean;
  responses: {
    greeting: string;
    namePrompt: string;
    nameConfirm: (name: string) => string;
    agePrompt: string;
    ageConfirm: (age: string) => string;
    weightPrompt: string;
    weightConfirm: (weight: string) => string;
    focusPrompt: string;
    focusOptions: string[];
    focusConfirm: (focus: string) => string;
    inspirationPrompt: string;
    inspirationOptions: string[];
    inspirationConfirm: (inspiration: string) => string;
    challengePrompt: string;
    challengeOptions: string[];
    challengeConfirm: (challenge: string) => string;
    experiencePrompt: string;
    experienceOptions: string[];
    experienceConfirm: (experience: string) => string;
    trainingStylePrompt: string;
    trainingStyleOptions: string[];
    trainingStyleConfirm: (style: string) => string;
    injuriesPrompt: string;
    injuriesConfirm: (hasInjuries: boolean) => string;
    frequencyPrompt: string;
    frequencyConfirm: (days: number) => string;
    durationPrompt: string;
    durationOptions: string[];
    durationConfirm: (duration: string) => string;
    continueToProfile: string;
  };
}

export const aiPersonalities: Record<string, AIPersonality> = {
  calm: {
    id: 'calm',
    name: 'Calm & Data-Driven',
    color: '#17D4D4',
    progressBarColor: '#01AB7B',
    chatStyle: 'analytical',
    useEmojis: false,
    responses: {
      greeting: "Hey there I'm here to keep you on track and moving at your own pace.",
      namePrompt: "First things first — what should I call you? I want to get it right.",
      nameConfirm: (name) => `Got it ${name}! Nice to meet you.`,
      agePrompt: "The next step is recording your age. This is better for me to understand where you currently are at in your journey!",
      ageConfirm: (age) => `Perfect. At ${age}, we can create a program that's optimized for your body's current capabilities and recovery needs.`,
      weightPrompt: "Let's record your current weight. This helps me track your progress accurately over time.",
      weightConfirm: (weight) => `Noted - ${weight} is our starting baseline. We'll monitor changes methodically.`,
      focusPrompt: "What's your primary training focus? Understanding this helps me structure your program effectively.",
      focusOptions: ['Build Muscle', 'Lose Fat', 'Feel Healthier', 'Sports Performance'],
      focusConfirm: (focus) => `${focus} - excellent choice. I'll optimize your training for this specific goal.`,
      inspirationPrompt: "What drives your training? This helps me understand your deeper motivation.",
      inspirationOptions: ['Appearance', 'Health', 'Confidence', 'Performance'],
      inspirationConfirm: (inspiration) => `${inspiration} is a powerful motivator. Let's channel that into consistent progress.`,
      challengePrompt: "What's your biggest fitness challenge? Knowing this helps me provide targeted support.",
      challengeOptions: ['Motivation', 'Time Management', 'Injuries', 'Knowledge'],
      challengeConfirm: (challenge) => `I understand. We'll address ${challenge.toLowerCase()} systematically throughout your program.`,
      experiencePrompt: "How would you rate your training experience level?",
      experienceOptions: ['Beginner', 'Intermediate', 'Advanced', 'Returning After Break'],
      experienceConfirm: (experience) => `As ${experience.toLowerCase()}, we'll ensure proper progression and technique focus.`,
      trainingStylePrompt: "What's your preferred training environment?",
      trainingStyleOptions: ['Home/Bodyweight', 'Gym Equipment', 'Both/Flexible'],
      trainingStyleConfirm: (style) => `Perfect. I'll design workouts specifically for ${style.toLowerCase()}.`,
      injuriesPrompt: "Do you have any current injuries or physical limitations I should know about?",
      injuriesConfirm: (hasInjuries) => hasInjuries
        ? "I'll ensure all exercises are safe and appropriate for your condition."
        : "Great - we can proceed with a full range of exercises.",
      frequencyPrompt: "How many days per week can you commit to training?",
      frequencyConfirm: (days) => `${days} days per week is optimal. I'll structure your split accordingly.`,
      durationPrompt: "How long can you dedicate to each workout session?",
      durationOptions: ['30 minutes', '45 minutes', '60 minutes', '60+ minutes'],
      durationConfirm: (duration) => `${duration} sessions work well. I'll maximize efficiency within this timeframe.`,
      continueToProfile: "Great! Thank you for sharing that! Now click continue to finish setting up your profile!"
    }
  },

  clear: {
    id: 'clear',
    name: 'Clear & Concise',
    color: '#F3C54A',
    progressBarColor: '#F3C54A',
    chatStyle: 'concise',
    useEmojis: false,
    responses: {
      greeting: "Let's get you set up quickly and efficiently.",
      namePrompt: "What should I call you?",
      nameConfirm: (name) => `Got it, ${name}.`,
      agePrompt: "Your age?",
      ageConfirm: (age) => `${age} - noted.`,
      weightPrompt: "Current weight?",
      weightConfirm: (weight) => `${weight} - recorded.`,
      focusPrompt: "Main goal?",
      focusOptions: ['Build Muscle', 'Lose Fat', 'Feel Healthier', 'Sports Performance'],
      focusConfirm: (focus) => `${focus} - understood.`,
      inspirationPrompt: "What drives you?",
      inspirationOptions: ['Appearance', 'Health', 'Confidence', 'Performance'],
      inspirationConfirm: (inspiration) => `${inspiration} - got it.`,
      challengePrompt: "Biggest obstacle?",
      challengeOptions: ['Motivation', 'Time', 'Injuries', 'Knowledge'],
      challengeConfirm: (challenge) => `${challenge} - we'll address it.`,
      experiencePrompt: "Experience level?",
      experienceOptions: ['Beginner', 'Intermediate', 'Advanced', 'Returning'],
      experienceConfirm: (experience) => `${experience} - noted.`,
      trainingStylePrompt: "Where will you train?",
      trainingStyleOptions: ['Home', 'Gym', 'Both'],
      trainingStyleConfirm: (style) => `${style} - perfect.`,
      injuriesPrompt: "Any injuries?",
      injuriesConfirm: (hasInjuries) => hasInjuries ? "I'll work around them." : "Good to go.",
      frequencyPrompt: "Training days per week?",
      frequencyConfirm: (days) => `${days} days - set.`,
      durationPrompt: "Session length?",
      durationOptions: ['30 min', '45 min', '60 min', '60+ min'],
      durationConfirm: (duration) => `${duration} - done.`,
      continueToProfile: "All set. Click continue."
    }
  },

  gentle: {
    id: 'gentle',
    name: 'Gentle & Supportive',
    color: '#38BDF8',
    progressBarColor: '#38BDF8',
    chatStyle: 'supportive',
    useEmojis: true,
    responses: {
      greeting: "Hey there! 😊 I'm here to support you every step of the way, at whatever pace feels right for you.",
      namePrompt: "First, I'd love to know - what should I call you? Your name helps make this journey more personal.",
      nameConfirm: (name) => `It's wonderful to meet you, ${name}! I'm excited to be part of your fitness journey. 💙`,
      agePrompt: "Would you mind sharing your age with me? This helps me understand what's best for your body right now.",
      ageConfirm: (age) => `Thank you for sharing! At ${age}, you're at a great point to make positive changes. We'll take things at just the right pace.`,
      weightPrompt: "If you're comfortable sharing, what's your current weight? Remember, this is just a starting point - no judgment here! 🤗",
      weightConfirm: (weight) => `Thank you for trusting me with that. ${weight} is simply where we're starting - every journey begins somewhere!`,
      focusPrompt: "What would you most like to achieve? There's no wrong answer here - it's all about what matters to you.",
      focusOptions: ['Build Muscle', 'Lose Fat', 'Feel Healthier', 'Sports Performance'],
      focusConfirm: (focus) => `${focus} is a wonderful goal! We'll work towards it together, one day at a time. 🌟`,
      inspirationPrompt: "What inspires you to make this change? Understanding your 'why' helps me support you better.",
      inspirationOptions: ['Appearance', 'Health', 'Confidence', 'Performance'],
      inspirationConfirm: (inspiration) => `${inspiration} is such a valid and powerful reason. I'm here to help you achieve that! 💪`,
      challengePrompt: "We all face challenges - what's the toughest part of fitness for you? It's okay to be honest.",
      challengeOptions: ['Motivation', 'Time Management', 'Injuries', 'Knowledge'],
      challengeConfirm: (challenge) => `Thank you for being open about ${challenge.toLowerCase()}. We'll work through it together - you're not alone in this!`,
      experiencePrompt: "How would you describe your experience with exercise? No judgment - everyone starts somewhere!",
      experienceOptions: ['Beginner', 'Intermediate', 'Advanced', 'Returning After Break'],
      experienceConfirm: (experience) => `Being ${experience.toLowerCase()} is perfectly fine! We'll make sure everything feels manageable and safe.`,
      trainingStylePrompt: "Where do you feel most comfortable working out?",
      trainingStyleOptions: ['Home/Bodyweight', 'Gym Equipment', 'Both/Flexible'],
      trainingStyleConfirm: (style) => `${style} is perfect! The best workout is the one you'll actually do. 😊`,
      injuriesPrompt: "Do you have any injuries or areas we should be careful with? Your safety is my top priority.",
      injuriesConfirm: (hasInjuries) => hasInjuries
        ? "Thank you for letting me know. We'll be extra careful and work around any limitations. Your health comes first! 🤗"
        : "That's great! We'll still focus on proper form and gradual progression to keep you injury-free.",
      frequencyPrompt: "How many days per week feels realistic for you? Remember, consistency beats perfection!",
      frequencyConfirm: (days) => `${days} days is perfect! It's better to be consistent with what you can manage than to overcommit. 👍`,
      durationPrompt: "How much time can you comfortably dedicate to each workout?",
      durationOptions: ['30 minutes', '45 minutes', '60 minutes', '60+ minutes'],
      durationConfirm: (duration) => `${duration} is great! Quality always beats quantity - we'll make every minute count. 💙`,
      continueToProfile: "You did amazing sharing all of that! 🌟 Click continue when you're ready for the next step."
    }
  },

  motivational: {
    id: 'motivational',
    name: 'Motivational',
    color: '#7A1F1F',
    progressBarColor: '#FF6B6B',
    chatStyle: 'energetic',
    useEmojis: true,
    responses: {
      greeting: "LET'S GO! 🔥 I'm pumped to be your coach and help you CRUSH your fitness goals!",
      namePrompt: "First up - what's your name, champion? I want to know who I'm training! 💪",
      nameConfirm: (name) => `YES! ${name}, you're already taking the first step to GREATNESS! Let's DO THIS! 🚀`,
      agePrompt: "How old are you? Age is just a number when you've got the FIRE to succeed! 🔥",
      ageConfirm: (age) => `${age} years of POTENTIAL! This is YOUR time to shine! Let's make it happen! 💯`,
      weightPrompt: "What's your current weight? This is just your starting line - we're going PLACES! 📈",
      weightConfirm: (weight) => `${weight} - that's our launch pad! Get ready for an AMAZING transformation! 🎯`,
      focusPrompt: "What's your MAIN MISSION? What are we conquering together? 🏆",
      focusOptions: ['BUILD MUSCLE 💪', 'BURN FAT 🔥', 'FEEL UNSTOPPABLE 🌟', 'ATHLETIC BEAST MODE 🏃'],
      focusConfirm: (focus) => `${focus}?! PERFECT! We're going to DOMINATE this goal together! No limits! 🚀`,
      inspirationPrompt: "What FIRES YOU UP? What's driving this incredible journey? 🔥",
      inspirationOptions: ['Look AMAZING', 'Feel POWERFUL', 'Confidence BOOST', 'Peak Performance'],
      inspirationConfirm: (inspiration) => `${inspiration} - THAT'S what I'm talking about! Your motivation is UNSTOPPABLE! 💪`,
      challengePrompt: "What challenge are we going to DEMOLISH? Every obstacle is an opportunity! 💥",
      challengeOptions: ['Need More Drive', 'Time Crunch', 'Working Around Injuries', 'Learning Curve'],
      challengeConfirm: (challenge) => `${challenge}? We'll CRUSH IT! Champions find a way - and that's exactly what you are! 🏆`,
      experiencePrompt: "What's your training background? Wherever you are, we're taking it to the NEXT LEVEL! ⬆️",
      experienceOptions: ['Ready to START', 'Building MOMENTUM', 'Taking it HIGHER', 'COMEBACK Season'],
      experienceConfirm: (experience) => `${experience} - PERFECT starting point! Get ready to EXCEED your own expectations! 🎯`,
      trainingStylePrompt: "Where are we going to make the MAGIC happen? 🏋️",
      trainingStyleOptions: ['Home WARRIOR', 'Gym BEAST', 'ANYWHERE, Anytime'],
      trainingStyleConfirm: (style) => `${style} - I LOVE IT! We'll turn any space into your personal arena of SUCCESS! 💯`,
      injuriesPrompt: "Any battle scars we need to work around? Warriors adapt and overcome! 💪",
      injuriesConfirm: (hasInjuries) => hasInjuries
        ? "No problem - we'll work SMART and come back STRONGER! Every champion faces adversity! 🔥"
        : "PERFECT! Full steam ahead - but always training SMART to stay in the game! 💪",
      frequencyPrompt: "How many days are you ready to BRING IT? Consistency is your superpower! ⚡",
      frequencyConfirm: (days) => `${days} days of PURE DEDICATION! That's the commitment of a CHAMPION! 🏆`,
      durationPrompt: "How long are we going HARD each session? Every minute counts! ⏱️",
      durationOptions: ['30 min BLITZ', '45 min BURN', '60 min GRIND', '60+ WARRIOR MODE'],
      durationConfirm: (duration) => `${duration} of MAXIMUM EFFORT! We're going to make EVERY SECOND count! 🔥`,
      continueToProfile: "YOU'RE READY! 🚀 Hit that continue button and let's start your LEGENDARY transformation! 💪🔥"
    }
  }
};

export const getPersonality = (id: string): AIPersonality => {
  return aiPersonalities[id] || aiPersonalities.calm;
};