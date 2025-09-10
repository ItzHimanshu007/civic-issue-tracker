'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, user, login } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Allow access to login page
    if (pathname === '/login') {
      setIsInitialized(true);
      return;
    }

    // Auto-login for development - bypass all auth issues
    if (!isAuthenticated && !user) {
      console.log('Auto-login activated for development');
      
      const devUser = {
        id: 'dev-admin-id',
        name: 'Development Administrator',
        username: 'dev-admin',
        email: 'dev@civictracker.com',
        role: 'ADMIN' as const,
        isVerified: true,
        createdAt: new Date().toISOString()
      };
      
      const devTokens = {
        accessToken: 'dev-access-token',
        refreshToken: 'dev-refresh-token'
      };
      
      login(devUser, devTokens);
      toast.success(`Auto-login successful! Welcome ${devUser.name}`, {
        duration: 2000,
      });
    }

    setIsInitialized(true);
  }, [isAuthenticated, user, login, pathname]);

  useEffect(() => {
    // If still not authenticated after auto-login attempt and not on login page
    if (isInitialized && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isInitialized, isAuthenticated, pathname, router]);

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated && pathname !== '/login') {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}
