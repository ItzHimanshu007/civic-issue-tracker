'use client';

import { useState, useEffect } from 'react';
import { ChartBarIcon, ArrowTrendingUpIcon, ClockIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState('30d');
  
  useEffect(() => {
    toast(`Analytics refreshed for ${timeframe}`);
  }, [timeframe]);

  const metrics = [
    { label: 'Total Reports', value: '1,234', change: '+12%', trend: 'up' },
    { label: 'Avg Response Time', value: '2.4h', change: '-8%', trend: 'down' },
    { label: 'Resolution Rate', value: '85%', change: '+3%', trend: 'up' },
    { label: 'User Satisfaction', value: '4.2/5', change: '+0.2', trend: 'up' },
  ];

  const categoryData = [
    { name: 'Potholes', count: 456, percentage: 37 },
    { name: 'Streetlights', count: 234, percentage: 19 },
    { name: 'Waste Management', count: 198, percentage: 16 },
    { name: 'Water Issues', count: 156, percentage: 13 },
    { name: 'Other', count: 190, percentage: 15 },
  ];

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Insights and trends for civic issue management.</p>
        </div>
        <select 
          value={timeframe} 
          onChange={(e) => setTimeframe(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{metric.label}</dt>
                    <dd className="text-lg font-semibold text-gray-900">{metric.value}</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <div className={`flex items-center text-sm ${
                  metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <ArrowTrendingUpIcon className={`h-4 w-4 ${
                    metric.trend === 'up' ? 'text-green-500' : 'text-red-500 transform rotate-180'
                  }`} />
                  <span className="ml-1">{metric.change} from last period</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports by Category */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Reports by Category</h3>
          <div className="space-y-4">
            {categoryData.map((category) => (
              <div key={category.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                  <span className="text-sm text-gray-700">{category.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{category.count}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 w-8">{category.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Response Time Trends */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Response Time Trends</h3>
          <div className="space-y-4">
            <div className="flex items-center text-sm text-gray-600">
              <ClockIcon className="h-4 w-4 mr-2" />
              Average response time over the last {timeframe}
            </div>
            <div className="h-40 flex items-end justify-between space-x-2">
              {[2.1, 2.8, 2.3, 1.9, 2.4, 2.1, 2.0].map((value, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div 
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${value * 20}px` }}
                  ></div>
                  <span className="text-xs text-gray-500 mt-1">{value}h</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Analytics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Issue Resolution Funnel</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { stage: 'Submitted', count: 1234, color: 'blue' },
            { stage: 'Acknowledged', count: 1180, color: 'yellow' },
            { stage: 'In Progress', count: 987, color: 'orange' },
            { stage: 'Under Review', count: 876, color: 'purple' },
            { stage: 'Resolved', count: 789, color: 'green' },
          ].map((stage, index) => (
            <div key={stage.stage} className="text-center">
              <div className={`bg-${stage.color}-100 rounded-lg p-4 mb-2`}>
                <div className={`text-2xl font-bold text-${stage.color}-600`}>{stage.count}</div>
                <div className="text-sm text-gray-600">{stage.stage}</div>
              </div>
              {index < 4 && (
                <div className="hidden md:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
