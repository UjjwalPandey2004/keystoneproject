import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Wrench, ClipboardList, Building2, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDark, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password');
    setError(null);
    setLoading(true);
    try {
      await login(demoEmail, 'password');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login with demo credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: isDark ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' : 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
      <div style={{ maxWidth: 900, width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 32, alignItems: 'center' }}>
        
        {/* Left Side: Brand & Overview */}
        <div style={{ color: isDark ? '#f1f5f9' : '#ffffff' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(79, 70, 229, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', padding: '6px 14px', borderRadius: 9999, marginBottom: 16 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8' }} />
            <span style={{ fontSize: '0.8rem', color: isDark ? '#c7d2fe' : '#334155', fontWeight: 600, letterSpacing: '0.05em' }}>ZIDIO ENGINEERING PROJECT</span>
          </div>

          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.02em' }}>
            Project KEYSTONE
          </h1>
          <p style={{ fontSize: '1.05rem', color: isDark ? '#94a3b8' : '#334155', lineHeight: 1.6, marginBottom: 24 }}>
            Commercial facilities maintenance and field-service platform for Meridian Facilities Management. Governed work-order lifecycle, role-based access, inventory integrity, and real-time SLA tracking.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: isDark ? '#cbd5e1' : '#64748b', fontSize: '0.9rem' }}>
              <CheckCircle2 size={18} color="#34d399" />
              <span>Spring Boot 3 + PostgreSQL + Flyway Schema Migrations</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: isDark ? '#cbd5e1' : '#64748b', fontSize: '0.9rem' }}>
              <CheckCircle2 size={18} color="#34d399" />
              <span>Stateless JWT Authentication & 4 Role-Based Boundaries</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: isDark ? '#cbd5e1' : '#64748b', fontSize: '0.9rem' }}>
              <CheckCircle2 size={18} color="#34d399" />
              <span>Guarded Lifecycle State Machine with Append-Only Audit Trail</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card & Demo Quick Logins */}
        <div style={{ background: isDark ? '#334155' : '#ffffff', borderRadius: 16, padding: 32, boxShadow: isDark ? '0 20px 25px -5px rgba(0, 0, 0, 0.5)' : '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a', marginBottom: 6 }}>Sign In</h2>
          <p style={{ fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b', marginBottom: 20 }}>Select a role or sign in with your credentials.</p>

          {error && (
            <div style={{ background: isDark ? '#3f3f4f' : '#fef2f2', border: isDark ? '1px solid #4f46e5' : '1px solid #fecaca', color: isDark ? '#9f7ae2' : '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 4 }}>Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="e.g. admin@meridian.com"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid ' + (isDark ? '#475569' : '#cbd5e1'), borderRadius: 6, fontSize: '0.9rem', outline: 'none', background: isDark ? '#3f3f4f' : '#fff', color: isDark ? '#f1f5f9' : '#0f172a' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 4 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid ' + (isDark ? '#475569' : '#cbd5e1'), borderRadius: 6, fontSize: '0.9rem', outline: 'none', background: isDark ? '#3f3f4f' : '#fff', color: isDark ? '#f1f5f9' : '#0f172a' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '11px 0', marginTop: 6, fontSize: '0.95rem', background: isDark ? '#3f3f4f' : '#3f3f4f', color: isDark ? '#f1f5f9' : '#fff' }}
            >
              <KeyRound size={16} /> {loading ? 'Authenticating...' : 'Sign In to Keystone'}
            </button>
          </form>

          {/* Seed Quick-Login Buttons */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: isDark ? '1px solid #475569' : '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: isDark ? '#cbd5e1' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              One-Click Seed Logins (For Review & Demo)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@meridian.com')}
                style={{ background: isDark ? '#3f3f4f' : '#f8fafc', border: '1px solid ' + (isDark ? '#475569' : '#cbd5e1'), padding: '8px 10px', borderRadius: 6, textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.8rem', color: isDark ? '#f1f5f9' : '#1e293b' }}>
                  <Shield size={14} color="#4f46e5" /> Manager
                </div>
                <div style={{ fontSize: '0.7rem', color: isDark ? '#94a3b8' : '#64748b' }}>Full system / SLA</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('dispatcher@meridian.com')}
                style={{ background: isDark ? '#3f3f4f' : '#f8fafc', border: '1px solid ' + (isDark ? '#475569' : '#cbd5e1'), padding: '8px 10px', borderRadius: 6, textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.8rem', color: isDark ? '#f1f5f9' : '#1e293b' }}>
                  <ClipboardList size={14} color="#0284c7" /> Dispatcher
                </div>
                <div style={{ fontSize: '0.7rem', color: isDark ? '#94a3b8' : '#64748b' }}>Kanban / Assign</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('tech@meridian.com')}
                style={{ background: isDark ? '#3f3f4f' : '#f8fafc', border: '1px solid ' + (isDark ? '#475569' : '#cbd5e1'), padding: '8px 10px', borderRadius: 6, textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.8rem', color: isDark ? '#f1f5f9' : '#1e293b' }}>
                  <Wrench size={14} color="#d97706" /> Technician
                </div>
                <div style={{ fontSize: '0.7rem', color: isDark ? '#94a3b8' : '#64748b' }}>Field / Parts / Time</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('customer@meridian.com')}
                style={{ background: isDark ? '#3f3f4f' : '#f8fafc', border: '1px solid ' + (isDark ? '#475569' : '#cbd5e1'), padding: '8px 10px', borderRadius: 6, textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.8rem', color: isDark ? '#f1f5f9' : '#1e293b' }}>
                  <Building2 size={14} color="#059669" /> Customer
                </div>
                <div style={{ fontSize: '0.7rem', color: isDark ? '#94a3b8' : '#64748b' }}>Raise / Track</div>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};