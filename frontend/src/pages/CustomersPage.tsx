import React, { useEffect, useState } from 'react';
import { Building, Eye, RefreshCw, Search, Users, X } from 'lucide-react';
import { apiError, directoryApi } from '../services/api';
import { CustomerAccount } from '../types';
import { initials } from '../components/Navbar';
import { formatMoney, methodText } from '../components/PaymentReceipt';
import { CustomerSites } from './CustomerSites';

export const formatJoined = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString([], { dateStyle: 'medium' }) : '—');

export const CUSTOMER_STATUS: Record<CustomerAccount['status'], { label: string; badge: string }> = {
  ACTIVE: { label: 'Active', badge: 'badge-available' },
  UNVERIFIED: { label: 'Email unverified', badge: 'badge-pending' },
  UNLINKED: { label: 'Not linked', badge: 'badge-closed' },
};

// Manager view of one customer account.
export const CustomerDetailModal: React.FC<{ userId: number; onClose: () => void }> = ({ userId, onClose }) => {
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    directoryApi.customerAccount(userId).then(setAccount).catch((err) => setError(apiError(err, 'Unable to load the customer.')));
  }, [userId]);

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <h3>Customer Profile</h3>
          <button className="ks-icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        {error && <div className="ks-alert ks-alert-error">{error}</div>}
        {!account && !error && <div className="ks-empty">Loading…</div>}
        {account && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
              <span className="ks-avatar" style={{ width: 56, height: 56, fontSize: 20 }}>{initials(account.name)}</span>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{account.name}</div>
                <span className={`badge ${CUSTOMER_STATUS[account.status].badge}`}>{CUSTOMER_STATUS[account.status].label}</span>
              </div>
            </div>
            {[
              ['Customer ID', `#${account.id}`],
              ['Email', account.email],
              ['Phone', account.phone || 'Not provided'],
              ['Organisation', account.organisationName || 'Not linked yet'],
              ['Joined', formatJoined(account.joinedAt)],
              ['Email verified', account.emailVerified ? 'Yes' : 'No'],
            ].map(([label, value]) => (
              <div key={label} className="ks-field"><span className="ks-field-label">{label}</span><span className="ks-field-value">{value}</span></div>
            ))}

            <div className="ks-grid" style={{ margin: '16px 0' }}>
              <div className="ks-inset"><div className="ks-tile-value" style={{ fontSize: '1.4rem' }}>{account.openWorkOrders ?? 0}</div><div className="ks-dim">Open work orders</div></div>
              <div className="ks-inset"><div className="ks-tile-value" style={{ fontSize: '1.4rem' }}>{account.totalWorkOrders ?? 0}</div><div className="ks-dim">Total work orders</div></div>
              <div className="ks-inset"><div className="ks-tile-value" style={{ fontSize: '1.4rem' }}>{formatMoney(Number(account.totalPaid ?? 0))}</div><div className="ks-dim">Paid by this customer</div></div>
            </div>

            <h4 className="ks-section-title">Recent work orders</h4>
            {(account.recentWorkOrders || []).length === 0 ? <div className="ks-hint">None yet.</div> : (
              <div className="ks-table-wrap" style={{ marginBottom: 16 }}>
                <table className="ks-table">
                  <thead><tr><th>Work order</th><th>Problem</th><th>Status</th><th>Raised</th></tr></thead>
                  <tbody>{account.recentWorkOrders!.map((w) => (
                    <tr key={w.id}><td className="ks-code">{w.code}</td><td>{w.title}</td><td><span className={`badge badge-${w.status.toLowerCase()}`}>{w.status.replace('_', ' ')}</span></td><td className="ks-muted">{formatJoined(w.createdAt)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            <h4 className="ks-section-title">Payments by this customer</h4>
            {(account.payments || []).length === 0 ? <div className="ks-hint">No payments yet.</div> : (
              <div className="ks-table-wrap">
                <table className="ks-table">
                  <thead><tr><th>Reference</th><th>Problem</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>{account.payments!.map((p) => (
                    <tr key={p.id}><td><strong>{p.reference}</strong></td><td>{p.workOrderCode} — {p.workOrderTitle}</td><td><strong>{formatMoney(p.amount, p.currency)}</strong></td><td>{methodText(p)}</td><td><span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span></td><td className="ks-muted">{formatJoined(p.paidAt || p.createdAt)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </>
        )}
        <div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
};

const CustomerAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    directoryApi.customerAccounts()
      .then((list) => { setAccounts(list); setError(''); })
      .catch((err) => setError(apiError(err, 'Unable to load customers.')))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const q = query.trim().toLowerCase();
  const shown = q
    ? accounts.filter((a) => [a.name, a.email, a.phone, a.organisationName, String(a.id)].some((v) => v?.toLowerCase().includes(q)))
    : accounts;

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 420 }}>
          <Search size={15} className="ks-dim" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone or ID" style={{ paddingLeft: 34 }} aria-label="Search customers" />
        </div>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={15} /> Refresh</button>
      </div>
      {error && <div className="ks-alert ks-alert-error">{error}</div>}
      {loading ? <div className="ks-empty">Loading customers…</div> : shown.length === 0 ? <div className="card ks-empty">No customers found.</div> : (
        <div className="ks-table-wrap">
          <table className="ks-table">
            <thead><tr><th>Customer name</th><th>Email</th><th>Phone</th><th>Customer ID</th><th>Organisation</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{shown.map((a) => (
              <tr key={a.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="ks-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{initials(a.name)}</span><strong>{a.name}</strong></div></td>
                <td className="ks-muted">{a.email}</td>
                <td className="ks-muted">{a.phone || '—'}</td>
                <td>#{a.id}</td>
                <td>{a.organisationName || <span className="ks-dim">Not linked</span>}</td>
                <td className="ks-muted" style={{ whiteSpace: 'nowrap' }}>{formatJoined(a.joinedAt)}</td>
                <td><span className={`badge ${CUSTOMER_STATUS[a.status].badge}`}>{CUSTOMER_STATUS[a.status].label}</span></td>
                <td><button className="btn btn-sm btn-secondary" onClick={() => setViewing(a.id)}><Eye size={13} /> View</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {viewing && <CustomerDetailModal userId={viewing} onClose={() => setViewing(null)} />}
    </>
  );
};

// Manager "Customers": registered customer accounts, plus the existing organisations & sites.
export const CustomersPage: React.FC = () => {
  const [tab, setTab] = useState<'accounts' | 'organisations'>('accounts');
  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">Customers</h2>
          <p className="ks-page-sub">Registered customer accounts and the organisations and sites they belong to. Visible to managers only.</p>
        </div>
        <div className="ks-toolbar-actions">
          <button className={`btn btn-sm ${tab === 'accounts' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('accounts')}><Users size={14} /> Customer Accounts</button>
          <button className={`btn btn-sm ${tab === 'organisations' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('organisations')}><Building size={14} /> Organisations & Sites</button>
        </div>
      </div>
      {tab === 'accounts' ? <CustomerAccounts /> : <CustomerSites />}
    </div>
  );
};
