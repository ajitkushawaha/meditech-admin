import {Navigate, Route, Routes} from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import SuperAdminRoute from '../components/SuperAdminRoute';
import DashboardPage from '../pages/DashboardPage';
import ThemesPage from '../pages/ThemesPage';
import BannersPage from '../pages/BannersPage';
import VendorsPage from '../pages/VendorsPage';
import LoginPage from '../pages/LoginPage';
import ProductsPage from '../pages/ProductsPage';
import ProductBulkImportPage from '../pages/ProductBulkImportPage';
import DeliveryPartnersPage from '../pages/DeliveryPartnersPage';
import OrdersPage from '../pages/OrdersPage';
import BranchesPage from '../pages/BranchesPage';
import CategoriesPage from '../pages/CategoriesPage';
import CustomersPage from '../pages/CustomersPage';
import PaymentsPage from '../pages/PaymentsPage';
import AdminUsersPage from '../pages/AdminUsersPage';

import PrivacyPolicyPage from '../pages/PrivacyPolicyPage';
import AccountDeletePage from '../pages/AccountDeletePage';

const App = () => {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="delete-account" element={<AccountDeletePage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route element={<SuperAdminRoute />}>
            <Route path="products/bulk-import" element={<ProductBulkImportPage />} />
          </Route>
          <Route path="branches" element={<BranchesPage />} />
          <Route path="delivery-partners" element={<DeliveryPartnersPage />} />
          <Route path="banners" element={<BannersPage />} />
          <Route element={<SuperAdminRoute />}>
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="admin-users" element={<AdminUsersPage />} />
            <Route path="themes" element={<ThemesPage />} />
            <Route path="vendors" element={<VendorsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
