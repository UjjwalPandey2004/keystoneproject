import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Shield, Wrench, ClipboardList, BarChart3, Building, LogOut, User as UserIcon, Moon, Sun } from 'lucide-react';
import { Role } from '../types';

export const Navbar: React.FC = () => {
  const { user, role, logout, login } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const handleQuickSwitch = async (targetRole: Role, email: string) => {
    try {
      await login(email, 'password');
      if (targetRole === 'MANAGER') setCurrentTab('dashboard');
      else if (targetRole === 'DISPATCHER') setCurrentTab('board');
      else if (targetRole === 'TECHNICIAN') setCurrentTab('field');
      else if (targetRole === 'CUSTOMER') setCurrentTab('customer');
    } catch (err) {
      console.error('Quick switch failed', err);
    }
  };

  const [currentTab, setCurrentTab] = React.useState<'dashboard' | 'board' | 'field' | 'customers' | 'customer'>('dashboard');

  return (
    <header style={{ background: isDark ? '#1e293b' : '#0f172a', color: isDark ? '#f1f5f9' : '#ffffff', borderBottom: '1px solid #334155' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: isDark ? '#3f3f4f' : '#4f46e5', color: isDark ? '#f1f5f9' : '#ffffff', width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
            K
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.2 }}>KEYSTONE</h1>
            <p style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#94a3b8', margin: 0 }}>Meridian Facilities Management</p>
          </div>
        </div>

        {/* Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={toggleTheme}
            style={{
              width: 32, height: 32, borderRadius: 50, background: isDark ? '#334155' : '#f1f5f9', 
              border: '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}
          >
            <Moon size={18} color={isDark ? '#f1f5f9' : '#334155'} />
          </button>
        </div>

        {/* Role Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {(role === 'MANAGER' || role === 'DISPATCHER') && (
            <button
              onClick={() => setCurrentTab('board')}
              className={`btn btn-sm ${currentTab === 'board' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ background: currentTab === 'board' ? '#4f46e5' : '#1e293b', color: isDark ? '#ffffff' : '#ffffff', border: '1px solid #334155' }}
            >
              <ClipboardList size={14} /> Dispatch Board
            </button>
          )}

          {role === 'MANAGER' && (
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`btn btn-sm ${currentTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ background: currentTab === 'dashboard' ? '#4f46e5' : '#1e293b', color: isDark ? '#ffffff' : '#ffffff', border: '1px solid #334155' }}
            >
              <BarChart3 size={14} /> Ops Dashboard
            </button>
          )}

          {(role === 'MANAGER' || role === 'DISPATCHER') && (
            <button
              onClick={() => setCurrentTab('customers')}
              className={`btn btn-sm ${currentTab === 'customers' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ background: currentTab === 'customers' ? '#4f46e5' : '#1e293b', color: isDark ? '#ffffff' : '#ffffff', border: '1px solid #334155' }}
            >
              <Building size={14} /> Customers & Sites
            </button>
          )}

          {(role === 'TECHNICIAN' || role === 'MANAGER') && (
            <button
              onClick={() => setCurrentTab('field')}
              className={`btn btn-sm ${currentTab === 'field' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ background: currentTab === 'field' ? '#4f46e5' : '#1e293b', color: isDark ? '#ffffff' : '#ffffff', border: '1px solid #334155' }}
            >
              <Wrench size={14} /> Technician Field View
            </button>
          )}

          {(role === 'CUSTOMER' || role === 'MANAGER') && (
            <button
              onClick={() => setCurrentTab('customer')}
              className={`btn btn-sm ${currentTab === 'customer' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ background: currentTab === 'customer' ? '#4f46e5' : '#1e293b', color: isDark ? '#ffffff' : '#ffffff', border: '1px solid #334155' }}
            >
              <Shield size={14} /> Customer Portal
            </button>
          )}
        </nav>

        {/* User Info & Quick Demo Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <div style={{ background: isDark ? '#334155' : '#f1f5f9', padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserIcon size={14} color={isDark ? '#38bdf8' : '#1e293b'} />
              <span style={{ fontWeight: 600 }}>{user?.userName}</span>
              <span style={{ fontSize: '0.75rem', color: isDark ? '#cbd5e1' : '#64748b', background: isDark ? '#475569' : '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                {role}
              </span>
            </div>
          </div>

          {/* Quick Demo Switcher Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: '0.7rem', color: isDark ? '#cbd5e1' : '#64748b' }}>Demo Role:</span>
            <button 
              onClick={() => handleQuickSwitch('MANAGER', 'admin@meridian.com')}
              title="Switch to Manager"
              style={{ padding: '3px 6px', fontSize: '0.7rem', background: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#fff' : '#1e293b', borderRadius: 4 }}
            >
              Manager
            </button>
            <button 
              onClick={() => handleQuickSwitch('DISPATCHER', 'dispatcher@meridian.com')}
              title="Switch to Dispatcher"
              style={{ padding: '3px 6px', fontSize: '0.7rem', background: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#fff' : '#1e293b', borderRadius: 4 }}
            >
              Dispatch
            </button>
            <button 
              onClick={() => handleQuickSwitch('TECHNICIAN', 'tech@meridian.com')}
              title="Switch to Technician"
              style={{ padding: '3px 6px', fontSize: '0.7rem', background: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#fff' : '#1e293b', borderRadius: 4 }}
            >
              Tech
            </button>
            <button 
              onClick={() => handleQuickSwitch('CUSTOMER', 'customer@meridian.com')}
              title="Switch to Customer"
              style={{ padding: '3px 6px', fontSize: '0.7rem', background: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#fff' : '#1e293b', borderRadius: 4 }}
            >
              Customer
            </button>
          </div>

          <button onClick={logout} className="btn btn-sm btn-secondary" style={{ background: isDark ? '#334155' : '#f87171', color: isDark ? '#fff' : '#fff', border: 'none' }}>
            <LogOut size={14} /> Exit
          </button>
        </div>

      </div>
    </header>
  );
};