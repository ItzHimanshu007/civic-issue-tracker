'use client';

import { useState } from 'react';
import { 
  FunnelIcon, 
  XMarkIcon, 
  MapIcon,
  FireIcon 
} from '@heroicons/react/24/outline';

interface MapFilters {
  categories: string[];
  statuses: string[];
  priorities: string[];
  dateFrom?: string;
  dateTo?: string;
  showHeatmap: boolean;
  clustered: boolean;
}

interface MapFiltersProps {
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const CATEGORIES = [
  'POTHOLE',
  'STREETLIGHT', 
  'GARBAGE',
  'WATER_LEAK',
  'SEWAGE',
  'ROAD_MAINTENANCE',
  'TRAFFIC_SIGNAL',
  'PARK_MAINTENANCE',
  'NOISE_POLLUTION',
  'OTHER'
];

const STATUSES = [
  'SUBMITTED',
  'ACKNOWLEDGED', 
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED'
];

const PRIORITIES = [
  'NORMAL',
  'URGENT',
  'CRITICAL'
];

const MapFilters: React.FC<MapFiltersProps> = ({
  filters,
  onFiltersChange,
  onRefresh,
  isLoading
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof MapFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleMultiSelectChange = (key: keyof MapFilters, option: string) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(option)
      ? currentArray.filter(item => item !== option)
      : [...currentArray, option];
    
    handleFilterChange(key, newArray);
  };

  const clearFilters = () => {
    onFiltersChange({
      categories: [],
      statuses: [],
      priorities: [],
      dateFrom: undefined,
      dateTo: undefined,
      showHeatmap: false,
      clustered: true
    });
  };

  const hasActiveFilters = 
    filters.categories.length > 0 || 
    filters.statuses.length > 0 || 
    filters.priorities.length > 0 || 
    filters.dateFrom || 
    filters.dateTo;

  return (
    <div className="bg-white shadow-lg rounded-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <span className="font-medium text-gray-900">Map Filters</span>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Active
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? (
              <XMarkIcon className="h-5 w-5" />
            ) : (
              <FunnelIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Quick toggles */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleFilterChange('clustered', !filters.clustered)}
            className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filters.clustered
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <MapIcon className="h-4 w-4 mr-1" />
            Clustered
          </button>
          
          <button
            onClick={() => handleFilterChange('showHeatmap', !filters.showHeatmap)}
            className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filters.showHeatmap
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FireIcon className="h-4 w-4 mr-1" />
            Heatmap
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="From"
              />
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="To"
              />
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categories ({filters.categories.length} selected)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {CATEGORIES.map(category => (
                <label key={category} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(category)}
                    onChange={() => handleMultiSelectChange('categories', category)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{category.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Statuses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statuses ({filters.statuses.length} selected)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map(status => (
                <label key={status} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.statuses.includes(status)}
                    onChange={() => handleMultiSelectChange('statuses', status)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{status.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Priorities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priorities ({filters.priorities.length} selected)
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map(priority => (
                <label key={priority} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.priorities.includes(priority)}
                    onChange={() => handleMultiSelectChange('priorities', priority)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`ml-2 text-sm font-medium ${
                    priority === 'CRITICAL' ? 'text-red-700' :
                    priority === 'URGENT' ? 'text-yellow-700' :
                    'text-gray-700'
                  }`}>
                    {priority}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapFilters;
