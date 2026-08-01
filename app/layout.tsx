import React from 'react';
import './globals.css';
import { ThemeProvider } from '../src/components/ThemeProvider';
import TopHeader from '../src/components/TopHeader';
import { CartProvider } from '../src/context/CartContext';
import { AccountProvider } from '../src/context/AccountContext';
import { CartDrawer } from '../src/components/cart/CartDrawer';

export const metadata = {
  title: 'Bookshop | Independent publishing and reading',
  description: 'A modern publishing platform for authors and readers, styled in a warm, editorial way.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <AccountProvider>
            <CartProvider>
              <TopHeader />
              <main className="flex-1 bg-[var(--bookshop-bg)] text-[var(--bookshop-text)]">
                {children}
              </main>
              <CartDrawer />
              <footer className="w-full border-t border-[var(--bookshop-border)] bg-[var(--bookshop-surface)]/80 py-6 text-sm text-[var(--bookshop-muted)]">
                <div className="bookshop-shell text-center">
                  © {new Date().getFullYear()} Bookshop — Independent publishing, reader-first experience.
                </div>
              </footer>
            </CartProvider>
          </AccountProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
