// src/screens/main/SettingsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import * as StoreReview from 'expo-store-review';
import { supabase } from '../../services/supabase';

// Types
type SettingsScreenProps = {
  navigation: StackNavigationProp<any>;
};

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  unit_preference: 'kg' | 'lb';
  notifications_enabled: boolean;
  coach_id?: string;
  coach_name?: string;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [showEditEmailModal, setShowEditEmailModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  
  // Form states
  const [tempName, setTempName] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  
  // Loading states
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // FIXED: Get profile data first, then get coach info separately
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        // Get coach info separately if coach_id exists
        let coachName = undefined;
        if (data.coach_id) {
          const { data: coachData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', data.coach_id)
            .single();
          
          coachName = coachData?.full_name;
        }

        setProfile({
          id: data.id,
          full_name: data.full_name || 'User',
          email: data.email || user.email || '',
          avatar_url: data.avatar_url,
          unit_preference: data.unit_preference || 'kg',
          notifications_enabled: data.notifications_enabled || false,
          coach_id: data.coach_id,
          coach_name: coachName,
        });
      }
    } catch (error) {
      console.error('Error in loadProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle profile picture selection
  const handleSelectImage = () => {
    setShowImagePickerModal(true);
  };

  const pickImageFromLibrary = async () => {
    setShowImagePickerModal(false);
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images, // FIXED: Use MediaType instead of MediaTypeOptions
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadProfileImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    setShowImagePickerModal(false);
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaType.Images, // FIXED: Use MediaType instead of MediaTypeOptions
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadProfileImage(result.assets[0].uri);
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    try {
      setUploadingImage(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `avatar-${user.id}.jpg`,
      } as any);

      // Upload to Supabase storage
      const fileName = `avatar-${user.id}-${Date.now()}.jpg`;
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, formData);

      if (uploadError) {
        Alert.alert('Error', 'Failed to upload image. Please try again.');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        Alert.alert('Error', 'Failed to update profile picture.');
        return;
      }

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      Alert.alert('Success', 'Profile picture updated!');

    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle name change
  const handleSaveName = async () => {
    if (!tempName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: tempName.trim() })
        .eq('id', user.id);

      if (error) {
        Alert.alert('Error', 'Failed to update name. Please try again.');
        return;
      }

      setProfile(prev => prev ? { ...prev, full_name: tempName.trim() } : null);
      setShowEditNameModal(false);
      Alert.alert('Success', 'Name updated successfully!');

    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Failed to update name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle email change
  const handleSaveEmail = async () => {
    if (!tempEmail.trim()) {
      Alert.alert('Error', 'Email cannot be empty');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tempEmail.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setSaving(true);

      // Update auth email (requires re-authentication in production)
      const { error: authError } = await supabase.auth.updateUser({
        email: tempEmail.trim()
      });

      if (authError) {
        Alert.alert('Error', 'Failed to update email. You may need to re-authenticate.');
        return;
      }

      // Update profile email
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ email: tempEmail.trim() })
          .eq('id', user.id);

        if (profileError) {
          console.error('Error updating profile email:', profileError);
        }
      }

      setProfile(prev => prev ? { ...prev, email: tempEmail.trim() } : null);
      setShowEditEmailModal(false);
      Alert.alert('Success', 'Email update request sent! Please check your new email to confirm.');

    } catch (error) {
      console.error('Error updating email:', error);
      Alert.alert('Error', 'Failed to update email. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle unit preference toggle
  const handleUnitToggle = async (unit: 'kg' | 'lb') => {
    // Update local state immediately for better UX
    setProfile(prev => prev ? { ...prev, unit_preference: unit } : null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ unit_preference: unit })
        .eq('id', user.id);

      if (error) {
        // Revert local state on error
        const previousUnit = unit === 'kg' ? 'lb' : 'kg';
        setProfile(prev => prev ? { ...prev, unit_preference: previousUnit } : null);
        Alert.alert('Error', 'Failed to update unit preference');
        return;
      }

    } catch (error) {
      // Revert local state on error
      const previousUnit = unit === 'kg' ? 'lb' : 'kg';
      setProfile(prev => prev ? { ...prev, unit_preference: previousUnit } : null);
      console.error('Error updating unit preference:', error);
    }
  };

  // Handle notifications toggle
  const handleNotificationsToggle = async (enabled: boolean) => {
    // Update local state immediately for better UX
    setProfile(prev => prev ? { ...prev, notifications_enabled: enabled } : null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ notifications_enabled: enabled })
        .eq('id', user.id);

      if (error) {
        // Revert local state on error
        setProfile(prev => prev ? { ...prev, notifications_enabled: !enabled } : null);
        Alert.alert('Error', 'Failed to update notification settings');
        return;
      }

    } catch (error) {
      // Revert local state on error
      setProfile(prev => prev ? { ...prev, notifications_enabled: !enabled } : null);
      console.error('Error updating notifications:', error);
    }
  };

  // Handle coach management
  const handleManageCoach = () => {
    if (profile?.coach_id) {
      Alert.alert(
        'Coach Connected',
        `You're currently connected with ${profile.coach_name || 'your coach'}. What would you like to do?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disconnect Coach', style: 'destructive', onPress: handleDisconnectCoach },
        ]
      );
    } else {
      Alert.alert('No Coach', 'You don\'t have a coach connected yet. This feature will be available soon!');
    }
  };

  const handleDisconnectCoach = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ coach_id: null })
        .eq('id', user.id);

      if (error) {
        Alert.alert('Error', 'Failed to disconnect coach');
        return;
      }

      setProfile(prev => prev ? { ...prev, coach_id: undefined, coach_name: undefined } : null);
      Alert.alert('Success', 'Coach disconnected successfully');

    } catch (error) {
      console.error('Error disconnecting coach:', error);
    }
  };

  // Handle contact support
  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'How would you like to get in touch?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Email Support', onPress: () => Linking.openURL('mailto:support@yourapp.com') },
        { text: 'Visit Help Center', onPress: () => Linking.openURL('https://yourapp.com/help') },
      ]
    );
  };

  // Handle rate us
  const handleRateUs = async () => {
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
      } else {
        // Fallback to app store link
        const storeUrl = Platform.OS === 'ios' 
          ? 'https://apps.apple.com/app/your-app-id'
          : 'https://play.google.com/store/apps/details?id=your.package.name';
        await Linking.openURL(storeUrl);
      }
    } catch (error) {
      console.error('Error requesting review:', error);
    }
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              // Navigation will be handled by auth state change
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          }
        },
      ]
    );
  };

  // Handle delete account
  const handleDeleteAccount = () => {
    setShowDeleteAccountModal(true);
  };

  const confirmDeleteAccount = async () => {
    try {
      setSaving(true);
      
      // In a real app, you'd call a backend function to handle account deletion
      // This is a simplified version
      Alert.alert(
        'Account Deletion',
        'Account deletion requests are processed within 24-48 hours. Your data will be permanently removed.',
        [{ text: 'OK' }]
      );
      
      setShowDeleteAccountModal(false);
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'Failed to process deletion request. Please contact support.');
    } finally {
      setSaving(false);
    }
  };

  // Navigation
  const handleBack = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          
          {/* Profile Picture */}
          <TouchableOpacity style={styles.settingsRow} onPress={handleSelectImage}>
            <View style={styles.rowLeft}>
              <View style={styles.avatarContainer}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={24} color="#888888" />
                  </View>
                )}
                {uploadingImage && (
                  <View style={styles.uploadingOverlay}>
                    <Text style={styles.uploadingText}>...</Text>
                  </View>
                )}
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Profile Picture</Text>
                <Text style={styles.rowSubtitle}>Tap to change</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>

          {/* Name */}
          <TouchableOpacity 
            style={styles.settingsRow} 
            onPress={() => {
              setTempName(profile?.full_name || '');
              setShowEditNameModal(true);
            }}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="person-outline" size={20} color="#17D4D4" style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <View style={styles.rowTitleContainer}>
                  <Text style={styles.rowTitle}>Name</Text>
                  <Text style={styles.rowValue}>{profile?.full_name}</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>

          {/* Email */}
          <TouchableOpacity 
            style={styles.settingsRow} 
            onPress={() => {
              setTempEmail(profile?.email || '');
              setShowEditEmailModal(true);
            }}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="mail-outline" size={20} color="#17D4D4" style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <View style={styles.rowTitleContainer}>
                  <Text style={styles.rowTitle}>Email</Text>
                  <Text style={styles.rowValue}>{profile?.email}</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          {/* Unit System */}
          <View style={styles.settingsRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="scale-outline" size={20} color="#17D4D4" style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Unit System</Text>
                <Text style={styles.rowSubtitle}>Weight measurement</Text>
              </View>
            </View>
            <View style={styles.unitToggle}>
              <TouchableOpacity
                style={[
                  styles.unitOption,
                  profile?.unit_preference === 'kg' && styles.unitOptionSelected
                ]}
                onPress={() => handleUnitToggle('kg')}
              >
                <Text style={[
                  styles.unitText,
                  profile?.unit_preference === 'kg' && styles.unitTextSelected
                ]}>kg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitOption,
                  profile?.unit_preference === 'lb' && styles.unitOptionSelected
                ]}
                onPress={() => handleUnitToggle('lb')}
              >
                <Text style={[
                  styles.unitText,
                  profile?.unit_preference === 'lb' && styles.unitTextSelected
                ]}>lb</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.settingsRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={20} color="#17D4D4" style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Notifications</Text>
                <Text style={styles.rowSubtitle}>Workout reminders</Text>
              </View>
            </View>
            <Switch
              value={profile?.notifications_enabled || false}
              onValueChange={(value) => handleNotificationsToggle(value)}
              trackColor={{ false: '#E0E0E0', true: '#17D4D4' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E0E0E0"
              style={styles.switch}
            />
          </View>
        </View>

        {/* Coach Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coach</Text>
          
          <TouchableOpacity style={styles.settingsRow} onPress={handleManageCoach}>
            <View style={styles.rowLeft}>
              <Ionicons name="people-outline" size={20} color="#17D4D4" style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Manage Coach</Text>
                <Text style={styles.rowSubtitle}>
                  {profile?.coach_id ? `Connected: ${profile.coach_name}` : 'No coach connected'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity style={styles.settingsRow} onPress={handleContactSupport}>
            <View style={styles.rowLeft}>
              <Ionicons name="help-circle-outline" size={20} color="#17D4D4" style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Contact Support</Text>
                <Text style={styles.rowSubtitle}>Get help</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsRow} onPress={handleRateUs}>
            <View style={styles.rowLeft}>
              <Ionicons name="star-outline" size={20} color="#17D4D4" style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Love FL? Rate Us</Text>
                <Text style={styles.rowSubtitle}>Share your feedback</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.settingsRow} onPress={handleLogout}>
            <View style={styles.rowLeft}>
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, styles.destructiveText]}>Log Out</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsRow} onPress={handleDeleteAccount}>
            <View style={styles.rowLeft}>
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, styles.destructiveText]}>Delete Account</Text>
                <Text style={styles.rowSubtitle}>Permanently remove your account</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Name</Text>
            <TextInput
              style={styles.modalInput}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Enter your name"
              maxLength={50}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setShowEditNameModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
                onPress={handleSaveName}
                disabled={saving}
              >
                <Text style={styles.modalSaveText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Email Modal */}
      <Modal
        visible={showEditEmailModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Change Email</Text>
            <TextInput
              style={styles.modalInput}
              value={tempEmail}
              onChangeText={setTempEmail}
              placeholder="Enter new email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <Text style={styles.modalNote}>
              You'll need to confirm your new email address.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setShowEditEmailModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
                onPress={handleSaveEmail}
                disabled={saving}
              >
                <Text style={styles.modalSaveText}>
                  {saving ? 'Updating...' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePickerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imagePickerModal}>
            <Text style={styles.modalTitle}>Change Profile Picture</Text>
            <TouchableOpacity style={styles.imagePickerOption} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color="#17D4D4" />
              <Text style={styles.imagePickerText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imagePickerOption} onPress={pickImageFromLibrary}>
              <Ionicons name="images" size={24} color="#17D4D4" />
              <Text style={styles.imagePickerText}>Choose from Library</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.imagePickerCancel} 
              onPress={() => setShowImagePickerModal(false)}
            >
              <Text style={styles.imagePickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteAccountModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Ionicons name="warning" size={48} color="#FF6B6B" style={styles.warningIcon} />
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.deleteWarningText}>
              This action cannot be undone. All your workout data, progress, and account information will be permanently deleted.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setShowDeleteAccountModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalDeleteButton, saving && styles.modalSaveButtonDisabled]}
                onPress={confirmDeleteAccount}
                disabled={saving}
              >
                <Text style={styles.modalDeleteText}>
                  {saving ? 'Processing...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Sections
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  
  // Settings Rows
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: 16, // Increased from 12 for better spacing
    width: 20, // Fixed width for consistent alignment
  },
  rowContent: {
    flex: 1,
  },
  rowTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginRight: 8,
  },
  rowValue: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
    flex: 1,
  },
  rowSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  destructiveText: {
    color: '#FF6B6B',
  },
  
  // Avatar
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  
  // Unit Toggle
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
    padding: 2,
    width: 80,
    height: 36,
  },
  unitOption: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginHorizontal: 1,
  },
  unitOptionSelected: {
    backgroundColor: '#17D4D4',
    shadowColor: '#17D4D4',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  unitText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666666',
  },
  unitTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  
  // Switch
  switch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    height: 48,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    marginBottom: 12,
  },
  modalNote: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginRight: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#666666',
  },
  modalSaveButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#17D4D4',
    borderRadius: 12,
    marginLeft: 8,
  },
  modalSaveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  modalSaveText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  modalDeleteButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    marginLeft: 8,
  },
  modalDeleteText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  
  // Image Picker Modal
  imagePickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  imagePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 12,
  },
  imagePickerText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#000000',
    marginLeft: 12,
  },
  imagePickerCancel: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  imagePickerCancelText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#666666',
  },
  
  // Delete Account Warning
  warningIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  deleteWarningText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  
  bottomSpacing: {
    height: 40,
  },
});

export default SettingsScreen;