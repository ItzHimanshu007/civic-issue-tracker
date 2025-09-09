'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  MapIcon,
  ChartBarSquareIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

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

  return (
    <nav className="bg-white shadow-sm border-r border-gray-200">
      <div className="px-4 py-6">
        <div className="flex items-center">
          <MapIcon className="h-8 w-8 text-blue-600" />
          <h1 className="ml-3 text-xl font-bold text-gray-900">
            Civic Tracker
          </h1>
        </div>
      </div>
      
      <div className="px-2">
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
    </nav>
  );
}
