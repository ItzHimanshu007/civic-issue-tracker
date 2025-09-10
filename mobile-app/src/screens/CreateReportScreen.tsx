import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { IssueCategory, Priority, CreateReportRequest } from '../types';
import { createReport } from '../services/reportsService';

interface Props {
  navigation: StackNavigationProp<any>;
}

const CreateReportScreen: React.FC<Props> = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>(IssueCategory.OTHER);
  const [priority, setPriority] = useState<Priority>(Priority.NORMAL);
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock location for now - in a real app this would come from GPS
  const mockLocation = {
    latitude: 40.7128 + Math.random() * 0.01,
    longitude: -74.0060 + Math.random() * 0.01,
  };

  const categories = [
    { value: IssueCategory.POTHOLE, label: 'Pothole' },
    { value: IssueCategory.STREETLIGHT, label: 'Street Light' },
    { value: IssueCategory.GARBAGE, label: 'Garbage' },
    { value: IssueCategory.WATER_LEAK, label: 'Water Leak' },
    { value: IssueCategory.SEWAGE, label: 'Sewage' },
    { value: IssueCategory.ROAD_MAINTENANCE, label: 'Road Maintenance' },
    { value: IssueCategory.TRAFFIC_SIGNAL, label: 'Traffic Signal' },
    { value: IssueCategory.PARK_MAINTENANCE, label: 'Park Maintenance' },
    { value: IssueCategory.NOISE_POLLUTION, label: 'Noise Pollution' },
    { value: IssueCategory.OTHER, label: 'Other' },
  ];

  const priorities = [
    { value: Priority.NORMAL, label: 'Normal' },
    { value: Priority.URGENT, label: 'Urgent' },
    { value: Priority.CRITICAL, label: 'Critical' },
  ];

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !address.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    const reportData: CreateReportRequest = {
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      location: mockLocation,
      address: address.trim(),
      images: [],
      videos: [],
      audioNotes: [],
    };

    try {
      const newReport = await createReport(reportData);
      Alert.alert(
        'Success!',
        `Your report "${newReport.title}" has been submitted successfully. It will appear in the admin portal immediately.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setTitle('');
              setDescription('');
              setCategory(IssueCategory.OTHER);
              setPriority(Priority.NORMAL);
              setAddress('');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to submit report: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Brief description of the issue"
          editable={!isSubmitting}
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Detailed description of the issue"
          multiline
          numberOfLines={4}
          editable={!isSubmitting}
        />

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryButton,
                category === cat.value && styles.categoryButtonActive,
              ]}
              onPress={() => setCategory(cat.value)}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  category === cat.value && styles.categoryButtonTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityContainer}>
          {priorities.map((prio) => (
            <TouchableOpacity
              key={prio.value}
              style={[
                styles.priorityButton,
                priority === prio.value && styles.priorityButtonActive,
              ]}
              onPress={() => setPriority(prio.value)}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  priority === prio.value && styles.priorityButtonTextActive,
                ]}
              >
                {prio.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Where is this issue located?"
          editable={!isSubmitting}
        />

        <View style={styles.locationInfo}>
          <Text style={styles.locationText}>
            📍 Location: {mockLocation.latitude.toFixed(4)}, {mockLocation.longitude.toFixed(4)}
          </Text>
          <Text style={styles.locationSubtext}>
            (In a real app, this would use your current GPS location)
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    color: '#2E7D32',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    marginBottom: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#2E7D32',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  priorityContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: '#2E7D32',
  },
  priorityButtonText: {
    fontSize: 16,
    color: '#666',
  },
  priorityButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  locationInfo: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  locationSubtext: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#aaa',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CreateReportScreen;
