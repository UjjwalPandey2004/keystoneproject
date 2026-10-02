import React from 'react';
import { BarChart3, Building, ClipboardList, LayoutDashboard, MapPin, User as UserIcon, Users, Wrench } from 'lucide-react';
import { Role } from './types';

export type Tab = 'home' | 'reports' | 'board' | 'field' | 'customers' | 'customer' | 'users' | 'profile';

export interface NavItem {
  tab: Tab;
  label: string;
  icon: React.ReactNode;
}

const item = (tab: Tab, label: string, icon: React.ReactNode): NavItem => ({ tab, label, icon });

// Sidebar entries per role. Each one maps to a page the backend allows that role to use.
export const navForRole = (role: Role | null): NavItem[] => {
  const dashboard = item('home', 'Dashboard', <LayoutDashboard size={18} />);
  const profile = item('profile', 'Profile', <UserIcon size={18} />);
  switch (role) {
    case 'MANAGER':
      return [
        dashboard,
        item('customers', 'Customers', <Building size={18} />),
        item('users', 'Workers & Users', <Users size={18} />),
        item('board', 'Work Orders', <ClipboardList size={18} />),
        item('field', 'Field Jobs', <Wrench size={18} />),
        item('reports', 'Reports', <BarChart3 size={18} />),
        profile,
      ];
    case 'DISPATCHER':
      return [
        dashboard,
        item('board', 'Work Orders', <ClipboardList size={18} />),
        item('customers', 'Customers & Sites', <Building size={18} />),
        profile,
      ];
    case 'TECHNICIAN':
      return [
        dashboard,
        item('field', 'My Work Orders', <Wrench size={18} />),
        profile,
      ];
    case 'CUSTOMER':
      return [
        dashboard,
        item('customer', 'My Work Orders', <MapPin size={18} />),
        profile,
      ];
    default:
      return [dashboard, profile];
  }
};

export const isTabAllowed = (role: Role | null, tab: Tab) => navForRole(role).some((entry) => entry.tab === tab);

// The current page lives in the URL hash (#/profile) so a browser refresh stays on it.
export const tabFromHash = (): Tab => (window.location.hash.replace(/^#\/?/, '') || 'home') as Tab;
