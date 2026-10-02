import React, { useState, useEffect } from 'react';
import { reportApi, workOrderApi } from '../services/api';
import { DashboardMetrics, WorkOrder } from '../types';
import { Activity, AlertTriangle, CheckCircle2, Clock, Gauge, PlusCircle, RefreshCw, Timer } from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recent, setRecent] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [m, woRes] = await Promise.all([
        reportApi.getSummary(),
        workOrderApi.list({ size: 8 }),
      ]);
      setMetrics(m);
      setRecent(woRes.content || []);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48, color: 'var(--ks-muted)' }}>Loading operational dashboard...</div>;
  }

  if (!metrics) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--ks-muted)' }}>
        No metrics available. Please ensure the backend and seeded data are ready.
      </div>
    );
  }

  const kpis = [
    { label: 'Open Work Orders', value: metrics.totalOpen, color: 'var(--ks-accent-text)', icon: <Activity size={18} />, bg: 'var(--ks-violet-tint)' },
    { label: 'Overdue / SLA Breached', value: metrics.overdueOrders, color: '#ef4444', icon: <AlertTriangle size={18} />, bg: 'var(--ks-danger-tint)' },
    { label: 'SLA At Risk', value: metrics.atRiskOrders, color: 'var(--ks-warning-text)', icon: <Clock size={18} />, bg: 'var(--ks-warning-tint)' },
    { label: 'Completed', value: metrics.completedOrders, color: 'var(--ks-success-text)', icon: <CheckCircle2 size={18} />, bg: 'var(--ks-success-tint)' },
    { label: 'Closed & Signed Off', value: metrics.closedOrders, color: 'var(--ks-muted)', icon: <Timer size={18} />, bg: 'var(--ks-neutral-tint)' },
  ];

  const statusRows: { key: keyof DashboardMetrics; label: string; color: string }[] = [
    { key: 'newOrders', label: 'New', color: '#3b82f6' },
    { key: 'assignedOrders', label: 'Assigned', color: '#8b5cf6' },
    { key: 'inProgressOrders', label: 'In Progress', color: '#f59e0b' },
    { key: 'onHoldOrders', label: 'On Hold', color: 'var(--ks-warning-text)' },
    { key: 'completedOrders', label: 'Completed', color: '#10b981' },
    { key: 'closedOrders', label: 'Closed', color: 'var(--ks-muted)' },
    { key: 'cancelledOrders', label: 'Cancelled', color: '#ef4444' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ks-text)' }}>Operations Dashboard</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--ks-muted)' }}>Real-time work-order funnel and SLA compliance across all facilities.</p>
        </div>
        <button onClick={fetchDashboard} className="btn btn-secondary">
          <RefreshCw size={16} /> Refresh Metrics
        </button>
      </div>

      {/* Top KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: kpi.bg, color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {kpi.icon}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ks-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {kpi.label}
              </span>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--ks-text)', margin: 0 }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* SLA Compliance */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Gauge size={18} color="var(--ks-accent-text)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>SLA Compliance</h3>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--ks-muted)', marginBottom: 6 }}>
              <span>{metrics.totalClosedWithinSla} of {metrics.totalClosed} closed within SLA</span>
              <strong style={{ color: 'var(--ks-text)' }}>{metrics.slaCompliancePercentage.toFixed(1)}%</strong>
            </div>
            <div style={{ background: 'var(--ks-surface)', height: 12, borderRadius: 9999, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, metrics.slaCompliancePercentage)}%`,
                  background: metrics.slaCompliancePercentage >= 85 ? '#10b981' : metrics.slaCompliancePercentage >= 60 ? '#f59e0b' : '#ef4444',
                  borderRadius: 9999,
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, paddingTop: 12, borderTop: '1px solid var(--ks-border)', fontSize: '0.8rem', color: 'var(--ks-muted)' }}>
            <div>
              <span style={{ display: 'block', color: 'var(--ks-dim)' }}>Total Closed</span>
              <strong style={{ color: 'var(--ks-text)', fontSize: '1.1rem' }}>{metrics.totalClosed}</strong>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--ks-dim)' }}>Overdue</span>
              <strong style={{ color: '#ef4444', fontSize: '1.1rem' }}>{metrics.overdueOrders}</strong>
            </div>
          </div>
        </div>

        {/* Status Funnel */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <PlusCircle size={18} color="var(--ks-accent-text)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Work Order Funnel</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {statusRows.map((row) => {
              const value = (metrics[row.key] as number) || 0;
              const pct = metrics.totalOpen + metrics.closedOrders > 0
                ? Math.round((value / (metrics.totalOpen + metrics.closedOrders + metrics.cancelledOrders)) * 100)
                : 0;
              return (
                <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 100, fontSize: '0.78rem', color: 'var(--ks-muted)', fontWeight: 500 }}>{row.label}</span>
                  <div style={{ flex: 1, background: 'var(--ks-surface)', height: 8, borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: row.color, borderRadius: 9999 }} />
                  </div>
                  <strong style={{ width: 30, textAlign: 'right', fontSize: '0.85rem' }}>{value}</strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
        {[
          { title: 'Work Orders by Technician', data: metrics.technicianBreakdown },
          { title: 'Work Orders by Site', data: metrics.siteBreakdown },
        ].map((section) => (
          <div className="card" key={section.title}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>{section.title}</h3>
            {Object.keys(section.data || {}).length === 0 ? (
              <p style={{ color: 'var(--ks-dim)', fontSize: '0.85rem' }}>No matching work orders.</p>
            ) : Object.entries(section.data).map(([label, count]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--ks-border)' }}>
                <span style={{ color: 'var(--ks-muted)', fontSize: '0.85rem' }}>{label}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Recent Work Orders */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>Latest Activity</h3>
        {recent.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--ks-dim)', textAlign: 'center', padding: 24 }}>No recent work orders.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recent.map((wo) => (
              <div key={wo.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', background: 'var(--ks-surface)', borderRadius: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={14} color="var(--ks-dim)" />
                  <span style={{ fontWeight: 700, color: 'var(--ks-accent-text)', fontSize: '0.8rem' }}>{wo.code}</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--ks-text)', fontWeight: 600 }}>{wo.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge badge-${wo.status.toLowerCase()}`}>{wo.status}</span>
                  <span className={`badge badge-${wo.priority.toLowerCase()}`}>{wo.priority}</span>
                  {wo.slaBreached && <span className="badge badge-cancelled"><AlertTriangle size={12} /> SLA Overdue</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
