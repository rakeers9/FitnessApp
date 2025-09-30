import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { styled } from 'nativewind';

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'default',
  children,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-slate-900 active:bg-slate-800',
    destructive: 'bg-red-500 active:bg-red-600',
    outline: 'border border-slate-200 bg-white active:bg-slate-100',
    secondary: 'bg-slate-100 active:bg-slate-200',
    ghost: 'active:bg-slate-100',
    link: 'underline-offset-4',
  };

  const sizeStyles = {
    default: 'px-4 py-2',
    sm: 'px-3 py-1',
    lg: 'px-8 py-3',
    icon: 'p-2',
  };

  const textVariantStyles = {
    default: 'text-white',
    destructive: 'text-white',
    outline: 'text-slate-900',
    secondary: 'text-slate-900',
    ghost: 'text-slate-900',
    link: 'text-blue-600 underline',
  };

  const textSizeStyles = {
    default: 'text-base',
    sm: 'text-sm',
    lg: 'text-lg',
    icon: 'text-base',
  };

  return (
    <StyledTouchableOpacity
      className={`rounded-md items-center justify-center ${variantStyles[variant]} ${sizeStyles[size]} ${
        disabled ? 'opacity-50' : ''
      } ${className}`}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'secondary' ? '#1e293b' : '#fff'} />
      ) : (
        <StyledText
          className={`font-medium ${textVariantStyles[variant]} ${textSizeStyles[size]}`}
        >
          {children}
        </StyledText>
      )}
    </StyledTouchableOpacity>
  );
};

export { Button };