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
  const [collapsed, setCollapsed] = useState(false);

  // Load saved collapse state on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_sidebar_collapsed");
      if (saved === "true") {
        setCollapsed(true);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin_sidebar_collapsed", String(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  };

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

  interface SubNavItem {
    label: string;
    href: string;
    exact?: boolean;
    permission?: string;
  }

  interface NavGroup {
    id: string;
    label: string;
    href: string;
    icon: string;
    exact?: boolean;
    permission?: string;
    children?: SubNavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "/admin",
      icon: "📊",
      exact: true,
    },
    {
      id: "orders",
      label: "Orders & Sales",
      href: "/admin/orders",
      icon: "📦",
      children: [
        { label: "All Orders", href: "/admin/orders", exact: true },
        { label: "Payments", href: "/admin/payments" },
        { label: "Discounts", href: "/admin/discounts" },
      ],
    },
    {
      id: "catalog",
      label: "Catalog & Stock",
      href: "/admin/products",
      icon: "🎨",
      children: [
        { label: "Products", href: "/admin/products", exact: true },
        { label: "Categories", href: "/admin/categories" },
        { label: "Bundles", href: "/admin/products/bundles" },
        { label: "Inventory", href: "/admin/inventory" },
        { label: "Customizations", href: "/admin/customizations" },
      ],
    },
    {
      id: "customers",
      label: "Customers & CRM",
      href: "/admin/customers",
      icon: "👥",
      children: [
        { label: "Directory", href: "/admin/customers", exact: true },
        { label: "Reviews", href: "/admin/reviews" },
      ],
    },
    {
      id: "marketing",
      label: "Marketing",
      href: "/admin/marketing/campaigns",
      icon: "✉️",
      children: [
        { label: "Campaigns", href: "/admin/marketing/campaigns" },
        { label: "Segments", href: "/admin/marketing/segments" },
        { label: "Automations", href: "/admin/marketing/automations" },
        { label: "Historical Import", href: "/admin/marketing/import" },
      ],
    },
    {
      id: "analytics",
      label: "Analytics",
      href: "/admin/analytics",
      icon: "📈",
    },
    {
      id: "settings",
      label: "Settings",
      href: "/admin/settings",
      icon: "⚙️",
      permission: "organization.manage",
      children: [
        { label: "Settings Hub", href: "/admin/settings", exact: true },
        { label: "Payment Methods", href: "/admin/settings/payments" },
        { label: "Delivery Zones", href: "/admin/settings/delivery" },
        { label: "Locations", href: "/admin/settings/locations" },
        { label: "Warehouses", href: "/admin/settings/warehouses" },
        { label: "Team Members", href: "/admin/settings/team", permission: "team.read" },
        { label: "Audit Logs", href: "/admin/audit-logs", permission: "organization.manage" },
      ],
    },
  ];

  const filteredNavGroups = navGroups
    .filter((group) => {
      if (group.permission === "organization.manage" && !isAdmin) return false;
      if (group.permission === "team.read" && !isAdmin) return false;
      return true;
    })
    .map((group) => {
      if (!group.children) return group;
      return {
        ...group,
        children: group.children.filter((child) => {
          if (child.permission === "organization.manage" && !isAdmin) return false;
          if (child.permission === "team.read" && !isAdmin) return false;
          return true;
        }),
      };
    });

  const isLinkActive = (href: string, exact: boolean = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const isGroupActive = (group: NavGroup) => {
    if (group.exact) return pathname === group.href;
    if (group.children?.some((child) => isLinkActive(child.href, child.exact))) {
      return true;
    }
    return pathname.startsWith(group.href);
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Auto-expand active group on route change
  useEffect(() => {
    filteredNavGroups.forEach((group) => {
      if (group.children && isGroupActive(group)) {
        setOpenGroups((prev) => ({ ...prev, [group.id]: true }));
      }
    });
  }, [pathname]);

  const toggleGroup = (groupId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const getPageTitle = () => {
    if (pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/audit-logs")) return "Audit Logs";
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

  const isBuilderPage =
    pathname === "/admin/marketing/campaigns/new" ||
    (pathname.startsWith("/admin/marketing/campaigns/") &&
      !pathname.endsWith("/campaigns") &&
      !pathname.endsWith("/import"));

  return (
    <div className="min-h-screen bg-bg-subtle text-slate-800 flex flex-col md:flex-row">
      {/* 1. Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-neutral-charcoal text-slate-200 shrink-0 md:h-screen md:sticky md:top-0 border-r border-slate-800 select-none transition-[width] duration-300 ease-in-out ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div
          className={`p-4 border-b border-slate-800 flex items-center ${
            collapsed ? "justify-center" : "justify-between"
          } transition-all duration-300`}
        >
          <Link
            href="/admin"
            className="flex items-center gap-3 group overflow-hidden"
            title="Unwind & Doodle Admin"
          >
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs shrink-0">
              <img
                src="/logo.png"
                alt="Admin Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {!collapsed && (
              <div className="transition-opacity duration-200 min-w-0">
                <div className="font-heading font-bold text-sm tracking-tight text-white flex items-center gap-1.5 whitespace-nowrap">
                  <span>Unwind &amp; Doodle</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded whitespace-nowrap">
                  Admin Console
                </span>
              </div>
            )}
          </Link>

          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label="Collapse sidebar"
              aria-expanded={!collapsed}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Collapse sidebar"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Collapsed Expand Quick Button */}
        {collapsed && (
          <div className="py-2 flex justify-center border-b border-slate-800">
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label="Expand sidebar"
              aria-expanded={!collapsed}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Expand sidebar"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Store Context Badge */}
        {!collapsed ? (
          <div className="px-5 py-3 bg-slate-800/40 border-b border-slate-800">
            <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Active Store
            </div>
            <div className="text-xs font-bold text-slate-100 truncate">
              {session?.organization.name || "Unwind & Doodle"}
            </div>
          </div>
        ) : (
          <div
            className="px-2 py-2.5 bg-slate-800/40 border-b border-slate-800 flex justify-center"
            title={`Active Store: ${session?.organization.name || "Unwind & Doodle"}`}
          >
            <span className="text-xs">🏪</span>
          </div>
        )}

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-4 space-y-1.5">
          {filteredNavGroups.map((group) => {
            const hasChildren = Boolean(group.children && group.children.length > 0);
            const active = isGroupActive(group);
            const isOpen = Boolean(openGroups[group.id]);

            if (collapsed) {
              return (
                <Link
                  key={group.id}
                  href={group.href}
                  title={group.label}
                  className={`flex items-center justify-center p-2.5 rounded-xl text-xs font-medium transition-colors ${
                    active
                      ? "bg-rose-500 text-white font-semibold shadow-xs"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <span className="text-base">{group.icon}</span>
                </Link>
              );
            }

            return (
              <div key={group.id} className="space-y-1">
                <div
                  className={`flex items-center justify-between rounded-xl transition-colors ${
                    active && !isOpen
                      ? "bg-rose-500 text-white font-semibold shadow-xs"
                      : active && isOpen
                        ? "bg-slate-800/90 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <Link
                    href={group.href}
                    className="flex-1 flex items-center gap-3 px-3 py-2 text-xs font-medium min-w-0"
                  >
                    <span className="text-sm shrink-0">{group.icon}</span>
                    <span className="truncate">{group.label}</span>
                  </Link>

                  {hasChildren && (
                    <button
                      type="button"
                      onClick={(e) => toggleGroup(group.id, e)}
                      aria-label={`Toggle ${group.label} submenu`}
                      aria-expanded={isOpen}
                      className="p-2 mr-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Sub-items accordion */}
                {hasChildren && isOpen && (
                  <div className="ml-4 pl-3 border-l border-slate-800/80 space-y-0.5 py-1 animate-in fade-in duration-150">
                    {group.children!.map((child) => {
                      const childActive = isLinkActive(child.href, child.exact);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            childActive
                              ? "text-rose-400 font-bold bg-rose-950/40"
                              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer / View Store */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <Link
            href="/"
            target="_blank"
            title={collapsed ? "View Live Store" : undefined}
            className={`flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors ${
              collapsed ? "py-2 px-2" : "gap-2 w-full py-2 px-3"
            }`}
          >
            <span>↗</span>
            {!collapsed && <span>View Live Store</span>}
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

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {filteredNavGroups.map((group) => {
                const hasChildren = Boolean(group.children && group.children.length > 0);
                const active = isGroupActive(group);
                const isOpen = Boolean(openGroups[group.id]);

                return (
                  <div key={group.id} className="space-y-1">
                    <div
                      className={`flex items-center justify-between rounded-xl ${
                        active && !isOpen
                          ? "bg-rose-500 text-white font-bold"
                          : active && isOpen
                            ? "bg-slate-800 text-white font-bold"
                            : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <Link
                        href={group.href}
                        onClick={() => {
                          if (!hasChildren) setMobileSidebarOpen(false);
                        }}
                        className="flex-1 flex items-center gap-3 px-3 py-2.5 text-xs font-medium"
                      >
                        <span>{group.icon}</span>
                        <span>{group.label}</span>
                      </Link>

                      {hasChildren && (
                        <button
                          type="button"
                          onClick={(e) => toggleGroup(group.id, e)}
                          className="p-2.5 mr-1 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      )}
                    </div>

                    {hasChildren && isOpen && (
                      <div className="ml-4 pl-3 border-l border-slate-800 space-y-1 py-1">
                        {group.children!.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setMobileSidebarOpen(false)}
                            className={`block px-3 py-2 rounded-xl text-xs font-medium ${
                              isLinkActive(child.href, child.exact)
                                ? "bg-rose-500/20 text-rose-300 font-bold"
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
      <div className={`flex-1 flex flex-col min-w-0 ${isBuilderPage ? "h-screen overflow-hidden" : ""}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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

            {/* Desktop sidebar collapse/expand toggle */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden md:flex p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
                  d="M4 6h16M4 12h16M4 18h7"
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
        <main
          className={
            isBuilderPage
              ? "flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden w-full"
              : "flex-1 p-4 w-full mx-auto"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
