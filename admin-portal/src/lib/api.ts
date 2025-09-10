import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  withCredentials: true,
});

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
  created_at: string;
}

export const ReportsApi = {
  async list(params?: { status?: string; category?: string; limit?: number; offset?: number; }) {
    const res = await api.get<{ success: boolean; data: ReportDto[] }>('/api/reports', { params: { mock: 1, ...(params || {}) } });
    return res.data.data;
  },
};

export default api;

