// User Types
export interface User {
  id: string;
  phoneNumber: string;
  email?: string;
  name: string;
  avatar?: string;
  isVerified: boolean;
  points: number;
  badges: Badge[];
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

// Report Types
export interface Report {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  priority: Priority;
  status: ReportStatus;
  location: Location;
  address: string;
  images: MediaFile[];
  videos: MediaFile[];
  audioNotes: MediaFile[];
  userId: string;
  user: User;
  upvotes: number;
  hasUserUpvoted: boolean;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  estimatedResolutionTime?: string;
}

export interface MediaFile {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  thumbnailUrl?: string;
  size: number;
  uploadedAt: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  user: User;
  createdAt: string;
}

// Enums
export enum IssueCategory {
  POTHOLE = 'POTHOLE',
  STREETLIGHT = 'STREETLIGHT',
  GARBAGE = 'GARBAGE',
  WATER_LEAK = 'WATER_LEAK',
  SEWAGE = 'SEWAGE',
  ROAD_MAINTENANCE = 'ROAD_MAINTENANCE',
  TRAFFIC_SIGNAL = 'TRAFFIC_SIGNAL',
  PARK_MAINTENANCE = 'PARK_MAINTENANCE',
  NOISE_POLLUTION = 'NOISE_POLLUTION',
  OTHER = 'OTHER'
}

export enum Priority {
  NORMAL = 'NORMAL',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL'
}

export enum ReportStatus {
  SUBMITTED = 'SUBMITTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ReportDetails: { reportId: string };
  CreateReport: undefined;
  Camera: undefined;
  Map: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  OTPVerification: { phoneNumber: string };
  SocialLogin: undefined;
  ProfileSetup: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Map: undefined;
  Reports: undefined;
  Profile: undefined;
};

// API Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LoginRequest {
  phoneNumber: string;
}

export interface VerifyOTPRequest {
  phoneNumber: string;
  otp: string;
}

export interface CreateReportRequest {
  title: string;
  description: string;
  category: IssueCategory;
  priority: Priority;
  location: Location;
  address: string;
  images: string[]; // Base64 encoded images
  videos: string[];
  audioNotes: string[];
}

export interface UpdateReportRequest {
  title?: string;
  description?: string;
  category?: IssueCategory;
  priority?: Priority;
}

// Redux State Types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ReportsState {
  reports: Report[];
  userReports: Report[];
  currentReport: Report | null;
  isLoading: boolean;
  error: string | null;
  filters: ReportFilters;
}

export interface ReportFilters {
  category?: IssueCategory;
  status?: ReportStatus;
  priority?: Priority;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  location?: {
    center: Location;
    radius: number; // in kilometers
  };
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'report_update' | 'comment' | 'upvote' | 'badge_earned';
  data?: any;
  isRead: boolean;
  createdAt: string;
}

// Configuration Types
export interface Config {
  apiUrl: string;
  wsUrl: string;
  mapApiKey: string;
  twilioAccountSid: string;
  awsConfig: {
    region: string;
    bucket: string;
  };
}
