'use client';

import { useMemo, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function DepartmentsPage() {
  const [departments] = useState([
    {
      id: 1,
      name: 'Public Works',
      description: 'Roads, infrastructure, and utility maintenance',
      head: 'John Smith',
      email: 'john.smith@city.gov',
      phone: '(555) 123-4567',
      activeReports: 45,
      status: 'Active'
    },
    {
      id: 2,
      name: 'Parks & Recreation',
      description: 'Park maintenance and recreational facilities',
      head: 'Sarah Johnson',
      email: 'sarah.johnson@city.gov',
      phone: '(555) 234-5678',
      activeReports: 23,
      status: 'Active'
    },
    {
      id: 3,
      name: 'Environmental Services',
      description: 'Waste management and environmental issues',
      head: 'Mike Davis',
      email: 'mike.davis@city.gov',
      phone: '(555) 345-6789',
      activeReports: 67,
      status: 'Active'
    },
    {
      id: 4,
      name: 'Transportation',
      description: 'Traffic management and public transit',
      head: 'Lisa Chen',
      email: 'lisa.chen@city.gov',
      phone: '(555) 456-7890',
      activeReports: 34,
      status: 'Active'
    },
    {
      id: 5,
      name: 'Water & Sewer',
      description: 'Water supply and sewage system management',
      head: 'Robert Wilson',
      email: 'robert.wilson@city.gov',
      phone: '(555) 567-8901',
      activeReports: 19,
      status: 'Under Review'
    }
  ]);

  const [query, setQuery] = useState('');

  const filtered = useMemo(() =>
    departments.filter(d =>
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.description.toLowerCase().includes(query.toLowerCase())
    ),
  [departments, query]);

  const addDepartment = () => toast('Open "Add Department" modal');
  const editDepartment = (name: string) => toast(`Edit ${name}`);
  const deleteDepartment = (name: string) => toast.success(`Deleted ${name}`);
  const viewReports = (name: string) => toast(`View ${name} reports`);
  const contactDept = (name: string) => toast(`Contact ${name}`);

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-600">Manage city departments and their responsibilities.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search departments..."
            className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          <button onClick={addDepartment} className="btn-primary flex items-center">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Department
          </button>
        </div>
      </header>

      {/* Department Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Departments</dt>
                  <dd className="text-lg font-semibold text-gray-900">{departments.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Departments</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {departments.filter(d => d.status === 'Active').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Active Reports</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {departments.reduce((sum, dept) => sum + dept.activeReports, 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Reports/Dept</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {Math.round(departments.reduce((sum, dept) => sum + dept.activeReports, 0) / departments.length)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((department) => (
          <div key={department.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{department.name}</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    department.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {department.status}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => editDepartment(department.name)} className="text-gray-400 hover:text-blue-600">
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button onClick={() => deleteDepartment(department.name)} className="text-gray-400 hover:text-red-600">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{department.description}</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Department Head:</span>
                <span className="text-sm text-gray-900">{department.head}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Email:</span>
                <span className="text-sm text-gray-900">{department.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Phone:</span>
                <span className="text-sm text-gray-900">{department.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Active Reports:</span>
                <span className="text-sm font-semibold text-blue-600">{department.activeReports}</span>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button onClick={() => viewReports(department.name)} className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                View Reports
              </button>
              <button onClick={() => contactDept(department.name)} className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200">
                Contact
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
