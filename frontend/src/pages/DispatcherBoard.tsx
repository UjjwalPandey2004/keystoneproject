import React, { useState, useEffect } from 'react';
import { apiError, workOrderApi, customerApi, userApi } from '../services/api';
import { Customer, Priority, Site, User, WorkOrder, WorkOrderStatus } from '../types';
import { Plus, UserCheck, Clock, AlertTriangle, MapPin, X, RefreshCw } from 'lucide-react';
import { TechnicianPicker } from '../components/TechnicianPicker';
import { AttachmentsPanel } from '../components/AttachmentsPanel';

const STATUS_COLUMNS: { key: WorkOrderStatus; title: string; color: string }[] = [
  { key: 'NEW', title: 'New', color: '#3b82f6' },
  { key: 'ASSIGNED', title: 'Assigned', color: '#8b5cf6' },
  { key: 'IN_PROGRESS', title: 'In Progress', color: '#f59e0b' },
  { key: 'ON_HOLD', title: 'On Hold', color: '#ea580c' },
  { key: 'COMPLETED', title: 'Completed', color: '#10b981' },
  { key: 'CLOSED', title: 'Closed', color: '#64748b' },
];

export const DispatcherBoard: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedSites, setSelectedSites] = useState<Site[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<WorkOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<WorkOrder | null>(null);
  const [formError, setFormError] = useState('');

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('MEDIUM');
  const [newCustomerId, setNewCustomerId] = useState<number | ''>('');
  const [newSiteId, setNewSiteId] = useState<number | ''>('');
  const [technicianId, setTechnicianId] = useState<number | ''>('');
  const [assignNote, setAssignNote] = useState('');

  const fetchBoardData = async () => {
    try {
      setLoading(true);
      const [woRes, custRes, techRes] = await Promise.all([
        workOrderApi.list({ size: 100 }),
        customerApi.getAll(),
        userApi.getTechnicians(),
      ]);
      setWorkOrders(woRes.content || []);
      setCustomers(custRes || []);
      setTechnicians(techRes || []);
    } catch (err) {
      console.error('Failed to load board data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, []);

  const openAssign = (order: WorkOrder) => {
    setFormError('');
    // Pre-select the current technician, else the first available one (the list is sorted by availability and load).
    setTechnicianId(order.assignedToId || technicians.find((t) => t.available)?.id || technicians[0]?.id || '');
    setShowAssignModal(order);
  };

  const handleCustomerChange = async (custId: number) => {
    setNewCustomerId(custId);
    try {
      const sites = await customerApi.getSites(custId);
      setSelectedSites(sites);
      if (sites.length > 0) setNewSiteId(sites[0].id);
      else setNewSiteId('');
    } catch (err) {
      console.error('Failed to fetch sites', err);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId || !newSiteId) return;

    try {
      await workOrderApi.create({
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        customerId: Number(newCustomerId),
        siteId: Number(newSiteId),
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      fetchBoardData();
    } catch (err: any) {
      setFormError(apiError(err, 'Failed to create work order'));
    }
  };

  const handleAssignTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAssignModal || !technicianId) return;

    try {
      await workOrderApi.assign(showAssignModal.id, Number(technicianId), assignNote);
      setShowAssignModal(null);
      setAssignNote('');
      fetchBoardData();
    } catch (err: any) {
      setFormError(apiError(err, 'Assignment failed'));
    }
  };

  const selectedTech = technicians.find((t) => t.id === technicianId);

  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">Work Orders</h2>
          <p className="ks-page-sub">Raise, dispatch and track service jobs across all facilities.</p>
        </div>
        <div className="ks-toolbar-actions">
          <button onClick={() => { setFormError(''); setShowCreateModal(true); }} className="btn btn-primary">
            <Plus size={16} /> Raise Work Order
          </button>
          <button onClick={fetchBoardData} className="btn btn-secondary">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="ks-empty">Loading the dispatch board…</div>
      ) : (
        <div className="ks-kanban">
          {STATUS_COLUMNS.map((col) => {
            const columnOrders = workOrders.filter((wo) => wo.status === col.key);

            return (
              <div key={col.key} className="ks-kanban-col" style={{ borderTop: `4px solid ${col.color}` }}>
                <div className="ks-kanban-head">
                  <h3>{col.title}</h3>
                  <span className="ks-count-pill">{columnOrders.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {columnOrders.length === 0 ? (
                    <div className="ks-dim" style={{ textAlign: 'center', padding: '24px 8px', fontSize: '0.78rem' }}>
                      No {col.title.toLowerCase()} jobs
                    </div>
                  ) : (
                    columnOrders.map((order) => (
                      <div
                        key={order.id}
                        className="card ks-job-card"
                        style={{ borderLeft: order.slaBreached ? '4px solid #ef4444' : undefined }}
                        onClick={() => setShowDetailModal(order)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setShowDetailModal(order)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 6 }}>
                          <span className="ks-code">{order.code}</span>
                          <span className={`badge badge-${order.priority.toLowerCase()}`}>{order.priority}</span>
                        </div>

                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{order.title}</h4>

                        <div className="ks-muted" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', marginBottom: 6 }}>
                          <MapPin size={12} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.siteName || 'Facility Site'}</span>
                        </div>

                        <div className={order.slaBreached ? 'ks-danger-text' : 'ks-muted'} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', marginBottom: 10 }}>
                          {order.slaBreached ? <AlertTriangle size={12} /> : <Clock size={12} />}
                          <span>
                            {order.slaBreached
                              ? 'SLA Breached'
                              : `Due: ${new Date(order.slaDueDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingTop: 8, borderTop: '1px solid var(--ks-border)' }}>
                          <span className={order.assignedToName ? 'ks-text' : 'ks-dim'} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            {order.assignedToName || 'Unassigned'}
                          </span>
                          {col.key !== 'CLOSED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAssign(order);
                              }}
                              className="btn btn-sm btn-secondary"
                            >
                              <UserCheck size={12} /> {order.assignedToName ? 'Reassign' : 'Assign'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE WORK ORDER MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Raise New Work Order</h3>
              <button className="ks-icon-btn" onClick={() => setShowCreateModal(false)} aria-label="Close"><X size={20} /></button>
            </div>
            {formError && <div className="ks-alert ks-alert-error">{formError}</div>}

            <form onSubmit={handleCreateOrder} className="ks-form">
              <div>
                <label className="ks-label">Customer Organization</label>
                <select value={newCustomerId} onChange={(e) => handleCustomerChange(Number(e.target.value))} required>
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ks-label">Target Site / Building</label>
                <select value={newSiteId} onChange={(e) => setNewSiteId(Number(e.target.value))} required disabled={!newCustomerId}>
                  <option value="">Select building site...</option>
                  {selectedSites.map((s) => (
                    <option key={s.id} value={s.id}>{s.siteName} ({s.buildingName || s.address})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ks-label">Job Title / Issue</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required placeholder="e.g. Main chiller water pressure low" />
              </div>

              <div>
                <label className="ks-label">Priority (Sets SLA Target)</label>
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as Priority)}>
                  <option value="LOW">LOW (72 Hours SLA)</option>
                  <option value="MEDIUM">MEDIUM (48 Hours SLA)</option>
                  <option value="HIGH">HIGH (24 Hours SLA)</option>
                  <option value="CRITICAL">CRITICAL (4 Hours Emergency SLA)</option>
                </select>
              </div>

              <div>
                <label className="ks-label">Detailed Description</label>
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} placeholder="Include specific instructions, equipment numbers, or room access details..." />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Dispatch Work Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN TECHNICIAN MODAL */}
      {showAssignModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>Assign Technician</h3>
              <button className="ks-icon-btn" onClick={() => setShowAssignModal(null)} aria-label="Close"><X size={20} /></button>
            </div>

            <div className="ks-inset" style={{ marginBottom: 16, fontSize: '0.85rem' }}>
              <div><span className="ks-code">{showAssignModal.code}</span> <strong>{showAssignModal.title}</strong></div>
              <div className="ks-muted" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <MapPin size={13} /> Job location: {showAssignModal.siteName}{showAssignModal.siteAddress ? ` — ${showAssignModal.siteAddress}` : ''}
              </div>
            </div>
            {formError && <div className="ks-alert ks-alert-error">{formError}</div>}

            <form onSubmit={handleAssignTechnician} className="ks-form">
              <div>
                <label className="ks-label">Select Technician</label>
                <TechnicianPicker technicians={technicians} selectedId={technicianId} onSelect={setTechnicianId} />
              </div>

              {selectedTech && !selectedTech.available && (
                <div className="ks-alert ks-alert-warning">{selectedTech.userName} is marked as unavailable. You can still assign, but they may not respond quickly.</div>
              )}

              <div>
                <label className="ks-label">Dispatcher Note (Optional)</label>
                <input type="text" value={assignNote} onChange={(e) => setAssignNote(e.target.value)} placeholder="e.g. Assigned for immediate morning inspection" />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowAssignModal(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!technicianId}>
                  <UserCheck size={15} /> Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WORK ORDER DETAIL & AUDIT HISTORY MODAL */}
      {showDetailModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <div>
                <span className="ks-code">{showDetailModal.code}</span>
                <h3 style={{ marginTop: 2 }}>{showDetailModal.title}</h3>
              </div>
              <button className="ks-icon-btn" onClick={() => setShowDetailModal(null)} aria-label="Close"><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span className={`badge badge-${showDetailModal.status.toLowerCase()}`}>{showDetailModal.status.replace('_', ' ')}</span>
              <span className={`badge badge-${showDetailModal.priority.toLowerCase()}`}>{showDetailModal.priority} Priority</span>
              {showDetailModal.slaBreached && <span className="badge badge-cancelled">SLA Breached</span>}
            </div>

            <div className="ks-inset" style={{ fontSize: '0.86rem', marginBottom: 16, display: 'grid', gap: 6 }}>
              <div><strong>Customer:</strong> {showDetailModal.customerName}</div>
              <div><strong>Site:</strong> {showDetailModal.siteName} ({showDetailModal.siteAddress})</div>
              <div>
                <strong>Assigned To:</strong> {showDetailModal.assignedToName || 'Unassigned'}
                {showDetailModal.assignedToLocation && <span className="ks-muted"> — based in {showDetailModal.assignedToLocation}</span>}
              </div>
              <div><strong>SLA Target:</strong> {new Date(showDetailModal.slaDueDate).toLocaleString()}</div>
              {showDetailModal.description && <div className="ks-muted"><strong className="ks-text">Description:</strong> {showDetailModal.description}</div>}
              {showDetailModal.technicianNotes && <div className="ks-muted"><strong className="ks-text">Technician notes:</strong> {showDetailModal.technicianNotes}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
              <div className="ks-inset ks-stat-tint-success">
                <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>PARTS CONSUMED TOTAL</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0 0 0' }}>${(showDetailModal.totalPartsCost ?? 0).toFixed(2)}</p>
              </div>
              <div className="ks-inset ks-stat-tint-info">
                <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>LABOR LOGGED TOTAL</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0 0 0' }}>
                  {showDetailModal.totalLaborMinutes} mins ({Math.floor(showDetailModal.totalLaborMinutes / 60)}h {showDetailModal.totalLaborMinutes % 60}m)
                </p>
              </div>
            </div>

            <h4 className="ks-section-title">Status History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {showDetailModal.statusHistory && showDetailModal.statusHistory.length > 0 ? (
                showDetailModal.statusHistory.map((h) => (
                  <div key={h.id} className="ks-inset" style={{ fontSize: '0.8rem', padding: '8px 12px', borderLeft: '3px solid var(--ks-accent)' }}>
                    <div className="ks-muted" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <span><strong className="ks-text">{h.fromStatus || 'START'}</strong> ➔ <strong className="ks-text">{h.toStatus}</strong> by {h.changedByName || h.changedByEmail}</span>
                      <span>{new Date(h.changedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    {h.notes && <p style={{ margin: '4px 0 0 0' }}>{h.notes}</p>}
                  </div>
                ))
              ) : (
                <div className="ks-dim" style={{ fontSize: '0.8rem' }}>No status history available.</div>
              )}
            </div>

            <AttachmentsPanel workOrderId={showDetailModal.id} />

            <div className="modal-actions">
              <button onClick={() => setShowDetailModal(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
