import { Report, CreateReportRequest, ReportFilters } from '../types';

// Dynamic API URL based on environment
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://civic-tracker-admin.vercel.app/api'
    : 'http://localhost:3001/api');

const handleApiError = (error: any) => {
  console.error('API Error:', error);
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }
  throw new Error('Network error. Please check your connection.');
};

export const fetchReports = async (filters?: ReportFilters): Promise<Report[]> => {
  try {
    const params = new URLSearchParams();
    
    if (filters?.category) {
      params.append('category', filters.category);
    }
    if (filters?.status) {
      params.append('status', filters.status);
    }
    
    params.append('limit', '50');
    params.append('offset', '0');
    
    const response = await fetch(`${API_BASE_URL}/reports?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch reports');
    }
    
    // Transform API response to match mobile app's Report interface
    return result.data.map((apiReport: any) => ({
      id: apiReport.id,
      title: apiReport.title,
      description: apiReport.description,
      category: apiReport.category,
      priority: apiReport.priority,
      status: apiReport.status,
      location: {
        latitude: apiReport.latitude,
        longitude: apiReport.longitude,
      },
      address: apiReport.address,
      images: apiReport.images || [],
      videos: apiReport.videos || [],
      audioNotes: apiReport.audioNotes || [],
      userId: apiReport.userId || '1',
      user: apiReport.user || {
        id: '1',
        name: 'अनाम यूजर',
        phoneNumber: '+91-9876543216',
        email: 'user@gmail.com',
        isVerified: true,
        points: 0,
        badges: [],
        createdAt: new Date().toISOString(),
      },
      upvotes: apiReport.upvotes || 0,
      hasUserUpvoted: false,
      comments: apiReport.comments || [],
      createdAt: apiReport.created_at,
      updatedAt: apiReport.updated_at || apiReport.created_at,
    }));
  } catch (error) {
    handleApiError(error);
    return [];
  }
};

export const fetchUserReports = async (): Promise<Report[]> => {
  // For now, fetch all reports and filter by mobile user
  // In a real app, this would be a separate endpoint with authentication
  try {
    const allReports = await fetchReports();
    return allReports.filter(report => report.userId === 'mobile-user-1');
  } catch (error) {
    handleApiError(error);
    return [];
  }
};

export const createReport = async (reportData: CreateReportRequest): Promise<Report> => {
  try {
    const payload = {
      title: reportData.title,
      description: reportData.description,
      category: reportData.category,
      priority: reportData.priority,
      latitude: reportData.location.latitude,
      longitude: reportData.location.longitude,
      address: reportData.address,
    };
    
    const response = await fetch(`${API_BASE_URL}/reports/mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to create report');
    }
    
    // Return a complete Report object
    const newReport: Report = {
      id: result.data.id,
      title: reportData.title,
      description: reportData.description,
      category: reportData.category,
      priority: reportData.priority,
      status: 'SUBMITTED',
      location: reportData.location,
      address: reportData.address,
      images: [],
      videos: [],
      audioNotes: [],
      userId: 'mobile-user-1',
      user: {
        id: 'mobile-user-1',
        name: 'रमेश कुमार',
        phoneNumber: '+91-9876543215',
        email: 'ramesh.mobile@gmail.com',
        isVerified: true,
        points: 150,
        badges: [],
        createdAt: new Date().toISOString(),
      },
      upvotes: 0,
      hasUserUpvoted: false,
      comments: [],
      createdAt: result.data.createdAt,
      updatedAt: result.data.createdAt,
    };
    
    console.log('Report created successfully:', newReport.id);
    return newReport;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const upvoteReport = async (reportId: string): Promise<Report> => {
  // TODO: Implement API call
  throw new Error('Not implemented');
};
