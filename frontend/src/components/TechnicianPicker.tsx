import React from 'react';
import { Briefcase, CheckCircle2, MapPin, XCircle } from 'lucide-react';
import { User } from '../types';
import { initials } from './Navbar';

interface Props {
  technicians: User[];
  selectedId: number | '';
  onSelect: (id: number) => void;
}

// Technician choice with the details a dispatcher needs: location, availability and workload.
export const TechnicianPicker: React.FC<Props> = ({ technicians, selectedId, onSelect }) => {
  if (technicians.length === 0) {
    return <div className="ks-inset ks-dim">No technicians yet. A manager can add them under Workers.</div>;
  }
  return (
    <div className="ks-tech-list" role="radiogroup" aria-label="Select technician">
      {technicians.map((t) => {
        const selected = selectedId === t.id;
        return (
          <button
            type="button"
            key={t.id}
            role="radio"
            aria-checked={selected}
            className={`ks-tech-option ${selected ? 'selected' : ''}`}
            onClick={() => t.id && onSelect(t.id)}
          >
            <span className="ks-avatar" style={{ width: 38, height: 38, fontSize: 14 }}>{initials(t.userName)}</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700 }}>{t.userName}</span>
              <span className="ks-tech-meta">
                <span><MapPin size={13} /> {t.location || 'Location not set'}</span>
                <span><Briefcase size={13} /> {t.currentJobs ?? 0} current job{t.currentJobs === 1 ? '' : 's'}</span>
              </span>
            </span>
            {t.available ? (
              <span className="badge badge-available"><CheckCircle2 size={12} /> Available</span>
            ) : (
              <span className="badge badge-busy"><XCircle size={12} /> Unavailable</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
