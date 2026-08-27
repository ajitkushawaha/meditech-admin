import {FormEvent, useEffect, useMemo, useState} from 'react';
import {api} from '../lib/api';

type Vendor = {
  id: string;
  name: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  location?: {
    latitude: number | null;
    longitude: number | null;
  };
  serviceRadiusKm?: number;
  isActive: boolean;
  ownerUser?: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
  } | null;
};

type VendorForm = {
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  latitude: string;
  longitude: string;
  serviceRadiusKm: string;
  password: string;
  isActive: boolean;
};

const emptyForm: VendorForm = {
  name: '',
  ownerName: '',
  email: '',
  phone: '',
  address: '',
  latitude: '',
  longitude: '',
  serviceRadiusKm: '10',
  password: '',
  isActive: true,
};

const VendorsPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState<VendorForm>(emptyForm);

  const modalTitle = useMemo(
    () => (editingVendor ? 'Edit vendor' : 'Add vendor'),
    [editingVendor],
  );

  const loadVendors = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/vendors');
      setVendors(response.data.vendors || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVendors();
  }, []);

  const openCreateModal = () => {
    setEditingVendor(null);
    setForm(emptyForm);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setForm({
      name: vendor.name || '',
      ownerName: vendor.ownerName || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      latitude: vendor.location?.latitude?.toString() || '',
      longitude: vendor.location?.longitude?.toString() || '',
      serviceRadiusKm: String(vendor.serviceRadiusKm || 10),
      password: '',
      isActive: vendor.isActive,
    });
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVendor(null);
    setForm(emptyForm);
  };

  const submitVendor = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        name: form.name.trim(),
        ownerName: form.ownerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        serviceRadiusKm: Number(form.serviceRadiusKm || 10),
        isActive: form.isActive,
        ...(editingVendor ? {} : {password: form.password}),
      };

      if (editingVendor) {
        await api.put(`/admin/vendors/${editingVendor.id}`, payload);
      } else {
        await api.post('/admin/vendors', payload);
      }

      closeModal();
      await loadVendors();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to save vendor');
    } finally {
      setSaving(false);
    }
  };

  const toggleVendor = async (vendor: Vendor) => {
    try {
      await api.put(`/admin/vendors/${vendor.id}`, {
        name: vendor.name,
        ownerName: vendor.ownerName,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        latitude: vendor.location?.latitude,
        longitude: vendor.location?.longitude,
        serviceRadiusKm: vendor.serviceRadiusKm,
        isActive: !vendor.isActive,
      });
      await loadVendors();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to update vendor');
    }
  };

  const deleteVendor = async (vendor: Vendor) => {
    if (!window.confirm(`Delete ${vendor.name}? Vendor login will be disabled.`)) {
      return;
    }

    try {
      await api.delete(`/admin/vendors/${vendor.id}`);
      await loadVendors();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to delete vendor');
    }
  };

  return (
    <section className="page-stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Marketplace</p>
          <h2>Vendors</h2>
        </div>
        <button className="primary-button" onClick={openCreateModal}>
          Add vendor
        </button>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      {loading ? (
        <div className="content-card">Loading vendors...</div>
      ) : vendors.length === 0 ? (
        <div className="content-card empty-state-card">
          <h3>No vendors yet</h3>
          <p>Add your first vendor and create their owner login in one step.</p>
          <button className="secondary-button" onClick={openCreateModal}>
            Create vendor
          </button>
        </div>
      ) : (
        <div className="vendor-grid">
          {vendors.map(vendor => (
            <article className="content-card vendor-card" key={vendor.id}>
              <div className="theme-card-title-row">
                <div>
                  <h3>{vendor.name}</h3>
                  <p>{vendor.ownerName || 'No owner name'}</p>
                </div>
                <span className={vendor.isActive ? 'status-badge' : 'status-badge-muted'}>
                  {vendor.isActive ? 'Active' : 'Paused'}
                </span>
              </div>

              <div className="vendor-meta">
                <span>Email</span>
                <strong>{vendor.email || 'Not set'}</strong>
                <span>Phone</span>
                <strong>{vendor.phone || 'Not set'}</strong>
                <span>Login</span>
                <strong>{vendor.ownerUser?.email || 'No owner login'}</strong>
                <span>Location</span>
                <strong>
                  {vendor.location?.latitude != null && vendor.location?.longitude != null
                    ? `${vendor.location.latitude}, ${vendor.location.longitude}`
                    : 'Not set'}
                </strong>
                <span>Radius</span>
                <strong>{vendor.serviceRadiusKm || 10} km</strong>
              </div>

              {vendor.address ? <p className="vendor-address">{vendor.address}</p> : null}

              <div className="banner-actions">
                <button className="ghost-button" onClick={() => openEditModal(vendor)}>
                  Edit
                </button>
                <button className="secondary-button" onClick={() => toggleVendor(vendor)}>
                  {vendor.isActive ? 'Pause' : 'Activate'}
                </button>
                <button className="danger-button" onClick={() => deleteVendor(vendor)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card vendor-form" onSubmit={submitVendor}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Vendor setup</p>
                <h3>{modalTitle}</h3>
              </div>
              <button type="button" className="ghost-button" onClick={closeModal}>
                Close
              </button>
            </div>

            <label>
              Store name
              <input
                required
                value={form.name}
                onChange={event => setForm({...form, name: event.target.value})}
                placeholder="Fresh Mart Vendor"
              />
            </label>

            <div className="form-grid-two">
              <label>
                Owner name
                <input
                  value={form.ownerName}
                  onChange={event => setForm({...form, ownerName: event.target.value})}
                  placeholder="Owner name"
                />
              </label>
              <label>
                Phone
                <input
                  value={form.phone}
                  onChange={event => setForm({...form, phone: event.target.value})}
                  placeholder="9876543210"
                />
              </label>
            </div>

            <label>
              Owner login email
              <input
                type="email"
                value={form.email}
                onChange={event => setForm({...form, email: event.target.value})}
                placeholder="vendor@example.com"
              />
            </label>

            {!editingVendor ? (
              <label>
                Owner login password
                <input
                  type="password"
                  value={form.password}
                  onChange={event => setForm({...form, password: event.target.value})}
                  placeholder="Minimum 8 characters"
                />
              </label>
            ) : null}

            <label>
              Address
              <textarea
                rows={3}
                value={form.address}
                onChange={event => setForm({...form, address: event.target.value})}
                placeholder="Vendor/store address"
              />
            </label>

            <div className="form-grid-two">
              <label>
                Latitude
                <input
                  required
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={event => setForm({...form, latitude: event.target.value})}
                  placeholder="26.8467"
                />
              </label>
              <label>
                Longitude
                <input
                  required
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={event => setForm({...form, longitude: event.target.value})}
                  placeholder="80.9462"
                />
              </label>
            </div>

            <label>
              Service radius km
              <input
                min={1}
                type="number"
                value={form.serviceRadiusKm}
                onChange={event => setForm({...form, serviceRadiusKm: event.target.value})}
                placeholder="10"
              />
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={event => setForm({...form, isActive: event.target.checked})}
              />
              Active vendor
            </label>

            <button className="secondary-button" disabled={saving}>
              {saving ? 'Saving...' : 'Save vendor'}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
};

export default VendorsPage;
