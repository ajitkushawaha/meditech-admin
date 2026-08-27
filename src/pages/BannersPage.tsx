import {FormEvent, useEffect, useMemo, useState} from 'react';
import {api} from '../lib/api';

type Banner = {
  id: string;
  title: string;
  isActive: boolean;
  sortOrder: number;
  image: string | null;
};

const emptyForm = {
  title: '',
  sortOrder: '0',
  isActive: true,
};

const BannersPage = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingBannerId, setUpdatingBannerId] = useState<string | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  const previewUrl = useMemo(() => {
    if (file) {
      return URL.createObjectURL(file);
    }

    return editingBanner?.image ?? null;
  }, [editingBanner?.image, file]);

  const loadBanners = () => {
    setLoading(true);
    api
      .get('/admin/banners')
      .then(response => setBanners(response.data?.banners ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBanners();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const resetForm = () => {
    setEditingBanner(null);
    setIsModalOpen(false);
    setForm(emptyForm);
    setFile(null);
    setMessage('');
  };

  const startCreate = () => {
    setEditingBanner(null);
    setForm(emptyForm);
    setFile(null);
    setMessage('');
    setIsModalOpen(true);
  };

  const startEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      sortOrder: String(banner.sortOrder ?? 0),
      isActive: banner.isActive,
    });
    setFile(null);
    setMessage('');
    setIsModalOpen(true);
  };

  const submitBanner = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (!form.title.trim()) {
      setMessage('Title is required.');
      return;
    }

    if (!editingBanner && !file) {
      setMessage('Banner image is required.');
      return;
    }

    setSaving(true);

    try {
      if (editingBanner) {
        if (file) {
          const data = new FormData();
          data.append('title', form.title.trim());
          data.append('sortOrder', form.sortOrder || '0');
          data.append('isActive', String(form.isActive));
          data.append('bannerFile', file);

          await api.put(`/admin/banners/${editingBanner.id}`, data);
        } else {
          await api.patch(`/admin/banners/${editingBanner.id}`, {
            title: form.title.trim(),
            sortOrder: form.sortOrder || '0',
            isActive: form.isActive,
          });
        }
      } else {
        const data = new FormData();
        data.append('title', form.title.trim());
        data.append('sortOrder', form.sortOrder || '0');
        data.append('isActive', String(form.isActive));

        if (file) {
          data.append('bannerFile', file);
        }

        await api.post('/admin/banners', data);
      }

      resetForm();
      loadBanners();
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
          'Unable to save banner. Please check image and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleBanner = (banner: Banner) => {
    setUpdatingBannerId(banner.id);
    api
      .patch(`/admin/banners/${banner.id}`, {isActive: !banner.isActive})
      .then(loadBanners)
      .finally(() => setUpdatingBannerId(null));
  };

  const deleteBanner = (banner: Banner) => {
    const confirmed = window.confirm(`Delete "${banner.title}" banner?`);

    if (!confirmed) {
      return;
    }

    setUpdatingBannerId(banner.id);
    api
      .delete(`/admin/banners/${banner.id}`)
      .then(() => {
        if (editingBanner?.id === banner.id) {
          resetForm();
        }
        loadBanners();
      })
      .finally(() => setUpdatingBannerId(null));
  };

  return (
    <section className="page-stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Store Content</p>
          <h2>Banners</h2>
        </div>
        <button className="secondary-button" onClick={startCreate}>
          Add banner
        </button>
      </div>

      {loading ? (
        <div className="content-card">Loading banners…</div>
      ) : banners.length > 0 ? (
        <div className="banner-grid">
          {banners.map(banner => (
            <article className="content-card banner-card" key={banner.id}>
              {banner.image ? (
                <img src={banner.image} alt={banner.title} />
              ) : (
                <div className="banner-placeholder">No image</div>
              )}

              <div className="banner-card-body">
                <div>
                  <div className="theme-card-title-row">
                    <h3>{banner.title}</h3>
                    <span
                      className={
                        banner.isActive ? 'status-badge' : 'status-badge-muted'
                      }>
                      {banner.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <p>Sort order: {banner.sortOrder}</p>
                </div>

                <div className="banner-actions">
                  <button className="ghost-button" onClick={() => startEdit(banner)}>
                    Edit
                  </button>
                  <button
                    className="secondary-button"
                    disabled={updatingBannerId === banner.id}
                    onClick={() => toggleBanner(banner)}>
                    {banner.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button
                    className="danger-button"
                    disabled={updatingBannerId === banner.id}
                    onClick={() => deleteBanner(banner)}>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="content-card empty-state-card">
          <h3>No banners found</h3>
          <p>Create your first carousel banner for the customer app.</p>
          <button className="secondary-button" onClick={startCreate}>
            Add banner
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card banner-form" onSubmit={submitBanner}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{editingBanner ? 'Edit' : 'Create'}</p>
                <h3>{editingBanner ? editingBanner.title : 'Upload banner'}</h3>
              </div>
              <button className="ghost-button" type="button" onClick={resetForm}>
                Close
              </button>
            </div>

            <label>
              Title
              <input
                value={form.title}
                onChange={event =>
                  setForm(current => ({...current, title: event.target.value}))
                }
                placeholder="Monsoon essentials"
              />
            </label>

            <label>
              Sort order
              <input
                value={form.sortOrder}
                onChange={event =>
                  setForm(current => ({...current, sortOrder: event.target.value}))
                }
                placeholder="0"
                type="number"
              />
            </label>

            <label className="checkbox-row">
              <input
                checked={form.isActive}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              Active banner
            </label>

            <label>
              Image {editingBanner ? '(optional)' : ''}
              <input
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={event => setFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>

            {previewUrl ? (
              <img
                className="banner-form-preview"
                src={previewUrl}
                alt="Banner preview"
              />
            ) : (
              <div className="banner-form-placeholder">Preview will appear here</div>
            )}

            {message && <div className="form-error">{message}</div>}

            <button className="secondary-button" disabled={saving}>
              {saving
                ? 'Saving…'
                : editingBanner
                  ? 'Save changes'
                  : 'Create banner'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
};

export default BannersPage;
