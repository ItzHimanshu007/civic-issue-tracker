'use client';

import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { ReportsApi, type ReportDto } from '@/lib/api';

export default function ReportsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | ReportDto['status']>('ALL');
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

  useEffect(() => {
    fetchReports();
  }, [status]);

  const rows = useMemo(() => {
    return reports.filter(r =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.category.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, reports]);

  const exportCsv = () => {
    const header = ['Title', 'Category', 'Priority', 'Status', 'Created'];
    const data = rows.map(r => [r.title, r.category, r.priority, r.status, r.created]);
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

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reports..."
              className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <button onClick={exportCsv} className="btn-primary">Export CSV</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((r, i) => (
                <tr key={i} className="cursor-pointer hover:bg-gray-50" onClick={() => viewRow(r)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      r.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      r.priority === 'URGENT' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>{r.priority}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      r.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                      r.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.created}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">No reports match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

