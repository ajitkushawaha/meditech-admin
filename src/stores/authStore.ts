import {create} from 'zustand';

type AdminUser = {
  id: string;
  name?: string;
  email: string;
  role: string;
  vendorId?: string;
};

type AuthState = {
  admin: AdminUser | null;
  token: string | null;
  setSession: (token: string, admin: AdminUser) => void;
  logout: () => void;
};

const TOKEN_KEY = 'ghop_ghop_admin_token';
const ADMIN_KEY = 'ghop_ghop_admin_user';

const getStoredAdmin = () => {
  try {
    const value = localStorage.getItem(ADMIN_KEY);
    return value ? (JSON.parse(value) as AdminUser) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>(set => ({
  admin: getStoredAdmin(),
  token: localStorage.getItem(TOKEN_KEY),
  setSession: (token, admin) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
    set({token, admin});
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    set({token: null, admin: null});
  },
}));

export const getAdminToken = () => localStorage.getItem(TOKEN_KEY);
