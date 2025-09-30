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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 9; // Gap between cards
const CONTENT_WIDTH = SCREEN_WIDTH - 48; // 24px padding on each side
const CARD_WIDTH = (CONTENT_WIDTH - CARD_GAP) / 2; // Dynamic card width
const CARD_HEIGHT = 264; // Fixed card height (240 * 1.1)

interface PersonaCardProps {
  id: string;
  title: string;
  description: string;
  gradientColors: [string, string];
  selected: boolean;
  onPress: () => void;
  index: number;
}

const PersonaCard: React.FC<PersonaCardProps> = ({
  id,
  title,
  description,
  gradientColors,
  selected,
  onPress,
  index,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stagger animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }, index * 40);
  }, []);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.card,
          selected && styles.cardSelected,
        ]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Orb image for each persona */}
        {(() => {
          const orbImages = {
            'calm': require('../../../assets/images/calmOrb.png'),
            'clear': require('../../../assets/images/clearOrb.png'),
            'gentle': require('../../../assets/images/gentleOrb.png'),
            'motivational': require('../../../assets/images/motivationalOrb.png'),
          };

          // Gradient colors for each persona
          const glowGradients = {
            'calm': ['rgba(1, 171, 123, 0.15)', 'rgba(59, 173, 230, 0.12)', 'rgba(0, 0, 0, 0)'],
            'clear': ['rgba(243, 197, 74, 0.15)', 'rgba(243, 197, 74, 0.12)', 'rgba(0, 0, 0, 0)'],
            'gentle': ['rgba(56, 189, 248, 0.15)', 'rgba(29, 78, 216, 0.12)', 'rgba(0, 0, 0, 0)'],
            'motivational': ['rgba(122, 31, 31, 0.15)', 'rgba(122, 31, 31, 0.12)', 'rgba(0, 0, 0, 0)'],
          };

          return (
            <>
              {/* Ambient field gradient behind everything - only show when selected */}
              {selected && (
                <LinearGradient
                  colors={glowGradients[id] || glowGradients['calm']}
                  locations={[0, 0.5, 1]}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}

              {/* Orb - always visible, opacity changes based on selection */}
              <Image
                source={orbImages[id] || orbImages['calm']}
                style={{
                  width: 99,
                  height: 99,
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  marginTop: -49.5,
                  marginLeft: -39.5, // Moved right by 10px (was -49.5)
                  opacity: selected ? 1 : 0.15,
                }}
              />
            </>
          );
        })()}
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface PersonaSelectionScreenProps {
  navigation?: any;
  onContinue?: (persona: string) => void;
  onBack?: () => void;
}

const PersonaSelectionScreen: React.FC<PersonaSelectionScreenProps> = ({
  navigation,
  onContinue,
  onBack,
}) => {
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Animation refs
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(8)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const screenFadeOut = useRef(new Animated.Value(1)).current;

  const personas = [
    {
      id: 'calm',
      title: 'Calm data driven',
      description: 'Focused on metrics and progress',
      gradientColors: ['#17D4D4', '#0E2230'] as [string, string],
    },
    {
      id: 'clear',
      title: 'Clear and concise',
      description: 'Straight to the point guidance',
      gradientColors: ['#F3C54A', '#4D3920'] as [string, string],
    },
    {
      id: 'gentle',
      title: 'Gentle accountability',
      description: 'Supportive and understanding',
      gradientColors: ['#7A1F1F', '#2A0C0C'] as [string, string],
    },
    {
      id: 'motivational',
      title: 'Motivational',
      description: 'Energetic and encouraging',
      gradientColors: ['#38BDF8', '#1D4ED8'] as [string, string],
    },
  ];

  useEffect(() => {
    // Animate header
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate CTA after delay
    setTimeout(() => {
      Animated.timing(ctaOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, 200);
  }, []);

  const handleContinue = () => {
    if (selectedPersona && !isTransitioning) {
      setIsTransitioning(true);

      // Simple fade out transition
      Animated.timing(screenFadeOut, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Transition complete, navigate to next screen
        if (onContinue) {
          onContinue(selectedPersona);
        } else if (navigation) {
          navigation.navigate('CoachIntro', { selectedPersona });
        }
      });
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <Animated.View style={{ opacity: screenFadeOut, flex: 1 }}>
        {/* Header with Back Button */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* Title Section */}
        <Animated.View
          style={[
            styles.titleSection,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          <Text style={styles.title}>Let's choose your AI coach's persona</Text>
          <Text style={styles.subtitle}>This determines how you will be coached</Text>
        </Animated.View>

        {/* Persona Grid */}
        <View style={styles.grid}>
          <PersonaCard
            {...personas[0]}
            selected={selectedPersona === personas[0].id}
            onPress={() => setSelectedPersona(personas[0].id)}
            index={0}
          />
          <View style={{ width: CARD_GAP }} />
          <PersonaCard
            {...personas[1]}
            selected={selectedPersona === personas[1].id}
            onPress={() => setSelectedPersona(personas[1].id)}
            index={1}
          />
          <View style={{ width: '100%', height: CARD_GAP }} />
          <PersonaCard
            {...personas[2]}
            selected={selectedPersona === personas[2].id}
            onPress={() => setSelectedPersona(personas[2].id)}
            index={2}
          />
          <View style={{ width: CARD_GAP }} />
          <PersonaCard
            {...personas[3]}
            selected={selectedPersona === personas[3].id}
            onPress={() => setSelectedPersona(personas[3].id)}
            index={3}
          />
        </View>
      </ScrollView>

      {/* Continue Button */}
      <Animated.View
        style={[
          styles.ctaContainer,
          {
            opacity: ctaOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedPersona && styles.continueButtonDisabled,
            { opacity: selectedPersona ? 1 : 0.5 },
          ]}
          onPress={handleContinue}
          disabled={!selectedPersona}
          activeOpacity={0.9}
        >
          <Text style={[
            styles.continueButtonText,
            !selectedPersona && styles.continueButtonTextDisabled,
          ]}>
            Continue
          </Text>
        </TouchableOpacity>
      </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerBar: {
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
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 0, // No need for top padding since header is separate
    paddingBottom: 100, // Space for fixed CTA
  },
  titleSection: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 24,
    fontStyle: 'normal',
    fontWeight: '500',
    lineHeight: 32,
    color: '#FAFAFA',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 24,
    color: '#FAFAFA',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12, // Further reduced to bring cards even closer to subtitle
    marginBottom: 40, // Balance spacing
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#171717',
    borderRadius: 14,
    borderWidth: 1.25,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: 12,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardSelected: {
    backgroundColor: '#262626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  orb: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
  },
  orbLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardTextContainer: {
    gap: 1,
    width: '100%',
    alignItems: 'flex-start',
    position: 'absolute',
    bottom: 15,
    left: 12,
    right: 12,
  },
  cardTitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    fontStyle: 'normal',
    fontWeight: '500',
    lineHeight: 20,
    color: '#FAFAFA',
  },
  cardDescription: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 16,
    color: '#A3A3A3',
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 34,
    backgroundColor: '#000000',
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
  continueButtonDisabled: {
    backgroundColor: '#3A3A3A',
  },
  continueButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#171717',
  },
  continueButtonTextDisabled: {
    color: '#9E9E9E',
  },
});

export default PersonaSelectionScreen;