import React, {useState, useRef, useEffect} from 'react';
import {Link} from 'react-router-dom';
import {api} from '../lib/api';

const imageColumnNames = ['image', 'image_url', 'imageurl', 'img', 'photo', 'picture', 'thumbnail'];

const isImageHeader = (header: string) => {
  const normalized = header.toLowerCase().replace(/[\s_-]/g, '');
  return imageColumnNames.includes(normalized);
};

const looksLikeImageUrl = (value: string) =>
  /^https?:\/\//i.test(value) && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(value);

const parseCsv = (csvText: string) => {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  const cleanRows = rows.filter(r => r.length > 0 && r.some(cell => cell.trim() !== ''));
  const [headers = [], ...dataRows] = cleanRows;

  const parsedHeaders = headers.map(h => h.trim());
  const parsedRows = dataRows.map(values =>
    parsedHeaders.reduce<Record<string, string>>((record, header, index) => {
      record[header] = (values[index] || '').trim();
      return record;
    }, {})
  );

  return { headers: parsedHeaders, rows: parsedRows };
};

interface DBImageItem {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

interface UploadingQueueItem {
  id: string;
  name: string;
  loading: boolean;
  error?: string;
}

const ProductBulkImportPage = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'generator'>('upload');
  
  // CSV Import States
  const [csvPreview, setCsvPreview] = useState<{headers: string[]; rows: Record<string, string>[]} | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Media Library States
  const [dbImages, setDbImages] = useState<DBImageItem[]>([]);
  const [uploadingQueue, setUploadingQueue] = useState<UploadingQueueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = async (query = '') => {
    try {
      const response = await api.get('/admin/images', { params: { q: query } });
      setDbImages(response.data.images || []);
    } catch (err) {
      console.error('Failed to fetch media library images');
    }
  };

  useEffect(() => {
    if (activeTab === 'generator') {
      void fetchImages(searchQuery);
    }
  }, [activeTab]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value;
    setSearchQuery(val);
    void fetchImages(val);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setError('');
    setMessage('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = parseCsv(text);
        if (parsed.headers.length === 0) {
          setError('The uploaded CSV file appears to be empty or invalid.');
          return;
        }
        setCsvPreview(parsed);
        setSelectedRows(new Set(parsed.rows.map((_, index) => index)));
      } catch (err) {
        setError('Failed to parse CSV file. Please check file format.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read CSV file.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      processFile(file);
    } else {
      setError('Please drop a valid .csv file.');
    }
  };

  const importSelectedProducts = async () => {
    if (!csvPreview?.rows.length) return;
    const products = csvPreview.rows.filter((_, index) => selectedRows.has(index));
    if (!products.length) {
      setError('Select at least one product to import.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await api.post('/admin/products/bulk', {
        products,
        source: 'csv_upload',
      });
      setMessage(`Imported ${response.data.count || 0} products. Skipped ${response.data.skipped || 0} duplicates.`);
      setCsvPreview(null);
      setSelectedRows(new Set());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to import products');
    } finally {
      setSaving(false);
    }
  };

  const submitTextImport = () => {
    try {
      const parsed = parseCsv(bulkCsvText);
      if (parsed.headers.length === 0) {
        setError('No valid CSV data provided.');
        return;
      }
      setCsvPreview(parsed);
      setSelectedRows(new Set(parsed.rows.map((_, index) => index)));
      setIsCsvModalOpen(false);
      setBulkCsvText('');
    } catch (err) {
      setError('Failed to parse pasted CSV data.');
    }
  };

  // Image Upload Logic
  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => {
          resolve(file);
        };
      };
      reader.onerror = () => {
        resolve(file);
      };
    });
  };

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length) {
      void uploadImages(files);
    }
  };

  const uploadImages = async (files: FileList) => {
    setError('');
    const newItems: UploadingQueueItem[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      loading: true
    }));
    
    setUploadingQueue(current => [...newItems, ...current]);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const targetItem = newItems[i];
      
      const compressedFile = await compressImage(file);
      
      const formData = new FormData();
      formData.append('image', compressedFile, file.name);

      try {
        await api.post('/admin/products/upload-image', formData);
        
        // Remove item from uploading queue and fetch updated list
        setUploadingQueue(current => current.filter(item => item.id !== targetItem.id));
        void fetchImages(searchQuery);
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Upload failed';
        setUploadingQueue(current =>
          current.map(item => item.id === targetItem.id ? { ...item, loading: false, error: errorMsg } : item)
        );
      }
    }
  };

  const handleImageDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      if (imageFiles.length) {
        const dataTransfer = new DataTransfer();
        imageFiles.forEach(file => dataTransfer.items.add(file));
        void uploadImages(dataTransfer.files);
      } else {
        setError('Please drop valid image files.');
      }
    }
  };

  const deleteImage = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this image permanently? This will delete it from Cloudinary as well.')) return;
    try {
      setError('');
      await api.delete(`/admin/images/${id}`);
      setDbImages(current => current.filter(img => img.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete image');
    }
  };

  const copyToClipboard = (id: string, url: string) => {
    void navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const previewRows = csvPreview?.rows || [];
  const imageHeaders = csvPreview?.headers.filter(isImageHeader) || [];
  const allRowsSelected = previewRows.length > 0 && selectedRows.size === previewRows.length;

  const toggleAllRows = () => {
    if (!previewRows.length) return;
    setSelectedRows(allRowsSelected ? new Set() : new Set(previewRows.map((_, index) => index)));
  };

  const toggleRow = (index: number) => {
    setSelectedRows(current => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const downloadTemplate = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering uploader browse
    const headers = 'Name,Brand,Price,DiscountedPrice,CategoryName,SubCategory,Quantity,Description,Image\n';
    const sampleRow = '"Surgical Mask 3-Ply","3M",150,120,"Safety Gear","Masks","100 Pcs","High quality protective earloop face mask","https://res.cloudinary.com/xj8f78ho/image/upload/products/mock-mask.jpg"\n';
    const blob = new Blob([headers + sampleRow], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'medstore_bulk_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="page-stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Master catalog</p>
          <h2>Bulk import products</h2>
        </div>
        <div className="table-actions">
          {activeTab === 'upload' && (
            <button className="secondary-button" onClick={() => setIsCsvModalOpen(true)}>Paste Raw CSV</button>
          )}
          <Link className="ghost-button" to="/products">Back to products</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-navigation" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--panel-border)', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('upload')}
          style={{
            padding: '0.75rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'upload' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'upload' ? 'var(--text)' : 'var(--muted)',
            fontWeight: activeTab === 'upload' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          📁 Upload CSV File
        </button>
        <button 
          onClick={() => setActiveTab('generator')}
          style={{
            padding: '0.75rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'generator' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'generator' ? 'var(--text)' : 'var(--muted)',
            fontWeight: activeTab === 'generator' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          🖼️ Media Library & Link Generator
        </button>
      </div>

      {error ? <div className="form-error">{error}</div> : null}
      {message ? <div className="success-message">{message}</div> : null}

      {activeTab === 'upload' ? (
        <>
          <div 
            className="bulk-import-filter-card"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
              border: '2px dashed var(--panel-border)',
              borderRadius: 'var(--radius-lg, 8px)',
              padding: '2.5rem',
              textAlign: 'center',
              background: 'var(--panel-soft)',
              cursor: 'pointer',
              transition: 'border-color 0.2s, background-color 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              color: 'var(--text)'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".csv" 
              onChange={handleFileChange}
            />
            <div style={{ fontSize: '3rem' }}>📄</div>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Drag & Drop CSV File</h3>
              <p className="helper-text" style={{ margin: 0, color: 'var(--muted)' }}>
                or click to browse from your computer
              </p>
            </div>
            <p className="helper-text" style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--muted)' }}>
              Supported headers: <strong>Name, Brand, Price, DiscountedPrice, Category, SubCategory, Quantity, Description, Image</strong>
            </p>
          </div>

          {/* Visual Guideline Sample Grid */}
          {!csvPreview && (
            <div 
              style={{
                marginTop: '1.5rem',
                background: 'var(--panel)',
                border: '1px solid var(--panel-border)',
                borderRadius: 'var(--radius-lg, 8px)',
                padding: '1.5rem',
                color: 'var(--text)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>CSV Structure Guide</h4>
                <button 
                  type="button" 
                  className="secondary-button" 
                  onClick={downloadTemplate}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  📥 Download Starter Template
                </button>
              </div>
              <p className="helper-text" style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--muted)' }}>
                Your CSV columns must match the headers in the table below. Use the <strong>Media Library</strong> tab to upload and copy direct image links.
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--panel-soft)', borderBottom: '1px solid var(--panel-border)' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--panel-border)' }}>Name</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--panel-border)' }}>Brand</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--panel-border)' }}>Price</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--panel-border)' }}>DiscountedPrice</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--panel-border)' }}>CategoryName</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--panel-border)' }}>SubCategory</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--panel-border)' }}>Quantity</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--panel-border)' }}>Image</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                      <td style={{ padding: '0.5rem', border: '1px solid var(--panel-border)' }}>Surgical Mask 3-Ply</td>
                      <td style={{ padding: '0.5rem', border: '1px solid var(--panel-border)' }}>3M</td>
                      <td style={{ padding: '0.5rem', border: '1px solid var(--panel-border)' }}>150</td>
                      <td style={{ padding: '0.5rem', border: '1px solid var(--panel-border)' }}>120</td>
                      <td style={{ padding: '0.5rem', border: '1px solid var(--panel-border)' }}>Safety Gear</td>
                      <td style={{ padding: '0.5rem', border: '1px solid var(--panel-border)' }}>Masks</td>
                      <td style={{ padding: '0.5rem', border: '1px solid var(--panel-border)' }}>100 Pcs</td>
                      <td style={{ padding: '0.5rem', border: '1px solid var(--panel-border)', color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>https://res.cloudinary.com/...</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {csvPreview ? (
            <div className="kaggle-preview-card" style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p className="helper-text" style={{ margin: 0 }}>
                  Showing {csvPreview.rows.length} preview rows from {csvPreview.headers.length} columns. Selected {selectedRows.size}.
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="ghost-button" onClick={() => setCsvPreview(null)}>Cancel</button>
                  <button className="secondary-button" disabled={saving} onClick={importSelectedProducts}>
                    {saving ? 'Importing...' : `Import selected (${selectedRows.size})`}
                  </button>
                </div>
              </div>
              
              {!imageHeaders.length ? (
                <div className="form-error" style={{ marginBottom: '1rem' }}>
                  This CSV does not include an image URL column. Products will show a clean placeholder image until you upload images later.
                </div>
              ) : null}

              <div className="kaggle-preview-table-wrap">
                <table className="kaggle-preview-table">
                  <thead>
                    <tr>
                      <th className="selection-column">
                        <input
                          aria-label="Select all preview rows"
                          checked={allRowsSelected}
                          type="checkbox"
                          onChange={toggleAllRows}
                        />
                      </th>
                      {csvPreview.headers.map(header => <th key={header}>{header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.rows.map((row, index) => (
                      <tr key={index}>
                        <td className="selection-column">
                          <input
                            aria-label={`Select row ${index + 1}`}
                            checked={selectedRows.has(index)}
                            type="checkbox"
                            onChange={() => toggleRow(index)}
                          />
                        </td>
                        {csvPreview.headers.map(header => {
                          const value = row[header] || '';
                          const shouldRenderImage = isImageHeader(header) && looksLikeImageUrl(value);

                          return (
                            <td key={header}>
                              {shouldRenderImage ? (
                                <div className="preview-image-cell">
                                  <img src={value} alt={row.Name || row.name || 'Product'} />
                                  <span>{value}</span>
                                </div>
                              ) : value || '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        /* Media Library Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Image Uploader */}
          <div 
            className="bulk-import-filter-card"
            onDragOver={handleDragOver}
            onDrop={handleImageDrop}
            style={{
              border: '2px dashed var(--panel-border)',
              borderRadius: 'var(--radius-lg, 8px)',
              padding: '2rem',
              textAlign: 'center',
              background: 'var(--panel-soft)',
              cursor: 'pointer',
              transition: 'border-color 0.2s, background-color 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              color: 'var(--text)'
            }}
            onClick={() => imageInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={imageInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              multiple
              onChange={handleImageFileChange}
            />
            <div style={{ fontSize: '2.5rem' }}>🖼️</div>
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0' }}>Upload New Images</h3>
              <p className="helper-text" style={{ margin: 0, color: 'var(--muted)' }}>
                Drag & drop or click to browse (multiple uploads supported)
              </p>
            </div>
          </div>

          {/* Uploading Queue */}
          {uploadingQueue.length > 0 && (
            <div className="kaggle-preview-card" style={{ padding: '1.25rem', border: '1px solid var(--panel-border)', background: 'var(--panel-soft)' }}>
              <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}>
                <span className="spinner" style={{ border: '2px solid #ccc', borderTop: '2px solid var(--accent)', borderRadius: '50%', width: '14px', height: '14px', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                Uploading {uploadingQueue.length} files...
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {uploadingQueue.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{item.name}</span>
                    {item.error ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--danger, #ef4444)' }}>{item.error}</span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Uploading...</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Search & Library Grid */}
          <div className="kaggle-preview-card" style={{ padding: '1.5rem', background: 'var(--panel)', border: '1px solid var(--panel-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text)' }}>Uploaded Images</h3>
              <input
                type="text"
                placeholder="Search images by name..."
                value={searchQuery}
                onChange={handleSearchChange}
                style={{
                  width: '300px',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-lg, 8px)',
                  border: '1px solid var(--panel-border)',
                  background: 'var(--bg)',
                  color: 'var(--text)'
                }}
              />
            </div>

            {dbImages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--muted)' }}>
                No images found in your Media Library.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {dbImages.map((item) => (
                  <div 
                    key={item.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1.5rem', 
                      padding: '1rem', 
                      background: 'var(--panel-soft)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: 'var(--radius-lg, 8px)'
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{ width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img src={item.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>

                    {/* Metadata & Url */}
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>
                        {item.name}
                      </p>
                      <input 
                        type="text" 
                        readOnly 
                        value={item.url} 
                        style={{ 
                          width: '100%', 
                          padding: '0.25rem 0.5rem', 
                          fontSize: '0.8rem', 
                          borderRadius: '4px', 
                          border: '1px solid var(--panel-border)',
                          background: 'var(--bg)',
                          fontFamily: 'monospace',
                          color: 'var(--text)'
                        }}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button 
                        className="secondary-button" 
                        onClick={() => copyToClipboard(item.id, item.url)}
                        style={{ minWidth: '100px', fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                      >
                        {copiedId === item.id ? 'Copied! ✓' : 'Copy Link'}
                      </button>
                      <button 
                        className="ghost-button" 
                        onClick={() => deleteImage(item.id)}
                        style={{ color: 'var(--danger, #ef4444)', fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isCsvModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card csv-import-modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Master catalog</p>
                <h3>Paste Raw CSV</h3>
              </div>
              <button type="button" className="ghost-button" onClick={() => setIsCsvModalOpen(false)}>
                Close
              </button>
            </div>
            <p className="helper-text">
              Pasted text should start with column headers on the first line.
            </p>
            <textarea
              rows={10}
              value={bulkCsvText}
              onChange={event => setBulkCsvText(event.target.value)}
              placeholder={'name,brand,image,price,discountPrice,quantity,category\nPhilips Respironics BIPAP,Philips,,66800,62000,1 Unit,BIPAP Devices'}
            />
            <div className="modal-footer-actions">
              <button type="button" className="ghost-button" onClick={() => setBulkCsvText('')}>
                Clear
              </button>
              <button className="secondary-button" disabled={!bulkCsvText.trim()} onClick={submitTextImport}>
                Generate Preview
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ProductBulkImportPage;
