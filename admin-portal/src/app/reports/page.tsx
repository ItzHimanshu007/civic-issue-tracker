'use client';

import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { ReportsApi, EngagementApi, type ReportDto } from '@/lib/api';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

type ReportRow = ReportDto;

export default function ReportsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | ReportDto['status']>('ALL');
  const [sortBy, setSortBy] = useState<'created_at' | 'upvotes' | 'priority'>('created_at');
  const [reports, setReports] = useState<ReportDto[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await ReportsApi.list({
        status: status === 'ALL' ? undefined : status,
        limit: 100,
      });
      setReports(data);
    } catch (error) {
      toast.error('Failed to load reports');
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await EngagementApi.toggleUpvote(reportId);
      
      // Update the local state
      setReports(prev => prev.map(report => {
        if (report.id === reportId) {
          return {
            ...report,
            upvotes: result.data.upvoteCount,
            hasUserUpvoted: result.data.upvoted
          };
        }
        return report;
      }));
      
      toast.success(result.data.upvoted ? 'Report upvoted!' : 'Upvote removed');
    } catch (error) {
      toast.error('Failed to upvote report');
      console.error('Upvote error:', error);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [status]);

  const rows = useMemo(() => {
    let filtered = reports.filter(r =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.category.toLowerCase().includes(query.toLowerCase()) ||
      r.description.toLowerCase().includes(query.toLowerCase())
    );

    // Sort by selected criteria
    filtered.sort((a, b) => {
      if (sortBy === 'upvotes') {
        return (b.upvotes || 0) - (a.upvotes || 0);
      } else if (sortBy === 'priority') {
        const priorityOrder = { 'CRITICAL': 3, 'URGENT': 2, 'NORMAL': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [query, reports, sortBy]);

  const exportCsv = () => {
    const header = ['Title', 'Category', 'Priority', 'Status', 'Created'];
    const data = rows.map(r => [r.title, r.category, r.priority, r.status, r.created_at]);
    const csv = [header, ...data].map(line => line.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reports.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported reports.csv');
  };

  const viewRow = (r: ReportRow) => toast(`Open details: ${r.title}`);

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600">Browse and manage citizen issue reports.</p>
      </header>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reports, categories, descriptions..."
              className="block w-80 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">📝 Submitted</option>
              <option value="ACKNOWLEDGED">👀 Acknowledged</option>
              <option value="IN_PROGRESS">⚡ In Progress</option>
              <option value="RESOLVED">✅ Resolved</option>
              <option value="CLOSED">🔒 Closed</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            >
              <option value="created_at">⏰ Latest First</option>
              <option value="upvotes">❤️ Most Upvoted</option>
              <option value="priority">🔥 High Priority</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={fetchReports} 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {loading ? '🔄' : '🔄'} Refresh
            </button>
            <button 
              onClick={exportCsv} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              📊 Export CSV
            </button>
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Showing {rows.length} of {reports.length} reports
          {sortBy === 'upvotes' && ' (sorted by upvotes)'}
          {sortBy === 'priority' && ' (sorted by priority)'}
          {sortBy === 'created_at' && ' (latest first)'}
        </div>

        <div className="overflow-x-auto">
          <div className="grid gap-4 md:hidden">
            {/* Mobile Card View */}
            {rows.map((r) => (
              <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-medium text-gray-900 truncate pr-2">{r.title}</h3>
                  <button
                    onClick={(e) => handleUpvote(r.id, e)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100"
                  >
                    {r.hasUserUpvoted ? (
                      <HeartSolid className="w-5 h-5 text-red-500" />
                    ) : (
                      <HeartOutline className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-600">{r.upvotes || 0}</span>
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">{r.category.replace('_', ' ')}</span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      r.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      r.priority === 'URGENT' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>{r.priority}</span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      r.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                      r.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                    }`}>{r.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <table className="min-w-full divide-y divide-gray-200 hidden md:table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title & Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upvotes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => viewRow(r)}>
                  <td className="px-6 py-4 text-sm">
                    <div className="max-w-xs">
                      <p className="font-medium text-gray-900 truncate">{r.title}</p>
                      <p className="text-gray-500 text-xs mt-1 truncate">{r.description}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
                      {r.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      r.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      r.priority === 'URGENT' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {r.priority === 'CRITICAL' ? '🔥 CRITICAL' : 
                       r.priority === 'URGENT' ? '⚠️ URGENT' : '📝 NORMAL'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      r.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                      r.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-800' :
                      r.status === 'ACKNOWLEDGED' ? 'bg-blue-100 text-blue-800' :
                      r.status === 'SUBMITTED' ? 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {r.status === 'SUBMITTED' ? '📝 SUBMITTED' :
                       r.status === 'ACKNOWLEDGED' ? '👀 ACKNOWLEDGED' :
                       r.status === 'IN_PROGRESS' ? '⚡ IN PROGRESS' :
                       r.status === 'RESOLVED' ? '✅ RESOLVED' : '🔒 CLOSED'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => handleUpvote(r.id, e)}
                      className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      {r.hasUserUpvoted ? (
                        <HeartSolid className="w-5 h-5 text-red-500" />
                      ) : (
                        <HeartOutline className="w-5 h-5 text-gray-400" />
                      )}
                      <span className={`text-sm font-medium ${
                        r.hasUserUpvoted ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {r.upvotes || 0}
                      </span>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <p>{new Date(r.created_at).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleTimeString()}</p>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    <div className="space-y-2">
                      <p>📭 No reports match your filters</p>
                      <p className="text-xs">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

