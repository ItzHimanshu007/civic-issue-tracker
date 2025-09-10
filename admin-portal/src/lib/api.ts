import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const tokens = useAuthStore.getState().tokens;
    if (tokens?.accessToken) {
      // Skip auth header for development/offline tokens
      if (!tokens.accessToken.includes('dev-') && !tokens.accessToken.includes('demo-') && !tokens.accessToken.includes('offline-')) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const tokens = useAuthStore.getState().tokens;
    
    // Skip auth handling for development/offline tokens
    if (tokens?.accessToken && (tokens.accessToken.includes('dev-') || tokens.accessToken.includes('demo-') || tokens.accessToken.includes('offline-'))) {
      // For development mode, continue without auth issues
      console.log('Development mode: Skipping auth error handling');
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      if (tokens?.refreshToken && !tokens.refreshToken.includes('dev-') && !tokens.refreshToken.includes('demo-') && !tokens.refreshToken.includes('offline-')) {
        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh-token`,
            { refreshToken: tokens.refreshToken }
          );
          
          const newTokens = response.data.data.tokens;
          useAuthStore.getState().setTokens(newTokens);
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token or development token, logout user
        if (!tokens?.accessToken?.includes('dev-') && !tokens?.accessToken?.includes('demo-') && !tokens?.accessToken?.includes('offline-')) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  name: string;
  username?: string;
  phoneNumber?: string;
  email?: string;
  role: 'ADMIN' | 'STAFF' | 'USER';
  isVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ReportDto {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'NORMAL' | 'URGENT' | 'CRITICAL';
  status: 'SUBMITTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  latitude: number;
  longitude: number;
  address: string;
  upvotes?: number;
  hasUserUpvoted?: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  totalReports: number;
  totalUpvotes: number;
  points: number;
  badges: string[];
  rank: number;
}

export interface DepartmentRule {
  id: string;
  category: string;
  keywords: string[];
  departmentId: string;
  departmentName: string;
}

export interface DashboardStats {
  totalReports: number;
  resolvedReports: number;
  pendingReports: number;
  inProgressReports: number;
  criticalReports: number;
  reportsLastWeek: number;
  reportsLastMonth: number;
  avgResolutionTime: string;
  resolutionRate: number;
}

// API Functions
export const AuthApi = {
  async login(username: string, password: string) {
    const res = await api.post<{
      success: boolean;
      message?: string;
      data?: { user: User; tokens: AuthTokens };
    }>('/api/auth/login', {
      username,
      password,
    });
    return res.data;
  },

  async sendOTP(phoneNumber: string) {
    const res = await api.post<{ success: boolean; message: string; data?: { otp: string } }>(
      '/api/auth/send-otp',
      { phoneNumber }
    );
    return res.data;
  },

  async verifyOTP(phoneNumber: string, code: string, name?: string, email?: string) {
    const res = await api.post<{
      success: boolean;
      message?: string;
      data?: { user: User; tokens: AuthTokens };
    }>('/api/auth/verify-otp', {
      phoneNumber,
      code,
      name,
      email,
    });
    return res.data;
  },

  async getMe() {
    const res = await api.get<{ success: boolean; data: User }>('/api/auth/me');
    return res.data;
  },

  async logout() {
    const res = await api.post<{ success: boolean; message: string }>('/api/auth/logout');
    return res.data;
  },

  async refreshToken(refreshToken: string) {
    const res = await api.post<{
      success: boolean;
      data: { tokens: AuthTokens };
    }>('/api/auth/refresh-token', { refreshToken });
    return res.data;
  },
};

export const ReportsApi = {
  async list(params?: { status?: string; category?: string; limit?: number; offset?: number; mock?: boolean }) {
    const queryParams = { ...(params || {}) };
    if (!params?.mock) {
      delete queryParams.mock;
    } else {
      queryParams.mock = true;
    }
    
    const res = await api.get<{ success: boolean; data: ReportDto[] }>('/api/reports', { params: queryParams });
    return res.data.data;
  },

  async getById(id: string) {
    const res = await api.get<{ success: boolean; data: ReportDto }>(`/api/reports/${id}`);
    return res.data.data;
  },

  async updateStatus(id: string, status: ReportDto['status'], comment?: string) {
    const res = await api.patch<{ success: boolean; data: ReportDto }>(`/api/reports/${id}/status`, {
      status,
      comment,
    });
    return res.data.data;
  },
};

export const EngagementApi = {
  async toggleUpvote(reportId: string) {
    const res = await api.post<{ 
      success: boolean; 
      data: { upvoted: boolean; upvoteCount: number } 
    }>(`/api/engagement/reports/${reportId}/upvote`);
    return res.data;
  },

  async getComments(reportId: string) {
    const res = await api.get<{ success: boolean; data: any[] }>(`/api/engagement/reports/${reportId}/comments`);
    return res.data.data;
  },

  async addComment(reportId: string, content: string, isInternal = false) {
    const res = await api.post<{ success: boolean; data: any }>(`/api/engagement/reports/${reportId}/comments`, {
      content,
      isInternal,
    });
    return res.data;
  },
};

export const LeaderboardApi = {
  async getLeaderboard(limit = 10, type: 'reports' | 'upvotes' | 'points' = 'points') {
    const res = await api.get<{ success: boolean; data: LeaderboardEntry[] }>(
      `/api/gamification/leaderboard?limit=${limit}&type=${type}`
    );
    return res.data.data;
  },

  async getUserStats(userId?: string) {
    const endpoint = userId ? `/api/gamification/users/${userId}/stats` : '/api/gamification/users/me/stats';
    const res = await api.get<{ success: boolean; data: any }>(endpoint);
    return res.data.data;
  },
};

export const DepartmentApi = {
  async getRoutingRules() {
    const res = await api.get<{ success: boolean; data: DepartmentRule[] }>('/api/departments/routing');
    return res.data.data;
  },

  async createRoutingRule(rule: Omit<DepartmentRule, 'id'>) {
    const res = await api.post<{ success: boolean; data: DepartmentRule }>('/api/departments/routing', rule);
    return res.data.data;
  },

  async updateRoutingRule(id: string, rule: Partial<DepartmentRule>) {
    const res = await api.patch<{ success: boolean; data: DepartmentRule }>(`/api/departments/routing/${id}`, rule);
    return res.data.data;
  },

  async assignReportToDepartment(reportId: string, departmentId: string) {
    const res = await api.post<{ success: boolean }>(`/api/reports/${reportId}/assign`, {
      departmentId,
    });
    return res.data;
  },
};

export const AnalyticsApi = {
  async getDashboardStats() {
    const res = await api.get<{ success: boolean; data: DashboardStats }>('/api/analytics');
    return res.data.data;
  },

  async getCategoryBreakdown() {
    const res = await api.get<{ success: boolean; data: any[] }>('/api/analytics/categories');
    return res.data.data;
  },

  async getTrends(period: 'week' | 'month' = 'week') {
    const res = await api.get<{ success: boolean; data: any[] }>('/api/analytics/trends', {
      params: { period },
    });
    return res.data.data;
  },
};

export default api;

