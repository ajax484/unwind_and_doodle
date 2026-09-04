'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { InAppNotification } from '@/types/notification';

interface NotificationBellProps {
  variant?: 'customer' | 'admin';
  className?: string;
}

export default function NotificationBell({
  variant = 'customer',
  className = '',
}: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications?limit=25');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setNotifications(json.data.notifications || []);
          setUnreadCount(json.data.unreadCount || 0);
        }
      }
    } catch {
      // Ignore background fetch failure
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll notifications periodically while mounted
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Handle outside clicks and ESC key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, link?: string | null) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch {
      // Revert if failed
      fetchNotifications();
    }

    if (link) {
      setIsOpen(false);
      router.push(link);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    try {
      setMarkingAll(true);
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: now })));
      setUnreadCount(0);

      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch {
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'yesterday';
    return `${diffDay}d ago`;
  };

  const getCategoryIcon = (category: string, type: string) => {
    switch (category) {
      case 'order':
        return '📦';
      case 'stock':
        return '🎨';
      case 'customization':
        return '✂️';
      case 'review':
        return '⭐';
      case 'inventory':
        return '📋';
      default:
        return type === 'success' ? '✓' : type === 'warning' ? '⚠️' : type === 'error' ? '✕' : '🔔';
    }
  };

  const filteredNotifications =
    activeTab === 'unread'
      ? notifications.filter((n) => !n.readAt)
      : notifications;

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {/* Bell Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="Open notifications"
        aria-expanded={isOpen}
        className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
          variant === 'admin'
            ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 bg-white'
            : 'text-[#243342] hover:text-[#D99BA3] hover:bg-[#FBF0F2]'
        }`}
      >
        <svg
          className="w-5 h-5 transition-transform group-hover:scale-110"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge Counter */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-75"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Popover Drawer */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="fixed inset-x-3 top-16 sm:static sm:inset-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 rounded-2xl bg-white border border-[#EDF3F7] shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-[#EDF3F7] bg-[#FAFCFD] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-sm text-[#243342]">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="bg-rose-100 text-rose-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="text-[11px] font-heading font-semibold text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {markingAll ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="px-3 pt-2 pb-1 border-b border-[#EDF3F7] flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg font-heading font-semibold transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#EBF3F8] text-[#243342]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1 rounded-lg font-heading font-semibold transition-colors cursor-pointer ${
                activeTab === 'unread'
                  ? 'bg-[#EBF3F8] text-[#243342]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#F4F8FA]">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="text-3xl">✨</div>
                <p className="font-heading font-semibold text-xs text-slate-700">
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-slate-400">
                  You are completely caught up with your updates.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isUnread = !item.readAt;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleMarkAsRead(item.id, item.link)}
                    className={`p-3.5 transition-colors cursor-pointer relative group flex items-start gap-3 ${
                      isUnread ? 'bg-[#FBF0F2]/30 hover:bg-[#FBF0F2]/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Category Icon Circle */}
                    <div
                      className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm border shadow-2xs ${
                        isUnread
                          ? 'bg-white border-[#F2D7DC]'
                          : 'bg-slate-50 border-slate-200/80 text-slate-500'
                      }`}
                    >
                      {getCategoryIcon(item.category, item.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h4
                          className={`text-xs leading-snug truncate ${
                            isUnread
                              ? 'font-heading font-bold text-slate-900'
                              : 'font-heading font-medium text-slate-700'
                          }`}
                        >
                          {item.title}
                        </h4>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>

                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{formatRelativeTime(item.createdAt)}</span>
                        {item.link && (
                          <span className="text-[#D99BA3] font-semibold group-hover:underline flex items-center gap-0.5">
                            View details ↗
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unread Indicator Dot */}
                    {isUnread && (
                      <span
                        className="absolute right-3 top-4 w-2 h-2 rounded-full bg-rose-500 shadow-2xs"
                        title="Unread"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
