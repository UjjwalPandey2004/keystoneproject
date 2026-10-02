import React, { useEffect, useState } from 'react';
import { AlertTriangle, MapPin, RefreshCw, Truck, Wrench } from 'lucide-react';
import { workOrderApi } from '../services/api';
import { WorkOrder, WorkOrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatMinutes, TechnicianFieldView } from './TechnicianFieldView';

// Service delivery = a technician going to a site and carrying out a work order.
const IN_FIELD: WorkOrderStatus[] = ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];

type Filter = 'active' | 'completed' | 'all';

export const DeliveriesPage: React.FC = () => {
  const { viewRole } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('active');
  const [view, setView] = useState<'tracker' | 'workspace'>('tracker');

  const load = () => {
    setLoading(true);
    workOrderApi.list({ size: 100 })
      .then((page) => setOrders((page.content || []).filter((o) => IN_FIELD.includes(o.status) || o.status === 'CLOSED')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const shown = orders.filter((o) =>
    filter === 'all' ? true : filter === 'completed' ? o.status === 'COMPLETED' || o.status === 'CLOSED' : ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'].includes(o.status));
  const counts = {
    enRoute: orders.filter((o) => o.status === 'ASSIGNED').length,
    onSite: orders.filter((o) => o.status === 'IN_PROGRESS').length,
    blocked: orders.filter((o) => o.status === 'ON_HOLD').length,
    delivered: orders.filter((o) => o.status === 'COMPLETED' || o.status === 'CLOSED').length,
  };

  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">Deliveries</h2>
          <p className="ks-page-sub">Track field service delivery: which technician is where, and how each job is progressing.</p>
        </div>
        <div className="ks-toolbar-actions">
          {viewRole === 'MANAGER' && (
            <>
              <button className={`btn btn-sm ${view === 'tracker' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('tracker')}><Truck size={14} /> Tracker</button>
              <button className={`btn btn-sm ${view === 'workspace' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('workspace')}><Wrench size={14} /> Field workspace</button>
            </>
          )}
          {view === 'tracker' && <button className="btn btn-sm btn-secondary" onClick={load}><RefreshCw size={14} /> Refresh</button>}
        </div>
      </div>

      {view === 'workspace' && viewRole === 'MANAGER' ? (
        <TechnicianFieldView />
      ) : (
        <>
          <div className="ks-grid" style={{ marginBottom: 20 }}>
            <div className="ks-card"><div className="ks-tile-value">{counts.enRoute}</div><div className="ks-tile-title">Assigned / en route</div></div>
            <div className="ks-card"><div className="ks-tile-value">{counts.onSite}</div><div className="ks-tile-title">On site (in progress)</div></div>
            <div className="ks-card"><div className="ks-tile-value">{counts.blocked}</div><div className="ks-tile-title">On hold</div></div>
            <div className="ks-card"><div className="ks-tile-value">{counts.delivered}</div><div className="ks-tile-title">Delivered</div></div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['active', 'completed', 'all'] as Filter[]).map((f) => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
                {f === 'active' ? 'Active' : f === 'completed' ? 'Delivered' : 'All'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="ks-empty">Loading deliveries…</div>
          ) : shown.length === 0 ? (
            <div className="card ks-empty">No deliveries in this view.</div>
          ) : (
            <div className="ks-table-wrap">
              <table className="ks-table">
                <thead>
                  <tr><th>Work order</th><th>Technician</th><th>Service location</th><th>Status</th><th>SLA</th><th>Time on job</th></tr>
                </thead>
                <tbody>
                  {shown.map((o) => (
                    <tr key={o.id}>
                      <td><span className="ks-code">{o.code}</span><div style={{ fontWeight: 600 }}>{o.title}</div><div className="ks-dim" style={{ fontSize: '0.78rem' }}>{o.customerName}</div></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.assignedToName || '—'}</div>
                        {o.assignedToLocation && <div className="ks-dim" style={{ fontSize: '0.78rem' }}>Based in {o.assignedToLocation}</div>}
                      </td>
                      <td><span style={{ display: 'flex', gap: 5 }}><MapPin size={14} className="ks-accent" style={{ marginTop: 3, flexShrink: 0 }} /><span>{o.siteName}<div className="ks-dim" style={{ fontSize: '0.78rem' }}>{o.siteAddress}</div></span></span></td>
                      <td><span className={`badge badge-${o.status.toLowerCase()}`}>{o.status.replace('_', ' ')}</span></td>
                      <td className={o.slaBreached ? 'ks-danger-text' : 'ks-muted'} style={{ whiteSpace: 'nowrap' }}>
                        {o.slaBreached && <AlertTriangle size={13} />} {new Date(o.slaDueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>{formatMinutes(o.totalLaborMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
