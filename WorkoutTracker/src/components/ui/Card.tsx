import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <StyledView
      className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </StyledView>
  );
};

const CardHeader: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <StyledView className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
      {children}
    </StyledView>
  );
};

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <StyledText className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </StyledText>
  );
};

const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <StyledText className={`text-sm text-slate-500 ${className}`}>{children}</StyledText>;
};

const CardContent: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <StyledView className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </StyledView>
  );
};

const CardFooter: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <StyledView className={`flex flex-row items-center p-6 pt-0 ${className}`} {...props}>
      {children}
    </StyledView>
  );
};

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };