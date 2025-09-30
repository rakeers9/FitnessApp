import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';
import { styled } from 'nativewind';

const StyledTextInput = styled(TextInput);
const StyledView = styled(View);
const StyledText = styled(Text);

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<TextInput, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <StyledView className="w-full">
        {label && (
          <StyledText className="text-sm font-medium text-slate-900 mb-2">{label}</StyledText>
        )}
        <StyledTextInput
          ref={ref}
          className={`flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ${
            error ? 'border-red-500' : ''
          } ${className}`}
          placeholderTextColor="#94a3b8"
          {...props}
        />
        {error && <StyledText className="text-sm text-red-500 mt-1">{error}</StyledText>}
      </StyledView>
    );
  }
);

Input.displayName = 'Input';

export { Input };