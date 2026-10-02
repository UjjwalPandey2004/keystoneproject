import React from 'react';
import {
  BarChart3, Bell, Building, CalendarCheck, ClipboardList, CreditCard, HardHat, LayoutDashboard, ListChecks, MapPin, Truck,
  User as UserIcon, Users, Wrench,
} from 'lucide-react';
import { Role } from './types';

export type Tab =
  | 'home' | 'reports' | 'board' | 'field' | 'customers' | 'customer' | 'users' | 'profile'
  | 'deliveries' | 'payments' | 'mypayments' | 'notifications' | 'technicians' | 'tasks' | 'staff' | 'attendance';

export interface NavItem {
  tab: Tab;
  label: string;
  icon: React.ReactNode;
}

const item = (tab: Tab, label: string, icon: React.ReactNode): NavItem => ({ tab, label, icon });

// Sidebar entries per role. Each one maps to a page the backend allows that role to use.
export const navForRole = (role: Role | null): NavItem[] => {
  const dashboard = item('home', 'Dashboard', <LayoutDashboard size={18} />);
  const notifications = item('notifications', 'Notifications', <Bell size={18} />);
  const profile = item('profile', 'Profile', <UserIcon size={18} />);
  switch (role) {
    case 'MANAGER':
      return [
        dashboard,
        item('customers', 'Customers', <Building size={18} />),
        item('staff', 'Staff', <Users size={18} />),
        item('board', 'Work Orders', <ClipboardList size={18} />),
        item('deliveries', 'Deliveries', <Truck size={18} />),
        item('payments', 'Payments', <CreditCard size={18} />),
        item('attendance', 'Attendance', <CalendarCheck size={18} />),
        notifications,
        item('reports', 'Reports', <BarChart3 size={18} />),
        profile,
      ];
    case 'DISPATCHER':
      return [
        dashboard,
        item('board', 'Work Orders', <ClipboardList size={18} />),
        item('deliveries', 'Deliveries', <Truck size={18} />),
        item('technicians', 'Technicians', <HardHat size={18} />),
        notifications,
        profile,
      ];
    case 'TECHNICIAN':
      return [
        dashboard,
        item('field', 'My Work Orders', <Wrench size={18} />),
        item('tasks', 'My Tasks', <ListChecks size={18} />),
        notifications,
        profile,
      ];
    case 'CUSTOMER':
      return [
        dashboard,
        item('customer', 'My Services', <MapPin size={18} />),
        item('mypayments', 'My Payments', <CreditCard size={18} />),
        notifications,
        profile,
      ];
    default:
      return [dashboard, notifications, profile];
  }
};

// Pages a role may open that are reached from the dashboard rather than the sidebar.
const extraTabs: Partial<Record<Role, Tab[]>> = {
  DISPATCHER: ['customers'],
  MANAGER: ['field', 'technicians', 'users'],
};

export const isTabAllowed = (role: Role | null, tab: Tab) =>
  navForRole(role).some((entry) => entry.tab === tab) || (role ? extraTabs[role]?.includes(tab) ?? false : false);

// The current page lives in the URL hash (#/profile) so a browser refresh stays on it.
export const tabFromHash = (): Tab => (window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'home') as Tab;
