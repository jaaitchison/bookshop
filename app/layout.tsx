import React from 'react';
import './globals.css';
import { ThemeProvider } from '../src/components/ThemeProvider';
import TopHeader from '../src/components/TopHeader';

export const metadata = {
  title: 'bookshop',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <TopHeader />
          <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {children}
          </main>
          <footer className="w-full border-t border-gray-200 dark:border-gray-800 p-4 text-sm text-center">
            © {new Date().getFullYear()} bookshop — Version: 0.1.0
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
