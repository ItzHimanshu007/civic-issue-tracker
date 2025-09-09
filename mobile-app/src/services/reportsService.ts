import { Report, CreateReportRequest, ReportFilters } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

export const fetchReports = async (filters?: ReportFilters): Promise<Report[]> => {
  // TODO: Implement API call with filters
  return [];
};

export const fetchUserReports = async (): Promise<Report[]> => {
  // TODO: Implement API call
  return [];
};

export const createReport = async (reportData: CreateReportRequest): Promise<Report> => {
  // TODO: Implement API call
  const mockReport: Report = {
    id: Date.now().toString(),
    title: reportData.title,
    description: reportData.description,
    category: reportData.category,
    priority: reportData.priority,
    status: 'SUBMITTED' as const,
    location: reportData.location,
    address: reportData.address,
    images: [],
    videos: [],
    audioNotes: [],
    userId: '1',
    user: {
      id: '1',
      name: 'John Doe',
      phoneNumber: '+1234567890',
      email: 'john@example.com',
      isVerified: true,
      points: 150,
      badges: [],
      createdAt: new Date().toISOString(),
    },
    upvotes: 0,
    hasUserUpvoted: false,
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return mockReport;
};

export const upvoteReport = async (reportId: string): Promise<Report> => {
  // TODO: Implement API call
  throw new Error('Not implemented');
};
