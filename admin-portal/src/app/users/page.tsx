'use client';

import { useMemo, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon, UserIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function UsersPage() {
  const [users] = useState([
    {
      id: 1,
      name: 'John Administrator',
      email: 'john@city.gov',
      role: 'Admin',
      department: 'IT Department',
      status: 'Active',
      lastLogin: '2 hours ago',
      avatar: null
    },
    {
      id: 2,
      name: 'Sarah Manager',
      email: 'sarah@city.gov',
      role: 'Department Manager',
      department: 'Public Works',
      status: 'Active',
      lastLogin: '1 day ago',
      avatar: null
    },
    {
      id: 3,
      name: 'Mike Staff',
      email: 'mike@city.gov',
      role: 'Staff',
      department: 'Environmental Services',
      status: 'Active',
      lastLogin: '3 hours ago',
      avatar: null
    },
    {
      id: 4,
      name: 'Lisa Coordinator',
      email: 'lisa@city.gov',
      role: 'Department Manager',
      department: 'Transportation',
      status: 'Active',
      lastLogin: '5 minutes ago',
      avatar: null
    },
    {
      id: 5,
      name: 'Robert Viewer',
      email: 'robert@city.gov',
      role: 'Viewer',
      department: 'Water & Sewer',
      status: 'Inactive',
      lastLogin: '1 week ago',
      avatar: null
    }
  ]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-purple-100 text-purple-800';
      case 'Department Manager': return 'bg-blue-100 text-blue-800';
      case 'Staff': return 'bg-green-100 text-green-800';
      case 'Viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  const filtered = useMemo(() =>
    users.filter(u =>
      (role ? u.role === role : true) &&
      (status ? u.status === status : true) &&
      (u.name.toLowerCase().includes(query.toLowerCase()) ||
       u.email.toLowerCase().includes(query.toLowerCase()) ||
       u.department.toLowerCase().includes(query.toLowerCase()))
    ),
  [users, role, status, query]);

  const addUser = () => toast('Open "Add User" modal');
  const exportUsers = () => {
    const header = ['Name','Email','Role','Department','Status','Last Login'];
    const data = filtered.map(u => [u.name,u.email,u.role,u.department,u.status,u.lastLogin]);
    const csv = [header, ...data].map(line => line.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported users.csv');
  };
  const editUser = (name: string) => toast(`Edit ${name}`);
  const deleteUser = (name: string) => toast.success(`Deleted ${name}`);

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage system users and their permissions.</p>
        </div>
        <button onClick={addUser} className="btn-primary flex items-center">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add User
        </button>
      </header>

      {/* User Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="text-lg font-semibold text-gray-900">{users.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {users.filter(u => u.status === 'Active').length}
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
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Admins</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {users.filter(u => u.role === 'Admin').length}
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
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Department Managers</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {users.filter(u => u.role === 'Department Manager').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
              <option value="">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Department Manager">Department Manager</option>
              <option value="Staff">Staff</option>
              <option value="Viewer">Viewer</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <button onClick={exportUsers} className="btn-secondary">Export Users</button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.avatar ? (
                          <img className="h-10 w-10 rounded-full" src={user.avatar} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => editUser(user.name)} className="text-blue-600 hover:text-blue-900">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteUser(user.name)} className="text-red-600 hover:text-red-900">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Permissions Info */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-purple-900 mb-2">Admin</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Full system access</li>
              <li>• User management</li>
              <li>• Department management</li>
              <li>• System configuration</li>
            </ul>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Department Manager</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Manage department reports</li>
              <li>• View analytics</li>
              <li>• Assign tasks</li>
              <li>• Update report status</li>
            </ul>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Staff</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• View assigned reports</li>
              <li>• Update report progress</li>
              <li>• Add comments</li>
              <li>• Upload media</li>
            </ul>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Viewer</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Read-only access</li>
              <li>• View reports</li>
              <li>• View analytics</li>
              <li>• Export data</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
