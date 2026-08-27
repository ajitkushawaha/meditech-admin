import {FormEvent, useEffect, useState} from 'react';
import {api} from '../lib/api';

type Theme = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  priority: number;
  startDate?: string | null;
  endDate?: string | null;
  colors: {
    primary: string;
    headerGradient: [string, string];
    background: string;
    stickySearchBackground: string;
    sectionTitle: string;
    categoryTileBackground: string;
    productCardBackground: string;
    productCardBorder: string;
    productBadgeBackground: string;
  };
};

const emptyForm = {
  name: '',
  slug: '',
  isActive: false,
  priority: '0',
  startDate: '',
  endDate: '',
  primaryColor: '#10b981',
  headerGradientStart: '#0f9f5f',
  headerGradientEnd: '#10b981',
  backgroundColor: '#ffffff',
  stickySearchBackground: '#0f9f5f',
  sectionTitleColor: '#111827',
  categoryTileBackground: '#dcfce7',
  productCardBackground: '#ffffff',
  productCardBorder: '#e5e7eb',
  productBadgeBackground: '#f9fafb',
};

type ThemeForm = typeof emptyForm;

const colorFields: Array<{label: string; key: keyof ThemeForm}> = [
  {label: 'Primary', key: 'primaryColor'},
  {label: 'Header start', key: 'headerGradientStart'},
  {label: 'Header end', key: 'headerGradientEnd'},
  {label: 'Background', key: 'backgroundColor'},
  {label: 'Sticky search', key: 'stickySearchBackground'},
  {label: 'Section title', key: 'sectionTitleColor'},
  {label: 'Category tile', key: 'categoryTileBackground'},
  {label: 'Product card', key: 'productCardBackground'},
  {label: 'Product border', key: 'productCardBorder'},
  {label: 'Product badge', key: 'productBadgeBackground'},
];

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  return value.slice(0, 10);
};

const ThemesPage = () => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activatingThemeId, setActivatingThemeId] = useState<string | null>(null);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ThemeForm>(emptyForm);
  const [message, setMessage] = useState('');

  const loadThemes = () => {
    setLoading(true);
    api
      .get('/admin/themes')
      .then(response => setThemes(response.data?.themes ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadThemes();
  }, []);

  const resetForm = () => {
    setEditingTheme(null);
    setIsModalOpen(false);
    setForm(emptyForm);
    setMessage('');
  };

  const startCreate = () => {
    setEditingTheme(null);
    setForm(emptyForm);
    setMessage('');
    setIsModalOpen(true);
  };

  const startEdit = (theme: Theme) => {
    setEditingTheme(theme);
    setForm({
      name: theme.name,
      slug: theme.slug,
      isActive: theme.isActive,
      priority: String(theme.priority ?? 0),
      startDate: toDateInput(theme.startDate),
      endDate: toDateInput(theme.endDate),
      primaryColor: theme.colors.primary,
      headerGradientStart: theme.colors.headerGradient[0],
      headerGradientEnd: theme.colors.headerGradient[1],
      backgroundColor: theme.colors.background,
      stickySearchBackground: theme.colors.stickySearchBackground,
      sectionTitleColor: theme.colors.sectionTitle,
      categoryTileBackground: theme.colors.categoryTileBackground,
      productCardBackground: theme.colors.productCardBackground,
      productCardBorder: theme.colors.productCardBorder,
      productBadgeBackground: theme.colors.productBadgeBackground,
    });
    setMessage('');
    setIsModalOpen(true);
  };

  const updateForm = <Key extends keyof ThemeForm>(key: Key, value: ThemeForm[Key]) => {
    setForm(current => ({...current, [key]: value}));
  };

  const submitTheme = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (!form.name.trim() || !form.slug.trim()) {
      setMessage('Theme name and slug are required.');
      return;
    }

    setSaving(true);

    try {
      if (editingTheme) {
        await api.put(`/admin/themes/${editingTheme.id}`, form);
      } else {
        await api.post('/admin/themes', form);
      }

      resetForm();
      loadThemes();
    } catch {
      setMessage('Unable to save theme. Check slug uniqueness and try again.');
    } finally {
      setSaving(false);
    }
  };

  const activateTheme = (themeId: string) => {
    setActivatingThemeId(themeId);
    api
      .post(`/admin/themes/${themeId}/activate`)
      .then(loadThemes)
      .finally(() => setActivatingThemeId(null));
  };

  const deleteTheme = (theme: Theme) => {
    const confirmed = window.confirm(`Delete "${theme.name}" theme?`);

    if (!confirmed) return;

    setActivatingThemeId(theme.id);
    api
      .delete(`/admin/themes/${theme.id}`)
      .then(loadThemes)
      .finally(() => setActivatingThemeId(null));
  };

  return (
    <section className="page-stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Store Content</p>
          <h2>Themes</h2>
        </div>
        <button className="secondary-button" onClick={startCreate}>
          Add theme
        </button>
      </div>

      <div className="theme-grid">
        {loading ? (
          <div className="content-card">Loading themes…</div>
        ) : themes.length > 0 ? (
          themes.map(theme => (
            <div className="content-card theme-card" key={theme.id}>
              <div
                className="theme-swatch theme-swatch-wide"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.headerGradient[0]}, ${theme.colors.headerGradient[1]})`,
                }}
              />
              <div className="theme-card-body">
                <div>
                  <div className="theme-card-title-row">
                    <h3>{theme.name}</h3>
                    {theme.isActive && <span className="status-badge">Active</span>}
                  </div>
                  <p>Slug: {theme.slug}</p>
                  <p>Priority: {theme.priority}</p>
                </div>

                <div className="theme-color-row">
                  <span style={{background: theme.colors.background}} />
                  <span style={{background: theme.colors.stickySearchBackground}} />
                  <span style={{background: theme.colors.categoryTileBackground}} />
                </div>

                <div className="banner-actions">
                  <button className="ghost-button" onClick={() => startEdit(theme)}>
                    Edit
                  </button>
                  <button
                    className="secondary-button"
                    disabled={theme.isActive || activatingThemeId === theme.id}
                    onClick={() => activateTheme(theme.id)}>
                    {theme.isActive
                      ? 'Active'
                      : activatingThemeId === theme.id
                        ? 'Activating…'
                        : 'Activate'}
                  </button>
                  <button
                    className="danger-button"
                    disabled={theme.isActive || activatingThemeId === theme.id}
                    onClick={() => deleteTheme(theme)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="content-card empty-state-card">
            <h3>No themes found</h3>
            <p>Create a theme to customize the customer app.</p>
            <button className="secondary-button" onClick={startCreate}>
              Add theme
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card theme-form" onSubmit={submitTheme}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{editingTheme ? 'Edit' : 'Create'}</p>
                <h3>{editingTheme ? editingTheme.name : 'New theme'}</h3>
              </div>
              <button className="ghost-button" type="button" onClick={resetForm}>
                Close
              </button>
            </div>

            <div className="form-grid-two">
              <label>
                Name
                <input
                  value={form.name}
                  onChange={event => updateForm('name', event.target.value)}
                  placeholder="Diwali"
                />
              </label>
              <label>
                Slug
                <input
                  value={form.slug}
                  onChange={event => updateForm('slug', event.target.value)}
                  placeholder="diwali"
                />
              </label>
              <label>
                Priority
                <input
                  value={form.priority}
                  onChange={event => updateForm('priority', event.target.value)}
                  type="number"
                />
              </label>
              <label className="checkbox-row">
                <input
                  checked={form.isActive}
                  onChange={event => updateForm('isActive', event.target.checked)}
                  type="checkbox"
                />
                Active theme
              </label>
              <label>
                Start date
                <input
                  value={form.startDate}
                  onChange={event => updateForm('startDate', event.target.value)}
                  type="date"
                />
              </label>
              <label>
                End date
                <input
                  value={form.endDate}
                  onChange={event => updateForm('endDate', event.target.value)}
                  type="date"
                />
              </label>
            </div>

            <div
              className="theme-form-preview"
              style={{
                background: `linear-gradient(135deg, ${form.headerGradientStart}, ${form.headerGradientEnd})`,
              }}>
              <span>Header preview</span>
            </div>

            <div className="color-field-grid">
              {colorFields.map(field => (
                <label key={field.key}>
                  {field.label}
                  <div className="color-input-row">
                    <input
                      value={form[field.key] as string}
                      onChange={event => updateForm(field.key, event.target.value)}
                      type="color"
                    />
                    <input
                      value={form[field.key] as string}
                      onChange={event => updateForm(field.key, event.target.value)}
                    />
                  </div>
                </label>
              ))}
            </div>

            {message && <div className="form-error">{message}</div>}

            <button className="secondary-button" disabled={saving}>
              {saving ? 'Saving…' : editingTheme ? 'Save changes' : 'Create theme'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
};

export default ThemesPage;
