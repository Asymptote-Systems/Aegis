import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Utility functions
const getBaseUrl = () => {
  const currentUrl = new URL(window.location.origin);
  return `${currentUrl.protocol}//${currentUrl.hostname}:8000`;
};

const getAuthHeaders = (includeContentType = true) => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('authToken');
  if (!token) return includeContentType ? { 'Content-Type': 'application/json' } : {};
  const headers = { 'Authorization': `Bearer ${token}` };
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
};

const checkAuthToken = () => {
  const tokenKeys = ['token', 'access_token', 'authToken', 'accessToken'];
  let token = null;
  for (const key of tokenKeys) {
    token = localStorage.getItem(key);
    if (token) {
      localStorage.setItem('token', token);
      break;
    }
  }
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      tokenKeys.forEach(key => localStorage.removeItem(key));
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const makeAuthenticatedRequest = async (url, options = {}) => {
  if (!checkAuthToken()) throw new Error('No valid authentication token');
  const defaultOptions = { headers: getAuthHeaders() };
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...options.headers }
  };
  try {
    const response = await fetch(url, mergedOptions);
    if (response.status === 401) {
      ['token', 'access_token', 'authToken', 'accessToken'].forEach(key => { localStorage.removeItem(key); });
      toast.error('Session expired. Please log in again.');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
      throw new Error('Authentication failed');
    }
    if (response.status === 403) {
      toast.error('You do not have permission to perform this action');
      throw new Error('Permission denied');
    }
    return response;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      toast.error('Network error. Please check your connection.');
      throw new Error('Network error');
    }
    throw error;
  }
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  const fetchUnreadCount = async () => {
    try {
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/notifications/unread-count`,
        {}
      );
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/notifications/my-notifications?unread_only=false`,
        {}
      );
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.slice(0, 10)); // Show last 10
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const baseUrl = getBaseUrl();
      await makeAuthenticatedRequest(
        `${baseUrl}/api/notifications/${notificationId}/mark-read`,
        { method: 'PUT' }
      );
      // Refresh
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const baseUrl = getBaseUrl();
      await makeAuthenticatedRequest(
        `${baseUrl}/api/notifications/mark-all-read`,
        { method: 'POST' }
      );
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No notifications</p>
          ) : (
            <div className="space-y-2">
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    !notif.is_read ? 'bg-blue-50 border border-blue-200' : 'border border-gray-200'
                  }`}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-sm">{notif.title}</h4>
                    {!notif.is_read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
