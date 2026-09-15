"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";
import { Avatar } from "@/components/Avatar";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import { AdminServerSession } from "@/lib/auth-helpers-server";

export default function AdminLayoutClient({
  children,
  session,
}: {
  children: React.ReactNode;
  session: AdminServerSession;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      window.dispatchEvent(new Event("auth-updated"));
      router.replace("/admin/login");
    } catch (err) {
      console.error("Error signing out:", err);
      router.replace("/admin/login");
    }
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  // Session keep-alive & visibility listener
  useEffect(() => {
    const keepSessionAlive = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (!data.authenticated) {
            router.replace("/admin/login");
          }
        }
      } catch (err) {
        console.warn("[admin-session-heartbeat] Ping failed:", err);
      }
    };

    const interval = setInterval(keepSessionAlive, 25 * 60 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        keepSessionAlive();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router]);

  const role = session?.membership.role?.toLowerCase() || "staff";
  const isOwner = role === "owner";
  const isAdmin = role === "admin" || isOwner;

  interface NavItem {
    label: string;
    href: string;
    icon: string;
    exact?: boolean;
    permission?: string;
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const navSections: NavSection[] = [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/admin", icon: "📊", exact: true },
        { label: "Analytics", href: "/admin/analytics", icon: "📈" },
      ],
    },
    {
      title: "Orders & Customers",
      items: [
        { label: "Orders", href: "/admin/orders", icon: "📦" },
        { label: "Customers", href: "/admin/customers", icon: "👥" },
        { label: "Reviews", href: "/admin/reviews", icon: "⭐" },
      ],
    },
    {
      title: "Catalog & Stock",
      items: [
        { label: "Products", href: "/admin/products", icon: "🎨", exact: true },
        { label: "Categories", href: "/admin/categories", icon: "🏷️" },
        { label: "Bundles", href: "/admin/products/bundles", icon: "🎁" },
        { label: "Inventory", href: "/admin/inventory", icon: "📋" },
        { label: "Customizations", href: "/admin/customizations", icon: "✂️" },
      ],
    },
    {
      title: "Marketing & Growth",
      items: [
        { label: "Campaigns", href: "/admin/marketing/campaigns", icon: "✉️" },
        { label: "Segments", href: "/admin/marketing/segments", icon: "🎯" },
        { label: "Discounts", href: "/admin/discounts", icon: "🏷️" },
      ],
    },
  ];

  const allNavSettings: NavItem[] = [
    {
      label: "Store Settings",
      href: "/admin/settings",
      icon: "⚙️",
      permission: "organization.manage",
    },
    {
      label: "Locations",
      href: "/admin/settings/locations",
      icon: "📍",
      permission: "organization.manage",
    },
    {
      label: "Warehouses",
      href: "/admin/settings/warehouses",
      icon: "🏬",
      permission: "organization.manage",
    },
    {
      label: "Delivery Zones",
      href: "/admin/settings/delivery",
      icon: "🚚",
      permission: "organization.manage",
    },
    {
      label: "Team Members",
      href: "/admin/settings/team",
      icon: "🛡️",
      permission: "team.read",
    },
  ];

  const navSettings = allNavSettings.filter((item) => {
    if (item.permission === "team.read") return isAdmin;
    if (item.permission === "organization.manage") return isAdmin;
    return true;
  });

  const isLinkActive = (href: string, exact: boolean = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const getPageTitle = () => {
    if (pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/analytics")) return "Store Analytics";
    if (pathname.startsWith("/admin/orders")) return "Order Management";
    if (pathname.startsWith("/admin/products/bundles"))
      return "Product Bundles";
    if (pathname.startsWith("/admin/products")) return "Products";
    if (pathname.startsWith("/admin/inventory")) return "Inventory & Stock";
    if (pathname.startsWith("/admin/customers")) return "Customer Directory";
    if (pathname.startsWith("/admin/reviews")) return "Review Moderation";
    if (pathname.startsWith("/admin/customizations")) return "Customizations";
    if (pathname.startsWith("/admin/discounts"))
      return "Discounts & Promotions";
    if (pathname.startsWith("/admin/marketing/campaigns"))
      return "Marketing Campaigns";
    if (pathname.startsWith("/admin/marketing/segments"))
      return "Customer Segments";
    if (pathname.startsWith("/admin/settings")) return "Store Settings";
    return "Admin Console";
  };

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    if (pathname === "/admin") {
      return [{ label: "Dashboard", isCurrent: true }];
    }

    const segments = pathname
      .replace(/^\/admin\/?/, "")
      .split("/")
      .filter(Boolean);
    const items: BreadcrumbItem[] = [];

    const sectionLabels: Record<string, string> = {
      analytics: "Store Analytics",
      orders: "Orders",
      products: "Products",
      bundles: "Bundles",
      inventory: "Inventory & Stock",
      customers: "Customers",
      reviews: "Reviews",
      customizations: "Customizations",
      discounts: "Discounts",
      marketing: "Marketing",
      campaigns: "Campaigns",
      segments: "Segments",
      settings: "Store Settings",
      locations: "Locations",
      warehouses: "Warehouses",
      delivery: "Delivery Rates",
      team: "Team Members",
    };

    let accumulatedPath = "/admin";
    segments.forEach((seg, idx) => {
      accumulatedPath += `/${seg}`;
      const isLast = idx === segments.length - 1;
      const label =
        sectionLabels[seg] || (seg.length > 12 ? `${seg.slice(0, 8)}…` : seg);
      items.push({
        label,
        href: isLast ? undefined : accumulatedPath,
        isCurrent: isLast,
      });
    });

    return items;
  };

  return (
    <div className="min-h-screen bg-bg-subtle text-slate-800 flex flex-col md:flex-row">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-neutral-charcoal text-slate-200 shrink-0 min-h-screen border-r border-slate-800 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs">
              <img
                src="/logo.png"
                alt="Admin Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="font-heading font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>Unwind &amp; Doodle</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded">
                Admin Console
              </span>
            </div>
          </Link>
        </div>

        {/* Store Context Badge */}
        <div className="px-5 py-3 bg-slate-800/40 border-b border-slate-800">
          <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Active Store
          </div>
          <div className="text-xs font-bold text-slate-100 truncate">
            {session?.organization.name || "Unwind & Doodle"}
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {section.title}
              </div>
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const active = isLinkActive(item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        active
                          ? "bg-rose-500 text-white font-semibold shadow-xs"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      }`}
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}

          {/* Settings Section */}
          <div>
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Settings &amp; Config
            </div>
            <nav className="space-y-1">
              {navSettings.map((item) => {
                const active = isLinkActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      active
                        ? "bg-rose-500 text-white font-semibold shadow-xs"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer / View Store */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <span>↗</span>
            <span>View Live Store</span>
          </Link>
        </div>
      </aside>

      {/* 2. Mobile Sidebar Overlay & Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />

          <div className="relative w-64 max-w-[80vw] bg-neutral-charcoal text-slate-200 flex flex-col h-full z-10 shadow-2xl animate-in slide-in-from-left">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="font-heading font-bold text-sm text-white">
                Unwind &amp; Doodle Admin
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Close Admin Sidebar"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {navSections.map((section) => (
                <div key={section.title}>
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {section.title}
                  </div>
                  <nav className="space-y-1">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                          isLinkActive(item.href, item.exact)
                            ? "bg-rose-500 text-white font-bold"
                            : "text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}

              <div className="pt-2 border-t border-slate-800">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Settings &amp; Config
                </div>
                <nav className="space-y-1">
                  {navSettings.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                        isLinkActive(item.href)
                          ? "bg-rose-500 text-white font-bold"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            <div className="p-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2 px-3 rounded-xl bg-red-950/40 text-red-300 hover:bg-red-900/60 text-xs font-semibold"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Open Admin Menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div className="hidden sm:block">
              <Breadcrumbs
                size="md"
                homeHref="/admin"
                homeLabel="Admin"
                items={getBreadcrumbs()}
                className="py-0"
              />
            </div>
          </div>

          {/* Right Header Admin Info & Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <Avatar
                size="sm"
                name={session?.user.email || "Admin"}
                status="online"
              />
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-700 leading-tight">
                  {session?.user.email || "Admin User"}
                </span>
                <span
                  className={`text-[10px] font-bold capitalize ${
                    isOwner
                      ? "text-amber-600"
                      : isAdmin
                        ? "text-rose-500"
                        : "text-blue-500"
                  }`}
                >
                  {session?.membership.role || "Staff"}
                </span>
              </div>
            </div>

            <NotificationBell variant="admin" />

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-red-600 text-xs font-semibold transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
