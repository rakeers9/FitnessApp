// src/screens/main/AITrainerScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAITrainer, ChatMessage, UserPlanInfo } from '../../context/AITrainerContext';
import aiService, { QuickReply, AIServiceResponse } from '../../services/aiService';
import QuickReplyButtons from '../../components/QuickReplyButtons';

// Navigation props type
type AITrainerScreenProps = {
  navigation: StackNavigationProp<any>;
};

const AITrainerScreen: React.FC<AITrainerScreenProps> = ({ navigation }) => {
  const {
    messages,
    isLoading,
    hasShownHealthDisclaimer,
    conversationState,
    userPlanInfo,
    currentPlanDraft,
    addMessage,
    setIsLoading,
    dismissHealthDisclaimer,
    saveConversation,
    setConversationState,
    updateUserPlanInfo,
    setPlanDraft,
    clearChat,
    restartAI,
  } = useAITrainer();
  
  const [inputText, setInputText] = useState('');
  const [currentQuickReplies, setCurrentQuickReplies] = useState<QuickReply[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Add welcome message if no conversation exists
    if (messages.length === 0) {
      addWelcomeMessage();
    }
  }, [messages.length]);

  const addWelcomeMessage = () => {
    addMessage({
      content: "Hi! I'm your AI fitness trainer. I can help you with workout advice, create personalized training plans, and answer any fitness questions you have. What would you like to work on today?",
      sender: 'ai',
    });
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputText.trim();
    if (!textToSend || isLoading) return;

    // Add user message
    addMessage({
      content: textToSend,
      sender: 'user',
    });

    // Clear input and quick replies
    setInputText('');
    setCurrentQuickReplies([]);
    setIsLoading(true);

    try {
      // Process message with AI service
      const aiResponse = await aiService.processMessage(
        textToSend,
        conversationState,
        messages,
        userPlanInfo
      );

      await processAIResponse(aiResponse);
    } catch (error) {
      console.error('Error processing message:', error);
      
      addMessage({
        content: "I'm experiencing some technical difficulties right now. Please try again in a moment, or feel free to ask me any fitness questions!",
        sender: 'ai',
      });
      
      setIsLoading(false);
    }
  };

  // Handle sending message with updated user info (for quick replies)
  const handleSendMessageWithInfo = async (messageText: string, infoUpdate: Partial<UserPlanInfo>) => {
    if (!messageText || isLoading) return;

    // Update user info first
    updateUserPlanInfo(infoUpdate);

    // Add user message
    addMessage({
      content: messageText,
      sender: 'user',
    });

    // Clear input and quick replies
    setInputText('');
    setCurrentQuickReplies([]);
    setIsLoading(true);

    try {
      // Create updated userPlanInfo object for AI processing
      const updatedUserPlanInfo = { ...userPlanInfo, ...infoUpdate };

      // Process message with AI service using updated info
      const aiResponse = await aiService.processMessage(
        messageText,
        conversationState,
        messages,
        updatedUserPlanInfo
      );

      await processAIResponse(aiResponse);
    } catch (error) {
      console.error('Error processing message with info:', error);
      
      addMessage({
        content: "I'm experiencing some technical difficulties right now. Please try again in a moment, or feel free to ask me any fitness questions!",
        sender: 'ai',
      });
      
      setIsLoading(false);
    }
  };

  // Process AI response (common logic)
  const processAIResponse = async (aiResponse: AIServiceResponse) => {
    // Add AI response
    addMessage({
      content: aiResponse.content,
      sender: 'ai',
      metadata: aiResponse.metadata,
    });

    // Update conversation state if provided
    if (aiResponse.newState) {
      setConversationState(aiResponse.newState);
    }

    // Update user plan info if provided
    if (aiResponse.userInfoUpdates) {
      updateUserPlanInfo(aiResponse.userInfoUpdates);
    }

    // Set quick replies if provided
    if (aiResponse.quickReplies) {
      setCurrentQuickReplies(aiResponse.quickReplies);
    }

    // Handle plan data if provided
    if (aiResponse.planData) {
      setPlanDraft(aiResponse.planData);
      setConversationState('PLAN_PERSISTING');
      
      // Show plan confirmation
      setTimeout(() => {
        addMessage({
          content: "Perfect! I've saved your workout plan to your calendar. You'll see the scheduled workouts marked on your calendar, and you can start following your program right away!\n\nI've designed this plan specifically for your goals and schedule. Feel free to ask me any questions about how to follow it, or if you'd like to make any adjustments.",
          sender: 'ai',
        });
        setConversationState('PLAN_EXPLAINED');
        setCurrentQuickReplies([]);
      }, 2000);
    }

    setIsLoading(false);
    
    // Save conversation to database
    await saveConversation();
  };

  // Handle quick reply button press
  const handleQuickReply = async (reply: QuickReply) => {
    // Handle different quick reply actions
    switch (reply.action) {
      case 'CONFIRM_PLAN':
        await handleSendMessage(reply.text);
        break;
      
      case 'DECLINE_PLAN':
        await handleSendMessage(reply.text);
        break;
      
      case 'CONFIRM_STOP':
        await handleSendMessage(reply.text);
        break;
      
      case 'DECLINE_STOP':
        await handleSendMessage(reply.text);
        break;
      
      case 'SET_GOAL':
        await handleSendMessageWithInfo(`My goal is ${reply.data}`, { goal: reply.data });
        break;
      
      case 'SET_EXPERIENCE':
        await handleSendMessageWithInfo(`I'm a ${reply.data}`, { experience: reply.data });
        break;
      
      case 'SET_DAYS':
        await handleSendMessageWithInfo(`I can work out ${reply.data} days per week`, { daysPerWeek: reply.data });
        break;
      
      case 'SET_SESSION_LENGTH':
        await handleSendMessageWithInfo(`I want ${reply.data} minute sessions`, { sessionLength: reply.data });
        break;
      
      case 'SET_EQUIPMENT':
        const equipmentText = reply.data.includes('gym') ? 'a full gym' : reply.data.join(' and ');
        await handleSendMessageWithInfo(`I have access to ${equipmentText}`, { equipment: reply.data });
        break;
      
      default:
        await handleSendMessage(reply.text);
        break;
    }
  };

  // Menu action handlers
  const handleClearChat = () => {
    setShowMenu(false);
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear the conversation? This will remove all messages but keep your preferences.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            clearChat();
            addWelcomeMessage();
          }
        }
      ]
    );
  };

  const handleRestartAI = () => {
    setShowMenu(false);
    Alert.alert(
      'Restart AI',
      'This will completely reset the AI trainer, clearing all conversation history and preferences. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restart', 
          style: 'destructive',
          onPress: () => {
            restartAI();
            setCurrentQuickReplies([]);
            setTimeout(addWelcomeMessage, 500);
          }
        }
      ]
    );
  };

  const handleReportConversation = () => {
    setShowMenu(false);
    Alert.alert(
      'Report Conversation',
      'Report this conversation for inappropriate content or technical issues.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Report', 
          onPress: () => {
            // TODO: Implement actual reporting mechanism
            Alert.alert('Reported', 'Thank you for your report. We will review this conversation.');
          }
        }
      ]
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText]}>
            {item.content}
          </Text>
        </View>
        <Text style={[styles.messageTime, isUser ? styles.userMessageTime : styles.aiMessageTime]}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AI Trainer</Text>
          <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Health Disclaimer */}
        {!hasShownHealthDisclaimer && (
          <View style={styles.disclaimerContainer}>
            <View style={styles.disclaimer}>
              <Ionicons name="information-circle" size={16} color="#0D9488" />
              <Text style={styles.disclaimerText}>
                I'm an AI assistant and not a medical professional. Always consider your personal health history and consult a qualified professional before starting a new program.
              </Text>
              <TouchableOpacity 
                onPress={dismissHealthDisclaimer}
                style={styles.dismissButton}
              >
                <Ionicons name="close" size={16} color="#6E6E6E" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Messages */}
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            // Auto-scroll to bottom when new messages arrive
            if (messages.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }
          }}
          ref={flatListRef}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>AI is typing...</Text>
            </View>
          </View>
        )}

        {/* Quick Reply Buttons */}
        {currentQuickReplies.length > 0 && (
          <QuickReplyButtons
            quickReplies={currentQuickReplies}
            onQuickReply={handleQuickReply}
            disabled={isLoading}
          />
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask me about workouts, nutrition, or training..."
              placeholderTextColor="#999999"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onSubmitEditing={() => handleSendMessage()}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={(!inputText.trim() || isLoading) ? "#CCCCCC" : "#FFFFFF"} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Modal */}
        <Modal
          visible={showMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            onPress={() => setShowMenu(false)}
            activeOpacity={1}
          >
            <View style={styles.menuModal}>
              <TouchableOpacity style={styles.menuItem} onPress={handleClearChat}>
                <Ionicons name="trash-outline" size={20} color="#000000" />
                <Text style={styles.menuItemText}>Clear Chat</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity style={styles.menuItem} onPress={handleRestartAI}>
                <Ionicons name="refresh-outline" size={20} color="#000000" />
                <Text style={styles.menuItemText}>Restart AI</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity style={styles.menuItem} onPress={handleReportConversation}>
                <Ionicons name="flag-outline" size={20} color="#FF3B3B" />
                <Text style={[styles.menuItemText, styles.menuItemDanger]}>Report Conversation</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
  },
  menuButton: {
    padding: 4,
  },
  
  // Health Disclaimer
  disclaimerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  disclaimer: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#0F766E',
    marginLeft: 8,
    marginRight: 8,
    lineHeight: 16,
  },
  dismissButton: {
    padding: 2,
  },
  
  // Messages
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: '#17D4D4',
  },
  aiBubble: {
    backgroundColor: '#F5F5F5',
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  aiMessageText: {
    color: '#000000',
  },
  messageTime: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#999999',
    marginTop: 4,
  },
  userMessageTime: {
    alignSelf: 'flex-end',
  },
  aiMessageTime: {
    alignSelf: 'flex-start',
  },
  
  // Loading
  loadingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  typingIndicator: {
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  typingText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    fontStyle: 'italic',
  },
  
  // Input
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8F8F8',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    maxHeight: 100,
    paddingVertical: 8,
    textAlignVertical: 'center',
  },
  sendButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },

  // Menu Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 20,
  },
  menuModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    marginLeft: 12,
  },
  menuItemDanger: {
    color: '#FF3B3B',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
});

export default AITrainerScreen;
