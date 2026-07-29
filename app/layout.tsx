import React from 'react';
import './globals.css';
import { ThemeProvider } from '../src/components/ThemeProvider';
import TopHeader from '../src/components/TopHeader';
import { CartProvider } from '../src/context/CartContext';
import { CartDrawer } from '../src/components/cart/CartDrawer';

export const metadata = {
  title: 'bookshop',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <CartProvider>
            <TopHeader />
            <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
              {children}
            </main>
            <CartDrawer />
            <footer className="w-full border-t border-gray-200 dark:border-gray-800 p-4 text-sm text-center">
              © {new Date().getFullYear()} bookshop — Version: 0.1.0
            </footer>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
