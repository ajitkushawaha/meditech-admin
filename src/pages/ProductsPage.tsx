import {FormEvent, useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {api} from '../lib/api';
import {useAuthStore} from '../stores/authStore';

type Product = {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  subCategory?: string;
  breadcrumbs?: string;
  image: string;
  price: number;
  discountPrice?: number | null;
  quantity: string;
  categoryId: string;
  categoryName: string;
  categoryIds?: string[];
  categoryNames?: string[];
  vendorPrice?: number;
  vendorDiscountPrice?: number | null;
  stock?: number;
  isAvailable?: boolean;
  branchId?: string;
};

type Category = {id: string; name: string; image?: string};
type Branch = {id: string; name: string};
type Pagination = {page: number; limit: number; total: number; totalPages: number};
type VendorListingForm = {
  price: string;
  discountPrice: string;
  stock: string;
  isAvailable: boolean;
  branchId: string;
};

const emptyForm = {
  name: '',
  brand: '',
  description: '',
  subCategory: '',
  breadcrumbs: '',
  image: '',
  price: '',
  discountPrice: '',
  quantity: '',
  categoryId: '',
  categoryIds: [] as string[],
};

const toPositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const allowedLimits = new Set([6, 10, 25, 50, 100]);
const onlyDecimal = (value: string) => value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
const onlyInteger = (value: string) => value.replace(/\D/g, '');

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const admin = useAuthStore(state => state.admin);
  const isSuperAdmin = admin?.role === 'super_admin';
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [listingForms, setListingForms] = useState<Record<string, VendorListingForm>>({});
  const [form, setForm] = useState(emptyForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const initialSearch = searchParams.get('search') || '';
  const initialLimit = toPositiveInt(searchParams.get('limit'), 6);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('categoryId') || '');
  const [availabilityFilter, setAvailabilityFilter] = useState(searchParams.get('availability') || 'all');
  const [page, setPage] = useState(toPositiveInt(searchParams.get('page'), 1));
  const [limit, setLimit] = useState(allowedLimits.has(initialLimit) ? initialLimit : 6);
  const [pagination, setPagination] = useState<Pagination>({page: 1, limit: 6, total: 0, totalPages: 1});
  const [error, setError] = useState('');

  const hydrateListingForms = (items: Product[], branchList: Branch[]) => {
    const next: Record<string, VendorListingForm> = {};
    for (const product of items) {
      next[product.id] = {
        price: String(product.vendorPrice ?? product.price ?? ''),
        discountPrice:
          product.vendorDiscountPrice == null ? '' : String(product.vendorDiscountPrice),
        stock: product.stock ? String(product.stock) : '',
        isAvailable: Boolean(product.isAvailable),
        branchId: product.branchId || branchList[0]?.id || '',
      };
    }
    setListingForms(next);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsResponse, categoriesResponse, branchesResponse] = await Promise.all([
        api.get('/admin/products', {
          params: {
            page,
            limit,
            search,
            categoryId: categoryFilter,
            availability: availabilityFilter,
          },
        }),
        api.get('/admin/categories'),
        isSuperAdmin ? Promise.resolve({data: {branches: []}}) : api.get('/admin/branches'),
      ]);
      const nextProducts = productsResponse.data.products || [];
      const nextBranches = branchesResponse.data.branches || [];
      setProducts(nextProducts);
      setCategories(categoriesResponse.data.categories || []);
      setBranches(nextBranches);
      if (
        categoryFilter &&
        !(categoriesResponse.data.categories || []).some((category: Category) => category.id === categoryFilter)
      ) {
        setCategoryFilter('');
        setPage(1);
      }
      const nextPagination = productsResponse.data.pagination || {page, limit, total: nextProducts.length, totalPages: 1};
      setPagination(nextPagination);
      if (nextPagination.page && nextPagination.page !== page) setPage(nextPagination.page);
      hydrateListingForms(nextProducts, nextBranches);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [page, limit, search, categoryFilter, availabilityFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch === search) return;
      setPage(1);
      setSearch(nextSearch);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (page > 1) nextParams.set('page', String(page));
    if (limit !== 6) nextParams.set('limit', String(limit));
    if (search) nextParams.set('search', search);
    if (categoryFilter) nextParams.set('categoryId', categoryFilter);
    if (availabilityFilter !== 'all') nextParams.set('availability', availabilityFilter);
    setSearchParams(nextParams, {replace: true});
  }, [page, limit, search, categoryFilter, availabilityFilter, setSearchParams]);

  const openCreate = () => {
    setEditingProduct(null);
    setForm({...emptyForm, categoryId: categories[0]?.id || '', categoryIds: categories[0]?.id ? [categories[0].id] : []});
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      brand: product.brand || '',
      description: product.description || '',
      subCategory: product.subCategory || '',
      breadcrumbs: product.breadcrumbs || '',
      image: product.image,
      price: String(product.price),
      discountPrice: product.discountPrice == null ? '' : String(product.discountPrice),
      quantity: product.quantity,
      categoryId: product.categoryId,
      categoryIds: product.categoryIds?.length ? product.categoryIds : [product.categoryId].filter(Boolean),
    });
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
  };

  const submitProduct = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        categoryId: form.categoryIds[0] || form.categoryId,
        categoryIds: form.categoryIds,
        price: Number(form.price),
        discountPrice: form.discountPrice ? Number(form.discountPrice) : '',
      };

      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/admin/products', payload);
      }

      closeModal();
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to save product');
    } finally {
      setSaving(false);
    }
  };

  const uploadProductImage = async (file: File | null) => {
    if (!file) return;
    setUploadingImage(true);
    setError('');
    try {
      const data = new FormData();
      data.append('productFile', file);
      const response = await api.post('/admin/products/upload-image', data);
      setForm(current => ({...current, image: response.data.image}));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to upload product image');
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleFormCategory = (categoryId: string) => {
    setForm(current => {
      const exists = current.categoryIds.includes(categoryId);
      const categoryIds = exists
        ? current.categoryIds.filter(id => id !== categoryId)
        : [...current.categoryIds, categoryId];
      return {
        ...current,
        categoryIds,
        categoryId: categoryIds[0] || '',
      };
    });
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Delete ${product.name} from master catalog?`)) return;
    try {
      await api.delete(`/admin/products/${product.id}`);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to delete product');
    }
  };

  const updateListingForm = (productId: string, patch: Partial<VendorListingForm>) => {
    setListingForms(current => ({
      ...current,
      [productId]: {...current[productId], ...patch},
    }));
  };

  const replaceProductRow = (updatedProduct: Product) => {
    setProducts(current =>
      current.map(product =>
        product.id === updatedProduct.id ? {...product, ...updatedProduct} : product,
      ),
    );
    setListingForms(current => ({
      ...current,
      [updatedProduct.id]: {
        price: String(updatedProduct.vendorPrice ?? updatedProduct.price ?? ''),
        discountPrice:
          updatedProduct.vendorDiscountPrice == null
            ? ''
            : String(updatedProduct.vendorDiscountPrice),
        stock: updatedProduct.stock ? String(updatedProduct.stock) : '',
        isAvailable: Boolean(updatedProduct.isAvailable),
        branchId: updatedProduct.branchId || current[updatedProduct.id]?.branchId || branches[0]?.id || '',
      },
    }));
  };

  const saveVendorListing = async (product: Product) => {
    const listing = listingForms[product.id];
    setSavingProductId(product.id);
    setError('');

    try {
      const response = await api.patch(`/admin/vendor-products/${product.id}`, {
        price: Number(listing.price || product.price),
        discountPrice: listing.discountPrice ? Number(listing.discountPrice) : '',
        stock: Number(listing.stock || 0),
        isAvailable: listing.isAvailable,
        branchId: listing.branchId,
      });
      if (response.data?.product) replaceProductRow(response.data.product);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to save vendor product');
    } finally {
      setSavingProductId(null);
    }
  };

  const makeVisibleProductsAvailable = async () => {
    if (!products.length) return;
    setBulkSaving(true);
    setError('');

    try {
      const responses = await Promise.all(products.map(product => {
        const listing = listingForms[product.id];
        return api.patch(`/admin/vendor-products/${product.id}`, {
          price: Number(listing?.price || product.price),
          discountPrice: listing?.discountPrice ? Number(listing.discountPrice) : '',
          stock: Number(listing?.stock || 0),
          isAvailable: true,
          branchId: listing?.branchId,
        });
      }));
      const updatedProducts = responses
        .map(response => response.data?.product)
        .filter(Boolean);
      setProducts(current =>
        current.map(product => {
          const updatedProduct = updatedProducts.find(item => item.id === product.id);
          return updatedProduct ? {...product, ...updatedProduct} : product;
        }),
      );
      setListingForms(current => {
        const next = {...current};
        for (const product of updatedProducts.length ? updatedProducts : products) {
          next[product.id] = {
            ...next[product.id],
            price: String(product.vendorPrice ?? product.price ?? next[product.id]?.price ?? ''),
            discountPrice:
              product.vendorDiscountPrice == null
                ? next[product.id]?.discountPrice || ''
                : String(product.vendorDiscountPrice),
            stock: product.stock ? String(product.stock) : next[product.id]?.stock || '',
            isAvailable: true,
            branchId: product.branchId || next[product.id]?.branchId || branches[0]?.id || '',
          };
        }
        return next;
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to make visible products available');
    } finally {
      setBulkSaving(false);
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategoryFilter('');
    setAvailabilityFilter('all');
    setLimit(6);
    setPage(1);
  };

  return (
    <section className="page-stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">{isSuperAdmin ? 'Master catalog' : 'Vendor catalog'}</p>
          <h2>Products</h2>
        </div>
        {isSuperAdmin ? (
          <div className="table-actions">
            <Link className="ghost-button" to="/products/bulk-import">
              Bulk import
            </Link>
            <button className="secondary-button" onClick={openCreate}>
              Add master product
            </button>
          </div>
        ) : (
          <div className="table-actions">
            <button
              className="secondary-button"
              disabled={bulkSaving || !products.length}
              onClick={makeVisibleProductsAvailable}>
              {bulkSaving ? 'Saving...' : 'Select all visible'}
            </button>
          </div>
        )}
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      <div className="catalog-filter-card">
        <label>
          Search products
          <input
            placeholder="Search name, brand, sub category..."
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
          />
        </label>
        <label>
          Category
          <select
            value={categoryFilter}
            onChange={event => {
              setPage(1);
              setCategoryFilter(event.target.value);
            }}>
            <option value="">All categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        {!isSuperAdmin ? (
          <label>
            Availability
            <select
              value={availabilityFilter}
              onChange={event => {
                setPage(1);
                setAvailabilityFilter(event.target.value);
              }}>
              <option value="all">All products</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </label>
        ) : null}
        <label>
          Per page
          <select
            value={limit}
            onChange={event => {
              setPage(1);
              setLimit(Number(event.target.value));
            }}>
            <option value={6}>6</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        <button className="ghost-button" onClick={clearFilters}>Reset</button>
      </div>

      <div className="product-category-strip" aria-label="Product categories">
        <button
          className={`product-category-chip ${!categoryFilter ? 'product-category-chip-active' : ''}`}
          onClick={() => {
            setPage(1);
            setCategoryFilter('');
          }}
          type="button">
          <span className="product-category-thumb product-category-thumb-empty">All</span>
          <strong>All categories</strong>
        </button>
        {categories.map(category => (
          <button
            className={`product-category-chip ${categoryFilter === category.id ? 'product-category-chip-active' : ''}`}
            key={category.id}
            onClick={() => {
              setPage(1);
              setCategoryFilter(category.id);
            }}
            type="button">
            {category.image ? (
              <img className="product-category-thumb" src={category.image} alt="" />
            ) : (
              <span className="product-category-thumb product-category-thumb-empty">
                {category.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <strong>{category.name}</strong>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="content-card">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="content-card empty-state-card">
          <h3>No master products yet</h3>
          <p>Super Admin should add shared catalog products first.</p>
          {isSuperAdmin ? (
            <div className="table-actions">
              <Link className="ghost-button" to="/products/bulk-import">
                Import products
              </Link>
              <button className="secondary-button" onClick={openCreate}>
                Create product
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="data-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>{isSuperAdmin ? 'Default price' : 'Vendor price'}</th>
                {!isSuperAdmin ? <th>Stock</th> : null}
                {!isSuperAdmin ? <th>Available</th> : null}
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map(product => {
                const listing = listingForms[product.id];
                return (
                  <tr key={product.id}>
                    <td>
                      <div className="table-product-cell">
                        {product.image ? <img src={product.image} alt={product.name} /> : <div className="table-image-placeholder">No image</div>}
                        <span>
                          {product.name}
                          {product.brand ? <small>{product.brand}</small> : null}
                        </span>
                      </div>
                    </td>
                    <td>{product.categoryNames?.length ? product.categoryNames.join(', ') : product.categoryName || '—'}</td>
                    <td>{product.quantity}</td>
                    <td>
                      {isSuperAdmin ? (
                        `₹${product.price}`
                      ) : (
                        <input
                          className="table-input"
                          inputMode="decimal"
                          type="text"
                          value={listing?.price || ''}
                          onChange={event => updateListingForm(product.id, {price: onlyDecimal(event.target.value)})}
                        />
                      )}
                    </td>
                    {!isSuperAdmin ? (
                      <td>
                        <input
                          className="table-input"
                          inputMode="numeric"
                          type="text"
                          value={listing?.stock || ''}
                          placeholder="0"
                          onChange={event => updateListingForm(product.id, {stock: onlyInteger(event.target.value)})}
                        />
                      </td>
                    ) : null}
                    {!isSuperAdmin ? (
                      <td>
                        <label className="table-checkbox-row">
                          <input
                            checked={Boolean(listing?.isAvailable)}
                            type="checkbox"
                            onChange={event => updateListingForm(product.id, {isAvailable: event.target.checked})}
                          />
                          <span>{listing?.isAvailable ? 'Yes' : 'No'}</span>
                        </label>
                      </td>
                    ) : null}
                    <td>
                      {isSuperAdmin ? (
                        <div className="table-actions">
                          <button className="ghost-button" onClick={() => openEdit(product)}>
                            Edit
                          </button>
                          <button className="danger-button" onClick={() => deleteProduct(product)}>
                            Delete
                          </button>
                        </div>
                      ) : (
                        <div className="table-actions">
                          {branches.length > 1 ? (
                            <select
                              value={listing?.branchId || ''}
                              onChange={event => updateListingForm(product.id, {branchId: event.target.value})}>
                              {branches.map(branch => (
                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                              ))}
                            </select>
                          ) : null}
                          <button
                            className="secondary-button"
                            disabled={savingProductId === product.id}
                            onClick={() => saveVendorListing(product)}>
                            {savingProductId === product.id ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="table-pagination-footer">
            <span>
              Showing page {pagination.page} of {pagination.totalPages} · {pagination.total} products
            </span>
            <div className="pagination-actions">
              <button
                className="ghost-button"
                disabled={pagination.page <= 1}
                onClick={() => setPage(current => Math.max(current - 1, 1))}>
                Previous
              </button>
              <button
                className="ghost-button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage(current => current + 1)}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card vendor-form" onSubmit={submitProduct}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Master catalog item</p>
                <h3>{editingProduct ? 'Edit master product' : 'Add master product'}</h3>
              </div>
              <button type="button" className="ghost-button" onClick={closeModal}>
                Close
              </button>
            </div>

            <label>
              Name
              <input required value={form.name} onChange={event => setForm({...form, name: event.target.value})} />
            </label>

            <div className="form-grid-two">
              <label>
                Brand
                <input value={form.brand} onChange={event => setForm({...form, brand: event.target.value})} />
              </label>
              <label>
                Sub category
                <input value={form.subCategory} onChange={event => setForm({...form, subCategory: event.target.value})} />
              </label>
            </div>

            <label>
              Image URL <span className="optional-label">optional</span>
              <input value={form.image} onChange={event => setForm({...form, image: event.target.value})} />
            </label>

            <label>
              Upload image
              <input
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                disabled={uploadingImage}
                type="file"
                onChange={event => uploadProductImage(event.target.files?.[0] || null)}
              />
            </label>

            <div className="form-grid-two">
              <label>
                Default price
                <input required min={0} type="number" value={form.price} onChange={event => setForm({...form, price: event.target.value})} />
              </label>
              <label>
                Default discount price
                <input min={0} type="number" value={form.discountPrice} onChange={event => setForm({...form, discountPrice: event.target.value})} />
              </label>
            </div>

            <div className="form-grid-two">
              <label>
                Quantity
                <input required value={form.quantity} onChange={event => setForm({...form, quantity: event.target.value})} placeholder="500g" />
              </label>
              <label>
                Categories
                <div className="category-checkbox-grid">
                  {categories.map(category => (
                    <label className="category-checkbox-option" key={category.id}>
                      <input
                        checked={form.categoryIds.includes(category.id)}
                        type="checkbox"
                        onChange={() => toggleFormCategory(category.id)}
                      />
                      <span>{category.name}</span>
                    </label>
                  ))}
                </div>
              </label>
            </div>

            <label>
              Description
              <textarea rows={4} value={form.description} onChange={event => setForm({...form, description: event.target.value})} />
            </label>

            <label>
              Breadcrumbs
              <input value={form.breadcrumbs} onChange={event => setForm({...form, breadcrumbs: event.target.value})} placeholder="Grocery > Staples > Dal" />
            </label>

            <button className="secondary-button" disabled={saving}>
              {saving ? 'Saving...' : 'Save master product'}
            </button>
          </form>
        </div>
      ) : null}

    </section>
  );
};

export default ProductsPage;
