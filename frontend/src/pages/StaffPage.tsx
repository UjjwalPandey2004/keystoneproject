import React, { useEffect, useState } from 'react';
import { Briefcase, Eye, Mail, MapPin, Pencil, Phone, RefreshCw, UserCog, Users, X } from 'lucide-react';
import { apiError, directoryApi, userApi } from '../services/api';
import { Role, StaffMember } from '../types';
import { initials } from '../components/Navbar';
import { UserManagement } from './UserManagement';
import { formatJoined } from './CustomersPage';

export const ATTENDANCE_BADGE: Record<string, { label: string; badge: string }> = {
  PRESENT: { label: 'Present', badge: 'badge-available' },
  HALF_DAY: { label: 'Half day', badge: 'badge-pending' },
  ON_LEAVE: { label: 'On leave', badge: 'badge-assigned' },
  ABSENT: { label: 'Absent', badge: 'badge-busy' },
  NOT_MARKED: { label: 'Not checked in', badge: 'badge-closed' },
};

interface StaffForm {
  userName: string;
  phone: string;
  role: Role;
  location: string;
  available: boolean;
  password: string;
}

// Manager edits a staff member's details (saved through PUT /api/users/{id}, manager only).
const EditStaffModal: React.FC<{ member: StaffMember; onClose: () => void; onSaved: (message: string) => void }> = ({ member, onClose, onSaved }) => {
  const [form, setForm] = useState<StaffForm>({
    userName: member.name,
    phone: member.phone || '',
    role: member.role,
    location: member.location || '',
    available: member.available ?? true,
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const technician = form.role === 'TECHNICIAN';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await userApi.update(member.id, {
        userName: form.userName.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        location: technician ? form.location.trim() : undefined,
        available: technician ? form.available : undefined,
        password: form.password || undefined,
      });
      onSaved(`${form.userName} updated.`);
    } catch (err) {
      setError(apiError(err, 'Could not save the changes.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3>Edit Staff — {member.name}</h3>
          <button className="ks-icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        {error && <div className="ks-alert ks-alert-error">{error}</div>}
        <form className="ks-form" onSubmit={submit}>
          <div><label className="ks-label" htmlFor="st-name">Name</label><input id="st-name" required maxLength={100} value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} /></div>
          <div className="ks-form-grid">
            <div><label className="ks-label" htmlFor="st-phone">Phone</label><input id="st-phone" type="tel" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +91 98765 43210" /></div>
            <div>
              <label className="ks-label" htmlFor="st-role">Role</label>
              <select id="st-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="TECHNICIAN">Technician</option>
                <option value="DISPATCHER">Dispatcher</option>
              </select>
            </div>
          </div>
          {technician && (
            <>
              <div><label className="ks-label" htmlFor="st-location">Location</label><input id="st-location" maxLength={150} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Jaipur" /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
                <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
                Available for new jobs
              </label>
            </>
          )}
          <div>
            <label className="ks-label" htmlFor="st-password">New password (optional)</label>
            <input id="st-password" type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep the current password" />
            <div className="ks-hint">Email can't be changed here. Setting a password signs this person out everywhere.</div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}><Pencil size={15} /> {saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StaffList: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<StaffMember | null>(null);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [notice, setNotice] = useState('');

  const load = () => {
    setLoading(true);
    directoryApi.staff()
      .then((list) => { setStaff(list); setError(''); })
      .catch((err) => setError(apiError(err, 'Unable to load staff.')))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const present = staff.filter((s) => s.todayAttendance === 'PRESENT' || s.todayAttendance === 'HALF_DAY').length;

  return (
    <>
      <div className="ks-grid" style={{ marginBottom: 18 }}>
        <div className="ks-card"><div className="ks-tile-value">{staff.length}</div><div className="ks-tile-title">Staff members</div></div>
        <div className="ks-card"><div className="ks-tile-value">{staff.filter((s) => s.role === 'TECHNICIAN').length}</div><div className="ks-tile-title">Technicians</div></div>
        <div className="ks-card"><div className="ks-tile-value">{staff.filter((s) => s.role === 'DISPATCHER').length}</div><div className="ks-tile-title">Dispatchers</div></div>
        <div className="ks-card"><div className="ks-tile-value">{present}</div><div className="ks-tile-title">Present today</div></div>
      </div>
      <div style={{ marginBottom: 12 }}><button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={14} /> Refresh</button></div>
      {error && <div className="ks-alert ks-alert-error">{error}</div>}
      {notice && <div className="ks-alert ks-alert-success">{notice}</div>}
      {loading ? <div className="ks-empty">Loading staff…</div> : staff.length === 0 ? <div className="card ks-empty">No staff yet. Add technicians and dispatchers under Manage Accounts.</div> : (
        <div className="ks-table-wrap">
          <table className="ks-table">
            <thead><tr><th>Name</th><th>Role</th><th>Location</th><th>Status</th><th>Attendance today</th><th>Current jobs</th><th>Actions</th></tr></thead>
            <tbody>{staff.map((s) => (
              <tr key={s.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="ks-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{initials(s.name)}</span><div><strong>{s.name}</strong><div className="ks-dim" style={{ fontSize: '0.76rem' }}>{s.email}</div></div></div></td>
                <td><span className="badge badge-assigned">{s.role}</span></td>
                <td>{s.role === 'TECHNICIAN' ? (s.location || <span className="ks-dim">Not set</span>) : <span className="ks-dim">Office</span>}</td>
                <td>{s.role === 'TECHNICIAN'
                  ? <span className={`badge ${s.available ? 'badge-available' : 'badge-busy'}`}>{s.available ? 'Available' : 'Unavailable'}</span>
                  : <span className="badge badge-new">On duty</span>}</td>
                <td><span className={`badge ${ATTENDANCE_BADGE[s.todayAttendance].badge}`}>{ATTENDANCE_BADGE[s.todayAttendance].label}</span></td>
                <td>{s.role === 'TECHNICIAN' ? s.currentJobs ?? 0 : '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => setViewing(s)}><Eye size={13} /> View</button>
                    <button className="btn btn-sm btn-primary" onClick={() => { setNotice(''); setEditing(s); }}><Pencil size={13} /> Edit</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {viewing && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Staff Profile</h3>
              <button className="ks-icon-btn" onClick={() => setViewing(null)} aria-label="Close"><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <span className="ks-avatar" style={{ width: 56, height: 56, fontSize: 20 }}>{initials(viewing.name)}</span>
              <div><div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{viewing.name}</div><span className="ks-role-tag">{viewing.role}</span></div>
            </div>
            <div className="ks-muted" style={{ display: 'grid', gap: 8, fontSize: '0.9rem' }}>
              <span style={{ display: 'flex', gap: 8 }}><MapPin size={16} /> {viewing.role === 'TECHNICIAN' ? viewing.location || 'Location not set' : 'Office'}</span>
              <span style={{ display: 'flex', gap: 8 }}><Mail size={16} /> {viewing.email}</span>
              <span style={{ display: 'flex', gap: 8 }}><Phone size={16} /> {viewing.phone || 'No phone'}</span>
              {viewing.role === 'TECHNICIAN' && <span style={{ display: 'flex', gap: 8 }}><Briefcase size={16} /> {viewing.currentJobs ?? 0} current jobs · {viewing.available ? 'Available' : 'Unavailable'}</span>}
              <span>Attendance today: <span className={`badge ${ATTENDANCE_BADGE[viewing.todayAttendance].badge}`}>{ATTENDANCE_BADGE[viewing.todayAttendance].label}</span></span>
              <span>Staff ID #{viewing.id} · Joined {formatJoined(viewing.joinedAt)}</span>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setViewing(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setNotice(''); setEditing(viewing); setViewing(null); }}><Pencil size={15} /> Edit</button>
            </div>
          </div>
        </div>
      )}
      {editing && (
        <EditStaffModal
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => { setEditing(null); setNotice(message); load(); }}
        />
      )}
    </>
  );
};

// Manager "Staff": technicians and dispatchers (never customers), plus account management.
export const StaffPage: React.FC = () => {
  const [tab, setTab] = useState<'staff' | 'accounts'>('staff');
  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">Staff</h2>
          <p className="ks-page-sub">Technicians and dispatchers with location, availability and today's attendance.</p>
        </div>
        <div className="ks-toolbar-actions">
          <button className={`btn btn-sm ${tab === 'staff' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('staff')}><Users size={14} /> Staff List</button>
          <button className={`btn btn-sm ${tab === 'accounts' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('accounts')}><UserCog size={14} /> Manage Accounts</button>
        </div>
      </div>
      {tab === 'staff' ? <StaffList /> : <UserManagement />}
    </div>
  );
};
