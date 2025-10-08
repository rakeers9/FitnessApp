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

interface AgeConversationScreenProps {
  navigation?: any;
  selectedPersona?: string;
  userName: string;
  onContinue?: (age: string) => void;
  onBack?: () => void;
}

const AgeConversationScreen: React.FC<AgeConversationScreenProps> = ({
  navigation,
  selectedPersona = 'calm',
  userName,
  onContinue,
  onBack,
}) => {
  const [userAge, setUserAge] = useState('');
  const [hasSubmittedAge, setHasSubmittedAge] = useState(false);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTypingIndex, setCurrentTypingIndex] = useState(3); // Start at 3 since first 3 messages are already shown
  const scrollViewRef = useRef<ScrollView>(null);

  // Get AI personality
  const personality = getPersonality(selectedPersona);

  // Animation refs
  const progressAnim = useRef(new Animated.Value(0.2)).current;
  const messageOpacities = useRef<Animated.Value[]>([]).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    // Continue the conversation from where we left off
    const initialMessages: Message[] = [
      {
        role: 'coach',
        text: personality.responses.namePrompt,
        emphasisParts: parseEmphasisText(personality.responses.namePrompt),
      },
      {
        role: 'user',
        text: userName,
      },
      {
        role: 'coach',
        text: personality.responses.nameConfirm(userName),
      },
      {
        role: 'coach',
        text: personality.responses.agePrompt,
        animated: true,
        animationComplete: false,
      },
    ];

    setMessages(initialMessages);

    // Animate progress bar to next step
    Animated.timing(progressAnim, {
      toValue: 0.12, // Age step progress
      duration: 420,
      useNativeDriver: false,
    }).start();

    // Initialize opacity for existing messages
    initialMessages.forEach((_, index) => {
      messageOpacities[index] = new Animated.Value(1); // Set to 1 since typing handles appearance
    });
  }, [personality, userName]);

  // Parse text for emphasis
  const parseEmphasisText = (text: string): { text: string; isEmphasized: boolean }[] | undefined => {
    const patterns = [
      'what should I call you',
      'What should I call you',
      'your age',
      'Your age',
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

  const handleSendAge = (age: string) => {
    if (!age.trim() || hasSubmittedAge) return;

    // Validate age is a number
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      // Could show an error message here
      return;
    }

    const userMessage: Message = {
      role: 'user',
      text: age,
    };

    const confirmMessage: Message = {
      role: 'coach',
      text: personality.responses.ageConfirm(age),
      animated: true,
      animationComplete: false,
    };

    const continueMessage: Message = {
      role: 'coach',
      text: personality.responses.continueToProfile,
      animated: true,
      animationComplete: false,
    };

    setMessages(prev => [...prev, userMessage, confirmMessage, continueMessage]);
    setUserAge(age);
    setHasSubmittedAge(true);

    // Update typing index to allow new messages to type sequentially
    const currentMessageCount = messages.length;
    setCurrentTypingIndex(currentMessageCount + 1); // +1 to start with the first new coach message

    // Add opacity for new messages (set to 1 since typing handles appearance)
    const newOpacities = [new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)];
    messageOpacities.push(...newOpacities);

    // Show continue button after a delay (when last message would be done typing)
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
    }, 800); // Reduced delay for faster typing

    // Update progress
    Animated.timing(progressAnim, {
      toValue: 0.24, // Complete name + age
      duration: 420,
      useNativeDriver: false,
    }).start();

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  const handleContinue = () => {
    if (onContinue && userAge) {
      onContinue(userAge);
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
            // Only show messages that should be visible (user messages or coach messages that have started typing)
            const shouldShow = message.role === 'user' || index <= currentTypingIndex;
            if (!shouldShow && message.animated) return null;

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
                  (message.role === 'user' || index <= currentTypingIndex)
                }
                onAnimationComplete={() => {
                  if (message.animated) {
                    // Mark animation as complete and move to next message
                    setMessages(prev => prev.map((msg, i) =>
                      i === index ? { ...msg, animationComplete: true } : msg
                    ));
                    // Move to next coach message
                    if (message.role === 'coach') {
                      setCurrentTypingIndex(prev => prev + 1);
                    }
                  }
                }}
              />
            </Animated.View>
            );
          })}

          {/* Continue Button */}
          {showContinueButton && (
            <Animated.View
              style={[
                styles.continueButtonWrapper,
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
          )}
        </ScrollView>

        {/* Input */}
        {!hasSubmittedAge && (
          <ChatInput
            placeholder="Enter your age"
            onSend={handleSendAge}
            keyboardType="number-pad"
            value={userAge}
            onChangeText={setUserAge}
            maxLength={3}
          />
        )}
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
    paddingHorizontal: 8,
    paddingRight: 44, // Add right padding to match back button width + margin
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
  continueButtonWrapper: {
    marginTop: 24,
    marginBottom: 24,
  },
  continueButton: {
    backgroundColor: '#E5E5E5',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 2,
  },
  continueButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    color: '#0F0F0F',
  },
});

export default AgeConversationScreen;