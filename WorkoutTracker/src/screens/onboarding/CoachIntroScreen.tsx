import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ChatBubble from '../../components/chat/ChatBubble';
import ChatInput from '../../components/chat/ChatInput';
import { getPersonality } from '../../config/aiPersonalities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Message {
  role: 'user' | 'coach';
  text: string;
  emphasisParts?: { text: string; isEmphasized: boolean }[];
  animated?: boolean;
  animationComplete?: boolean;
}

interface CoachIntroScreenProps {
  navigation?: any;
  selectedPersona?: string;
  onContinue?: (data: { name: string; age: string; persona: string }) => void;
  onBack?: () => void;
}

const CoachIntroScreen: React.FC<CoachIntroScreenProps> = ({
  navigation,
  selectedPersona = 'calm',
  onContinue,
  onBack,
}) => {
  const [userName, setUserName] = useState('');
  const [userAge, setUserAge] = useState('');
  const [currentStep, setCurrentStep] = useState<'name' | 'age' | 'complete'>('name');
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTypingIndex, setCurrentTypingIndex] = useState(-1);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Animation refs for continue button
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(12)).current;

  // Get AI personality
  const personality = getPersonality(selectedPersona);

  // Animation refs
  const progressAnim = useRef(new Animated.Value(0)).current;
  const messageOpacities = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    // Initialize with greeting and name prompt
    const initialMessages: Message[] = [
      {
        role: 'coach',
        text: personality.responses.greeting,
        animated: true,
        animationComplete: false,
      },
      {
        role: 'coach',
        text: personality.responses.namePrompt,
        emphasisParts: parseEmphasisText(personality.responses.namePrompt),
        animated: true,
        animationComplete: false,
      },
    ];

    setMessages(initialMessages);
    setIsAITyping(true); // AI starts typing immediately
    setCurrentTypingIndex(0); // Start typing the first coach message

    // Animate progress bar - starting at step 1 of ~18 total steps
    Animated.timing(progressAnim, {
      toValue: 0.111, // ~11.1% for second step - Name (2/18)
      duration: 420,
      useNativeDriver: false,
    }).start();

    // Initialize opacity for messages (they'll appear as they type)
    initialMessages.forEach((_, index) => {
      const opacity = new Animated.Value(1); // Start at 1 since typing will handle the appearance
      messageOpacities[index] = opacity;
    });
  }, [personality]);

  // Parse text for emphasis (text between "what should I call you?" pattern)
  const parseEmphasisText = (text: string): { text: string; isEmphasized: boolean }[] | undefined => {
    // Look for common patterns that should be emphasized
    const patterns = [
      'what should I call you',
      'What should I call you',
      'your name',
      'Your name',
    ];

    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        const parts = text.split(pattern);
        if (parts.length === 2) {
          return [
            { text: parts[0], isEmphasized: false },
            { text: pattern, isEmphasized: true },
            { text: parts[1], isEmphasized: false },
          ];
        }
      }
    }

    return undefined;
  };

  const handleSend = (value: string) => {
    if (!value.trim() || isAITyping) return; // Prevent sending while AI is typing

    if (currentStep === 'name') {
      // Validate name - must be at least 2 characters and only letters/spaces
      const trimmedName = value.trim();
      if (trimmedName.length < 2) {
        return; // Too short
      }
      // Allow letters, spaces, hyphens, and apostrophes
      const nameRegex = /^[a-zA-Z\s\-']+$/;
      if (!nameRegex.test(trimmedName)) {
        return; // Invalid characters
      }

      // Handle name submission
      const userMessage: Message = {
        role: 'user',
        text: value,
      };

      const confirmMessage: Message = {
        role: 'coach',
        text: personality.responses.nameConfirm(value),
        animated: true,
        animationComplete: false,
      };

      const agePromptMessage: Message = {
        role: 'coach',
        text: personality.responses.agePrompt,
        animated: true,
        animationComplete: false,
      };

      const newMessages = [...messages, userMessage, confirmMessage, agePromptMessage];
      setMessages(newMessages);
      setUserName(value);
      setCurrentStep('age');
      setInputValue(''); // Clear input for age
      setIsAITyping(true); // AI is typing new messages

      // Find the index of the first new coach message to type
      const firstNewCoachIndex = messages.length + 1; // +1 for userMessage, then confirmMessage
      setCurrentTypingIndex(firstNewCoachIndex);

      // Add opacity for new messages
      const newOpacities = [new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)];
      messageOpacities.push(...newOpacities);

      // Update progress to step 2
      Animated.timing(progressAnim, {
        toValue: 0.166, // ~16.6% for third step - Age (3/18)
        duration: 420,
        useNativeDriver: false,
      }).start();

    } else if (currentStep === 'age') {
      // Validate age - must be a number between 13 and 120
      const trimmedValue = value.trim();

      // Check if it's a valid number
      if (!/^\d+$/.test(trimmedValue)) {
        return; // Not a number
      }

      const ageNum = parseInt(trimmedValue);
      if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
        return; // Out of valid range
      }

      // Handle age submission
      const userMessage: Message = {
        role: 'user',
        text: value,
      };

      const continueMessage: Message = {
        role: 'coach',
        text: personality.responses.continueToProfile,
        animated: true,
        animationComplete: false,
      };

      const newMessages = [...messages, userMessage, continueMessage];
      setMessages(newMessages);
      setUserAge(value);
      setCurrentStep('complete');
      setInputValue('');
      setIsAITyping(true); // AI is typing new messages

      // Find the index of the first new coach message to type
      const firstNewCoachIndex = messages.length + 1; // +1 for userMessage, then continueMessage
      setCurrentTypingIndex(firstNewCoachIndex);

      // Add opacity for new messages
      const newOpacities = [new Animated.Value(1), new Animated.Value(1)];
      messageOpacities.push(...newOpacities);

      // Update progress to step 3
      Animated.timing(progressAnim, {
        toValue: 0.166, // Keep at Age completion (3/18)
        duration: 420,
        useNativeDriver: false,
      }).start();

      // Calculate delay based on message length (3ms per char + buffer)
      const messageLength = continueMessage.text.length;
      const typingDelay = messageLength * 3 + 200; // 3ms per char + 200ms buffer

      // Show continue button after messages finish typing
      setTimeout(() => {
        setShowContinueButton(true);
        Animated.parallel([
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(buttonTranslateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }, typingDelay); // Dynamic delay based on message length
    }

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  const handleContinue = () => {
    if (onContinue && userName && userAge) {
      onContinue({ name: userName, age: userAge, persona: selectedPersona });
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const getMessageOpacity = (index: number) => {
    return messageOpacities[index] || new Animated.Value(1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header with Back Button and Progress Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: personality.progressBarColor,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message, index) => {
            // Only show messages that should be visible
            const isUserMessage = message.role === 'user';
            const isCurrentlyTyping = message.role === 'coach' && index === currentTypingIndex && message.animated && !message.animationComplete;
            const hasTyped = message.role === 'coach' && (index < currentTypingIndex || message.animationComplete);
            const shouldShow = isUserMessage || isCurrentlyTyping || hasTyped;

            if (!shouldShow) return null;

            return (
            <Animated.View
              key={index}
              style={{
                opacity: getMessageOpacity(index),
              }}
            >
              <ChatBubble
                text={message.text}
                role={message.role}
                emphasisParts={message.emphasisParts}
                animated={
                  message.animated &&
                  !message.animationComplete &&
                  index === currentTypingIndex
                }
                onAnimationComplete={() => {
                  if (message.animated && index === currentTypingIndex) {
                    // Mark animation as complete
                    setMessages(prev => prev.map((msg, i) =>
                      i === index ? { ...msg, animationComplete: true } : msg
                    ));

                    // Find next coach message that needs to type
                    let nextCoachIndex = -1;
                    for (let i = index + 1; i < messages.length; i++) {
                      if (messages[i].role === 'coach' && messages[i].animated && !messages[i].animationComplete) {
                        nextCoachIndex = i;
                        break;
                      }
                    }

                    if (nextCoachIndex !== -1) {
                      // Move to next coach message
                      setCurrentTypingIndex(nextCoachIndex);
                    } else {
                      // No more messages to type
                      setIsAITyping(false);
                    }
                  }
                }}
              />
            </Animated.View>
            );
          })}

        </ScrollView>

        {/* Input or Continue Button */}
        {currentStep !== 'complete' ? (
          <ChatInput
            key={currentStep} // Force re-mount when step changes
            placeholder={currentStep === 'name' ? "Chat with your coach" : "Enter your age"}
            onSend={handleSend}
            keyboardType={currentStep === 'age' ? 'number-pad' : 'default'}
            value={inputValue}
            onChangeText={setInputValue}
            maxLength={currentStep === 'age' ? 3 : undefined}
            disabled={isAITyping}
          />
        ) : showContinueButton ? (
          <Animated.View
            style={[
              styles.continueButtonContainer,
              {
                opacity: buttonOpacity,
                transform: [{ translateY: buttonTranslateY }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.9}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  progressBarContainer: {
    flex: 1,
    maxWidth: 280, // Fixed max width for consistent size
    alignSelf: 'center',
    marginHorizontal: 'auto',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#3A3A3A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  messagesContent: {
    paddingBottom: 24,
  },
  continueButtonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  continueButton: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 9999,
    backgroundColor: '#E5E5E5',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  continueButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#171717',
  },
});

export default CoachIntroScreen;