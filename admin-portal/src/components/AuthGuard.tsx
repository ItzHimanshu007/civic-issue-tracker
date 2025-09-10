'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AuthApi } from '@/lib/api';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, user, tokens, login, logout, setLoading } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      // If no tokens, redirect to login
      if (!tokens?.accessToken) {
        router.push('/login');
        return;
      }

      // If we have tokens but no user data, try to fetch user info
      if (!user && tokens.accessToken) {
        setLoading(true);
        try {
          const result = await AuthApi.getMe();
          if (result.success) {
            // Verify user has admin/staff role
            if (result.data.role !== 'ADMIN' && result.data.role !== 'STAFF') {
              logout();
              router.push('/login');
              return;
            }
            login(result.data, tokens);
          } else {
            logout();
            router.push('/login');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
          router.push('/login');
        } finally {
          setLoading(false);
        }
      }
    };

    checkAuth();
  }, [tokens, user, router, login, logout, setLoading]);

  // Show loading state while checking auth
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
