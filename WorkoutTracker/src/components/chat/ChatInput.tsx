import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardTypeOptions,
  InputAccessoryView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  placeholder?: string;
  onSend: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  value?: string;
  onChangeText?: (text: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  placeholder = "Chat with your coach",
  onSend,
  keyboardType = 'default',
  maxLength,
  value: controlledValue,
  onChangeText: controlledOnChangeText,
  disabled = false,
}) => {
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : localValue;
  const onChangeText = isControlled ? controlledOnChangeText : setLocalValue;

  const handleSend = () => {
    if (disabled) return; // Prevent sending if disabled
    const textToSend = value.trim();
    if (textToSend) {
      onSend(textToSend);
      if (!isControlled) {
        setLocalValue('');
      }
    }
  };

  const isButtonActive = value.trim().length > 0 && !disabled;
  const inputAccessoryViewID = 'chatInput';

  return (
    <View style={styles.container}>
      <View style={[
        styles.inputBar,
        isFocused && styles.inputBarFocused,
      ]}>
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor="#9A9A9A"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType={keyboardType}
          maxLength={maxLength}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          enablesReturnKeyAutomatically={true}
          inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
          editable={true} // Always allow typing
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            isButtonActive ? styles.sendButtonActive : styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!isButtonActive}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-up"
            size={16}
            color={isButtonActive ? "#0F0F0F" : "#E6E6E6"}
          />
        </TouchableOpacity>
      </View>
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={inputAccessoryViewID}>
          <View />
        </InputAccessoryView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 28,
    height: 56,
    paddingLeft: 16,
    paddingRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  inputBarFocused: {
    backgroundColor: '#333333',
    borderWidth: 1.25,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  textInput: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: '#FFFFFF',
    paddingRight: 8,
    paddingVertical: 0, // Remove default padding
    paddingBottom: 4, // Add bottom padding to push text up
    textAlignVertical: 'center', // Center text vertically
    includeFontPadding: false, // Remove extra font padding on Android
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  sendButtonDisabled: {
    backgroundColor: '#3A3A3A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    opacity: 0.5,
  },
});

export default ChatInput;