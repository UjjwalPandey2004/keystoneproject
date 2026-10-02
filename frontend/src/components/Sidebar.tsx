import React from 'react';
import { Eye, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { navForRole, Tab } from '../navigation';
import { Role } from '../types';

interface SidebarProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const VIEW_ROLES: Role[] = ['MANAGER', 'DISPATCHER', 'TECHNICIAN', 'CUSTOMER'];

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const { role, viewRole, setViewAs, logout } = useAuth();

  return (
    <nav className="ks-sidebar" aria-label="Main navigation">
      {/* Only a signed-in manager can preview other roles' screens. */}
      {role === 'MANAGER' && (
        <div className="ks-view-as">
          <label htmlFor="ks-view-as" className="ks-nav-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eye size={13} /> Switch Role (View As)
          </label>
          <select
            id="ks-view-as"
            value={viewRole || 'MANAGER'}
            onChange={(e) => {
              setViewAs(e.target.value as Role);
              onTabChange('home');
            }}
          >
            {VIEW_ROLES.map((r) => (
              <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>
      )}

      <div className="ks-nav-label">Navigation</div>
      {navForRole(viewRole).map((entry) => (
        <button
          key={entry.tab}
          className={`ks-nav-item ${currentTab === entry.tab ? 'active' : ''}`}
          onClick={() => onTabChange(entry.tab)}
        >
          {entry.icon}
          <span>{entry.label}</span>
        </button>
      ))}

      <div className="ks-sidebar-footer">
        <button className="ks-nav-item ks-nav-logout" onClick={logout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};
