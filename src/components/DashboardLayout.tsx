import { useState, useRef, useEffect } from 'react';
import {
  Image,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Paintbrush,
  Package,
  ReceiptText,
  Store,
  Tags,
  Truck,
  Users,
  WalletCards,
  UserCircle,
  Menu,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import brandLogo from '../assets/logo.png';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Orders', path: '/orders', icon: ReceiptText },
  { label: 'Products', path: '/products', icon: Package },
  { label: 'Branches', path: '/branches', icon: MapPin },
  { label: 'Delivery', path: '/delivery-partners', icon: Truck },
  { label: 'Categories', path: '/categories', icon: Tags, superAdminOnly: true },
  { label: 'Customers', path: '/customers', icon: Users, superAdminOnly: true },
  { label: 'Payments', path: '/payments', icon: WalletCards, superAdminOnly: true },
  { label: 'Admin Users', path: '/admin-users', icon: KeyRound, superAdminOnly: true },
  { label: 'Themes', path: '/themes', icon: Paintbrush, superAdminOnly: true },
  { label: 'Banners', path: '/banners', icon: Image },
  { label: 'Vendors', path: '/vendors', icon: Store, superAdminOnly: true },
];

const DashboardLayout = () => {
  const admin = useAuthStore(state => state.admin);
  const logout = useAuthStore(state => state.logout);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const confirmLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      {/* Mobile overlay backdrop */}
      {mobileMenuOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-block">
          <img className="brand-mark brand-logo" src={brandLogo} alt="MedStore" />
          <div style={{ flex: 1 }}>
            <p className="brand-title">MedStore</p>
            <p className="brand-subtitle">Admin Console</p>
          </div>
          <button 
            className="mobile-menu-close"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-section-label">Main</p>
          {navItems
            .filter(item => !item.superAdminOnly || admin?.role === 'super_admin')
            .map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                  }>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
        </nav>
      </aside>

      <main className="main-panel">
        <div className="main-panel-content">
          <header className="topbar">
            <div className="topbar-left">
              <button 
                className="mobile-menu-toggle"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu size={28} color="#fff" />
              </button>
              <h1>MedStore</h1>
            </div>
            <div className="topbar-actions">
              
              <div className="profile-menu-container" ref={menuRef}>
                <button 
                  className="profile-icon-button" 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  <UserCircle size={28} />
                </button>
                
                {showProfileMenu && (
                  <div className="profile-dropdown">
                    <div className="profile-dropdown-header">
                      <strong>{admin?.role === 'vendor_owner' ? 'Vendor' : 'Super Admin'}</strong>
                      <span>{admin?.email || 'admin'}</span>
                    </div>
                    <button className="profile-dropdown-item text-danger" onClick={confirmLogout}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <div className="outlet-panel">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
