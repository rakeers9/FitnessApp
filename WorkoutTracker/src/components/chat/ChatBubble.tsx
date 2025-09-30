import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import AnimatedMessage from './AnimatedMessage';

interface ChatBubbleProps {
  text: string;
  role: 'user' | 'coach';
  emphasisParts?: { text: string; isEmphasized: boolean }[];
  animated?: boolean;
  onAnimationComplete?: () => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  text,
  role,
  emphasisParts,
  animated = false,
  onAnimationComplete
}) => {
  const isUser = role === 'user';

  const renderText = () => {
    // Use animated message for coach messages when specified
    if (!isUser && animated) {
      return (
        <AnimatedMessage
          text={text}
          emphasisParts={emphasisParts}
          onComplete={onAnimationComplete}
          typingSpeed={25} // Moderate typing speed
        />
      );
    }

    if (emphasisParts && emphasisParts.length > 0) {
      return (
        <Text style={styles.coachText}>
          {emphasisParts.map((part, index) => (
            <Text
              key={index}
              style={part.isEmphasized ? styles.emphasisText : undefined}
            >
              {part.text}
            </Text>
          ))}
        </Text>
      );
    }

    return (
      <Text style={isUser ? styles.userText : styles.coachText}>
        {text}
      </Text>
    );
  };

  if (isUser) {
    return (
      <View style={styles.userBubbleContainer}>
        <View style={styles.userBubble}>
          {renderText()}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.coachMessageContainer}>
      {renderText()}
    </View>
  );
};

const styles = StyleSheet.create({
  // Coach messages (left aligned, no bubble)
  coachMessageContainer: {
    alignSelf: 'flex-start',
    width: '100%',
    marginBottom: 24,
  },
  coachText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: '#FFFFFF',
  },
  emphasisText: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '600',
  },

  // User bubbles (right aligned with background)
  userBubbleContainer: {
    alignSelf: 'flex-end',
    maxWidth: '75%', // ~256px on 342px column
    marginBottom: 24,
  },
  userBubble: {
    backgroundColor: '#3A3A3A',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

export default ChatBubble;