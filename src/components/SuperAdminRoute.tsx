import {Navigate, Outlet} from 'react-router-dom';
import {useAuthStore} from '../stores/authStore';

const SuperAdminRoute = () => {
  const admin = useAuthStore(state => state.admin);

  if (admin?.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default SuperAdminRoute;
