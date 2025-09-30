import React, { useEffect, useRef } from 'react';
import {
  View,
  StatusBar,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { Box } from '@gluestack-ui/themed';
import { VStack } from '@gluestack-ui/themed';
import { Text } from '@gluestack-ui/themed';
import { Button, ButtonText } from '@gluestack-ui/themed';
import { Pressable } from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { config } from '../../config/gluestack-ui.config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WelcomeScreenProps {
  onAnimationComplete?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onAnimationComplete }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Animation values
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.92)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    // Fade in from splash screen
    Animated.sequence([
      Animated.delay(100),
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Then animate the content
      Animated.parallel([
        // Hero image animation
        Animated.parallel([
          Animated.timing(heroScale, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(heroOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        // Content animation - starts 80ms later
        Animated.sequence([
          Animated.delay(80),
          Animated.parallel([
            Animated.timing(contentOpacity, {
              toValue: 1,
              duration: 280,
              useNativeDriver: true,
            }),
            Animated.timing(contentTranslateY, {
              toValue: 0,
              duration: 280,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      });
    });
  }, []);

  const handleGetStarted = () => {
    navigation.navigate('GetStarted' as never);
  };

  const handleSignIn = () => {
    navigation.navigate('Auth' as never);
  };

  return (
    <GluestackUIProvider config={config}>
      <Box flex={1} bg="$background" justifyContent="flex-end" alignItems="center">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Hero Group */}
        <Animated.View
          style={[
            styles.heroGroup,
            {
              opacity: heroOpacity,
              transform: [{ scale: heroScale }],
            }
          ]}
        >
          {/* Phone Image (Placeholder) */}
          <View style={styles.phoneImageContainer}>
            <View style={styles.phoneFrame}>
              <View style={styles.phoneScreen} />
            </View>
          </View>

          {/* Gradient Rectangle Overlay */}
          <LinearGradient
            colors={[
              'rgba(10, 10, 10, 0)',  // #0A0A0A with 0% opacity
              'rgba(0, 0, 0, 0)',      // Transparent at 55%
              '#000000',               // base/background at 100%
            ]}
            locations={[0, 0.55, 1]}
            style={styles.gradientOverlay}
          />
        </Animated.View>

        {/* Content Stack - 345px wide using Gluestack */}
        <Animated.View
          style={[
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
              paddingBottom: insets.bottom + 22,
            }
          ]}
        >
          <VStack
            space="md"
            alignItems="center"
            w={345}
          >
            {/* Title */}
            <Text
              fontFamily="Poppins-Medium"
              fontSize="$3xl"
              lineHeight="$3xl"
              letterSpacing={-0.2}
              color="$foreground"
              textAlign="center"
              alignSelf="stretch"
            >
              Welcome to App
            </Text>

            {/* Subtitle */}
            <Box maxWidth={303} mt="$3">
              <Text
                fontFamily="Poppins-Regular"
                fontSize="$md"
                lineHeight="$md"
                color="$mutedForeground"
                textAlign="center"
              >
                Let's help you get started in reaching all your health and fitness goals
              </Text>
            </Box>

            {/* Primary CTA Button */}
            <Button
              size="lg"
              variant="default"
              onPress={handleGetStarted}
              w={345}
              h="$14"
              borderRadius="$full"
              mt="$6"
              bg="$primary"
              shadowColor="$black"
              shadowOffset={{ width: 0, height: 1 }}
              shadowOpacity={0.25}
              shadowRadius={8}
              elevation={2}
            >
              <ButtonText
                fontFamily="Poppins-Medium"
                fontSize="$md"
                lineHeight="$sm"
                letterSpacing={0.2}
                color="$primaryForeground"
              >
                Get started
              </ButtonText>
            </Button>

            {/* Secondary Link */}
            <Pressable
              onPress={handleSignIn}
              mt="$4"
              minHeight={44}
              px="$5"
              justifyContent="center"
              alignItems="center"
            >
              <Text
                fontFamily="Poppins-Medium"
                fontSize="$sm"
                lineHeight="$sm"
                color="$foreground"
              >
                Already have an account?
              </Text>
            </Pressable>
          </VStack>
        </Animated.View>
      </Box>
    </GluestackUIProvider>
  );
};

const styles = StyleSheet.create({
  heroGroup: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneImageContainer: {
    width: 286,
    height: 584.56,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -15 }],
  },
  phoneFrame: {
    width: 286,
    height: 584.56,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(25, 25, 25, 0.3)',
    overflow: 'hidden',
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: 'rgba(15, 15, 15, 0.5)',
  },
  gradientOverlay: {
    position: 'absolute',
    width: 345,
    height: 467,
    bottom: 0,
  },
});

export default WelcomeScreen;