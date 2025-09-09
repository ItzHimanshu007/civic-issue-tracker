import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ReportsState, Report, CreateReportRequest, ReportFilters } from '../../types';
import * as reportsService from '../../services/reportsService';

const initialState: ReportsState = {
  reports: [],
  userReports: [],
  currentReport: null,
  isLoading: false,
  error: null,
  filters: {},
};

export const fetchReports = createAsyncThunk(
  'reports/fetchReports',
  async (filters?: ReportFilters) => {
    return await reportsService.fetchReports(filters);
  }
);

export const fetchUserReports = createAsyncThunk(
  'reports/fetchUserReports',
  async () => {
    return await reportsService.fetchUserReports();
  }
);

export const createReport = createAsyncThunk(
  'reports/createReport',
  async (reportData: CreateReportRequest) => {
    return await reportsService.createReport(reportData);
  }
);

export const upvoteReport = createAsyncThunk(
  'reports/upvoteReport',
  async (reportId: string) => {
    return await reportsService.upvoteReport(reportId);
  }
);

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ReportFilters>) => {
      state.filters = action.payload;
    },
    setCurrentReport: (state, action: PayloadAction<Report | null>) => {
      state.currentReport = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReports.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.isLoading = false;
        state.reports = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch reports';
      })
      .addCase(createReport.fulfilled, (state, action) => {
        state.reports.unshift(action.payload);
        state.userReports.unshift(action.payload);
      });
  },
});

export const { setFilters, setCurrentReport, clearError } = reportsSlice.actions;
export default reportsSlice.reducer;
