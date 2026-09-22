import React, { useState, useEffect } from 'react';
import { workOrderApi, customerApi } from '../services/api';
import { Customer, Priority, Site, WorkOrder, WorkOrderStatus } from '../types';
import { Plus, UserCheck, Clock, AlertTriangle, MapPin, X } from 'lucide-react';

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

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<WorkOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<WorkOrder | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('MEDIUM');
  const [newCustomerId, setNewCustomerId] = useState<number | ''>('');
  const [newSiteId, setNewSiteId] = useState<number | ''>('');
  const [technicianId, setTechnicianId] = useState<number>(3); // Seed tech ID = 3
  const [assignNote, setAssignNote] = useState('');

  const fetchBoardData = async () => {
    try {
      setLoading(true);
      const [woRes, custRes] = await Promise.all([
        workOrderApi.list({ size: 100 }),
        customerApi.getAll(),
      ]);
      setWorkOrders(woRes.content || []);
      setCustomers(custRes || []);
    } catch (err) {
      console.error('Failed to load board data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, []);

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
      alert(err.response?.data?.message || 'Failed to create work order');
    }
  };

  const handleAssignTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAssignModal) return;

    try {
      await workOrderApi.assign(showAssignModal.id, technicianId, assignNote);
      setShowAssignModal(null);
      setAssignNote('');
      fetchBoardData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Assignment failed');
    }
  };

  return (
    <div>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Dispatch & Assignment Board</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Coordinate and monitor active service jobs across all facilities.</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <Plus size={16} /> Raise Work Order
          </button>
          <button onClick={fetchBoardData} className="btn btn-secondary">
            Refresh Board
          </button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>Loading active dispatch board...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'start', overflowX: 'auto' }}>
          {STATUS_COLUMNS.map((col) => {
            const columnOrders = workOrders.filter((wo) => wo.status === col.key);

            return (
              <div
                key={col.key}
                style={{
                  background: '#f1f5f9',
                  borderRadius: 10,
                  padding: 12,
                  minHeight: 500,
                  borderTop: `4px solid ${col.color}`,
                }}
              >
                {/* Column Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {col.title}
                  </h3>
                  <span style={{ background: '#cbd5e1', color: '#1e293b', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 9999 }}>
                    {columnOrders.length}
                  </span>
                </div>

                {/* Cards List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {columnOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 8px', fontSize: '0.78rem', color: '#94a3b8' }}>
                      No {col.title.toLowerCase()} jobs
                    </div>
                  ) : (
                    columnOrders.map((order) => (
                      <div
                        key={order.id}
                        className="card"
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                          borderLeft: order.slaBreached ? '4px solid #ef4444' : undefined,
                        }}
                        onClick={() => setShowDetailModal(order)}
                      >
                        {/* Header: Code & Priority */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#4f46e5' }}>{order.code}</span>
                          <span className={`badge badge-${order.priority.toLowerCase()}`}>{order.priority}</span>
                        </div>

                        {/* Title */}
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: 6, lineHeight: 1.3 }}>
                          {order.title}
                        </h4>

                        {/* Location */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#64748b', marginBottom: 6 }}>
                          <MapPin size={12} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {order.siteName || 'Facility Site'}
                          </span>
                        </div>

                        {/* SLA Due / Breached */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: order.slaBreached ? '#ef4444' : '#64748b', marginBottom: 10 }}>
                          {order.slaBreached ? <AlertTriangle size={12} color="#ef4444" /> : <Clock size={12} />}
                          <span>
                            {order.slaBreached
                              ? 'SLA Breached'
                              : `Due: ${new Date(order.slaDueDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                          </span>
                        </div>

                        {/* Assignee & Action */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: '0.75rem', color: order.assignedToName ? '#334155' : '#94a3b8', fontWeight: 500 }}>
                            {order.assignedToName || 'Unassigned'}
                          </span>

                          {col.key !== 'CLOSED' && col.key !== 'CANCELLED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowAssignModal(order);
                              }}
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '2px 8px', fontSize: '0.7rem' }}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Raise New Work Order</h3>
              <button onClick={() => setShowCreateModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Customer Organization</label>
                <select
                  value={newCustomerId}
                  onChange={(e) => handleCustomerChange(Number(e.target.value))}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Target Site / Building</label>
                <select
                  value={newSiteId}
                  onChange={(e) => setNewSiteId(Number(e.target.value))}
                  required
                  disabled={!newCustomerId}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="">Select building site...</option>
                  {selectedSites.map((s) => (
                    <option key={s.id} value={s.id}>{s.siteName} ({s.buildingName || s.address})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Job Title / Issue</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  placeholder="e.g. Main chiller water pressure low"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Priority (Sets SLA Target)</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Priority)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="LOW">LOW (72 Hours SLA)</option>
                  <option value="MEDIUM">MEDIUM (48 Hours SLA)</option>
                  <option value="HIGH">HIGH (24 Hours SLA)</option>
                  <option value="CRITICAL">CRITICAL (4 Hours Emergency SLA)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Detailed Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  placeholder="Include specific instructions, equipment numbers, or room access details..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
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
          <div className="modal-content" style={{ maxWidth: 450 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Assign Technician</h3>
              <button onClick={() => setShowAssignModal(null)}><X size={20} /></button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 16 }}>
              Assign <strong>{showAssignModal.code}</strong> - {showAssignModal.title}
            </p>

            <form onSubmit={handleAssignTechnician} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Select Field Technician</label>
                <select
                  value={technicianId}
                  onChange={(e) => setTechnicianId(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value={3}>Field Technician (tech@meridian.com)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Dispatcher Note (Optional)</label>
                <input
                  type="text"
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="e.g. Assigned for immediate morning inspection"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowAssignModal(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WORK ORDER DETAIL & AUDIT HISTORY MODAL */}
      {showDetailModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5' }}>{showDetailModal.code}</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '2px 0 0 0' }}>{showDetailModal.title}</h3>
              </div>
              <button onClick={() => setShowDetailModal(null)}><X size={20} /></button>
            </div>

            {/* Badges & Meta */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span className={`badge badge-${showDetailModal.status.toLowerCase()}`}>{showDetailModal.status}</span>
              <span className={`badge badge-${showDetailModal.priority.toLowerCase()}`}>{showDetailModal.priority} Priority</span>
              {showDetailModal.slaBreached && <span className="badge badge-cancelled">SLA Breached</span>}
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, fontSize: '0.85rem', marginBottom: 16 }}>
              <p style={{ margin: '0 0 6px 0' }}><strong>Customer:</strong> {showDetailModal.customerName}</p>
              <p style={{ margin: '0 0 6px 0' }}><strong>Site:</strong> {showDetailModal.siteName} ({showDetailModal.siteAddress})</p>
              <p style={{ margin: '0 0 6px 0' }}><strong>Assigned To:</strong> {showDetailModal.assignedToName || 'Unassigned'}</p>
              <p style={{ margin: '0 0 6px 0' }}><strong>SLA Target:</strong> {new Date(showDetailModal.slaDueDate).toLocaleString()}</p>
              {showDetailModal.description && (
                <p style={{ margin: '8px 0 0 0', color: '#475569' }}><strong>Notes:</strong> {showDetailModal.description}</p>
              )}
            </div>

            {/* Line Item Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#ecfdf5', padding: 12, borderRadius: 8, border: '1px solid #a7f3d0' }}>
                <span style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 600 }}>PARTS CONSUMED TOTAL</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#047857', margin: '4px 0 0 0' }}>
                  ${showDetailModal.totalPartsCost.toFixed(2)}
                </p>
              </div>

              <div style={{ background: '#eff6ff', padding: 12, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>LABOR LOGGED TOTAL</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1d4ed8', margin: '4px 0 0 0' }}>
                  {showDetailModal.totalLaborMinutes} mins ({Math.floor(showDetailModal.totalLaborMinutes / 60)}h {showDetailModal.totalLaborMinutes % 60}m)
                </p>
              </div>
            </div>

            {/* Append-Only Status Audit History */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 10 }}>Append-Only Status History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {showDetailModal.statusHistory && showDetailModal.statusHistory.length > 0 ? (
                showDetailModal.statusHistory.map((h) => (
                  <div key={h.id} style={{ fontSize: '0.8rem', padding: '8px 12px', background: '#f8fafc', borderLeft: '3px solid #4f46e5', borderRadius: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span><strong>{h.fromStatus || 'START'}</strong> ➔ <strong>{h.toStatus}</strong> by {h.changedByName || h.changedByEmail}</span>
                      <span>{new Date(h.changedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {h.notes && <p style={{ margin: '4px 0 0 0', color: '#334155' }}>{h.notes}</p>}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No status history available.</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowDetailModal(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
