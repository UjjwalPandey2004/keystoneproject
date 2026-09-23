import React, { useEffect, useState } from 'react';
import { userApi } from '../services/api';
import { Role, User } from '../types';

const roles: Role[] = ['MANAGER', 'DISPATCHER', 'TECHNICIAN', 'CUSTOMER'];

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ userName: '', userEmail: '', password: '', phone: '', role: 'TECHNICIAN' as Role });

  const load = async () => {
    try {
      setLoading(true);
      setUsers(await userApi.list());
      setError('');
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Unable to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await userApi.create(form);
      setForm({ userName: '', userEmail: '', password: '', phone: '', role: 'TECHNICIAN' });
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Unable to create user');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>User Management</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Create role-controlled staff and customer accounts.</p>
      </div>

      {error && <div className="card" style={{ color: '#b91c1c', marginBottom: 16 }}>{error}</div>}

      <form className="card" onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
        <input required placeholder="Full name" value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} />
        <input required type="email" placeholder="Email" value={form.userEmail} onChange={(e) => setForm({ ...form, userEmail: e.target.value })} />
        <input required minLength={8} type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          {roles.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
        <button className="btn btn-primary" type="submit">Create User</button>
      </form>

      <div className="card" style={{ overflowX: 'auto' }}>
        {loading ? <p>Loading users...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Name', 'Email', 'Phone', 'Role'].map((heading) => <th key={heading} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #cbd5e1' }}>{heading}</th>)}</tr></thead>
            <tbody>{users.map((user) => (
              <tr key={user.id}>
                <td style={{ padding: 10, borderBottom: '1px solid #e2e8f0' }}>{user.userName}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #e2e8f0' }}>{user.userEmail}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #e2e8f0' }}>{user.phone || '—'}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #e2e8f0' }}><span className="badge badge-assigned">{user.role}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
};
