import React from 'react';
import { AlertTriangle, Bell, CalendarCheck, CheckCircle2, ClipboardList, CreditCard, ShieldCheck, UserCheck, XCircle } from 'lucide-react';
import { AppNotification, NotificationType, Role } from '../types';
import { Tab } from '../navigation';

const STYLE: Record<NotificationType, { icon: React.ReactNode; tint: string }> = {
  WORK_ORDER_CREATED: { icon: <ClipboardList size={17} />, tint: 'ks-stat-tint-info' },
  WORK_ORDER_ASSIGNED: { icon: <UserCheck size={17} />, tint: 'ks-stat-tint-info' },
  TECHNICIAN_ASSIGNMENT: { icon: <UserCheck size={17} />, tint: 'ks-stat-tint-info' },
  WORK_ORDER_STATUS: { icon: <ClipboardList size={17} />, tint: 'ks-stat-tint-info' },
  WORK_ORDER_COMPLETED: { icon: <CheckCircle2 size={17} />, tint: 'ks-stat-tint-success' },
  CRITICAL_WORK_ORDER: { icon: <AlertTriangle size={17} />, tint: 'ks-alert-error' },
  PAYMENT_PENDING: { icon: <CreditCard size={17} />, tint: 'ks-alert-warning' },
  PAYMENT_RECEIVED: { icon: <CreditCard size={17} />, tint: 'ks-stat-tint-success' },
  PAYMENT_FAILED: { icon: <XCircle size={17} />, tint: 'ks-alert-error' },
  PAYMENT_CANCELLED: { icon: <XCircle size={17} />, tint: 'ks-alert-warning' },
  EMAIL_VERIFIED: { icon: <ShieldCheck size={17} />, tint: 'ks-stat-tint-success' },
  SECURITY: { icon: <ShieldCheck size={17} />, tint: 'ks-alert-warning' },
  CUSTOMER_REGISTERED: { icon: <UserCheck size={17} />, tint: 'ks-stat-tint-success' },
  ATTENDANCE: { icon: <CalendarCheck size={17} />, tint: 'ks-stat-tint-info' },
};

export const timeAgo = (iso: string) => {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
};

// Which page a notification's reference opens for the current (viewed) role.
export const tabForNotification = (role: Role | null, n: AppNotification): Tab | null => {
  if (n.referenceType === 'PAYMENT') {
    return role === 'MANAGER' ? 'payments' : role === 'CUSTOMER' ? 'mypayments' : null;
  }
  if (n.referenceType === 'WORK_ORDER') {
    if (role === 'TECHNICIAN') return 'field';
    if (role === 'CUSTOMER') return 'customer';
    return 'board';
  }
  return null;
};

interface Props {
  notification: AppNotification;
  onOpen: (n: AppNotification) => void;
}

export const NotificationItem: React.FC<Props> = ({ notification: n, onOpen }) => {
  const style = STYLE[n.type] || { icon: <Bell size={17} />, tint: 'ks-stat-tint-info' };
  return (
    <button className={`ks-notif ${n.read ? '' : 'unread'}`} onClick={() => onOpen(n)}>
      <span className={`ks-notif-icon ${style.tint}`}>{style.icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="ks-notif-title" style={{ display: 'block' }}>{n.title}</span>
        <span className="ks-notif-msg" style={{ display: 'block' }}>{n.message}</span>
        <span className="ks-notif-meta">
          <span title={new Date(n.createdAt).toLocaleString()}>{timeAgo(n.createdAt)}</span>
          {n.referenceLabel && <span className="ks-accent">{n.referenceLabel}</span>}
          <span>{n.read ? 'Read' : 'Unread'}</span>
        </span>
      </span>
      {!n.read && <span className="ks-unread-dot" aria-label="Unread" />}
    </button>
  );
};
