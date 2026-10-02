import React, { useEffect, useState } from 'react';
import { Pencil, UserPlus, X } from 'lucide-react';
import { apiError, customerApi, userApi } from '../services/api';
import { Customer, Role, User } from '../types';

const roles: Role[] = ['MANAGER', 'DISPATCHER', 'TECHNICIAN', 'CUSTOMER'];

const emptyForm = { userName: '', userEmail: '', password: '', phone: '', role: 'TECHNICIAN' as Role, customerId: '', location: '' };

interface EditForm {
  userName: string;
  phone: string;
  role: Role;
  customerId: string;
  location: string;
  available: boolean;
  password: string;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<User | null>(null);
  const [edit, setEdit] = useState<EditForm | null>(null);
  const [editError, setEditError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [userList, customerList, techList] = await Promise.all([userApi.list(), customerApi.getAll(), userApi.getTechnicians()]);
      setUsers(userList);
      setCustomers(customerList || []);
      setTechnicians(techList || []);
    } catch (requestError) {
      setMessage({ ok: false, text: apiError(requestError, 'Unable to load users') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const { customerId, location, ...rest } = form;
      await userApi.create({
        ...rest,
        customerId: form.role === 'CUSTOMER' && customerId ? Number(customerId) : undefined,
        location: form.role === 'TECHNICIAN' && location ? location : undefined,
      });
      setMessage({ ok: true, text: `${form.userName} created.` });
      setForm(emptyForm);
      await load();
    } catch (requestError) {
      setMessage({ ok: false, text: apiError(requestError, 'Unable to create user') });
    }
  };

  const openEdit = (user: User) => {
    setEditError('');
    setEditing(user);
    setEdit({
      userName: user.userName,
      phone: user.phone || '',
      role: user.role,
      customerId: user.customerId ? String(user.customerId) : '',
      location: user.location || '',
      available: user.available ?? true,
      password: '',
    });
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing?.id || !edit) return;
    try {
      await userApi.update(editing.id, {
        userName: edit.userName,
        phone: edit.phone || undefined,
        role: edit.role,
        customerId: edit.role === 'CUSTOMER' && edit.customerId ? Number(edit.customerId) : undefined,
        location: edit.role === 'TECHNICIAN' ? edit.location : undefined,
        available: edit.role === 'TECHNICIAN' ? edit.available : undefined,
        password: edit.password || undefined,
      });
      setMessage({ ok: true, text: `${edit.userName} updated.` });
      setEditing(null);
      await load();
    } catch (requestError) {
      setEditError(apiError(requestError, 'Unable to update user'));
    }
  };

  const organisationName = (user: User) =>
    user.customerId ? customers.find((customer) => customer.id === user.customerId)?.companyName || `#${user.customerId}` : '—';
  const techInfo = (user: User) => technicians.find((t) => t.id === user.id);

  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">Workers</h2>
          <p className="ks-page-sub">Staff and customer accounts, roles, and technician availability.</p>
        </div>
      </div>

      {message && <div className={`ks-alert ${message.ok ? 'ks-alert-success' : 'ks-alert-error'}`}>{message.text}</div>}

      <form className="ks-card" onSubmit={submit} style={{ marginBottom: 18 }}>
        <h3 className="ks-section-title"><UserPlus size={18} /> Add a user</h3>
        <div className="ks-form-grid">
          <input required placeholder="Full name" value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} aria-label="Full name" />
          <input required type="email" placeholder="Email" value={form.userEmail} onChange={(e) => setForm({ ...form, userEmail: e.target.value })} aria-label="Email" />
          <input required minLength={8} type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} aria-label="Temporary password" autoComplete="new-password" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} aria-label="Phone" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} aria-label="Role">
            {roles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          {form.role === 'CUSTOMER' && (
            <select required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} aria-label="Organisation">
              <option value="">Select organisation…</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}
            </select>
          )}
          {form.role === 'TECHNICIAN' && (
            <input placeholder="Base location (e.g. Jaipur)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} aria-label="Location" />
          )}
          <button className="btn btn-primary" type="submit"><UserPlus size={15} /> Create User</button>
        </div>
      </form>

      {loading ? <div className="ks-empty">Loading users…</div> : (
        <div className="ks-table-wrap">
          <table className="ks-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Organisation / location</th><th>Status</th><th /></tr></thead>
            <tbody>{users.map((user) => {
              const tech = techInfo(user);
              return (
                <tr key={user.id}>
                  <td style={{ fontWeight: 600 }}>{user.userName}</td>
                  <td className="ks-muted">{user.userEmail}</td>
                  <td className="ks-muted">{user.phone || '—'}</td>
                  <td><span className="badge badge-assigned">{user.role}</span></td>
                  <td>{user.role === 'TECHNICIAN' ? (user.location || <span className="ks-dim">Location not set</span>) : organisationName(user)}</td>
                  <td>
                    {user.role === 'TECHNICIAN' ? (
                      <>
                        <span className={`badge ${user.available ? 'badge-available' : 'badge-busy'}`}>{user.available ? 'Available' : 'Unavailable'}</span>
                        <div className="ks-dim" style={{ fontSize: '0.76rem', marginTop: 4 }}>{tech?.currentJobs ?? 0} current jobs</div>
                      </>
                    ) : user.emailVerified === false ? (
                      <span className="badge badge-pending">Email unverified</span>
                    ) : (
                      <span className="ks-dim">—</span>
                    )}
                  </td>
                  <td><button className="btn btn-sm btn-secondary" onClick={() => openEdit(user)}><Pencil size={13} /> Edit</button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      {editing && edit && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>Edit {editing.userName}</h3>
              <button className="ks-icon-btn" onClick={() => setEditing(null)} aria-label="Close"><X size={20} /></button>
            </div>
            {editError && <div className="ks-alert ks-alert-error">{editError}</div>}
            <form className="ks-form" onSubmit={saveEdit}>
              <div><label className="ks-label">Name</label><input required value={edit.userName} onChange={(e) => setEdit({ ...edit, userName: e.target.value })} /></div>
              <div><label className="ks-label">Phone</label><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
              <div>
                <label className="ks-label">Role</label>
                <select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}>
                  {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
              {edit.role === 'CUSTOMER' && (
                <div>
                  <label className="ks-label">Organisation</label>
                  <select value={edit.customerId} onChange={(e) => setEdit({ ...edit, customerId: e.target.value })}>
                    <option value="">Not linked</option>
                    {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}
                  </select>
                </div>
              )}
              {edit.role === 'TECHNICIAN' && (
                <>
                  <div><label className="ks-label">Base location</label><input value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} placeholder="e.g. Jaipur" /></div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
                    <input type="checkbox" checked={edit.available} onChange={(e) => setEdit({ ...edit, available: e.target.checked })} />
                    Available for new jobs
                  </label>
                </>
              )}
              <div>
                <label className="ks-label">New password (optional)</label>
                <input type="password" minLength={8} value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} autoComplete="new-password" placeholder="Leave blank to keep the current password" />
                <div className="ks-hint">Setting a password signs the user out of all their sessions.</div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
