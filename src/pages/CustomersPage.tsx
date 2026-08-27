import {useEffect, useState} from 'react';
import {api} from '../lib/api';

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  isActivated: boolean;
  location: {latitude: number | null; longitude: number | null};
};

const CustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/customers');
      setCustomers(response.data.customers || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const toggleCustomer = async (customer: Customer) => {
    try {
      await api.patch(`/admin/customers/${customer.id}`, {isActivated: !customer.isActivated});
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to update customer');
    }
  };

  return (
    <section className="page-stack">
      <div className="section-header"><div><p className="eyebrow">Accounts</p><h2>Customers</h2></div></div>
      {error ? <div className="form-error">{error}</div> : null}
      {loading ? <div className="content-card">Loading customers...</div> : (
        <div className="data-table-card">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th><th>Location</th><th>Status</th><th /></tr></thead>
            <tbody>
              {customers.map(customer => (
                <tr key={customer.id}>
                  <td>{customer.name || '—'}</td>
                  <td>{customer.phone || '—'}</td>
                  <td>{customer.email || '—'}</td>
                  <td>{customer.address || '—'}</td>
                  <td>{customer.location.latitude != null ? `${customer.location.latitude}, ${customer.location.longitude}` : '—'}</td>
                  <td><span className={customer.isActivated ? 'status-badge' : 'status-badge-muted'}>{customer.isActivated ? 'Active' : 'Inactive'}</span></td>
                  <td><button className="ghost-button" onClick={() => toggleCustomer(customer)}>{customer.isActivated ? 'Deactivate' : 'Activate'}</button></td>
                </tr>
              ))}
              {!customers.length ? <tr><td colSpan={7}>No customers found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default CustomersPage;
