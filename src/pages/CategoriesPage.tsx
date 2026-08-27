import {FormEvent, useEffect, useState} from 'react';
import {api} from '../lib/api';
import Toast from '../components/Toast';

type Category = {id: string; name: string; image: string};
type CategoryProduct = {
  id: string;
  name: string;
  brand?: string;
  image?: string;
  quantity: string;
  categoryNames?: string[];
  isAssignedToCategory: boolean;
};
const emptyForm = {name: '', image: ''};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const CategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Category | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [managingCategory, setManagingCategory] = useState<Category | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<CategoryProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{message: string; tone: 'error' | 'success' | 'info'} | null>(null);
  const [brokenImageIds, setBrokenImageIds] = useState<Record<string, boolean>>({});

  const showToast = (message: string, tone: 'error' | 'success' | 'info' = 'info') => {
    setToast({message, tone});
    window.setTimeout(() => {
      setToast(current => current?.message === message ? null : current);
    }, 4500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/categories');
      setCategories(response.data.categories || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load categories');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void loadData(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setIsModalOpen(true); setError(''); };
  const openEdit = (category: Category) => { setEditing(category); setForm({name: category.name, image: category.image}); setIsModalOpen(true); setError(''); };
  const closeModal = () => { setIsModalOpen(false); setEditing(null); setForm(emptyForm); };

  const loadCategoryProducts = async (category: Category, search = productSearch) => {
    setLoadingProducts(true);
    setError('');
    try {
      const response = await api.get(`/admin/categories/${category.id}/products`, {
        params: {search, assigned: 'all'},
      });
      setCategoryProducts(response.data.products || []);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Unable to load category products';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const openManageProducts = async (category: Category) => {
    setManagingCategory(category);
    setProductSearch('');
    setSelectedProductIds([]);
    await loadCategoryProducts(category, '');
  };

  const closeManageProducts = () => {
    setManagingCategory(null);
    setCategoryProducts([]);
    setSelectedProductIds([]);
    setProductSearch('');
  };

  const toggleSelectedProduct = (productId: string) => {
    setSelectedProductIds(current =>
      current.includes(productId)
        ? current.filter(id => id !== productId)
        : [...current, productId],
    );
  };

  const updateCategoryProducts = async (action: 'add' | 'remove') => {
    if (!managingCategory) return;
    if (!selectedProductIds.length) {
      showToast('Select at least one product.', 'info');
      return;
    }

    setSavingProducts(true);
    try {
      await api.patch(`/admin/categories/${managingCategory.id}/products`, {
        action,
        productIds: selectedProductIds,
      });
      showToast(action === 'add' ? 'Products added to category.' : 'Products removed from category.', 'success');
      setSelectedProductIds([]);
      await loadCategoryProducts(managingCategory);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Unable to update category products';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSavingProducts(false);
    }
  };

  const uploadCategoryImage = async (file: File | null) => {
    if (!file) return;
    setUploadingImage(true);
    setError('');
    try {
      const imageData = await readFileAsDataUrl(file);
      const response = await api.post('/admin/categories/upload-image', {
        filename: file.name,
        mimeType: file.type,
        imageData,
      });
      setForm(current => ({...current, image: response.data.image}));
      showToast('Category image uploaded.', 'success');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Unable to upload category image';
      setError(message);
      showToast(message, 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const copyImageUrl = async () => {
    if (!form.image) {
      showToast('No image URL to copy.', 'info');
      return;
    }

    try {
      await navigator.clipboard.writeText(form.image);
      showToast('Image URL copied.', 'success');
    } catch {
      showToast('Unable to copy image URL.', 'error');
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.put(`/admin/categories/${editing.id}`, form);
      else await api.post('/admin/categories', form);
      showToast(editing ? 'Category updated successfully.' : 'Category created successfully.', 'success');
      closeModal(); await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to save category');
    } finally { setSaving(false); }
  };
  const deleteCategory = async (category: Category) => {
    if (!window.confirm(`Delete ${category.name}?`)) return;
    try {
      await api.delete(`/admin/categories/${category.id}`);
      showToast('Category deleted successfully.', 'success');
      await loadData();
    }
    catch (err: any) {
      const message = err.response?.data?.message || 'Unable to delete category';
      setError(message);
      showToast(message, 'error');
    }
  };

  return (
    <section className="page-stack">
      {toast ? (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      ) : null}
      <div className="section-header"><div><p className="eyebrow">Catalog</p><h2>Categories</h2></div><button className="secondary-button" onClick={openCreate}>Add category</button></div>
      {error ? <div className="form-error">{error}</div> : null}
      {loading ? <div className="content-card">Loading categories...</div> : (
        <div className="banner-grid">
          {categories.map(category => (
            <article className="content-card banner-card category-card" key={category.id}>
              {category.image && !brokenImageIds[category.id] ? (
                <img
                  src={category.image}
                  alt={category.name}
                  onError={() => setBrokenImageIds(current => ({...current, [category.id]: true}))}
                />
              ) : (
                <div className="banner-placeholder">{category.name.slice(0, 2).toUpperCase()}</div>
              )}
              <div className="banner-card-body">
                <div className="theme-card-title-row"><h3>{category.name}</h3></div>
                <div className="banner-actions">
                  <button className="secondary-button" onClick={() => openManageProducts(category)}>Manage products</button>
                  <button className="ghost-button" onClick={() => openEdit(category)}>Edit</button>
                  <button className="danger-button" onClick={() => deleteCategory(category)}>Delete</button>
                </div>
              </div>
            </article>
          ))}
          {!categories.length ? <div className="content-card">No categories found.</div> : null}
        </div>
      )}
      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card vendor-form" onSubmit={submit}>
            <div className="modal-header"><div><p className="eyebrow">Category</p><h3>{editing ? 'Edit category' : 'Add category'}</h3></div><button type="button" className="ghost-button" onClick={closeModal}>Close</button></div>
            <label>Name<input required value={form.name} onChange={event => setForm({...form, name: event.target.value})} /></label>

            <label>
              Image URL
              <div className="copy-input-row">
                <input value={form.image} onChange={event => setForm({...form, image: event.target.value})} placeholder="Optional image URL" />
                <button className="ghost-button" type="button" onClick={copyImageUrl}>Copy</button>
              </div>
            </label>

            <label>
              Upload image
              <input
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                disabled={uploadingImage}
                type="file"
                onChange={event => uploadCategoryImage(event.target.files?.[0] || null)}
              />
            </label>

            {form.image ? (
              <div className="category-form-preview">
                <img src={form.image} alt="Category preview" />
              </div>
            ) : (
              <div className="banner-form-placeholder">Preview will appear here</div>
            )}

            <button className="secondary-button" disabled={saving}>{saving ? 'Saving...' : 'Save category'}</button>
          </form>
        </div>
      ) : null}
      {managingCategory ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card category-product-manager">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Assign existing products</p>
                <h3>{managingCategory.name}</h3>
              </div>
              <button type="button" className="ghost-button" onClick={closeManageProducts}>Close</button>
            </div>

            <div className="category-product-toolbar">
              <input
                placeholder="Search atta, rice, dal, brand..."
                value={productSearch}
                onChange={event => setProductSearch(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') void loadCategoryProducts(managingCategory, productSearch.trim());
                }}
              />
              <button className="ghost-button" onClick={() => loadCategoryProducts(managingCategory, productSearch.trim())}>Search</button>
            </div>

            <div className="category-product-actions">
              <span>{selectedProductIds.length} selected</span>
              <button className="secondary-button" disabled={savingProducts} onClick={() => updateCategoryProducts('add')}>
                Add to category
              </button>
              <button className="ghost-button" disabled={savingProducts} onClick={() => updateCategoryProducts('remove')}>
                Remove from category
              </button>
            </div>

            {loadingProducts ? (
              <div className="content-card">Loading products...</div>
            ) : (
              <div className="category-product-list">
                {categoryProducts.map(product => (
                  <label className="category-product-row" key={product.id}>
                    <input
                      checked={selectedProductIds.includes(product.id)}
                      type="checkbox"
                      onChange={() => toggleSelectedProduct(product.id)}
                    />
                    {product.image ? <img src={product.image} alt="" /> : <span className="table-image-placeholder">No image</span>}
                    <span>
                      <strong>{product.name}</strong>
                      <small>
                        {[product.brand, product.quantity, product.categoryNames?.join(', ')].filter(Boolean).join(' · ')}
                      </small>
                    </span>
                    <em>{product.isAssignedToCategory ? 'Added' : 'Not added'}</em>
                  </label>
                ))}
                {!categoryProducts.length ? <div className="content-card">No products found.</div> : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default CategoriesPage;
