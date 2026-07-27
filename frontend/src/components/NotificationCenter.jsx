import { useEffect, useState } from 'react';
import NotificationCard from './NotificationCard';
import CreateNotification from './CreateNotification';
import './NotificationCenter.css';
import { buildApiUrl } from '../api/apiBase';
import { getUserSession } from '../auth/sessionController';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'Academic', label: 'Academic' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Administrative', label: 'Administrative' },
  { value: 'System', label: 'System' },
  { value: 'Alerts', label: 'Alerts' }
];

const PRIORITIES = [
  { value: '', label: 'All' },
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' }
];

export default function NotificationCenter({ role = 'student' }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const session = getUserSession();
  const userId = session?.userId || '';

  useEffect(() =>{
    fetchNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, selectedCategory, selectedPriority, selectedStatus, searchQuery]);

  const fetchNotifications = async () =>{
    setLoading(true);
    try {
      let url = buildApiUrl(`/notifications/${role}`);
      const params = new URLSearchParams();

      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedPriority) params.append('priority', selectedPriority);
      if (selectedStatus) params.append('status', selectedStatus);
      if (searchQuery) params.append('search', searchQuery);
      if (userId) params.append('userId', userId);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setNotifications(data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) =>{
    try {
      await fetch(buildApiUrl(`/notifications/${notificationId}/read`), { method: 'PUT' });
      setNotifications(notifications.map(n =>n.id === notificationId ? { ...n, status: 'read' } : n
      ));
      window.dispatchEvent(new CustomEvent('cms-notifications-update'));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () =>{
    try {
      await fetch(buildApiUrl(`/notifications/${role}/read-all`), { method: 'PUT' });
      fetchNotifications();
      window.dispatchEvent(new CustomEvent('cms-notifications-update'));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDelete = async (notificationId) =>{
    try {
      await fetch(buildApiUrl(`/notifications/${notificationId}`), { method: 'DELETE' });
      setNotifications(notifications.filter(n =>n.id !== notificationId));
      window.dispatchEvent(new CustomEvent('cms-notifications-update'));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClearAll = async () =>{
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      try {
        await fetch(buildApiUrl(`/notifications/${role}/clear-all`), { method: 'POST' });
        setNotifications([]);
        window.dispatchEvent(new CustomEvent('cms-notifications-update'));
      } catch (error) {
        console.error('Error clearing notifications:', error);
      }
    }
  };

  const handleViewDetails = (notification) =>{
    setSelectedNotification(notification);
    setShowDetails(true);
  };

  const handleNotificationCreated = (newNotification) =>{
    setNotifications([newNotification, ...notifications]);
    setShowCreateForm(false);
    window.dispatchEvent(new CustomEvent('cms-notifications-update'));
  };

  const unreadCount = notifications.filter(n =>n.status === 'unread').length;

  const mockFinanceNotifications = [
    {
      id: 'mock_fin_1',
      title: 'Fee Payment Received',
      message: 'Student John Anderson (STU-2024-1547) has successfully paid Semester 4 fees of ₹45,000.',
      module: 'Finance',
      priority: 'High',
      status: 'unread',
      createdAt: new Date().toISOString(),
      senderRole: 'system',
      relatedData: { studentId: 'STU-2024-1547', amount: '₹45,000' }
    },
    {
      id: 'mock_fin_2',
      title: 'Audit Warning',
      message: 'Quarterly financial audit is scheduled for next Monday. Please ensure all ledger entries are up to date.',
      module: 'Administrative',
      priority: 'Critical',
      status: 'unread',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      senderRole: 'admin'
    },
    {
      id: 'mock_fin_3',
      title: 'Scholarship Batch Processed',
      message: 'A batch of 12 merit scholarships has been approved for disbursement.',
      module: 'Finance',
      priority: 'Medium',
      status: 'read',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      senderRole: 'system'
    }
  ];

  let displayNotifications = notifications.length >0 ? notifications : (role === 'finance' ? mockFinanceNotifications : []);

  if (selectedCategory) {
    displayNotifications = displayNotifications.filter(n =>n.module === selectedCategory);
  }
  if (selectedPriority) {
    displayNotifications = displayNotifications.filter(n =>n.priority === selectedPriority);
  }
  if (selectedStatus) {
    displayNotifications = displayNotifications.filter(n =>n.status === selectedStatus);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    displayNotifications = displayNotifications.filter(n =>n.title.toLowerCase().includes(q) || 
      n.message.toLowerCase().includes(q)
    );
  }

  return (
    <div className="notification-center"><div className="notification-center-header-v2"><div className="notification-header-left"><span className="material-symbols-outlined header-icon">notifications_active</span><div><h1>Notifications</h1><p>Manage your alerts and financial updates</p></div></div><div className="notification-header-stats"><div className="stat-pill unread"><span className="dot"></span>{unreadCount || (role === 'finance' ? 2 : 0)} Unread
          </div><div className="stat-pill total">{displayNotifications.length} Total
          </div></div></div><div className="notification-center-toolbar"><div className="notification-center-search"><span className="material-symbols-outlined search-icon">search</span><input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) =>setSearchQuery(e.target.value)}
            className="notification-search-input"
          /></div><div className="notification-center-filters"><select
            value={selectedCategory}
            onChange={(e) =>setSelectedCategory(e.target.value)}
            className="notification-filter-select"
          >{CATEGORIES.map(cat =>(
              <option key={cat.value} value={cat.value}>{cat.label} Category</option>))}
          </select><select
            value={selectedPriority}
            onChange={(e) =>setSelectedPriority(e.target.value)}
            className="notification-filter-select"
          >{PRIORITIES.map(pri =>(
              <option key={pri.value} value={pri.value}>{pri.label} Priority</option>))}
          </select><select
            value={selectedStatus}
            onChange={(e) =>setSelectedStatus(e.target.value)}
            className="notification-filter-select"
          ><option value="">All Status</option><option value="unread">Unread</option><option value="read">Read</option></select></div><div className="notification-center-actions">{unreadCount >0 && (
            <button
              className="notification-center-btn secondary"
              onClick={handleMarkAllAsRead}
              title="Mark all notifications as read"
            ><span className="material-symbols-outlined">done_all</span>Mark All Read
            </button>)}
          <button
            className="notification-center-btn secondary"
            onClick={handleClearAll}
            title="Clear all notifications"
            disabled={displayNotifications.length === 0}
          ><span className="material-symbols-outlined">delete_sweep</span>Clear All
          </button>{(role === 'admin' || role === 'faculty') && (
            <button
              className="notification-center-btn primary"
              onClick={() =>setShowCreateForm(!showCreateForm)}
            ><span className="material-symbols-outlined">{showCreateForm ? 'close' : 'add'}</span>{showCreateForm ? 'Cancel' : 'Create'}
            </button>)}
        </div></div>{showCreateForm && (
        <CreateNotification
          senderRole={role}
          onNotificationCreated={handleNotificationCreated}
        />)}

      <div className="notification-center-content">{loading && notifications.length === 0 ? (
          <div className="notification-center-loading"><div className="loader"></div><p>Fetching alerts...</p></div>) : displayNotifications.length === 0 ? (
          <div className="notification-center-empty-v2"><div className="empty-icon-wrap"><span className="material-symbols-outlined">notifications_off</span></div><h3>All caught up!</h3><p>No new notifications at the moment.</p>{searchQuery && (
              <button onClick={() =>setSearchQuery('')} className="clear-search-btn">Clear Filters
              </button>)}
          </div>) : (
          <div className="notification-list-container">{displayNotifications.map(notification =>(
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkAsRead}
                onDelete={handleDelete}
                onViewDetails={handleViewDetails}
              />))}
          </div>)}
      </div>{showDetails && selectedNotification && (
        <NotificationDetailsModal
          notification={selectedNotification}
          onClose={() =>setShowDetails(false)}
        />)}
    </div>);
}

function NotificationDetailsModal({ notification, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="notification-modal-overlay" onClick={onClose}><div className="notification-modal" onClick={(e) =>e.stopPropagation()}><div className="notification-modal-header"><h2>{notification.title}</h2><button className="notification-modal-close" onClick={onClose}></button></div><div className="notification-modal-body"><div className="notification-modal-section"><h3>Message</h3><p>{notification.message}</p></div><div className="notification-modal-grid"><div className="notification-modal-item"><strong>Category</strong><p>{notification.module}</p></div><div className="notification-modal-item"><strong>Priority</strong><p>{notification.priority}</p></div><div className="notification-modal-item"><strong>From</strong><p className="capitalize">{notification.senderRole}</p></div><div className="notification-modal-item"><strong>Status</strong><p className="capitalize">{notification.status}</p></div></div>{notification.relatedData && Object.keys(notification.relatedData).length >0 && (
            <div className="notification-modal-section"><h3>Additional Information</h3><div className="notification-modal-details">{Object.entries(notification.relatedData).map(([key, value]) =>(
                  <div key={key} className="notification-modal-detail-item"><dt className="capitalize">{key.replace(/_/g, ' ')}</dt><dd>{String(value)}</dd></div>))}
              </div></div>)}

          <div className="notification-modal-section"><strong>Date & Time</strong><p>{new Date(notification.createdAt).toLocaleString()}</p></div></div><div className="notification-modal-footer"><button className="notification-modal-btn" onClick={onClose}>Close
          </button></div></div></div>);
}
