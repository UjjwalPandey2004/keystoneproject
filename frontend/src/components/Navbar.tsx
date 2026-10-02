import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { KeystoneLogo } from './KeystoneLogo';
import { NotificationItem, tabForNotification } from './NotificationItem';
import { notificationApi } from '../services/api';
import { AppNotification } from '../types';
import { Tab } from '../navigation';

interface NavbarProps {
  onTabChange: (tab: Tab) => void;
}

export const initials = (name?: string) =>
  (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');

export const Navbar: React.FC<NavbarProps> = ({ onTabChange }) => {
  const { viewRole } = useAuth();
  const { unread, refreshUnread } = useNotifications();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (anchor.current && !anchor.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggleBell = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        setItems(await notificationApi.list(8));
      } finally {
        setLoading(false);
      }
    }
  };

  const openNotification = async (n: AppNotification) => {
    if (!n.read) {
      await notificationApi.markRead(n.id).catch(() => undefined);
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      refreshUnread();
    }
    const tab = tabForNotification(viewRole, n);
    if (tab) {
      setOpen(false);
      onTabChange(tab);
    }
  };

  const markAll = async () => {
    await notificationApi.markAllRead();
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    refreshUnread();
  };

  return (
    <header className="ks-topbar">
      <div className="ks-brand">
        <KeystoneLogo size={38} />
        <div>
          <div className="ks-brand-name">KEYSTONE</div>
          <div className="ks-brand-sub">Field Service Management Platform</div>
        </div>
      </div>

      <div className="ks-topbar-actions">
        <div className="ks-dropdown-anchor" ref={anchor}>
          <button
            className="ks-round-btn"
            onClick={toggleBell}
            aria-label={`Notifications, ${unread} unread`}
            aria-expanded={open}
            title="Notifications"
          >
            <Bell size={17} />
            {unread > 0 && <span className="ks-bell-count">{unread > 99 ? '99+' : unread}</span>}
          </button>
          {open && (
            <div className="ks-dropdown" role="dialog" aria-label="Notifications">
              <div className="ks-dropdown-head">
                <span>Notifications {unread > 0 && <span className="ks-dim" style={{ fontWeight: 500 }}>({unread} unread)</span>}</span>
                {unread > 0 && <button className="ks-link-btn" onClick={markAll}>Mark all read</button>}
              </div>
              <div className="ks-dropdown-list">
                {loading ? (
                  <div className="ks-empty">Loading…</div>
                ) : items.length === 0 ? (
                  <div className="ks-empty">You're all caught up.</div>
                ) : (
                  items.map((n) => <NotificationItem key={n.id} notification={n} onOpen={openNotification} />)
                )}
              </div>
              <div className="ks-dropdown-foot">
                <button className="ks-link-btn" onClick={() => { setOpen(false); onTabChange('notifications'); }}>
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
