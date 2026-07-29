"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import type { ThemeMode } from './ThemeProvider';

const Heartbeat: React.FC<{ zone: 'admin' | 'studio' | 'public' }> = ({ zone }) => {
  const color = zone === 'admin' ? 'bg-red-500' : zone === 'studio' ? 'bg-amber-400' : 'bg-green-500';
  const ariaLabel = zone === 'admin' ? 'Admin area' : zone === 'studio' ? 'Writer Studio' : 'Public Showcase';
  return (
    <div className="flex items-center">
      <span className={`h-3 w-3 rounded-full ${color} animate-pulse mr-2`} aria-hidden="true" />
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
};

const ThemeSwitcher: React.FC = () => {
  const { mode, setMode } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm">Theme</label>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as ThemeMode)}
        className="bg-transparent border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm"
        aria-label="Theme mode"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="auto">Auto</option>
      </select>
    </div>
  );
};

export const TopHeader: React.FC = () => {
  const pathname = usePathname() || '/';
  const zone: 'admin' | 'studio' | 'public' = pathname.startsWith('/admin')
    ? 'admin'
    : pathname.startsWith('/studio') || pathname.startsWith('/writer')
    ? 'studio'
    : 'public';

  const breadcrumb = pathname === '/' ? 'Showcase' : pathname.split('/').filter(Boolean).join(' > ');

  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-white/60 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              aria-label="Toggle navigation"
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link href="/" className="flex items-center space-x-3">
              <Image src="/logo.jpg" alt="bookshop logo" width={40} height={40} className="rounded-md object-cover" />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold">bookshop</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{breadcrumb}</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4">
              <Heartbeat zone={zone} />
              <ThemeSwitcher />
            </div>
            <div className="hidden sm:flex items-center space-x-2">
              <Link href="/books" className="text-sm">Books</Link>
              <Link href="/library" className="text-sm">Library</Link>
              <Link href="/studio" className="text-sm">Writer Studio</Link>
              <Link href="/admin" className="text-sm">Admin</Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
