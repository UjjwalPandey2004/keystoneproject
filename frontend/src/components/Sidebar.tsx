import React from 'react';
import { Eye, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { navForRole, Tab } from '../navigation';
import { Role } from '../types';
import { initials } from './Navbar';

interface SidebarProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const VIEW_ROLES: Role[] = ['MANAGER', 'DISPATCHER', 'TECHNICIAN', 'CUSTOMER'];

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const { user, role, viewRole, setViewAs, logout } = useAuth();
  const { unread } = useNotifications();
  const { isDark, toggleTheme } = useTheme();

  return (
    <nav className="ks-sidebar" aria-label="Main navigation">
      <button className={`ks-side-user ${currentTab === 'profile' ? 'active' : ''}`} onClick={() => onTabChange('profile')} title="View profile">
        <span className="ks-avatar" style={{ width: 38, height: 38, fontSize: 14 }}>{initials(user?.userName)}</span>
        <span style={{ minWidth: 0, textAlign: 'left' }}>
          <span className="ks-side-user-name">{user?.userName}</span>
          <span className="ks-side-user-role">{role}{viewRole !== role ? ` · viewing as ${viewRole}` : ''}</span>
        </span>
      </button>

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
          {entry.tab === 'notifications' && unread > 0 && <span className="ks-nav-badge">{unread > 99 ? '99+' : unread}</span>}
        </button>
      ))}

      <div className="ks-sidebar-footer">
        <button className="ks-nav-item" onClick={toggleTheme} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button className="ks-nav-item ks-nav-logout" onClick={logout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};
