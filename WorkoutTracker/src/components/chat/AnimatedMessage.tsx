import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  StyleSheet,
} from 'react-native';

interface AnimatedMessageProps {
  text: string;
  emphasisParts?: { text: string; isEmphasized: boolean }[];
  onComplete?: () => void;
  typingSpeed?: number; // milliseconds per character
}

const AnimatedMessage: React.FC<AnimatedMessageProps> = ({
  text,
  emphasisParts,
  onComplete,
  typingSpeed = 15, // Faster typing speed (15ms per character)
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const hasStartedAnimation = useRef(false);

  useEffect(() => {
    // Only start animation once
    if (hasStartedAnimation.current) return;
    hasStartedAnimation.current = true;

    let currentIndex = 0;
    const fullText = emphasisParts
      ? emphasisParts.map(part => part.text).join('')
      : text;

    const timer = setInterval(() => {
      if (currentIndex < fullText.length) {
        // Add 1 character at a time for more natural typing
        const charsToAdd = 1;
        setDisplayedText(fullText.substring(0, currentIndex + charsToAdd));
        currentIndex += charsToAdd;
      } else {
        clearInterval(timer);
        setIsComplete(true);
        if (onComplete) {
          onComplete();
        }
      }
    }, typingSpeed);

    return () => clearInterval(timer);
  }, []); // Empty dependency array to ensure animation only runs once

  const renderText = () => {
    if (!emphasisParts || emphasisParts.length === 0) {
      return <Text style={styles.text}>{displayedText}</Text>;
    }

    // For emphasized text, we need to handle it differently
    let currentPosition = 0;
    const elements: JSX.Element[] = [];

    emphasisParts.forEach((part, index) => {
      const partLength = part.text.length;
      const partEnd = currentPosition + partLength;

      if (displayedText.length > currentPosition) {
        const visibleText = displayedText.substring(
          currentPosition,
          Math.min(partEnd, displayedText.length)
        );

        if (visibleText) {
          elements.push(
            <Text
              key={index}
              style={[styles.text, part.isEmphasized && styles.emphasisText]}
            >
              {visibleText}
            </Text>
          );
        }
      }

      currentPosition = partEnd;
    });

    return <Text style={styles.text}>{elements}</Text>;
  };

  return (
    <View style={styles.container}>
      {renderText()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  text: {
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
});

export default AnimatedMessage;