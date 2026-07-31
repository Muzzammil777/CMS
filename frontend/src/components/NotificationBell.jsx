import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import './NotificationBell.css';
import { buildApiUrl } from '../api/apiBase';
import { getUserSession } from '../auth/sessionController';

export default function NotificationBell({ role = 'student', onBellClick }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const session = getUserSession();
  const userId = session?.userId || '';

  useEffect(() => {
    // Fetch unread count
    const fetchUnreadCount = async () => {
      try {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        const qs = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(buildApiUrl(`/notifications/${role}/unread${qs}`));
        if (!response.ok) throw new Error(`Failed to fetch unread count (${response.status})`);
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching unread count:', error);
        setLoading(false);
      }
    };

    fetchUnreadCount();

    const handleUpdate = () => {
      fetchUnreadCount();
    };
    window.addEventListener('cms-notifications-update', handleUpdate);

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('cms-notifications-update', handleUpdate);
    };
  }, [role, userId]);

  return (
    <button
      className="relative p-2.5 rounded-xl border border-[#E6EDF2] bg-[#FAFBFC] hover:bg-[#F2FBFA] hover:border-[#003A40] text-[#003A40] transition-all cursor-pointer shadow-2xs flex items-center justify-center active:scale-95"
      onClick={onBellClick}
      title={`${unreadCount} unread notifications`}
      aria-label="Notifications"
    >
      <BellRing className="w-5 h-5 text-[#003A40]" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-[20px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full ring-2 ring-white shadow-xs">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

