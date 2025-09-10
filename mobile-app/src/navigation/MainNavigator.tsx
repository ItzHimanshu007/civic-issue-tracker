import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MainTabParamList } from '../types';
import ReportsListScreen from '../screens/ReportsListScreen';
import CreateReportScreen from '../screens/CreateReportScreen';
import { useNavigation } from '@react-navigation/native';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator();

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [recentReports, setRecentReports] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Sample data with Indian civic issues and varying upvotes
  const sampleReports = [
    {
      id: 'home-1',
      title: '🚧 रांची में बड़ा गड्ढा',
      description: 'Main Road Ranchi में बहुत बड़ा गड्ढा है जो दुर्घटना का कारण बन रहा है।',
      category: 'POTHOLE',
      priority: 'URGENT',
      status: 'SUBMITTED',
      upvotes: 142,
      hasUserUpvoted: false,
      address: 'Main Road, Ranchi, Jharkhand 834001',
      user: { name: 'राजेस कुमार' },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'home-2', 
      title: '💡 Street Light Issue in Morabadi',
      description: 'मोराबादी क्षेत्र में लगभग 10 स्ट्रीट लाइट्स खराब हैं। रात में अंधेरा होजाता है।',
      category: 'STREETLIGHT',
      priority: 'NORMAL',
      status: 'ACKNOWLEDGED',
      upvotes: 89,
      hasUserUpvoted: true,
      address: 'Morabadi, Ranchi, Jharkhand 834001',
      user: { name: 'सुनीता देवी' },
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'home-3',
      title: '🗑️ Garbage Collection Problem',
      description: 'Hatia area में कूड़ा इकट्ठा नहीं हो रहा 1 सप्ताह से। बहुत बदबू आ रही है।',
      category: 'GARBAGE',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      upvotes: 76,
      hasUserUpvoted: false,
      address: 'Hatia, Ranchi, Jharkhand 834003',
      user: { name: 'अनिल प्रसाद' },
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'home-4',
      title: '💧 Water Leakage at Upper Bazaar',
      description: 'Upper Bazaar में मुख्य पानी की पाइप से पानी लीक हो रहा है। पानी वेस्ट हो रहा है।',
      category: 'WATER_LEAK',
      priority: 'URGENT',
      status: 'SUBMITTED',
      upvotes: 63,
      hasUserUpvoted: false,
      address: 'Upper Bazaar, Ranchi, Jharkhand 834001',
      user: { name: 'प्रीति मिश्रा' },
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'home-5',
      title: '🚦 Traffic Light Not Working',
      description: 'Jamshedpur Sakchi के मुख्य चौराहे पर ट्रैफिक लाइट खराब है। जाम की समस्या हो रही है।',
      category: 'TRAFFIC_SIGNAL',
      priority: 'NORMAL',
      status: 'RESOLVED',
      upvotes: 45,
      hasUserUpvoted: false,
      address: 'Sakchi, Jamshedpur, Jharkhand 831001',
      user: { name: 'राम कृष्ण मुंडा' },
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  React.useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setRecentReports(sampleReports.sort((a, b) => b.upvotes - a.upvotes));
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleUpvote = (reportId: string) => {
    setRecentReports(prev => 
      prev.map(report => {
        if (report.id === reportId) {
          return {
            ...report,
            upvotes: report.hasUserUpvoted ? report.upvotes - 1 : report.upvotes + 1,
            hasUserUpvoted: !report.hasUserUpvoted
          };
        }
        return report;
      }).sort((a, b) => b.upvotes - a.upvotes)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return '#FFA726';
      case 'ACKNOWLEDGED': return '#42A5F5';
      case 'IN_PROGRESS': return '#AB47BC';
      case 'RESOLVED': return '#4CAF50';
      case 'CLOSED': return '#757575';
      default: return '#757575';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return '#F44336';
      case 'URGENT': return '#FF9800';
      case 'NORMAL': return '#4CAF50';
      default: return '#4CAF50';
    }
  };

  const renderReportItem = ({ item }: { item: any }) => (
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
      
      <Text style={styles.reportDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.reportMeta}>
        <Text style={styles.category}>{item.category.replace('_', ' ')}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.priorityText}>{item.priority}</Text>
        </View>
      </View>
      
      <View style={styles.reportFooter}>
        <Text style={styles.address} numberOfLines={1}>
          📍 {item.address}
        </Text>
      </View>
      
      <View style={styles.engagement}>
        <TouchableOpacity 
          style={styles.upvoteButton} 
          onPress={() => handleUpvote(item.id)}
        >
          <MaterialIcons 
            name={item.hasUserUpvoted ? 'thumb-up' : 'thumb-up-alt'} 
            size={20} 
            color={item.hasUserUpvoted ? '#2E7D32' : '#666'} 
          />
          <Text style={[styles.upvotes, item.hasUserUpvoted && styles.upvotedText]}>
            {item.upvotes}
          </Text>
        </TouchableOpacity>
        <Text style={styles.user}>By: {item.user.name}</Text>
      </View>
    </TouchableOpacity>
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏘️ Recent Issues</Text>
        <Text style={styles.subtitle}>Most upvoted civic problems</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.createButton} 
        onPress={() => navigation.navigate('CreateReport')}
      >
        <MaterialIcons name="add-circle" size={24} color="#fff" />
        <Text style={styles.createButtonText}>Report New Issue</Text>
      </TouchableOpacity>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>🔍 Loading recent issues...</Text>
        </View>
      ) : (
        <FlatList
          data={recentReports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const MapScreen: React.FC = () => {
  const [mapData, setMapData] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Jharkhand cities with issue density data
  const jharkhandHeatMapData = [
    {
      city: 'Ranchi',
      latitude: 23.3441,
      longitude: 85.3096,
      issues: 89,
      severity: 'high',
      topIssues: ['Potholes', 'Street Lights', 'Garbage']
    },
    {
      city: 'Jamshedpur',
      latitude: 22.7596,
      longitude: 86.1517,
      issues: 67,
      severity: 'medium',
      topIssues: ['Traffic', 'Water Leakage', 'Road Maintenance']
    },
    {
      city: 'Dhanbad',
      latitude: 23.7928,
      longitude: 86.4346,
      issues: 54,
      severity: 'medium',
      topIssues: ['Air Pollution', 'Sewage', 'Noise']
    },
    {
      city: 'Bokaro',
      latitude: 23.6693,
      longitude: 86.1511,
      issues: 43,
      severity: 'low',
      topIssues: ['Park Maintenance', 'Street Lights']
    },
    {
      city: 'Deoghar',
      latitude: 24.4823,
      longitude: 86.7033,
      issues: 31,
      severity: 'low',
      topIssues: ['Water Supply', 'Road Maintenance']
    },
    {
      city: 'Hazaribagh',
      latitude: 23.9929,
      longitude: 85.3594,
      issues: 28,
      severity: 'low',
      topIssues: ['Garbage Collection', 'Street Lights']
    }
  ];

  React.useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setMapData(jharkhandHeatMapData);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const getSeveritySize = (issues: number) => {
    if (issues > 80) return 60;
    if (issues > 50) return 50;
    if (issues > 30) return 40;
    return 30;
  };

  const renderHeatMapItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.heatMapCard}>
      <View style={styles.heatMapHeader}>
        <View 
          style={[
            styles.severityIndicator, 
            { 
              backgroundColor: getSeverityColor(item.severity),
              width: getSeveritySize(item.issues),
              height: getSeveritySize(item.issues)
            }
          ]}
        >
          <Text style={styles.issueCount}>{item.issues}</Text>
        </View>
        <View style={styles.cityInfo}>
          <Text style={styles.cityName}>{item.city}</Text>
          <Text style={styles.coordinates}>
            📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
          </Text>
          <Text style={[styles.severityText, { color: getSeverityColor(item.severity) }]}>
            {item.severity.toUpperCase()} DENSITY
          </Text>
        </View>
      </View>
      
      <View style={styles.topIssues}>
        <Text style={styles.topIssuesLabel}>Top Issues:</Text>
        <View style={styles.issueTagsContainer}>
          {item.topIssues.map((issue: string, index: number) => (
            <View key={index} style={styles.issueTag}>
              <Text style={styles.issueTagText}>{issue}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Jharkhand Heat Map</Text>
        <Text style={styles.subtitle}>Civic issue density across major cities</Text>
      </View>
      
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Issue Density:</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>High (80+)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendText}>Medium (30-80)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Low (<30)</Text>
          </View>
        </View>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>🗺️ Loading heat map data...</Text>
        </View>
      ) : (
        <FlatList
          data={mapData}
          renderItem={renderHeatMapItem}
          keyExtractor={(item) => item.city}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      <View style={styles.totalStats}>
        <Text style={styles.totalStatsText}>
          Total Issues: {mapData.reduce((sum, item) => sum + item.issues, 0)}
        </Text>
      </View>
    </View>
  );
};

const ReportsScreen: React.FC = () => {
  return <ReportsListScreen />;
};

const ProfileScreen: React.FC = () => {
  const [userData, setUserData] = React.useState<any>(null);
  const [leaderboardData, setLeaderboardData] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Current user data
  const currentUser = {
    id: 'user-1',
    name: 'राज कुमार',
    avatar: '👤',
    totalReports: 8,
    totalUpvotes: 156,
    points: 324,
    rank: 3,
    badges: [
      { name: 'First Reporter', emoji: '🥇', description: 'Submitted your first report' },
      { name: 'Community Hero', emoji: '🦸', description: 'Received 100+ upvotes' },
      { name: 'City Guardian', emoji: '🏛️', description: 'Reported 5+ different issue types' },
      { name: 'Active Citizen', emoji: '⚡', description: 'Reported issues for 3+ weeks' }
    ]
  };

  // Fake leaderboard data
  const fakeLeaderboard = [
    {
      id: 'user-2',
      name: 'सुनीता देवी',
      avatar: '👩',
      totalReports: 15,
      totalUpvotes: 289,
      points: 445,
      rank: 1,
      badges: ['🥇', '🦸', '🏛️', '⚡', '🌟']
    },
    {
      id: 'user-3',
      name: 'अनिल प्रसाद',
      avatar: '👨',
      totalReports: 12,
      totalUpvotes: 234,
      points: 378,
      rank: 2,
      badges: ['🥇', '🦸', '🏛️', '⚡']
    },
    {
      id: 'user-1',
      name: 'राज कुमार',
      avatar: '👤',
      totalReports: 8,
      totalUpvotes: 156,
      points: 324,
      rank: 3,
      badges: ['🥇', '🦸', '🏛️', '⚡']
    },
    {
      id: 'user-4',
      name: 'प्रीति मिश्रा',
      avatar: '👩‍💼',
      totalReports: 6,
      totalUpvotes: 142,
      points: 298,
      rank: 4,
      badges: ['🥇', '🦸', '🏛️']
    },
    {
      id: 'user-5',
      name: 'राम कृष्ण मुंडा',
      avatar: '👨‍🦳',
      totalReports: 5,
      totalUpvotes: 98,
      points: 203,
      rank: 5,
      badges: ['🥇', '🦸']
    },
    {
      id: 'user-6',
      name: 'कमला शर्मा',
      avatar: '👵',
      totalReports: 4,
      totalUpvotes: 76,
      points: 154,
      rank: 6,
      badges: ['🥇']
    },
    {
      id: 'user-7',
      name: 'विकास सिंह',
      avatar: '👨‍💻',
      totalReports: 3,
      totalUpvotes: 45,
      points: 93,
      rank: 7,
      badges: ['🥇']
    }
  ];

  React.useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setUserData(currentUser);
      setLeaderboardData(fakeLeaderboard);
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return '#2E7D32';
    }
  };

  const renderLeaderboardItem = ({ item, index }: { item: any; index: number }) => {
    const isCurrentUser = item.id === 'user-1';
    return (
      <View style={[
        styles.leaderboardItem, 
        isCurrentUser && styles.currentUserItem
      ]}>
        <View style={styles.rankContainer}>
          <View style={[styles.rankCircle, { backgroundColor: getRankColor(item.rank) }]}>
            <Text style={styles.rankText}>#{item.rank}</Text>
          </View>
        </View>
        <View style={styles.userContainer}>
          <Text style={styles.userAvatar}>{item.avatar}</Text>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, isCurrentUser && styles.currentUserName]}>
              {item.name} {isCurrentUser && '(You)'}
            </Text>
            <View style={styles.userStats}>
              <Text style={styles.statText}>📝 {item.totalReports} reports</Text>
              <Text style={styles.statText}>👍 {item.totalUpvotes} upvotes</Text>
            </View>
          </View>
        </View>
        <View style={styles.pointsContainer}>
          <Text style={styles.points}>{item.points}</Text>
          <Text style={styles.pointsLabel}>points</Text>
          <View style={styles.badgeRow}>
            {item.badges.map((badge: string, idx: number) => (
              <Text key={idx} style={styles.badgeIcon}>{badge}</Text>
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>👑 Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* User Profile Section */}
      <View style={styles.profileHeader}>
        <View style={styles.profileAvatar}>
          <Text style={styles.avatarText}>{userData?.avatar}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{userData?.name}</Text>
          <Text style={styles.profileTitle}>Active Citizen • Rank #{userData?.rank}</Text>
          <View style={styles.profileStats}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userData?.totalReports}</Text>
              <Text style={styles.statLabel}>Reports</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userData?.totalUpvotes}</Text>
              <Text style={styles.statLabel}>Upvotes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userData?.points}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Badges Section */}
      <View style={styles.badgesSection}>
        <Text style={styles.sectionTitle}>🏆 Your Badges</Text>
        <View style={styles.badgeGrid}>
          {userData?.badges.map((badge: any, index: number) => (
            <View key={index} style={styles.badgeCard}>
              <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
              <Text style={styles.badgeName}>{badge.name}</Text>
              <Text style={styles.badgeDescription}>{badge.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Leaderboard Section */}
      <View style={styles.leaderboardSection}>
        <Text style={styles.sectionTitle}>👑 Community Leaderboard</Text>
        <Text style={styles.sectionSubtitle}>Top citizens making a difference</Text>
        <FlatList
          data={leaderboardData}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View style={styles.footerSection}>
        <Text style={styles.footerText}>
          Keep reporting civic issues to climb the leaderboard! 🚀
        </Text>
      </View>
    </ScrollView>
  );
};

// Create a stack navigator to include CreateReport screen
const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Map':
              iconName = 'map';
              break;
            case 'Reports':
              iconName = 'report';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'home';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#2E7D32',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2E7D32',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabNavigator} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreateReport" 
        component={CreateReportScreen} 
        options={{ title: 'Create New Report' }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginTop: 4,
  },
  demo: {
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
    color: '#2E7D32',
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    margin: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  instructions: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginTop: 32,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    fontSize: 16,
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
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  reportFooter: {
    marginBottom: 8,
  },
  address: {
    fontSize: 12,
    color: '#666',
  },
  engagement: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  upvotes: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  upvotedText: {
    color: '#2E7D32',
  },
  user: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  // Heat Map Styles
  heatMapCard: {
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
  heatMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  severityIndicator: {
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  issueCount: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  topIssues: {
    marginTop: 8,
  },
  topIssuesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  issueTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  issueTag: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  issueTagText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  legendContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  totalStats: {
    backgroundColor: '#2E7D32',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  totalStatsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Profile Screen Styles
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statCard: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  badgesSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  badgeEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  leaderboardSection: {
    backgroundColor: '#fff',
    margin: 16,
    paddingTop: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currentUserItem: {
    backgroundColor: '#E8F5E8',
  },
  rankContainer: {
    marginRight: 12,
  },
  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    fontSize: 24,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  currentUserName: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  userStats: {
    flexDirection: 'row',
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginRight: 12,
  },
  pointsContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  points: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  pointsLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badgeIcon: {
    fontSize: 12,
    marginHorizontal: 1,
  },
  footerSection: {
    backgroundColor: '#f8f9fa',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MainNavigator;
