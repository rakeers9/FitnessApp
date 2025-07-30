// src/components/ScheduleWorkoutModal.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Types
interface ScheduleWorkoutModalProps {
  visible: boolean;
  currentSchedule: string[];
  workoutName: string;
  onClose: () => void;
  onSave: (selectedDays: string[]) => void;
}

const DAYS_OF_WEEK = [
  { key: 'Monday', short: 'Mon', display: 'Monday' },
  { key: 'Tuesday', short: 'Tue', display: 'Tuesday' },
  { key: 'Wednesday', short: 'Wed', display: 'Wednesday' },
  { key: 'Thursday', short: 'Thu', display: 'Thursday' },
  { key: 'Friday', short: 'Fri', display: 'Friday' },
  { key: 'Saturday', short: 'Sat', display: 'Saturday' },
  { key: 'Sunday', short: 'Sun', display: 'Sunday' },
];

const ScheduleWorkoutModal: React.FC<ScheduleWorkoutModalProps> = ({
  visible,
  currentSchedule,
  workoutName,
  onClose,
  onSave,
}) => {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Initialize selected days when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedDays([...currentSchedule]);
    }
  }, [visible, currentSchedule]);

  // Toggle day selection
  const toggleDay = (day: string) => {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  // Handle save
  const handleSave = () => {
    onSave(selectedDays);
    onClose();
  };

  // Handle close
  const handleClose = () => {
    setSelectedDays([...currentSchedule]); // Reset to original
    onClose();
  };

  // Render day selector
  const renderDaySelector = (day: typeof DAYS_OF_WEEK[0]) => {
    const isSelected = selectedDays.includes(day.key);
    
    return (
      <TouchableOpacity
        key={day.key}
        style={[styles.daySelector, isSelected && styles.daySelectorSelected]}
        onPress={() => toggleDay(day.key)}
        activeOpacity={0.7}
      >
        <View style={styles.dayContent}>
          <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
            {day.display}
          </Text>
          {isSelected && (
            <View style={styles.checkContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#17D4D4" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Get selected days summary
  const getSelectedSummary = () => {
    if (selectedDays.length === 0) return 'No days selected';
    if (selectedDays.length === 7) return 'Every day';
    
    const shortDays = selectedDays
      .map(day => DAYS_OF_WEEK.find(d => d.key === day)?.short)
      .filter(Boolean);
    
    return shortDays.join(', ');
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={20} color="#888888" />
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>Schedule Workout</Text>
          <Text style={styles.subtitle}>{workoutName}</Text>

          {/* Selected Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryLabel}>Selected:</Text>
            <Text style={styles.summaryText}>{getSelectedSummary()}</Text>
          </View>

          {/* Days List */}
          <View style={styles.daysContainer}>
            {DAYS_OF_WEEK.map(day => renderDaySelector(day))}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={() => setSelectedDays([])}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#888888',
    textAlign: 'center',
    marginBottom: 24,
  },
  summaryContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666666',
    marginRight: 8,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#17D4D4',
    flex: 1,
  },
  daysContainer: {
    marginBottom: 32,
  },
  daySelector: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  daySelectorSelected: {
    borderColor: '#17D4D4',
    backgroundColor: '#F8FFFE',
  },
  dayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dayText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#333333',
  },
  dayTextSelected: {
    color: '#17D4D4',
    fontFamily: 'Poppins-SemiBold',
  },
  checkContainer: {
    marginLeft: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 32,
    paddingVertical: 14,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#888888',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#17D4D4',
    borderRadius: 32,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
});

export default ScheduleWorkoutModal;