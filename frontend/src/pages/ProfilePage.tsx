import React, { useEffect, useState } from 'react';
import { Building, Hash, KeyRound, Mail, Phone, Shield, User as UserIcon } from 'lucide-react';
import { authApi, customerApi } from '../services/api';
import { User } from '../types';
import { initials } from '../components/Navbar';

const ChangePasswordCard: React.FC = () => {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (form.next.length < 8) {
      setMessage({ ok: false, text: 'New password must be at least 8 characters.' });
      return;
    }
    if (form.next !== form.confirm) {
      setMessage({ ok: false, text: 'New password and confirm password do not match.' });
      return;
    }
    setSaving(true);
    try {
      const res = await authApi.changePassword(form.current, form.next, form.confirm);
      setMessage({ ok: true, text: res.message || 'Password changed successfully.' });
      setForm({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      const data = err.response?.data;
      const fieldError = data?.fieldErrors && Object.values(data.fieldErrors)[0];
      setMessage({ ok: false, text: (fieldError as string) || data?.message || 'Unable to change the password.' });
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: 'current' | 'next' | 'confirm', autoComplete: string) => (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span className="ks-field-label" style={{ display: 'block', marginBottom: 4 }}>{label}</span>
      <input
        type="password"
        required
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        style={{ width: '100%' }}
      />
    </label>
  );

  return (
    <form className="ks-card" style={{ maxWidth: 720, marginTop: 20 }} onSubmit={submit}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '1.05rem', marginBottom: 14 }}>
        <KeyRound size={18} /> Change Password
      </div>
      {field('Current Password', 'current', 'current-password')}
      {field('New Password', 'next', 'new-password')}
      {field('Confirm New Password', 'confirm', 'new-password')}
      {message && <div className={message.ok ? 'ks-success' : 'ks-error'} style={{ marginBottom: 12, fontSize: '0.9rem' }}>{message.text}</div>}
      <button type="submit" className="ks-btn ks-btn-gradient" disabled={saving}>
        <KeyRound size={15} /> {saving ? 'Changing…' : 'Change Password'}
      </button>
    </form>
  );
};

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<User | null>(null);
  const [organisation, setOrganisation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const me = await authApi.me();
        setProfile(me);
        if (me.role === 'CUSTOMER' && me.customerId) {
          try {
            setOrganisation((await customerApi.getMine()).companyName);
          } catch {
            setOrganisation(null);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Unable to load your profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const rows: { label: string; value: React.ReactNode; icon: React.ReactNode }[] = profile
    ? [
        { label: 'Username', value: profile.userName, icon: <UserIcon size={16} /> },
        { label: 'Email', value: profile.userEmail, icon: <Mail size={16} /> },
        { label: 'Phone', value: profile.phone || 'Not provided', icon: <Phone size={16} /> },
        { label: 'Role', value: <span className="ks-role-tag">{profile.role}</span>, icon: <Shield size={16} /> },
        ...(profile.role === 'CUSTOMER'
          ? [{ label: 'Organisation', value: organisation || 'Not linked yet', icon: <Building size={16} /> }]
          : []),
        { label: 'User ID', value: `#${profile.id}`, icon: <Hash size={16} /> },
      ]
    : [];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="ks-page-title">Profile</div>
        <div className="ks-page-sub">Your account as stored in KEYSTONE.</div>
      </div>

      {loading && <div className="ks-card">Loading profile…</div>}
      {error && <div className="ks-card ks-error">{error}</div>}

      {profile && (
        <div className="ks-card" style={{ maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18, flexWrap: 'wrap' }}>
            <div className="ks-avatar" style={{ width: 84, height: 84, fontSize: 30, boxShadow: '0 10px 28px rgba(99, 102, 241, 0.45)' }}>
              {initials(profile.userName)}
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{profile.userName}</div>
              <div className="ks-page-sub">{profile.userEmail}</div>
            </div>
          </div>

          {rows.map((row) => (
            <div key={row.label} className="ks-field">
              <span className="ks-field-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{row.icon}{row.label}</span>
              <span className="ks-field-value">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {profile?.role === 'MANAGER' && <ChangePasswordCard />}
    </div>
  );
};
