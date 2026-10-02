import React, { useEffect, useState } from 'react';
import { Building, CalendarDays, CheckCircle2, Hash, KeyRound, Mail, MapPin, Pencil, Phone, Shield, User as UserIcon } from 'lucide-react';
import { apiError, authApi, customerApi } from '../services/api';
import { User } from '../types';
import { initials } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const ChangePasswordCard: React.FC = () => {
  const { replaceToken } = useAuth();
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
      // Older sessions are now invalid; keep this one signed in with the fresh token.
      if (res.token) replaceToken(res.token);
      setMessage({ ok: true, text: `${res.message || 'Password changed successfully'}. Your other devices have been signed out.` });
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setMessage({ ok: false, text: apiError(err, 'Unable to change the password.') });
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: 'current' | 'next' | 'confirm', autoComplete: string) => (
    <div>
      <label className="ks-label" htmlFor={`pw-${key}`}>{label}</label>
      <input
        id={`pw-${key}`}
        type="password"
        required
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <form className="ks-card ks-form" onSubmit={submit}>
      <h3 className="ks-section-title"><KeyRound size={18} /> Change Password</h3>
      {field('Current Password', 'current', 'current-password')}
      {field('New Password', 'next', 'new-password')}
      {field('Confirm New Password', 'confirm', 'new-password')}
      <div className="ks-hint">At least 8 characters. Changing it signs you out on every other device.</div>
      {message && <div className={`ks-alert ${message.ok ? 'ks-alert-success' : 'ks-alert-error'}`} style={{ marginBottom: 0 }}>{message.text}</div>}
      <div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <KeyRound size={15} /> {saving ? 'Changing…' : 'Change Password'}
        </button>
      </div>
    </form>
  );
};

const EditProfileCard: React.FC<{ profile: User; onSaved: (user: User) => void }> = ({ profile, onSaved }) => {
  const [form, setForm] = useState({
    userName: profile.userName,
    phone: profile.phone || '',
    location: profile.location || '',
    available: profile.available ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const technician = profile.role === 'TECHNICIAN';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const saved = await authApi.updateMe({
        userName: form.userName,
        phone: form.phone,
        ...(technician ? { location: form.location, available: form.available } : {}),
      });
      onSaved(saved);
      setMessage({ ok: true, text: 'Profile updated.' });
    } catch (err) {
      setMessage({ ok: false, text: apiError(err, 'Unable to update your profile.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="ks-card ks-form" onSubmit={submit}>
      <h3 className="ks-section-title"><Pencil size={18} /> Edit Profile</h3>
      <div><label className="ks-label" htmlFor="pf-name">Name</label><input id="pf-name" required maxLength={100} value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} /></div>
      <div><label className="ks-label" htmlFor="pf-phone">Phone</label><input id="pf-phone" type="tel" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      {technician && (
        <>
          <div>
            <label className="ks-label" htmlFor="pf-location">Current / base location</label>
            <input id="pf-location" maxLength={150} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Jaipur" />
            <div className="ks-hint">Dispatchers see this when choosing a technician.</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
            <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
            Available for new jobs
          </label>
        </>
      )}
      <div className="ks-hint">Your email and role are managed by KEYSTONE and cannot be changed here.</div>
      {message && <div className={`ks-alert ${message.ok ? 'ks-alert-success' : 'ks-alert-error'}`} style={{ marginBottom: 0 }}>{message.text}</div>}
      <div><button type="submit" className="btn btn-primary" disabled={saving}><Pencil size={15} /> {saving ? 'Saving…' : 'Save Profile'}</button></div>
    </form>
  );
};

export const ProfilePage: React.FC = () => {
  const { refreshUser } = useAuth();
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
      } catch (err) {
        setError(apiError(err, 'Unable to load your profile.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onSaved = (user: User) => {
    setProfile(user);
    refreshUser().catch(() => undefined);
  };

  const rows: { label: string; value: React.ReactNode; icon: React.ReactNode }[] = profile
    ? [
        { label: 'Name', value: profile.userName, icon: <UserIcon size={16} /> },
        {
          label: 'Email',
          value: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {profile.userEmail}
              {profile.emailVerified !== false && <span className="badge badge-available"><CheckCircle2 size={12} /> Verified</span>}
            </span>
          ),
          icon: <Mail size={16} />,
        },
        { label: 'Phone', value: profile.phone || 'Not provided', icon: <Phone size={16} /> },
        { label: 'Role', value: <span className="ks-role-tag">{profile.role}</span>, icon: <Shield size={16} /> },
        ...(profile.role === 'CUSTOMER'
          ? [{ label: 'Organisation', value: organisation || 'Not linked yet', icon: <Building size={16} /> }]
          : []),
        ...(profile.role === 'TECHNICIAN'
          ? [{
              label: 'Location',
              value: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {profile.location || 'Not set'}
                  <span className={`badge ${profile.available ? 'badge-available' : 'badge-busy'}`}>{profile.available ? 'Available' : 'Unavailable'}</span>
                </span>
              ),
              icon: <MapPin size={16} />,
            }]
          : []),
        { label: profile.role === 'CUSTOMER' ? 'Customer ID' : 'User ID', value: `#${profile.id}`, icon: <Hash size={16} /> },
        { label: 'Joined', value: profile.joinedAt ? new Date(profile.joinedAt).toLocaleDateString([], { dateStyle: 'medium' }) : '—', icon: <CalendarDays size={16} /> },
      ]
    : [];

  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">Profile</h2>
          <p className="ks-page-sub">Your account as stored in KEYSTONE.</p>
        </div>
      </div>

      {loading && <div className="ks-card">Loading profile…</div>}
      {error && <div className="ks-alert ks-alert-error">{error}</div>}

      {profile && (
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', alignItems: 'start' }}>
          <div className="ks-card">
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

          <div style={{ display: 'grid', gap: 20 }}>
            <EditProfileCard profile={profile} onSaved={onSaved} />
            <ChangePasswordCard />
          </div>
        </div>
      )}
    </div>
  );
};
