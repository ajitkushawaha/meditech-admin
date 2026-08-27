import {Image, Package, ReceiptText, Users} from 'lucide-react';
import {useEffect, useState} from 'react';
import {api} from '../lib/api';
import {useAuthStore} from '../stores/authStore';

type DashboardStats = {
  orders: number;
  customers: number;
  products: number;
  vendors: number;
  activeBanners: number;
  deliveryPartners: number;
  branches: number;
  revenue: number;
};

const emptyStats: DashboardStats = {
  orders: 0,
  customers: 0,
  products: 0,
  vendors: 0,
  activeBanners: 0,
  deliveryPartners: 0,
  branches: 0,
  revenue: 0,
};

type VendorSummary = {
  name: string;
  address?: string;
  serviceRadiusKm?: number;
  location?: {
    latitude: number | null;
    longitude: number | null;
  };
};

type BranchSummary = {
  name: string;
  address?: string;
  deliveryRadiusKm?: number;
  location?: {
    latitude: number | null;
    longitude: number | null;
  };
};

const DashboardPage = () => {
  const admin = useAuthStore(state => state.admin);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [activeThemeName, setActiveThemeName] = useState('Default');
  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [primaryBranch, setPrimaryBranch] = useState<BranchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const isVendor = admin?.role === 'vendor_owner' || admin?.role === 'vendor_staff';

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then(response => {
        setStats(response.data?.stats ?? emptyStats);
        setActiveThemeName(response.data?.activeTheme?.name ?? 'Default');
        setVendor(response.data?.vendor ?? null);
        setPrimaryBranch(response.data?.primaryBranch ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const cards = isVendor
    ? [
        {label: 'Orders', value: stats.orders, hint: 'Your vendor orders', icon: ReceiptText},
        {label: 'Products', value: stats.products, hint: 'Your listed products', icon: Package},
        {label: 'Branches', value: stats.branches, hint: 'Assigned branches', icon: Image},
        {
          label: 'Delivery partners',
          value: stats.deliveryPartners,
          hint: 'Assigned partners',
          icon: Users,
        },
      ]
    : [
        {label: 'Orders', value: stats.orders, hint: 'All orders', icon: ReceiptText},
        {label: 'Customers', value: stats.customers, hint: 'Registered customers', icon: Users},
        {label: 'Products', value: stats.products, hint: 'Catalog items', icon: Package},
        {label: 'Active banners', value: stats.activeBanners, hint: 'Visible banners', icon: Image},
      ];

  return (
    <section className="page-stack">
      <div className="hero-card">
        <p className="eyebrow">Overview</p>
        <h2>{isVendor ? `${vendor?.name || 'Vendor'} dashboard` : 'Store operations at a glance'}</h2>
        <p>
          {isVendor
            ? 'Monitor your vendor orders, product catalog, branches and delivery team from one focused workspace.'
            : 'Monitor live store content, active themes, order volume and catalog health from one focused workspace.'}
        </p>
      </div>

      <div className="stats-grid">
        {cards.map(item => {
          const Icon = item.icon;
          return (
          <div className="stat-card" key={item.label}>
            <div className="stat-card-top">
              <p>{item.label}</p>
              <span className="stat-icon"><Icon size={18} /></span>
            </div>
            <strong>{loading ? '…' : item.value.toLocaleString('en-IN')}</strong>
            <span>{item.hint}</span>
          </div>
        )})}
      </div>

      <div className="content-card dashboard-summary-grid">
        <div>
          <p className="eyebrow">Revenue</p>
          <h3>₹{stats.revenue.toLocaleString('en-IN')}</h3>
        </div>
        <div>
          <p className="eyebrow">{isVendor ? 'Service radius' : 'Active theme'}</p>
          <h3>{isVendor ? `${primaryBranch?.deliveryRadiusKm || vendor?.serviceRadiusKm || 10} km radius` : activeThemeName}</h3>
        </div>
        <div>
          <p className="eyebrow">{isVendor ? 'Primary branch' : 'Vendors'}</p>
          <h3>
            {isVendor
              ? primaryBranch?.address || primaryBranch?.name || 'Not set'
              : stats.vendors}
          </h3>
          {isVendor && primaryBranch?.location?.latitude != null && primaryBranch?.location?.longitude != null ? (
            <span className="summary-subtext">
              {primaryBranch.location.latitude}, {primaryBranch.location.longitude}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default DashboardPage;
