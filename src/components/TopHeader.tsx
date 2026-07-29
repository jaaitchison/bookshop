"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import type { ThemeMode } from './ThemeProvider';
import { useCart } from '../context/CartContext';

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

const MobileNav: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <nav
        ref={menuRef}
        className="fixed left-0 top-16 bottom-0 w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 shadow-lg overflow-y-auto"
      >
        <div className="p-4 space-y-2">
          <Link
            href="/books"
            className="block px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
            onClick={onClose}
          >
            Books
          </Link>
          <Link
            href="/library"
            className="block px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
            onClick={onClose}
          >
            My Library
          </Link>
          <Link
            href="/studio"
            className="block px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
            onClick={onClose}
          >
            Writer Studio
          </Link>
          <Link
            href="/admin"
            className="block px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
            onClick={onClose}
          >
            Admin
          </Link>
        </div>
      </nav>
    </div>
  );
};

export const TopHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname() || '/';
  const { count, openCart } = useCart();
  const zone: 'admin' | 'studio' | 'public' = pathname.startsWith('/admin')
    ? 'admin'
    : pathname.startsWith('/studio') || pathname.startsWith('/writer')
    ? 'studio'
    : 'public';

  const breadcrumb = pathname === '/' ? 'Showcase' : pathname.split('/').filter(Boolean).join(' > ');

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur bg-white/60 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation"
                aria-expanded={mobileMenuOpen}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
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
                <button
                  onClick={openCart}
                  className="ml-2 inline-flex items-center rounded-full bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Cart
                  {count > 0 ? <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{count}</span> : null}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
};

export default TopHeader;
