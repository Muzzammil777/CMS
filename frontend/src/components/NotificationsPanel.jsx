import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { buildApiUrl } from '../api/apiBase';

export default function NotificationsPanel({ facultyId, isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && facultyId) {
      fetchNotifications();
    }
  }, [isOpen, facultyId]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl(`/faculty/${facultyId}/notifications`));
      const data = await response.json();
      setNotifications(data);
      
      const unread = data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(buildApiUrl(`/faculty/${facultyId}/notifications/${notificationId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n._id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'LeaveApproval':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'WorkloadAlert':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'Performance':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-slate-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Bell size={24} className="text-green-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-800">Notifications</h2>
              <p className="text-sm text-slate-500">{unreadCount} unread</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 flex-col gap-2">
              <Bell size={32} className="opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map(notification => (
                <div
                  key={notification._id}
                  onClick={() => !notification.is_read && markAsRead(notification._id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    notification.is_read
                      ? 'bg-white hover:bg-slate-50'
                      : 'bg-green-50 hover:bg-green-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-slate-900 text-sm">
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-green-600 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(notification.created_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={fetchNotifications}
            className="w-full px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
