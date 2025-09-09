import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Navigation from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Civic Tracker Admin',
  description: 'Municipal staff dashboard for managing civic issues',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen bg-gray-50">
          <div className="w-64 flex-shrink-0">
            <Navigation />
          </div>
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
