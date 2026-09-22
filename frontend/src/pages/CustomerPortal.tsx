import React, { useState, useEffect } from 'react';
import { customerApi, workOrderApi } from '../services/api';
import { Customer, Priority, Site, WorkOrder } from '../types';
import { Building, Clock, MapPin, Plus, Send, X } from 'lucide-react';

export const CustomerPortal: React.FC = () => {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showRaise, setShowRaise] = useState(false);
  const [detail, setDetail] = useState<WorkOrder | null>(null);

  // Raise request form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [siteId, setSiteId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  const fetchPortal = async () => {
    try {
      setLoading(true);
      const [woRes, custRes, sitesRes] = await Promise.all([
        workOrderApi.list({ size: 100 }),
        customerApi.getById(1),
        customerApi.getSites(1),
      ]);
      setOrders(woRes.content || []);
      setCustomer(custRes || null);
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
    if (!siteId) return;
    setSaving(true);
    try {
      await workOrderApi.create({
        title,
        description,
        priority,
        customerId: customer ? customer.id : 1,
        siteId: Number(siteId),
      });
      setShowRaise(false);
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      fetchPortal();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to raise request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Customer Service Portal</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            {customer ? `${customer.companyName} — raise service requests and track SLA status.` : 'Raise and track service requests.'}
          </p>
        </div>
        <button onClick={() => setShowRaise(true)} className="btn btn-primary">
          <Plus size={16} /> Raise Service Request
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>Loading your service requests...</div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
          No service requests yet. Raise your first request to get dispatch support.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {orders.map((wo) => (
            <div key={wo.id} className="card" style={{ cursor: 'pointer', borderTop: `4px solid ${wo.slaBreached ? '#ef4444' : '#4f46e5'}` }} onClick={() => setDetail(wo)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, color: '#4f46e5', fontSize: '0.85rem' }}>{wo.code}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className={`badge badge-${wo.status.toLowerCase()}`}>{wo.status}</span>
                  <span className={`badge badge-${wo.priority.toLowerCase()}`}>{wo.priority}</span>
                </div>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6 }}>{wo.title}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: '#64748b', marginBottom: 8 }}>
                <MapPin size={12} />
                <span>{wo.siteName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: wo.slaBreached ? '#ef4444' : '#64748b' }}>
                {wo.slaBreached ? <Clock size={12} color="#ef4444" /> : <Clock size={12} />}
                <span>
                  {wo.slaBreached
                    ? 'SLA Breached'
                    : `SLA Due: ${new Date(wo.slaDueDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                </span>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                <span>Assigned: <strong>{wo.assignedToName || 'Pending dispatch'}</strong></span>
                <span>{new Date(wo.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RAISE REQUEST MODAL */}
      {showRaise && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Raise Service Request</h3>
              <button onClick={() => setShowRaise(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleRaiseRequest} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, fontSize: '0.85rem', color: '#475569' }}>
                <Building size={16} color="#4f46e5" />
                <strong>{customer?.companyName || 'Apex Commercial Towers'}</strong>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Facility Site *</label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(Number(e.target.value))}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="">Select site...</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.siteName} ({s.buildingName || s.address})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Issue Title *</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. HVAC not cooling floor 3"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Priority (Sets SLA Target)</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="LOW">LOW (72 Hours SLA)</option>
                  <option value="MEDIUM">MEDIUM (48 Hours SLA)</option>
                  <option value="HIGH">HIGH (24 Hours SLA)</option>
                  <option value="CRITICAL">CRITICAL (4 Hours Emergency SLA)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the issue and location details..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5' }}>{detail.code}</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '2px 0 0 0' }}>{detail.title}</h3>
              </div>
              <button onClick={() => setDetail(null)}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <span className={`badge badge-${detail.status.toLowerCase()}`}>{detail.status}</span>
              <span className={`badge badge-${detail.priority.toLowerCase()}`}>{detail.priority} Priority</span>
              {detail.slaBreached && <span className="badge badge-cancelled">SLA Breached</span>}
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, fontSize: '0.85rem', marginBottom: 16 }}>
              <p style={{ margin: '0 0 6px 0' }}><strong>Site:</strong> {detail.siteName} ({detail.siteAddress})</p>
              <p style={{ margin: '0 0 6px 0' }}><strong>Assigned To:</strong> {detail.assignedToName || 'Pending dispatch'}</p>
              <p style={{ margin: '0 0 6px 0' }}><strong>SLA Target:</strong> {new Date(detail.slaDueDate).toLocaleString()}</p>
              {detail.description && <p style={{ margin: '8px 0 0 0', color: '#475569' }}>{detail.description}</p>}
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 10 }}>Status History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {detail.statusHistory && detail.statusHistory.length > 0 ? (
                detail.statusHistory.map((h) => (
                  <div key={h.id} style={{ fontSize: '0.8rem', padding: '8px 12px', background: '#f8fafc', borderLeft: '3px solid #4f46e5', borderRadius: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span><strong>{h.fromStatus || 'START'}</strong> ➔ <strong>{h.toStatus}</strong> by {h.changedByName || h.changedByEmail || 'SYSTEM'}</span>
                      <span>{new Date(h.changedAt).toLocaleString()}</span>
                    </div>
                    {h.notes && <p style={{ margin: '4px 0 0 0', color: '#334155' }}>{h.notes}</p>}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No status history available.</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setDetail(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};