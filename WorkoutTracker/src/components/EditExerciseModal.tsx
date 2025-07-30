// src/components/EditExerciseModal.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Types
interface Exercise {
  id: string;
  name: string;
  duration_seconds?: number;
  sets_count: number;
  reps_count: number;
}

interface EditExerciseModalProps {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
  onSave: (exerciseId: string, updates: {
    duration_seconds: number;
    sets_count: number;
    reps_count: number;
  }) => void;
}

const EditExerciseModal: React.FC<EditExerciseModalProps> = ({
  visible,
  exercise,
  onClose,
  onSave,
}) => {
  const [restTimer, setRestTimer] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');

  // Initialize form when exercise changes
  useEffect(() => {
    if (exercise) {
      setRestTimer((exercise.duration_seconds || 60).toString());
      setSets(exercise.sets_count.toString());
      setReps(exercise.reps_count.toString());
    }
  }, [exercise]);

  // Handle save
  const handleSave = () => {
    if (!exercise) return;

    const restSeconds = parseInt(restTimer) || 60;
    const setsCount = parseInt(sets) || 3;
    const repsCount = parseInt(reps) || 12;

    onSave(exercise.id, {
      duration_seconds: restSeconds,
      sets_count: setsCount,
      reps_count: repsCount,
    });

    onClose();
  };

  // Handle close
  const handleClose = () => {
    onClose();
  };

  if (!exercise) return null;

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
          <Text style={styles.title}>Edit Exercise</Text>

          {/* Rest Timer Section */}
          <View style={styles.section}>
            <Text style={styles.label}>Rest Timer:</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.restInput}
                value={restTimer}
                onChangeText={setRestTimer}
                placeholder="60"
                placeholderTextColor="#888888"
                keyboardType="numeric"
              />
              <Text style={styles.unitText}>seconds</Text>
            </View>
          </View>

          {/* Sets and Reps Section */}
          <View style={styles.section}>
            <View style={styles.setsRepsRow}>
              <View style={styles.setsRepsItem}>
                <Text style={styles.setsRepsLabel}>sets</Text>
                <TextInput
                  style={styles.setsRepsInput}
                  value={sets}
                  onChangeText={setSets}
                  placeholder="3"
                  placeholderTextColor="#888888"
                  keyboardType="numeric"
                />
              </View>
              
              <Text style={styles.multiplySymbol}>×</Text>
              
              <View style={styles.setsRepsItem}>
                <Text style={styles.setsRepsLabel}>reps</Text>
                <TextInput
                  style={styles.setsRepsInput}
                  value={reps}
                  onChangeText={setReps}
                  placeholder="12"
                  placeholderTextColor="#888888"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
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
    maxWidth: 330,
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
    marginBottom: 32,
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333333',
    flex: 1,
    marginRight: 12,
    height: 48,
  },
  unitText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
  },
  setsRepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setsRepsItem: {
    alignItems: 'center',
  },
  setsRepsLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    marginBottom: 8,
  },
  setsRepsInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333333',
    width: 100,
    height: 48,
    textAlign: 'center',
  },
  multiplySymbol: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
    marginHorizontal: 16,
    marginTop: 24, // Align with inputs (after label)
  },
  saveButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 32,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
});

export default EditExerciseModal;