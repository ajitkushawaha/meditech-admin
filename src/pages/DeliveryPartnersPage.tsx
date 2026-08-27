import {FormEvent, useEffect, useState} from 'react';
import {api} from '../lib/api';

type Branch = {id: string; name: string};
type DeliveryPartner = {
  id: string;
  name: string;
  email: string;
  phone: number;
  address: string;
  isActivated: boolean;
  branchId: string;
  branchName: string;
};

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  branchId: '',
  password: '',
  isActivated: true,
};

const DeliveryPartnersPage = () => {
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingPartner, setEditingPartner] = useState<DeliveryPartner | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [partnersResponse, branchesResponse] = await Promise.all([
        api.get('/admin/delivery-partners'),
        api.get('/admin/branches'),
      ]);
      setPartners(partnersResponse.data.deliveryPartners || []);
      setBranches(branchesResponse.data.branches || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load delivery partners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openCreate = () => {
    setEditingPartner(null);
    setForm({...emptyForm, branchId: branches[0]?.id || ''});
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (partner: DeliveryPartner) => {
    setEditingPartner(partner);
    setForm({
      name: partner.name,
      email: partner.email,
      phone: String(partner.phone || ''),
      address: partner.address,
      branchId: partner.branchId,
      password: '',
      isActivated: partner.isActivated,
    });
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPartner(null);
    setForm(emptyForm);
  };

  const submitPartner = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {...form, phone: Number(form.phone)};
      if (editingPartner) {
        await api.put(`/admin/delivery-partners/${editingPartner.id}`, payload);
      } else {
        await api.post('/admin/delivery-partners', payload);
      }

      closeModal();
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to save delivery partner');
    } finally {
      setSaving(false);
    }
  };

  const deletePartner = async (partner: DeliveryPartner) => {
    if (!window.confirm(`Delete ${partner.name || partner.email}?`)) return;
    try {
      await api.delete(`/admin/delivery-partners/${partner.id}`);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to delete delivery partner');
    }
  };

  return (
    <section className="page-stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Fulfillment</p>
          <h2>Delivery partners</h2>
        </div>
        <button className="secondary-button" onClick={openCreate}>
          Add partner
        </button>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      {loading ? (
        <div className="content-card">Loading delivery partners...</div>
      ) : (
        <div className="data-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Branch</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {partners.map(partner => (
                <tr key={partner.id}>
                  <td>{partner.name || '—'}</td>
                  <td>{partner.email}</td>
                  <td>{partner.phone}</td>
                  <td>{partner.branchName || '—'}</td>
                  <td>
                    <span className={partner.isActivated ? 'status-badge' : 'status-badge-muted'}>
                      {partner.isActivated ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="ghost-button" onClick={() => openEdit(partner)}>Edit</button>
                      <button className="danger-button" onClick={() => deletePartner(partner)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!partners.length ? (
                <tr><td colSpan={6}>No delivery partners yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card vendor-form" onSubmit={submitPartner}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Delivery account</p>
                <h3>{editingPartner ? 'Edit partner' : 'Add partner'}</h3>
              </div>
              <button type="button" className="ghost-button" onClick={closeModal}>Close</button>
            </div>

            <div className="form-grid-two">
              <label>Name<input value={form.name} onChange={event => setForm({...form, name: event.target.value})} /></label>
              <label>Phone<input required value={form.phone} onChange={event => setForm({...form, phone: event.target.value})} /></label>
            </div>
            <label>Email<input required type="email" value={form.email} onChange={event => setForm({...form, email: event.target.value})} /></label>
            <label>
              Branch
              <select required value={form.branchId} onChange={event => setForm({...form, branchId: event.target.value})}>
                <option value="">Select branch</option>
                {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <label>Address<textarea rows={3} value={form.address} onChange={event => setForm({...form, address: event.target.value})} /></label>
            <label>
              {editingPartner ? 'New password optional' : 'Password'}
              <input required={!editingPartner} type="password" value={form.password} onChange={event => setForm({...form, password: event.target.value})} />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.isActivated} onChange={event => setForm({...form, isActivated: event.target.checked})} />
              Active partner
            </label>
            <button className="secondary-button" disabled={saving}>{saving ? 'Saving...' : 'Save partner'}</button>
          </form>
        </div>
      ) : null}
    </section>
  );
};

export default DeliveryPartnersPage;
