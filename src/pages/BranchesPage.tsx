import {FormEvent, useEffect, useState} from 'react';
import {api} from '../lib/api';
import {useAuthStore} from '../stores/authStore';

type Vendor = {id: string; name: string};
type Branch = {
  id: string;
  name: string;
  vendorId: string;
  vendorName: string;
  address: string;
  location: {latitude: number | null; longitude: number | null};
  deliveryRadiusKm: number;
  isActive: boolean;
  deliveryCharge: number;
  handlingCharge: number;
  surgeCharge: number;
  surgeEnabled: boolean;
  freeDeliveryThreshold: number;
};

const emptyForm = {
  name: '',
  vendorId: '',
  address: '',
  latitude: '',
  longitude: '',
  deliveryRadiusKm: '10',
  deliveryCharge: '29',
  handlingCharge: '2',
  surgeCharge: '3',
  surgeEnabled: false,
  freeDeliveryThreshold: '499',
  isActive: true,
};

const onlyPositiveDecimal = (value: string) => value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
const onlyCoordinate = (value: string) => {
  const cleaned = value.replace(/[^\d.-]/g, '').replace(/(?!^)-/g, '').replace(/(\..*)\./g, '$1');
  return cleaned === '-' ? cleaned : cleaned;
};

const BranchesPage = () => {
  const admin = useAuthStore(state => state.admin);
  const isSuperAdmin = admin?.role === 'super_admin';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [branchesResponse, vendorsResponse] = await Promise.all([
        api.get('/admin/branches'),
        isSuperAdmin ? api.get('/admin/vendors') : Promise.resolve({data: {vendors: []}}),
      ]);
      setBranches(branchesResponse.data.branches || []);
      setVendors(vendorsResponse.data.vendors || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({...emptyForm, vendorId: vendors[0]?.id || ''});
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditing(branch);
    setForm({
      name: branch.name,
      vendorId: branch.vendorId,
      address: branch.address,
      latitude: String(branch.location.latitude ?? ''),
      longitude: String(branch.location.longitude ?? ''),
      deliveryRadiusKm: String(branch.deliveryRadiusKm ?? 10),
      deliveryCharge: String(branch.deliveryCharge ?? 29),
      handlingCharge: String(branch.handlingCharge ?? 2),
      surgeCharge: String(branch.surgeCharge ?? 3),
      surgeEnabled: branch.surgeEnabled,
      freeDeliveryThreshold: String(branch.freeDeliveryThreshold ?? 499),
      isActive: branch.isActive,
    });
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      deliveryRadiusKm: Number(form.deliveryRadiusKm),
      deliveryCharge: Number(form.deliveryCharge),
      handlingCharge: Number(form.handlingCharge),
      surgeCharge: Number(form.surgeCharge),
      freeDeliveryThreshold: Number(form.freeDeliveryThreshold),
    };
    try {
      if (editing) await api.put(`/admin/branches/${editing.id}`, payload);
      else await api.post('/admin/branches', payload);
      closeModal();
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to save branch');
    } finally {
      setSaving(false);
    }
  };

  const deleteBranch = async (branch: Branch) => {
    if (!window.confirm(`Delete ${branch.name}?`)) return;
    try {
      await api.delete(`/admin/branches/${branch.id}`);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to delete branch');
    }
  };

  return (
    <section className="page-stack">
      <div className="section-header">
        <div><p className="eyebrow">Fulfillment</p><h2>Branches</h2></div>
        <button className="secondary-button" onClick={openCreate}>Add branch</button>
      </div>
      {error ? <div className="form-error">{error}</div> : null}
      {loading ? <div className="content-card">Loading branches...</div> : (
        <div className="data-table-card">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Vendor</th><th>Address</th><th>Radius</th><th>Charges</th><th>Status</th><th /></tr></thead>
            <tbody>
              {branches.map(branch => (
                <tr key={branch.id}>
                  <td><strong>{branch.name}</strong><span>{branch.location.latitude}, {branch.location.longitude}</span></td>
                  <td>{branch.vendorName || '—'}</td>
                  <td>{branch.address || '—'}</td>
                  <td>{branch.deliveryRadiusKm} km</td>
                  <td>₹{branch.deliveryCharge} + ₹{branch.handlingCharge}</td>
                  <td><span className={branch.isActive ? 'status-badge' : 'status-badge-muted'}>{branch.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td><div className="table-actions"><button className="ghost-button" onClick={() => openEdit(branch)}>Edit</button><button className="danger-button" onClick={() => deleteBranch(branch)}>Delete</button></div></td>
                </tr>
              ))}
              {!branches.length ? <tr><td colSpan={7}>No branches found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      )}
      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card vendor-form" onSubmit={submit}>
            <div className="modal-header"><div><p className="eyebrow">Branch</p><h3>{editing ? 'Edit branch' : 'Add branch'}</h3></div><button type="button" className="ghost-button" onClick={closeModal}>Close</button></div>
            <label>Name<input required value={form.name} onChange={event => setForm({...form, name: event.target.value})} /></label>
            {isSuperAdmin && (!editing || !form.vendorId) ? <label>Vendor<select required value={form.vendorId} onChange={event => setForm({...form, vendorId: event.target.value})}><option value="">Select vendor</option>{vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label> : null}
            {isSuperAdmin && editing && form.vendorId ? <label>Vendor<input disabled value={editing.vendorName || 'Assigned vendor'} /></label> : null}
            <label>Address<textarea rows={3} value={form.address} onChange={event => setForm({...form, address: event.target.value})} /></label>
            <div className="form-grid-two"><label>Latitude<input required inputMode="decimal" type="text" value={form.latitude} onChange={event => setForm({...form, latitude: onlyCoordinate(event.target.value)})} /></label><label>Longitude<input required inputMode="decimal" type="text" value={form.longitude} onChange={event => setForm({...form, longitude: onlyCoordinate(event.target.value)})} /></label></div>
            <div className="form-grid-two"><label>Radius km<input inputMode="decimal" type="text" value={form.deliveryRadiusKm} onChange={event => setForm({...form, deliveryRadiusKm: onlyPositiveDecimal(event.target.value)})} /></label><label>Free delivery above<input inputMode="decimal" type="text" value={form.freeDeliveryThreshold} onChange={event => setForm({...form, freeDeliveryThreshold: onlyPositiveDecimal(event.target.value)})} /></label></div>
            <div className="form-grid-two"><label>Delivery charge<input inputMode="decimal" type="text" value={form.deliveryCharge} onChange={event => setForm({...form, deliveryCharge: onlyPositiveDecimal(event.target.value)})} /></label><label>Handling charge<input inputMode="decimal" type="text" value={form.handlingCharge} onChange={event => setForm({...form, handlingCharge: onlyPositiveDecimal(event.target.value)})} /></label></div>
            <div className="form-grid-two"><label>Surge charge<input inputMode="decimal" type="text" value={form.surgeCharge} onChange={event => setForm({...form, surgeCharge: onlyPositiveDecimal(event.target.value)})} /></label><label className="checkbox-row"><input type="checkbox" checked={form.surgeEnabled} onChange={event => setForm({...form, surgeEnabled: event.target.checked})} />Surge enabled</label></div>
            <label className="checkbox-row"><input type="checkbox" checked={form.isActive} onChange={event => setForm({...form, isActive: event.target.checked})} />Active branch</label>
            <button className="secondary-button" disabled={saving}>{saving ? 'Saving...' : 'Save branch'}</button>
          </form>
        </div>
      ) : null}
    </section>
  );
};

export default BranchesPage;
