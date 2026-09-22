import React, { useState, useEffect } from 'react';
import { customerApi, siteApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Customer, Site } from '../types';
import { Building, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';

const EMPTY_CUSTOMER = { companyName: '', contactPerson: '', email: '', phone: '', address: '', active: true };

export const CustomerSites: React.FC = () => {
  const { role } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [sitesByCustomer, setSitesByCustomer] = useState<Record<number, Site[]>>({});
  const [siteModalCustomer, setSiteModalCustomer] = useState<Customer | null>(null);

  // Form states
  const [form, setForm] = useState<typeof EMPTY_CUSTOMER>(EMPTY_CUSTOMER);
  const [siteForm, setSiteForm] = useState({ siteName: '', buildingName: '', roomNo: '', address: '', city: '', state: '', country: '', zipcode: '' });
  const [saving, setSaving] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setCustomers((await customerApi.getAll()) || []);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const loadSites = async (customerId: number) => {
    try {
      const sites = await customerApi.getSites(customerId);
      setSitesByCustomer((prev) => ({ ...prev, [customerId]: sites || [] }));
    } catch (err) {
      console.error('Failed to load sites', err);
    }
  };

  const handleToggleExpand = (customerId: number) => {
    if (expanded === customerId) {
      setExpanded(null);
    } else {
      setExpanded(customerId);
      if (!sitesByCustomer[customerId]) loadSites(customerId);
    }
  };

  const openCreate = () => {
    setForm(EMPTY_CUSTOMER);
    setShowCreate(true);
  };

  const openEdit = (customer: Customer) => {
    setForm({
      companyName: customer.companyName,
      contactPerson: customer.contactPerson,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      active: customer.active,
    });
    setEditing(customer);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await customerApi.update(editing.id, { ...form, active: form.active });
      } else {
        await customerApi.create({ ...form, active: true });
      }
      setShowCreate(false);
      setEditing(null);
      await fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteModalCustomer) return;
    setSaving(true);
    try {
      await customerApi.addSite(siteModalCustomer.id, {
        siteName: siteForm.siteName,
        buildingName: siteForm.buildingName || undefined,
        roomNo: siteForm.roomNo ? Number(siteForm.roomNo) : undefined,
        address: siteForm.address || undefined,
        city: siteForm.city || undefined,
        state: siteForm.state || undefined,
        country: siteForm.country || undefined,
        zipcode: siteForm.zipcode ? Number(siteForm.zipcode) : undefined,
      });
      setSiteModalCustomer(null);
      setSiteForm({ siteName: '', buildingName: '', roomNo: '', address: '', city: '', state: '', country: '', zipcode: '' });
      await loadSites(siteModalCustomer.id);
      await fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add site');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSite = async (customerId: number, siteId: number) => {
    if (!window.confirm('Delete this site permanently?')) return;
    try {
      await siteApi.delete(siteId);
      await loadSites(customerId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete site');
    }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.875rem' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 };
  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={(form[key] as string | boolean).toString()}
        onChange={(e) => setForm({ ...form, [key]: type === 'checkbox' ? e.target.checked : e.target.value })}
        required={key !== 'address'}
        style={inputStyle}
      />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Customers & Sites</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Manage client organizations and their physical facility sites.</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          <Plus size={16} /> New Customer
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>Loading customers...</div>
      ) : customers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
          No customers yet. Create your first client organization.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {customers.map((c) => {
            const isExpanded = expanded === c.id;
            const sites = sitesByCustomer[c.id] || [];
            return (
              <div key={c.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Customer Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', flexWrap: 'wrap', gap: 12 }} onClick={() => handleToggleExpand(c.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{c.companyName}</h3>
                        {!c.active && <span className="badge badge-cancelled">Inactive</span>}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                        {c.contactPerson} · {c.email} · {c.phone}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-assigned">{sites.length} site{sites.length !== 1 ? 's' : ''}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                      className="btn btn-sm btn-secondary"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSiteModalCustomer(c); }}
                      className="btn btn-sm btn-primary"
                    >
                      <Plus size={12} /> Add Site
                    </button>
                  </div>
                </div>
                <p style={{ padding: '0 20px', fontSize: '0.8rem', color: '#94a3b8' }}>{c.address}</p>

                {/* Sites List */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #e2e8f0', padding: '14px 20px', background: '#f8fafc' }}>
                    {sites.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 24, fontSize: '0.85rem', color: '#94a3b8' }}>
                        No sites configured yet. Add a building site.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                        {sites.map((s) => (
                          <div key={s.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                              <div>
                                <strong style={{ fontSize: '0.9rem' }}>{s.siteName}</strong>
                                {s.buildingName && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{s.buildingName}</div>}
                              </div>
                              {role === 'MANAGER' && (
                                <button onClick={() => handleDeleteSite(c.id, s.id)} className="btn btn-sm btn-secondary" style={{ color: '#ef4444', padding: '2px 6px' }}>
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#64748b', marginTop: 6 }}>
                              <MapPin size={12} />
                              <span>{[s.address, s.city, s.state, s.country].filter(Boolean).join(', ')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {(showCreate || editing) && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{editing ? 'Edit Customer' : 'New Customer'}</h3>
              <button onClick={() => { setShowCreate(false); setEditing(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {field('companyName', 'Company Name')}
              {field('contactPerson', 'Contact Person')}
              {field('email', 'Email', 'email')}
              {field('phone', 'Phone')}
              {field('address', 'Address')}
              {editing && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                  Active account
                </label>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => { setShowCreate(false); setEditing(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SITE MODAL */}
      {siteModalCustomer && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add Site — {siteModalCustomer.companyName}</h3>
              <button onClick={() => setSiteModalCustomer(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSite} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Site / Building Name *</label>
                <input required value={siteForm.siteName} onChange={(e) => setSiteForm({ ...siteForm, siteName: e.target.value })} style={inputStyle} placeholder="e.g. Headquarters Tower A" />
              </div>
              <div>
                <label style={labelStyle}>Building Name</label>
                <input value={siteForm.buildingName} onChange={(e) => setSiteForm({ ...siteForm, buildingName: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Room No</label>
                  <input value={siteForm.roomNo} onChange={(e) => setSiteForm({ ...siteForm, roomNo: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Zipcode</label>
                  <input value={siteForm.zipcode} onChange={(e) => setSiteForm({ ...siteForm, zipcode: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Address</label>
                <input value={siteForm.address} onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>City</label>
                  <input value={siteForm.city} onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>State</label>
                  <input value={siteForm.state} onChange={(e) => setSiteForm({ ...siteForm, state: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Country</label>
                  <input value={siteForm.country} onChange={(e) => setSiteForm({ ...siteForm, country: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setSiteModalCustomer(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add Site'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};