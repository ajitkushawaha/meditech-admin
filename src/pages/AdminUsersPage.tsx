import {FormEvent, useEffect, useState} from 'react';
import {api} from '../lib/api';

type Vendor = {id: string; name: string};
type Branch = {id: string; name: string; vendorId: string};
type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  vendorId?: string;
  vendorName?: string;
  branchId?: string;
  branchName?: string;
  isActive: boolean;
};

const emptyForm = {name: '', email: '', password: '', role: 'vendor_staff', vendorId: '', branchId: '', isActive: true};

const AdminUsersPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersResponse, vendorsResponse, branchesResponse] = await Promise.all([
        api.get('/admin/admin-users'),
        api.get('/admin/vendors'),
        api.get('/admin/branches'),
      ]);
      setUsers(usersResponse.data.adminUsers || []);
      setVendors(vendorsResponse.data.vendors || []);
      setBranches(branchesResponse.data.branches || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load admin users');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void loadData(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setIsModalOpen(true); setError(''); };
  const openEdit = (user: AdminUser) => {
    setEditing(user);
    setForm({name: user.name || '', email: user.email, password: '', role: user.role, vendorId: user.vendorId || '', branchId: user.branchId || '', isActive: user.isActive});
    setIsModalOpen(true); setError('');
  };
  const closeModal = () => { setIsModalOpen(false); setEditing(null); setForm(emptyForm); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.put(`/admin/admin-users/${editing.id}`, form);
      else await api.post('/admin/admin-users', form);
      closeModal(); await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to save admin user');
    } finally { setSaving(false); }
  };
  const deleteUser = async (user: AdminUser) => {
    if (!window.confirm(`Delete ${user.email}?`)) return;
    try { await api.delete(`/admin/admin-users/${user.id}`); await loadData(); }
    catch (err: any) { setError(err.response?.data?.message || 'Unable to delete admin user'); }
  };

  return (
    <section className="page-stack">
      <div className="section-header"><div><p className="eyebrow">Access</p><h2>Admin users</h2></div><button className="secondary-button" onClick={openCreate}>Add user</button></div>
      {error ? <div className="form-error">{error}</div> : null}
      {loading ? <div className="content-card">Loading admin users...</div> : (
        <div className="data-table-card">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Vendor</th><th>Branch</th><th>Status</th><th /></tr></thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.name || '—'}</td><td>{user.email}</td><td>{user.role}</td><td>{user.vendorName || '—'}</td><td>{user.branchName || '—'}</td>
                  <td><span className={user.isActive ? 'status-badge' : 'status-badge-muted'}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td><div className="table-actions"><button className="ghost-button" onClick={() => openEdit(user)}>Edit</button><button className="danger-button" onClick={() => deleteUser(user)}>Delete</button></div></td>
                </tr>
              ))}
              {!users.length ? <tr><td colSpan={7}>No admin users found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      )}
      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card vendor-form" onSubmit={submit}>
            <div className="modal-header"><div><p className="eyebrow">Access</p><h3>{editing ? 'Edit admin user' : 'Add admin user'}</h3></div><button type="button" className="ghost-button" onClick={closeModal}>Close</button></div>
            <label>Name<input required value={form.name} onChange={event => setForm({...form, name: event.target.value})} /></label>
            <label>Email<input required type="email" value={form.email} onChange={event => setForm({...form, email: event.target.value})} /></label>
            <label>{editing ? 'New password optional' : 'Password'}<input required={!editing} type="password" value={form.password} onChange={event => setForm({...form, password: event.target.value})} /></label>
            <label>Role<select value={form.role} onChange={event => setForm({...form, role: event.target.value})}><option value="super_admin">Super Admin</option><option value="vendor_owner">Vendor Owner</option><option value="vendor_staff">Vendor Staff</option></select></label>
            <label>Vendor<select value={form.vendorId} onChange={event => setForm({...form, vendorId: event.target.value})}><option value="">No vendor</option>{vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
            <label>Branch<select value={form.branchId} onChange={event => setForm({...form, branchId: event.target.value})}><option value="">No branch</option>{branches.filter(branch => !form.vendorId || branch.vendorId === form.vendorId).map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
            <label className="checkbox-row"><input type="checkbox" checked={form.isActive} onChange={event => setForm({...form, isActive: event.target.checked})} />Active user</label>
            <button className="secondary-button" disabled={saving}>{saving ? 'Saving...' : 'Save user'}</button>
          </form>
        </div>
      ) : null}
    </section>
  );
};

export default AdminUsersPage;
