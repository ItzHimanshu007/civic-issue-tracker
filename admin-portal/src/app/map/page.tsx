'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import MapFilters from '@/components/MapFilters';

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
});

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'NORMAL' | 'URGENT' | 'CRITICAL';
  status: string;
  latitude: number;
  longitude: number;
  address: string;
  created_at: string;
  media_count?: number;
  type?: 'report' | 'cluster';
}

interface HeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number;
}

interface MapFiltersType {
  categories: string[];
  statuses: string[];
  priorities: string[];
  dateFrom?: string;
  dateTo?: string;
  showHeatmap: boolean;
  clustered: boolean;
}

const defaultFilters: MapFiltersType = {
  categories: [],
  statuses: [],
  priorities: [],
  showHeatmap: false,
  clustered: true,
};

export default function MapPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [filters, setFilters] = useState<MapFiltersType>(defaultFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [mapBounds, setMapBounds] = useState({
    north: 40.8,
    south: 40.6,
    east: -73.9,
    west: -74.1
  });

  // Mock API call - replace with actual API integration
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - replace with actual API call
      const mockReports: Report[] = [
        {
          id: '1',
          title: 'Pothole on Main Street',
          description: 'Large pothole affecting traffic flow',
          category: 'POTHOLE',
          priority: 'URGENT',
          status: 'SUBMITTED',
          latitude: 40.7589,
          longitude: -73.9851,
          address: '123 Main St, New York, NY',
          created_at: new Date().toISOString(),
          media_count: 2
        },
        {
          id: '2',
          title: 'Broken streetlight',
          description: 'Street light is not working, creating safety hazard',
          category: 'STREETLIGHT',
          priority: 'NORMAL',
          status: 'IN_PROGRESS',
          latitude: 40.7505,
          longitude: -73.9934,
          address: '456 Broadway, New York, NY',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          media_count: 1
        },
        {
          id: '3',
          title: 'Overflowing garbage bin',
          description: 'Garbage bin on corner is overflowing',
          category: 'GARBAGE',
          priority: 'NORMAL',
          status: 'RESOLVED',
          latitude: 40.7614,
          longitude: -73.9776,
          address: '789 5th Ave, New York, NY',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          media_count: 0
        },
        {
          id: '4',
          title: 'Water leak',
          description: 'Water main leak causing flooding',
          category: 'WATER_LEAK',
          priority: 'CRITICAL',
          status: 'ACKNOWLEDGED',
          latitude: 40.7549,
          longitude: -73.9840,
          address: '321 Park Ave, New York, NY',
          created_at: new Date(Date.now() - 1800000).toISOString(),
          media_count: 3
        }
      ];

      // Filter reports based on current filters
      let filteredReports = mockReports;
      
      if (filters.categories.length > 0) {
        filteredReports = filteredReports.filter(r => filters.categories.includes(r.category));
      }
      
      if (filters.statuses.length > 0) {
        filteredReports = filteredReports.filter(r => filters.statuses.includes(r.status));
      }
      
      if (filters.priorities.length > 0) {
        filteredReports = filteredReports.filter(r => filters.priorities.includes(r.priority));
      }

      setReports(filteredReports);

      // Mock heatmap data
      if (filters.showHeatmap) {
        const mockHeatmapData: HeatmapPoint[] = [
          { latitude: 40.7589, longitude: -73.9851, intensity: 0.8 },
          { latitude: 40.7505, longitude: -73.9934, intensity: 0.6 },
          { latitude: 40.7614, longitude: -73.9776, intensity: 0.4 },
          { latitude: 40.7549, longitude: -73.9840, intensity: 1.0 },
        ];
        setHeatmapData(mockHeatmapData);
      } else {
        setHeatmapData([]);
      }
      
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleReportClick = (report: Report) => {
    setSelectedReport(report);
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar with filters */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Map View
          </h1>
          
          <MapFilters
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={fetchReports}
            isLoading={isLoading}
          />

          {/* Report list */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Reports ({reports.length})
            </h3>
            
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => handleReportClick(report)}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                      {report.title}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      report.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      report.priority === 'URGENT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {report.priority}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {report.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {report.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              
              {reports.length === 0 && !isLoading && (
                <div className="text-center py-8 text-gray-500">
                  <p>No reports match the current filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          reports={reports}
          heatmapData={heatmapData}
          filters={filters}
          onFiltersChange={setFilters}
          onReportClick={handleReportClick}
        />
      </div>

      {/* Report detail modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedReport.title}
                </h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-700">{selectedReport.description}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Category</label>
                    <p className="text-sm text-gray-900">{selectedReport.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Priority</label>
                    <p className="text-sm text-gray-900">{selectedReport.priority}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className="text-sm text-gray-900">{selectedReport.status}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedReport.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <p className="text-sm text-gray-900">{selectedReport.address}</p>
                </div>

                <div className="flex space-x-3">
                  <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                    View Full Details
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors">
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
