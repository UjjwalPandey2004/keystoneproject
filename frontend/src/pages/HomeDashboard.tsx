import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Building, CheckCircle2, ClipboardList, MapPin, PauseCircle, User as UserIcon, Users, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { customerApi, reportApi, userApi, workOrderApi } from '../services/api';
import { WorkOrder, WorkOrderStatus } from '../types';
import { Tab } from '../navigation';

interface Tile {
  title: string;
  value?: string | number;
  desc: string;
  icon: React.ReactNode;
  tab: Tab;
}

interface Props {
  onTabChange: (tab: Tab) => void;
}

const OPEN: WorkOrderStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];

export const HomeDashboard: React.FC<Props> = ({ onTabChange }) => {
  // Data is loaded with the real role's permissions; the cards follow the "View As" role.
  const { user, role, viewRole } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [extra, setExtra] = useState<Record<string, number | string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const page = await workOrderApi.list({ size: 100 });
        setOrders(page.content || []);
        setTotalOrders(page.totalElements ?? (page.content || []).length);

        const more: Record<string, number | string> = {};
        if (role === 'MANAGER') {
          const [customers, users, summary] = await Promise.all([customerApi.getAll(), userApi.list(), reportApi.getSummary()]);
          more.customers = customers.length;
          more.workers = users.filter((u) => u.role === 'TECHNICIAN').length;
          more.users = users.length;
          more.sla = `${summary.slaCompliancePercentage}%`;
          more.overdue = summary.overdueOrders;
        } else if (role === 'DISPATCHER') {
          more.customers = (await customerApi.getAll()).length;
        } else if (role === 'CUSTOMER') {
          try {
            const mine = await customerApi.getMine();
            more.sites = (await customerApi.getSites(mine.id)).length;
            more.organisation = mine.companyName;
          } catch {
            more.sites = 0;
          }
        }
        setExtra(more);
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role]);

  const count = (...statuses: WorkOrderStatus[]) => orders.filter((o) => statuses.includes(o.status)).length;
  const open = count(...OPEN);

  const tilesByRole: Record<string, Tile[]> = {
    MANAGER: [
      { title: 'Customers', value: extra.customers, desc: 'Client organisations and their sites', icon: <Building size={22} />, tab: 'customers' },
      { title: 'Workers', value: extra.workers, desc: `Technicians · ${extra.users ?? 0} users in total`, icon: <Users size={22} />, tab: 'users' },
      { title: 'Work Orders', value: open, desc: `Open of ${totalOrders} total`, icon: <ClipboardList size={22} />, tab: 'board' },
      { title: 'Field Jobs', value: count('IN_PROGRESS'), desc: 'Jobs in progress in the field', icon: <Wrench size={22} />, tab: 'field' },
      { title: 'Reports', value: extra.sla, desc: `SLA compliance · ${extra.overdue ?? 0} overdue`, icon: <BarChart3 size={22} />, tab: 'reports' },
      { title: 'Profile', desc: 'Your account details', icon: <UserIcon size={22} />, tab: 'profile' },
    ],
    DISPATCHER: [
      { title: 'Work Orders', value: open, desc: `${count('NEW')} new and waiting for assignment`, icon: <ClipboardList size={22} />, tab: 'board' },
      { title: 'Assigned Tasks', value: count('ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'), desc: 'Assigned to technicians', icon: <Activity size={22} />, tab: 'board' },
      { title: 'Customers & Sites', value: extra.customers, desc: 'Organisations you dispatch for', icon: <Building size={22} />, tab: 'customers' },
      { title: 'Profile', desc: 'Your account details', icon: <UserIcon size={22} />, tab: 'profile' },
    ],
    TECHNICIAN: [
      { title: 'My Work Orders', value: open, desc: `${totalOrders} assigned to you in total`, icon: <Wrench size={22} />, tab: 'field' },
      { title: 'Assigned Tasks', value: count('ASSIGNED'), desc: 'Waiting for you to start', icon: <ClipboardList size={22} />, tab: 'field' },
      { title: 'Work Status', value: count('IN_PROGRESS'), desc: `In progress · ${count('ON_HOLD')} on hold · ${count('COMPLETED')} completed`, icon: <PauseCircle size={22} />, tab: 'field' },
      { title: 'Profile', desc: 'Your account details', icon: <UserIcon size={22} />, tab: 'profile' },
    ],
    CUSTOMER: [
      { title: 'My Services', value: extra.sites, desc: extra.organisation ? `Sites of ${extra.organisation}` : 'Service sites of your organisation', icon: <MapPin size={22} />, tab: 'customer' },
      { title: 'My Work Orders', value: open, desc: `${totalOrders} service requests in total`, icon: <ClipboardList size={22} />, tab: 'customer' },
      { title: 'Profile', desc: 'Your account details', icon: <UserIcon size={22} />, tab: 'profile' },
    ],
  };
  const tiles = tilesByRole[viewRole || ''] || tilesByRole.CUSTOMER;
  const recent = orders.slice(0, 5);

  return (
    <div>
      <div className="ks-hero">
        <div className="ks-page-title">Welcome back, {user?.userName}</div>
        <div className="ks-page-sub">
          Signed in as <strong>{role}</strong>{viewRole !== role && <> · viewing as <strong>{viewRole}</strong></>} ·{open} open work order{open === 1 ? '' : 's'} in your view
        </div>
      </div>

      {error && <div className="ks-card ks-error" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="ks-grid" style={{ marginBottom: 24 }}>
        {tiles.map((tile) => (
          <button key={tile.title} className="ks-card ks-tile" onClick={() => onTabChange(tile.tab)}>
            <div className="ks-tile-icon">{tile.icon}</div>
            {tile.value !== undefined && <div className="ks-tile-value">{loading ? '…' : tile.value}</div>}
            <div className="ks-tile-title">{tile.title}</div>
            <div className="ks-tile-desc">{tile.desc}</div>
          </button>
        ))}
      </div>

      <div className="ks-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 700 }}>
          <Activity size={18} /> Recent work orders
        </div>
        {loading ? (
          <div className="ks-tile-desc">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="ks-tile-desc">No work orders to show.</div>
        ) : (
          recent.map((order) => (
            <div key={order.id} className="ks-field" style={{ gridTemplateColumns: '110px 1fr auto' }}>
              <span style={{ fontWeight: 800, color: '#a5b4fc' }}>{order.code}</span>
              <span>
                {order.title}
                <span className="ks-tile-desc" style={{ display: 'block', marginTop: 0 }}>{order.siteName}</span>
              </span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {order.slaBreached && <AlertTriangle size={14} color="#f87171" />}
                {order.status === 'CLOSED' && <CheckCircle2 size={14} color="#34d399" />}
                <span className={`badge badge-${order.status.toLowerCase()}`}>{order.status.replace('_', ' ')}</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
