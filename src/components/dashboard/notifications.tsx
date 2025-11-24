/**
 * Notifications Component
 * 
 * Bell icon with dropdown showing notifications
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Notification, NotificationsResponse } from '@/lib/notifications/types';

async function fetchNotifications(): Promise<NotificationsResponse> {
  const response = await fetch('/api/notifications');
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return response.json();
}

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return date.toLocaleDateString();
}

function getNotificationIcon(type: Notification['type']): string {
  switch (type) {
    case 'new_order':
      return '🛒';
    case 'pending_payment':
      return '⏳';
    case 'failed_payment':
      return '❌';
    case 'low_stock':
      return '⚠️';
    case 'new_support_ticket':
      return '🎫';
    case 'support_ticket_reply':
      return '💬';
    default:
      return '🔔';
  }
}

function getNotificationColor(type: Notification['type']): string {
  switch (type) {
    case 'new_order':
      return 'text-blue-600';
    case 'pending_payment':
      return 'text-amber-600';
    case 'failed_payment':
      return 'text-red-600';
    case 'low_stock':
      return 'text-orange-600';
    case 'new_support_ticket':
      return 'text-purple-600';
    case 'support_ticket_reply':
      return 'text-indigo-600';
    default:
      return 'text-gray-600';
  }
}

// Get read notification IDs from localStorage
function getReadNotificationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const stored = localStorage.getItem('read_notifications');
  return stored ? new Set(JSON.parse(stored)) : new Set();
}

// Save read notification IDs to localStorage
function saveReadNotificationIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('read_notifications', JSON.stringify(Array.from(ids)));
}

// Mark all current notifications as read
function markAllNotificationsAsRead(notificationIds: string[]) {
  const readIds = getReadNotificationIds();
  notificationIds.forEach(id => readIds.add(id));
  saveReadNotificationIds(readIds);
}

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Load read IDs from localStorage on mount and when data changes
  useEffect(() => {
    setReadIds(getReadNotificationIds());
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });

  // Update readIds when data changes
  useEffect(() => {
    setReadIds(getReadNotificationIds());
  }, [data]);

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/clear', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to clear notifications');
      }
      return response.json();
    },
    onSuccess: () => {
      // Mark all current notifications as read in localStorage
      if (data?.notifications) {
        const notificationIds = data.notifications.map(n => n.id);
        markAllNotificationsAsRead(notificationIds);
        // Update state immediately
        const newReadIds = getReadNotificationIds();
        setReadIds(newReadIds);
      }
    },
  });

  // Filter out read notifications
  const filteredNotifications = useMemo(() => {
    return data?.notifications?.filter(n => !readIds.has(n.id)) || [];
  }, [data?.notifications, readIds]);
  
  const unreadCount = filteredNotifications.length;
  const notifications = filteredNotifications;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <span className="sr-only">Notifications</span>
          <BellIcon className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Loading notifications...
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-8 text-sm text-destructive">
              Failed to load notifications
            </div>
          )}

          {!isLoading && !error && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BellIcon className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">
                You're all caught up!
              </p>
            </div>
          )}

          {!isLoading && !error && notifications.length > 0 && (
            <div className="py-1">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  asChild
                  className="flex flex-col items-start px-4 py-3 cursor-pointer hover:bg-accent"
                >
                  <Link
                    href={notification.link}
                    onClick={() => {
                      // Mark notification as read when clicked
                      const newReadIds = new Set(readIds);
                      newReadIds.add(notification.id);
                      saveReadNotificationIds(newReadIds);
                      setReadIds(newReadIds);
                      setOpen(false);
                    }}
                  >
                    <div className="flex w-full items-start gap-3">
                      <span className="text-xl mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm font-medium ${getNotificationColor(notification.type)}`}
                          >
                            {notification.title}
                          </p>
                          {!readIds.has(notification.id) && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="flex flex-col gap-1 p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-sm"
                onClick={() => {
                  clearAllMutation.mutate();
                  setOpen(false);
                }}
                disabled={clearAllMutation.isPending}
              >
                {clearAllMutation.isPending ? 'Clearing...' : 'Clear All'}
              </Button>
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/orders?status=pending"
                  className="w-full text-center text-sm"
                  onClick={() => setOpen(false)}
                >
                  View all orders
                </Link>
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

