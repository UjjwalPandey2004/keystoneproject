import React, { useEffect, useState } from 'react';
import { CheckCheck, RefreshCw } from 'lucide-react';
import { notificationApi } from '../services/api';
import { AppNotification } from '../types';
import { NotificationItem, tabForNotification } from '../components/NotificationItem';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { Tab } from '../navigation';

interface Props {
  onTabChange: (tab: Tab) => void;
}

export const NotificationsPage: React.FC<Props> = ({ onTabChange }) => {
  const { viewRole } = useAuth();
  const { refreshUnread } = useNotifications();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setItems(await notificationApi.list(100));
      setError('');
    } catch {
      setError('Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const open = async (n: AppNotification) => {
    if (!n.read) {
      await notificationApi.markRead(n.id).catch(() => undefined);
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      refreshUnread();
    }
    const tab = tabForNotification(viewRole, n);
    if (tab) onTabChange(tab);
  };

  const markAll = async () => {
    await notificationApi.markAllRead();
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    refreshUnread();
  };

  const unreadCount = items.filter((n) => !n.read).length;
  const shown = filter === 'unread' ? items.filter((n) => !n.read) : items;

  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">Notifications</h2>
          <p className="ks-page-sub">Updates about your work orders, payments and account. {unreadCount} unread.</p>
        </div>
        <div className="ks-toolbar-actions">
          <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('all')}>All</button>
          <button className={`btn btn-sm ${filter === 'unread' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('unread')}>Unread</button>
          <button className="btn btn-sm btn-secondary" onClick={load}><RefreshCw size={14} /> Refresh</button>
          <button className="btn btn-sm btn-secondary" onClick={markAll} disabled={unreadCount === 0}><CheckCheck size={14} /> Mark all read</button>
        </div>
      </div>

      {error && <div className="ks-alert ks-alert-error">{error}</div>}

      <div className="ks-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="ks-empty">Loading notifications…</div>
        ) : shown.length === 0 ? (
          <div className="ks-empty">{filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</div>
        ) : (
          shown.map((n) => <NotificationItem key={n.id} notification={n} onOpen={open} />)
        )}
      </div>
    </div>
  );
};
