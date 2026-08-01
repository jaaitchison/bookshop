import React from "react";
import "./globals.css";
import { ThemeProvider } from "../src/components/ThemeProvider";
import TopHeader from "../src/components/TopHeader";
import PageHeader from "../src/components/layout/PageHeader";
import SiteFooter from "../src/components/layout/SiteFooter";
import { CartProvider } from "../src/context/CartContext";
import { AccountProvider } from "../src/context/AccountContext";
import { CartDrawer } from "../src/components/cart/CartDrawer";

export const metadata = {
  title: "Bookshop | Independent publishing and reading",
  description: "A modern publishing platform for authors and readers, styled in a warm, editorial way.",
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
                <PageHeader />
                {children}
              </main>
              <CartDrawer />
              <SiteFooter />
            </CartProvider>
          </AccountProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
