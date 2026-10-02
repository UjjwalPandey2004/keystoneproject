import React, { useState, useEffect } from 'react';
import { apiError, customerApi, workOrderApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Customer, Priority, Site, WorkOrder } from '../types';
import { Building, Clock, CreditCard, MapPin, Plus, Send, X } from 'lucide-react';
import { AttachmentsPanel } from '../components/AttachmentsPanel';
import { Tab } from '../navigation';

export const CustomerPortal: React.FC<{ onTabChange?: (tab: Tab) => void }> = ({ onTabChange }) => {
  const { role } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showRaise, setShowRaise] = useState(false);
  const [detail, setDetail] = useState<WorkOrder | null>(null);
  const [formError, setFormError] = useState('');

  // Raise request form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [siteId, setSiteId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  const fetchPortal = async () => {
    try {
      setLoading(true);
      const woRes = await workOrderApi.list({ size: 100 });
      setOrders(woRes.content || []);

      // Customers see their own linked organisation; a manager previews the first one.
      const custRes = role === 'CUSTOMER'
        ? await customerApi.getMine()
        : (await customerApi.getAll())[0];
      setCustomer(custRes || null);
      const sitesRes = custRes ? await customerApi.getSites(custRes.id) : [];
      setSites(sitesRes || []);
      if (sitesRes && sitesRes.length > 0) setSiteId(sitesRes[0].id);
    } catch (err) {
      console.error('Failed to load customer portal data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortal();
  }, []);

  const handleRaiseRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !customer) return;
    setSaving(true);
    try {
      await workOrderApi.create({
        title,
        description,
        priority,
        customerId: customer.id,
        siteId: Number(siteId),
      });
      setShowRaise(false);
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      fetchPortal();
    } catch (err: any) {
      setFormError(apiError(err, 'Failed to raise request'));
    } finally {
      setSaving(false);
    }
  };

  const canPay = (wo: WorkOrder) => role === 'CUSTOMER' && !!onTabChange && (wo.status === 'COMPLETED' || wo.status === 'CLOSED');

  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">My Services</h2>
          <p className="ks-page-sub">
            {customer ? `${customer.companyName} — raise service requests and track their status.` : loading ? 'Raise and track service requests.' : 'Your account is not linked to an organisation yet. Ask your service manager to link it.'}
          </p>
        </div>
        <button onClick={() => { setFormError(''); setShowRaise(true); }} className="btn btn-primary" disabled={!customer}>
          <Plus size={16} /> Raise Service Request
        </button>
      </div>

      {loading ? (
        <div className="ks-empty">Loading your service requests…</div>
      ) : orders.length === 0 ? (
        <div className="card ks-empty">No service requests yet. Raise your first request to get dispatch support.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {orders.map((wo) => (
            <div
              key={wo.id}
              className="card"
              style={{ cursor: 'pointer', borderTop: `4px solid ${wo.slaBreached ? '#ef4444' : '#6366f1'}` }}
              onClick={() => setDetail(wo)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setDetail(wo)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 6 }}>
                <span className="ks-code">{wo.code}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span className={`badge badge-${wo.status.toLowerCase()}`}>{wo.status.replace('_', ' ')}</span>
                  <span className={`badge badge-${wo.priority.toLowerCase()}`}>{wo.priority}</span>
                </div>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6 }}>{wo.title}</h3>
              <div className="ks-muted" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', marginBottom: 8 }}>
                <MapPin size={12} /> <span>{wo.siteName}</span>
              </div>
              <div className={wo.slaBreached ? 'ks-danger-text' : 'ks-muted'} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                <Clock size={12} />
                <span>{wo.slaBreached ? 'SLA Breached' : `Target: ${new Date(wo.slaDueDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}</span>
              </div>
              <div className="ks-muted" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--ks-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                <span>Technician: <strong className="ks-text">{wo.assignedToName || 'Pending dispatch'}</strong></span>
                {canPay(wo) ? (
                  <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); onTabChange?.('mypayments'); }}>
                    <CreditCard size={13} /> Pay now
                  </button>
                ) : (
                  <span>{new Date(wo.createdAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RAISE REQUEST MODAL */}
      {showRaise && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>Raise Service Request</h3>
              <button className="ks-icon-btn" onClick={() => setShowRaise(false)} aria-label="Close"><X size={20} /></button>
            </div>
            {formError && <div className="ks-alert ks-alert-error">{formError}</div>}

            <form onSubmit={handleRaiseRequest} className="ks-form">
              <div className="ks-inset" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                <Building size={16} className="ks-accent" />
                <strong>{customer?.companyName}</strong>
              </div>

              <div>
                <label className="ks-label">Facility Site *</label>
                <select value={siteId} onChange={(e) => setSiteId(Number(e.target.value))} required>
                  <option value="">Select site...</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.siteName} ({s.buildingName || s.address})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ks-label">Issue Title *</label>
                <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HVAC not cooling floor 3" />
              </div>

              <div>
                <label className="ks-label">Priority (Sets SLA Target)</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                  <option value="LOW">LOW (72 Hours SLA)</option>
                  <option value="MEDIUM">MEDIUM (48 Hours SLA)</option>
                  <option value="HIGH">HIGH (24 Hours SLA)</option>
                  <option value="CRITICAL">CRITICAL (4 Hours Emergency SLA)</option>
                </select>
              </div>

              <div>
                <label className="ks-label">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the issue and location details..." />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowRaise(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Send size={14} /> {saving ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST DETAIL MODAL */}
      {detail && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div>
                <span className="ks-code">{detail.code}</span>
                <h3 style={{ marginTop: 2 }}>{detail.title}</h3>
              </div>
              <button className="ks-icon-btn" onClick={() => setDetail(null)} aria-label="Close"><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <span className={`badge badge-${detail.status.toLowerCase()}`}>{detail.status.replace('_', ' ')}</span>
              <span className={`badge badge-${detail.priority.toLowerCase()}`}>{detail.priority} Priority</span>
              {detail.slaBreached && <span className="badge badge-cancelled">SLA Breached</span>}
            </div>

            <div className="ks-inset" style={{ fontSize: '0.86rem', marginBottom: 16, display: 'grid', gap: 6 }}>
              <div><strong>Site:</strong> {detail.siteName} ({detail.siteAddress})</div>
              <div><strong>Technician:</strong> {detail.assignedToName || 'Pending dispatch'}</div>
              <div><strong>Target:</strong> {new Date(detail.slaDueDate).toLocaleString()}</div>
              {detail.description && <div className="ks-muted">{detail.description}</div>}
            </div>

            <h4 className="ks-section-title">Status History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {detail.statusHistory && detail.statusHistory.length > 0 ? (
                detail.statusHistory.map((h) => (
                  <div key={h.id} className="ks-inset" style={{ fontSize: '0.8rem', padding: '8px 12px', borderLeft: '3px solid var(--ks-accent)' }}>
                    <div className="ks-muted" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <span><strong className="ks-text">{h.fromStatus || 'START'}</strong> ➔ <strong className="ks-text">{h.toStatus}</strong> by {h.changedByName || 'SYSTEM'}</span>
                      <span>{new Date(h.changedAt).toLocaleString()}</span>
                    </div>
                    {h.notes && <p style={{ margin: '4px 0 0 0' }}>{h.notes}</p>}
                  </div>
                ))
              ) : (
                <div className="ks-dim" style={{ fontSize: '0.8rem' }}>No status history available.</div>
              )}
            </div>

            <AttachmentsPanel workOrderId={detail.id} />

            <div className="modal-actions">
              {canPay(detail) && (
                <button className="btn btn-primary" onClick={() => { setDetail(null); onTabChange?.('mypayments'); }}><CreditCard size={15} /> Pay for this service</button>
              )}
              <button onClick={() => setDetail(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
