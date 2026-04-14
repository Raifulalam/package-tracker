import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { formatDateTime, getStatusTone } from '../lib/formatters';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import { Bell } from "lucide-react";

const NotificationCenter = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    if (!user?.token) return undefined;

    const loadNotifications = async () => {
      try {
        const response = await api.get('/api/notifications', { token: user.token });
        if (!active) return;
        setItems(response.data || []);
        setUnreadCount(response.meta?.unreadCount || 0);
      } catch {
        if (!active) return;
        setItems([]);
        setUnreadCount(0);
      }
    };

    loadNotifications();

    const socket = getSocket();
    const handleNewNotification = (notification) => {
      if (String(notification.userId) !== String(user.id || user._id)) return;

      setItems((current) => [notification, ...current].slice(0, 50));
      setUnreadCount((current) => current + 1);
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      active = false;
      socket.off('notification:new', handleNewNotification);
    };
  }, [user]);

  const unreadTone = useMemo(() => getStatusTone(unreadCount ? 'Pending' : 'Available'), [unreadCount]);

  const markAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all', {}, { token: user.token });
      setUnreadCount(0);
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch {
      // no-op in UI
    }
  };

  return (
    <div className="notification-center">
      <button className="notification-toggle button-ghost" onClick={() => setOpen((current) => !current)} type="button">
        <div>
          <Bell size={24} />
        </div>
        <strong className={`status-badge tone-${unreadTone}`}>{unreadCount}</strong>
      </button>

      {open ? (
        <div className="notification-panel glass-card">
          <div className="notification-head">
            <div>
              <h3>Notifications</h3>
              <p>Live shipment, payment, and assignment updates.</p>
            </div>
            <button className="button-secondary" onClick={markAllRead} type="button">
              Mark all read
            </button>
          </div>

          {items.length === 0 ? (
            <div className="empty-state">No notifications yet.</div>
          ) : (
            <div className="notification-list">
              {items.map((item) => (
                <article className={`notification-item${item.isRead ? '' : ' unread'}`} key={item._id}>
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                  <small>{formatDateTime(item.createdAt)}</small>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default NotificationCenter;
