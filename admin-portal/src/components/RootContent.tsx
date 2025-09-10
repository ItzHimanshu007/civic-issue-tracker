'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/Navigation';
import AuthGuard from '@/components/AuthGuard';

export default function RootContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-50">
        <div className="w-64 flex-shrink-0">
          <Navigation />
        </div>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
