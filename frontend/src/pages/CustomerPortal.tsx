import React, { useState, useEffect, useMemo } from 'react';
import { apiError, customerApi, workOrderApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Customer, Priority, Site, WorkOrder, WorkOrderStatus } from '../types';
import { Ban, Building, Check, Clock, CreditCard, MapPin, Plus, Search, Send, X } from 'lucide-react';
import { clearDraft, readDraft } from '../siteConfig';

const CATEGORIES: Record<string, string> = { HVAC: 'HVAC', ELECTRICAL: 'Electrical', PLUMBING: 'Plumbing', GENERAL: 'General maintenance' };
const STAGES: { status: WorkOrderStatus; label: string }[] = [
  { status: 'NEW', label: 'Requested' },
  { status: 'ASSIGNED', label: 'Technician assigned' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'COMPLETED', label: 'Completed' },
  { status: 'CLOSED', label: 'Closed' },
];
const stageIndex = (status: WorkOrderStatus) => (status === 'ON_HOLD' ? 2 : STAGES.findIndex((s) => s.status === status));

// Progress of a request; a cancelled one shows where it stopped.
const ProgressTracker: React.FC<{ wo: WorkOrder }> = ({ wo }) => {
  if (wo.status === 'CANCELLED') {
    return (
      <div className="ks-alert ks-alert-error" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Ban size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Cancelled</strong>{wo.cancelledAt && ` on ${new Date(wo.cancelledAt).toLocaleString()}`}{wo.cancelledByName && ` by ${wo.cancelledByName}`}.
          {wo.cancellationReason && <div>Reason: {wo.cancellationReason}</div>}
        </div>
      </div>
    );
  }
  const current = stageIndex(wo.status);
  return (
    <ol className="ks-progress" aria-label="Request progress">
      {STAGES.map((stage, i) => (
        <li key={stage.status} className={i < current ? 'done' : i === current ? 'current' : ''} aria-current={i === current ? 'step' : undefined}>
          <span className="ks-progress-dot">{i < current ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
          <span className="ks-progress-label">{stage.label}{i === current && wo.status === 'ON_HOLD' ? ' (on hold)' : ''}</span>
        </li>
      ))}
    </ol>
  );
};
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
  const [category, setCategory] = useState('HVAC');
  const [preferredDate, setPreferredDate] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [fromDraft, setFromDraft] = useState(false);
  const [saving, setSaving] = useState(false);

  // List filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | WorkOrderStatus>('ALL');

  // Cancellation
  const [cancelling, setCancelling] = useState<WorkOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [notice, setNotice] = useState('');

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

  // A request started on the public website opens here, pre-filled, once the customer is signed in.
  useEffect(() => {
    if (role !== 'CUSTOMER') return;
    const draft = readDraft();
    if (!draft) return;
    setCategory(draft.category in CATEGORIES ? draft.category : 'GENERAL');
    setTitle(draft.title);
    setPriority(draft.urgency);
    setPreferredDate(draft.preferredDate);
    setContactPhone(draft.contactPhone);
    setDescription([draft.description, draft.address && `Service address: ${draft.address}`,
      draft.contactName && `Contact on site: ${draft.contactName}`].filter(Boolean).join('\n'));
    setFromDraft(true);
    setFormError('');
    setShowRaise(true);
  }, [role]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((o) =>
      (statusFilter === 'ALL' || (statusFilter === 'OPEN' ? !['CLOSED', 'CANCELLED'].includes(o.status) : o.status === statusFilter))
      && (!term || [o.code, o.title, o.siteName, o.assignedToName].some((v) => v?.toLowerCase().includes(term))));
  }, [orders, search, statusFilter]);

  const closeRaise = () => {
    setShowRaise(false);
    if (fromDraft) {
      clearDraft();
      setFromDraft(false);
    }
  };

  const confirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelling) return;
    setCancelError('');
    try {
      const updated = await workOrderApi.cancel(cancelling.id, cancelReason.trim());
      setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));
      if (detail?.id === updated.id) setDetail(updated);
      setNotice(`${updated.code} has been cancelled. Our dispatch team has been notified.`);
      setCancelling(null);
      setCancelReason('');
    } catch (err) {
      setCancelError(apiError(err, 'The request could not be cancelled.'));
    }
  };

  const handleRaiseRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !customer) return;
    if (contactPhone.trim() && !/^[+]?[0-9 ()-]{7,20}$/.test(contactPhone.trim())) {
      setFormError('Enter a valid contact phone number, or leave it empty.');
      return;
    }
    setSaving(true);
    try {
      // Category, preferred date and contact are recorded with the request description.
      const details = [
        `Category: ${CATEGORIES[category]}`,
        preferredDate && `Preferred date: ${new Date(preferredDate + 'T00:00').toLocaleDateString([], { dateStyle: 'medium' })}`,
        contactPhone.trim() && `Contact phone: ${contactPhone.trim()}`,
        description.trim(),
      ].filter(Boolean).join('\n');
      const created = await workOrderApi.create({
        title: title.trim(),
        description: details,
        priority,
        customerId: customer.id,
        siteId: Number(siteId),
      });
      setShowRaise(false);
      clearDraft();
      setFromDraft(false);
      setTitle('');
      setDescription('');
      setPreferredDate('');
      setContactPhone('');
      setPriority('MEDIUM');
      setNotice(`Request ${created.code} submitted. Use this reference to track it below.`);
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

      {notice && <div className="ks-alert ks-alert-success" role="status">{notice}</div>}
      <div className="ks-filter-bar">
        <div className="ks-search">
          <Search size={16} aria-hidden="true" />
          <input aria-label="Search my requests" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by reference, title, site or technician" />
        </div>
        <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="ALL">All requests</option>
          <option value="OPEN">Open requests</option>
          <option value="NEW">New</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CLOSED">Closed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="ks-empty">Loading your service requests…</div>
      ) : orders.length === 0 ? (
        <div className="card ks-empty">No service requests yet. Raise your first request to get dispatch support.</div>
      ) : shown.length === 0 ? (
        <div className="card ks-empty">No requests match your search.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {shown.map((wo) => (
            <div
              key={wo.id}
              className="card"
              style={{ cursor: 'pointer', borderTop: `4px solid ${wo.status === 'CANCELLED' ? 'var(--ks-dim)' : wo.slaBreached ? 'var(--ks-danger)' : 'var(--ks-accent)'}` }}
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
              <button className="ks-icon-btn" onClick={closeRaise} aria-label="Close"><X size={20} /></button>
            </div>
            {fromDraft && <div className="ks-alert ks-alert-info">We filled in the details you entered on our website. Check them, choose the site and submit.</div>}
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

              <div className="ks-form-grid">
                <div>
                  <label className="ks-label" htmlFor="raise-category">Service category *</label>
                  <select id="raise-category" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ks-label" htmlFor="raise-date">Preferred date</label>
                  <input id="raise-date" type="date" min={new Date().toISOString().slice(0, 10)} value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="ks-label" htmlFor="raise-title">Issue Title *</label>
                <input id="raise-title" required maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HVAC not cooling floor 3" />
              </div>

              <div>
                <label className="ks-label" htmlFor="raise-phone">Contact phone on site</label>
                <input id="raise-phone" type="tel" maxLength={20} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91 98765 43210" />
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
                <button type="button" onClick={closeRaise} className="btn btn-secondary">Cancel</button>
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

            <ProgressTracker wo={detail} />

            <div className="ks-inset" style={{ fontSize: '0.86rem', marginBottom: 16, display: 'grid', gap: 6 }}>
              <div><strong>Site:</strong> {detail.siteName} ({detail.siteAddress})</div>
              <div><strong>Technician:</strong> {detail.assignedToName || 'Pending dispatch'}</div>
              <div><strong>Target:</strong> {new Date(detail.slaDueDate).toLocaleString()}</div>
              {detail.closedAt && <div><strong>Closed:</strong> {new Date(detail.closedAt).toLocaleString()}{detail.closedByName && ` by ${detail.closedByName}`}</div>}
              {detail.description && <div className="ks-muted ks-pre">{detail.description}</div>}
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
              {detail.cancellable && (
                <button className="btn btn-danger" onClick={() => { setCancelError(''); setCancelReason(''); setCancelling(detail); }}>
                  <Ban size={15} /> Cancel Request
                </button>
              )}
              {canPay(detail) && (
                <button className="btn btn-primary" onClick={() => { setDetail(null); onTabChange?.('mypayments'); }}><CreditCard size={15} /> Pay for this service</button>
              )}
              <button onClick={() => setDetail(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION */}
      {cancelling && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 id="cancel-title">Cancel {cancelling.code}?</h3>
              <button className="ks-icon-btn" onClick={() => setCancelling(null)} aria-label="Close"><X size={20} /></button>
            </div>
            <form className="ks-form" onSubmit={confirmCancel}>
              <p className="ks-muted" style={{ margin: 0 }}>
                “{cancelling.title}” will be cancelled{cancelling.assignedToName ? ` and ${cancelling.assignedToName} will be released from the job` : ''}.
                This cannot be undone; you can raise a new request at any time.
              </p>
              {cancelError && <div className="ks-alert ks-alert-error">{cancelError}</div>}
              <div>
                <label className="ks-label" htmlFor="cancel-reason">Reason (optional)</label>
                <textarea id="cancel-reason" rows={3} maxLength={500} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Issue resolved itself" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setCancelling(null)}>Keep request</button>
                <button type="submit" className="btn btn-danger"><Ban size={15} /> Yes, cancel request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
