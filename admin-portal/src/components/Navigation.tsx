'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon,
  MapIcon,
  ChartBarSquareIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { AuthApi } from '@/lib/api';
import toast from 'react-hot-toast';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Map View', href: '/map', icon: MapIcon },
  { name: 'Reports', href: '/reports', icon: DocumentTextIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarSquareIcon },
  { name: 'Departments', href: '/departments', icon: BuildingOfficeIcon },
  { name: 'Users', href: '/users', icon: UsersIcon },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await AuthApi.logout();
      logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      // Even if API call fails, logout locally
      logout();
      router.push('/login');
    }
  };

  return (
    <nav className="bg-white shadow-sm border-r border-gray-200 h-full flex flex-col">
      <div className="px-4 py-6">
        <div className="flex items-center">
          <MapIcon className="h-8 w-8 text-blue-600" />
          <h1 className="ml-3 text-xl font-bold text-gray-900">
            Civic Tracker
          </h1>
        </div>
      </div>
      
      <div className="flex-1 px-2">
        <ul role="list" className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6
                    ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon
                    className={`h-6 w-6 shrink-0 ${
                      isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-blue-700'
                    }`}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User Profile Section */}
      <div className="border-t border-gray-200 px-2 py-4">
        <div className="flex items-center gap-x-3 rounded-md p-2 text-sm">
          <UserCircleIcon className="h-6 w-6 text-gray-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || 'Admin User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.role || 'ADMIN'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full mt-2 group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:text-red-700 hover:bg-red-50"
        >
          <ArrowRightOnRectangleIcon className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-red-700" />
          Sign out
        </button>
      </div>
    </nav>
  );
}
