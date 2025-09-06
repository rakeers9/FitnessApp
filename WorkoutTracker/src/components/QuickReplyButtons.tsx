// src/components/QuickReplyButtons.tsx

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { QuickReply } from '../services/aiService';

interface QuickReplyButtonsProps {
  quickReplies: QuickReply[];
  onQuickReply: (reply: QuickReply) => void;
  disabled?: boolean;
}

const QuickReplyButtons: React.FC<QuickReplyButtonsProps> = ({
  quickReplies,
  onQuickReply,
  disabled = false,
}) => {
  if (!quickReplies || quickReplies.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {quickReplies.map((reply) => (
          <TouchableOpacity
            key={reply.id}
            style={[styles.button, disabled && styles.buttonDisabled]}
            onPress={() => onQuickReply(reply)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
              {reply.text}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  button: {
    backgroundColor: '#F0FDFA',
    borderColor: '#17D4D4',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#0D9488',
    textAlign: 'center',
  },
  buttonTextDisabled: {
    color: '#CCCCCC',
  },
});

export default QuickReplyButtons;
