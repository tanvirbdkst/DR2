import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Calendar,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Radio,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  requestAndRegisterPush,
  getPushPermissionStatus,
  listenForForegroundPush,
  PermissionState
} from '../services/webPushService.js';
import { isFirebaseWebConfigured } from '../config/firebase.js';

export interface AppNotification {
  id: number;
  user_id: number;
  role: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  is_read: number;
  created_at: string;
  read_at?: string | null;
}

interface NotificationBellProps {
  role: 'admin' | 'compounder' | 'doctor' | 'patient';
  onNavigate?: (view: string) => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  role,
  onNavigate,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<PermissionState>('default');
  const [pushSubscribing, setPushSubscribing] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);
  const [testingPush, setTestingPush] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check initial push status
  useEffect(() => {
    setPushStatus(getPushPermissionStatus());
  }, []);

  // Fetch notifications from server
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=30');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(Number(data.unreadCount) || 0);
      }
    } catch (err) {
      console.warn('[NotificationBell] Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Set up SSE (Server-Sent Events) live connection
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/notifications/stream');

      eventSource.addEventListener('notification', (e) => {
        try {
          const newNotif = JSON.parse(e.data);
          setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
          setUnreadCount((prev) => prev + 1);

          // Audio chime or subtle vibrate if supported
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
          }
        } catch (parseErr) {
          console.warn('[SSE] Parse error:', parseErr);
        }
      });

      eventSource.onerror = () => {
        // SSE will attempt auto-reconnect
      };
    } catch (sseErr) {
      console.warn('[SSE] Not supported or failed:', sseErr);
    }

    // Fallback polling interval every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    // Listen for foreground FCM push messages
    let unsubscribePush: (() => void) | null = null;
    listenForForegroundPush((payload) => {
      fetchNotifications();
    }).then((unsub) => {
      unsubscribePush = unsub;
    });

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
      if (unsubscribePush) unsubscribePush();
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark single notification as read
  const handleMarkAsRead = async (id: number) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch (err) {
      console.warn('[NotificationBell] Mark as read error:', err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
    } catch (err) {
      console.warn('[NotificationBell] Mark all read error:', err);
    }
  };

  // Request & register browser push notifications
  const handleEnablePush = async () => {
    setPushSubscribing(true);
    setPushFeedback(null);
    try {
      const result = await requestAndRegisterPush();
      setPushStatus(getPushPermissionStatus());
      if (result.success) {
        setPushFeedback('Browser push notifications enabled successfully!');
      } else {
        setPushFeedback(result.error || 'Push registration could not be completed.');
      }
    } catch (err: any) {
      setPushFeedback(err.message || 'Push registration failed.');
    } finally {
      setPushSubscribing(false);
      setTimeout(() => setPushFeedback(null), 6000);
    }
  };

  // Send a test notification (useful for testing FCM and in-app notifications)
  const handleSendTestPush = async () => {
    setTestingPush(true);
    try {
      const res = await fetch('/api/notifications/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPushFeedback('Test notification sent! Check in-app list and device notifications.');
        fetchNotifications();
      } else {
        setPushFeedback(data.error || 'Failed to send test push.');
      }
    } catch (err: any) {
      setPushFeedback(err.message || 'Test push failed.');
    } finally {
      setTestingPush(false);
      setTimeout(() => setPushFeedback(null), 6000);
    }
  };

  // Format relative timestamp
  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer border border-slate-700 flex items-center justify-center focus:outline-hidden"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-slate-900 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold tracking-tight">
                  Notifications (নোটিফিকেশন)
                </h3>
                <p className="text-[10px] text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3 h-3 text-emerald-400" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Push Notification Controls / Status Banner */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                <Radio className={`w-3.5 h-3.5 ${pushStatus === 'granted' ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
                <span>
                  Browser Push:{' '}
                  <strong className={pushStatus === 'granted' ? 'text-emerald-700' : 'text-slate-600'}>
                    {pushStatus === 'granted' ? 'Enabled (Active)' : pushStatus === 'denied' ? 'Blocked in Browser' : 'Inactive'}
                  </strong>
                </span>
              </div>

              {pushStatus !== 'granted' && pushStatus !== 'unsupported' && (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={pushSubscribing}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {pushSubscribing ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-amber-300" />
                  )}
                  <span>Enable Push</span>
                </button>
              )}
            </div>

            {/* Test Push button for Admin / Compounder */}
            {(role === 'admin' || role === 'compounder') && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-[10px] text-slate-500">Firebase Push Diagnostic:</span>
                <button
                  type="button"
                  onClick={handleSendTestPush}
                  disabled={testingPush}
                  className="text-[10px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 underline cursor-pointer disabled:opacity-50"
                >
                  {testingPush ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                  <span>Send Test Push</span>
                </button>
              </div>
            )}

            {pushFeedback && (
              <div className="text-[10px] p-1.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                {pushFeedback}
              </div>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium">No notifications yet.</p>
                <p className="text-[10px] text-slate-400">
                  New serial bookings and queue updates will show up here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isBooked = notif.type === 'appointment.booked';
                const isCancelled = notif.type === 'appointment.cancelled';

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.is_read) handleMarkAsRead(notif.id);
                      if (notif.data?.url && onNavigate) {
                        const target = notif.data.url.replace(/^\//, '');
                        onNavigate(target);
                        setIsOpen(false);
                      }
                    }}
                    className={`p-3 sm:p-3.5 transition cursor-pointer flex items-start gap-3 hover:bg-slate-50 ${
                      notif.is_read ? 'bg-white opacity-80' : 'bg-amber-50/40'
                    }`}
                  >
                    {/* Icon indicator */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isBooked
                          ? 'bg-emerald-100 text-emerald-700'
                          : isCancelled
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {isBooked ? (
                        <Calendar className="w-4 h-4" />
                      ) : isCancelled ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {notif.title}
                        </h4>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {notif.body}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(notif.created_at)}</span>
                        </span>

                        {notif.data?.serialNumber && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold font-mono">
                            Serial #{notif.data.serialNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <span className="text-[10px] text-slate-400">
              Daktar Serial Live Notification Hub (Firebase & In-App)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
