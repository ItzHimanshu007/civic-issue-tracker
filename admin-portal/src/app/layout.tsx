import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import RootContent from '@/components/RootContent';

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
        <RootContent>{children}</RootContent>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
