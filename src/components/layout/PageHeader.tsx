"use client";

import { usePathname } from "next/navigation";

export type SiteArea = "front" | "writer" | "admin";

interface PageHeaderConfig {
  area: SiteArea;
  areaLabel: string;
  title: string;
  description: string;
}

function getPageConfig(pathname: string): PageHeaderConfig {
  if (pathname.startsWith("/admin")) {
    return {
      area: "admin",
      areaLabel: "Administration",
      title: "Administration Dashboard",
      description: "Manage the catalogue, users, orders and operation of the Bookshop platform.",
    };
  }

  if (pathname.startsWith("/studio") || pathname.startsWith("/writer")) {
    return {
      area: "writer",
      areaLabel: "Writers Back Office",
      title: "Writer Studio",
      description: "Manage books, publishing activity, sales information and reader engagement.",
    };
  }

  if (pathname === "/") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Bookshop",
      description: "Discover books, writers and stories from across the Bookshop catalogue.",
    };
  }

  if (pathname === "/books") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Books Catalogue",
      description: "Browse, search and filter the books currently available through Bookshop.",
    };
  }

  if (pathname.startsWith("/books/")) {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Book Details",
      description: "Read about this title, review its details and choose how you would like to continue.",
    };
  }

  if (pathname === "/library") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "My Library",
      description: "Your purchased and saved books in one place.",
    };
  }

  if (pathname === "/account") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Account Hub",
      description: "Manage your profile, reading activity and access to writer or administration tools.",
    };
  }

  if (pathname === "/auth") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Sign In",
      description: "Sign in to your Bookshop account or create a new account.",
    };
  }

  if (pathname.startsWith("/checkout/success")) {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Order Confirmation",
      description: "Your purchase has been completed and your order details are shown below.",
    };
  }

  if (pathname.startsWith("/checkout")) {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Checkout",
      description: "Review your order and complete your purchase securely.",
    };
  }

  return {
    area: "front",
    areaLabel: "Front of House",
    title: "Bookshop",
    description: "Independent publishing and reading in one connected platform.",
  };
}

export default function PageHeader() {
  const pathname = usePathname() || "/";
  const config = getPageConfig(pathname);

  return (
    <section className="bookshop-shell pt-6 sm:pt-8" aria-labelledby="site-page-title">
      <div className="bookshop-page-header" data-area={config.area}>
        <div>
          <p className="bookshop-page-area">{config.areaLabel}</p>
          <h1 id="site-page-title" className="bookshop-page-title">
            {config.title}
          </h1>
          <p className="bookshop-page-description">{config.description}</p>
        </div>
      </div>
    </section>
  );
}
