import React, { useEffect, useState } from 'react';
import { Briefcase, Mail, MapPin, Phone, RefreshCw } from 'lucide-react';
import { userApi } from '../services/api';
import { User } from '../types';
import { initials } from '../components/Navbar';

// Dispatcher directory: who is available, where they are based and how loaded they are.
export const TechniciansPage: React.FC = () => {
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    userApi.getTechnicians()
      .then((list) => { setTechnicians(list); setError(''); })
      .catch(() => setError('Unable to load technicians.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const available = technicians.filter((t) => t.available).length;

  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">Technicians</h2>
          <p className="ks-page-sub">{available} of {technicians.length} available. Technicians update their own location and availability in their profile.</p>
        </div>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={15} /> Refresh</button>
      </div>
      {error && <div className="ks-alert ks-alert-error">{error}</div>}
      {loading ? (
        <div className="ks-empty">Loading technicians…</div>
      ) : technicians.length === 0 ? (
        <div className="card ks-empty">No technicians yet. A manager can add them under Workers.</div>
      ) : (
        <div className="ks-grid">
          {technicians.map((t) => (
            <div key={t.id} className="ks-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span className="ks-avatar" style={{ width: 44, height: 44, fontSize: 16 }}>{initials(t.userName)}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{t.userName}</div>
                  <span className={`badge ${t.available ? 'badge-available' : 'badge-busy'}`}>{t.available ? 'Available' : 'Unavailable'}</span>
                </div>
              </div>
              <div className="ks-muted" style={{ display: 'grid', gap: 6, fontSize: '0.84rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> {t.location || 'Location not set'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Briefcase size={14} /> {t.currentJobs ?? 0} current job{t.currentJobs === 1 ? '' : 's'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} /> {t.phone || 'No phone'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, wordBreak: 'break-all' }}><Mail size={14} /> {t.userEmail}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
