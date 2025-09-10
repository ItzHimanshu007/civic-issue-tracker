import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Report, IssueCategory, Priority, ReportStatus } from '../types';
import { fetchReports } from '../services/reportsService';

const ReportsListScreen: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | null>(null);

  const categories = [
    { value: null, label: 'All' },
    { value: IssueCategory.POTHOLE, label: 'Potholes' },
    { value: IssueCategory.STREETLIGHT, label: 'Street Lights' },
    { value: IssueCategory.GARBAGE, label: 'Garbage' },
    { value: IssueCategory.WATER_LEAK, label: 'Water Leaks' },
    { value: IssueCategory.SEWAGE, label: 'Sewage' },
    { value: IssueCategory.OTHER, label: 'Other' },
  ];

  const loadReports = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      
      const filters = selectedCategory ? { category: selectedCategory } : undefined;
      const fetchedReports = await fetchReports(filters);
      
      setReports(fetchedReports);
    } catch (error) {
      Alert.alert('Error', 'Failed to load reports. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadReports(false);
  };

  const handleCategoryChange = (category: IssueCategory | null) => {
    setSelectedCategory(category);
  };

  useEffect(() => {
    loadReports();
  }, [selectedCategory]);

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return '#FFA726';
      case 'ACKNOWLEDGED':
        return '#42A5F5';
      case 'IN_PROGRESS':
        return '#AB47BC';
      case 'RESOLVED':
        return '#4CAF50';
      case 'CLOSED':
        return '#757575';
      default:
        return '#757575';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'CRITICAL':
        return '#F44336';
      case 'URGENT':
        return '#FF9800';
      case 'NORMAL':
        return '#4CAF50';
      default:
        return '#4CAF50';
    }
  };

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderReportItem = ({ item }: { item: Report }) => (
    <TouchableOpacity style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.badges}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.reportDescription} numberOfLines={3}>
        {item.description}
      </Text>
      
      <View style={styles.reportMeta}>
        <Text style={styles.category}>{formatCategory(item.category)}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.priorityText}>{item.priority}</Text>
        </View>
      </View>
      
      <View style={styles.reportFooter}>
        <Text style={styles.address}>📍 {item.address}</Text>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.engagement}>
        <Text style={styles.upvotes}>👍 {item.upvotes}</Text>
        <Text style={styles.user}>By: {item.user.name}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryFilter,
                selectedCategory === item.value && styles.categoryFilterActive,
              ]}
              onPress={() => handleCategoryChange(item.value)}
            >
              <Text
                style={[
                  styles.categoryFilterText,
                  selectedCategory === item.value && styles.categoryFilterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => `filter-${item.value || 'all'}`}
        />
      </View>

      {/* Reports List */}
      <FlatList
        data={reports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2E7D32']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No reports found</Text>
            <Text style={styles.emptySubtext}>
              {selectedCategory 
                ? `No reports in the ${formatCategory(selectedCategory)} category` 
                : 'Pull down to refresh or create a new report'
              }
            </Text>
          </View>
        }
      />
      
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {reports.length} report{reports.length !== 1 ? 's' : ''} 
          {selectedCategory && ` in ${formatCategory(selectedCategory)}`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  categoryFilterActive: {
    backgroundColor: '#2E7D32',
  },
  categoryFilterText: {
    fontSize: 14,
    color: '#666',
  },
  categoryFilterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reportTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  badges: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  reportDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  reportMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  address: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  engagement: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upvotes: {
    fontSize: 12,
    color: '#2E7D32',
  },
  user: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  statsBar: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default ReportsListScreen;
