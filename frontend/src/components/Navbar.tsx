import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { KeystoneLogo } from './KeystoneLogo';
import { Tab } from '../navigation';

interface NavbarProps {
  onTabChange: (tab: Tab) => void;
}

export const initials = (name?: string) =>
  (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');

export const Navbar: React.FC<NavbarProps> = ({ onTabChange }) => {
  const { user, role, viewRole, logout, login, demoMode } = useAuth();

  const handleQuickSwitch = async (email: string) => {
    try {
      await login(email, 'password');
      onTabChange('home');
    } catch (err) {
      console.error('Quick switch failed', err);
    }
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
        {demoMode && (
          <div className="ks-demo">
            <span>Demo:</span>
            <button onClick={() => handleQuickSwitch('admin@meridian.com')}>Manager</button>
            <button onClick={() => handleQuickSwitch('dispatcher@meridian.com')}>Dispatch</button>
            <button onClick={() => handleQuickSwitch('tech@meridian.com')}>Tech</button>
            <button onClick={() => handleQuickSwitch('customer@meridian.com')}>Customer</button>
          </div>
        )}

        <button className="ks-user-chip" onClick={() => onTabChange('profile')} title="View profile">
          <span className="ks-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{initials(user?.userName)}</span>
          <span style={{ fontWeight: 600 }}>{user?.userName}</span>
          <span className="ks-role-tag">{role}</span>
          {viewRole !== role && <span className="ks-role-tag" title="Manager preview of another role">Viewing as {viewRole}</span>}
        </button>

        <button className="ks-btn ks-btn-gradient" onClick={logout}>
          <LogOut size={15} /> Logout
        </button>
      </div>
    </header>
  );
};
