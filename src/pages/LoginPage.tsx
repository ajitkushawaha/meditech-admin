import {FormEvent, useState} from 'react';
import {Navigate} from 'react-router-dom';
import {api} from '../lib/api';
import {useAuthStore} from '../stores/authStore';
import brandLogo from '../assets/logo.png';

const REMEMBER_LOGIN_KEY = 'ghop_ghop_admin_remember_login';

const getRememberedLogin = () => {
  try {
    const value = localStorage.getItem(REMEMBER_LOGIN_KEY);
    return value
      ? (JSON.parse(value) as {email?: string; password?: string})
      : null;
  } catch {
    return null;
  }
};

const LoginPage = () => {
  const token = useAuthStore(state => state.token);
  const setSession = useAuthStore(state => state.setSession);
  const rememberedLogin = getRememberedLogin();
  const [email, setEmail] = useState(rememberedLogin?.email || '');
  const [password, setPassword] = useState(rememberedLogin?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(Boolean(rememberedLogin?.password));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/admin/auth/login', {email, password});

      if (rememberPassword) {
        localStorage.setItem(
          REMEMBER_LOGIN_KEY,
          JSON.stringify({email: email.trim(), password}),
        );
      } else {
        localStorage.removeItem(REMEMBER_LOGIN_KEY);
      }

      setSession(response.data.token, response.data.admin);
    } catch {
      setError('Invalid admin email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <img className="brand-mark brand-logo login-brand" src={brandLogo} alt="MedStore" />
        <p className="eyebrow">MedStore Admin</p>
        <h1>Welcome back</h1>
        <p>Sign in to manage themes, banners, vendors and operations.</p>

        <label>
          Email
          <input
            autoComplete="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="admin@example.com"
            type="email"
            required
          />
        </label>

        <label>
          Password
          <div className="password-input-row">
            <input
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="••••••••"
              type={showPassword ? 'text' : 'password'}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(value => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </label>

        <label className="login-remember-row">
          <input
            checked={rememberPassword}
            onChange={event => {
              setRememberPassword(event.target.checked);

              if (!event.target.checked) {
                localStorage.removeItem(REMEMBER_LOGIN_KEY);
              }
            }}
            type="checkbox"
          />
          <span>Remember password on this device</span>
        </label>

        {error && <div className="form-error">{error}</div>}

        <button className="primary-button login-button" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
};

export default LoginPage;
