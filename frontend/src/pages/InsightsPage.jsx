import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import TagsInput from '../components/TagsInput';
import { api } from '../utils/api';

const EMPTY_FORM = {
  title: '', summary: '', content: '', category: '', tags: [], image_url: '', status: 'draft',
};

const CATEGORIES = [
  'Market Trends', 'Leadership', 'Talent Strategy', 'Diversity & Inclusion',
  'Executive Search', 'Compensation', 'Industry Analysis', 'Research', 'Other',
];

function InsightForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ...initial,
    tags: Array.isArray(initial.tags) ? initial.tags : [],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger"><span>⚠️</span> {error}</div>}

      <div className="form-group">
        <label className="form-label">Title <span className="required">*</span></label>
        <input className="form-control" value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="e.g. Executive Talent Trends Q1 2025" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-control" value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">— Select category —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Tags</label>
        <TagsInput value={form.tags} onChange={(tags) => set('tags', tags)} />
        <p className="form-hint">Press Enter or comma to add a tag</p>
      </div>

      <div className="form-group">
        <label className="form-label">Summary</label>
        <textarea className="form-control" rows={2} value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Brief summary for listings and previews" />
      </div>

      <div className="form-group">
        <label className="form-label">Full Content <span className="required">*</span></label>
        <textarea className="form-control" rows={8} value={form.content} onChange={(e) => set('content', e.target.value)} required placeholder="Full article content…" />
      </div>

      <div className="form-group">
        <label className="form-label">Image URL</label>
        <input className="form-control" value={form.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://…" type="url" />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving…' : 'Save Insight'}
        </button>
      </div>
    </form>
  );
}

export default function InsightsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const limit = 15;

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit };
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    api.getInsights(params)
      .then((data) => { setItems(data.items); setTotal(data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, statusFilter, categoryFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      api.getInsight(editId).then((item) => {
        setEditItem(item);
        setModalOpen(true);
        setSearchParams({});
      }).catch(console.error);
    }
  }, [searchParams, setSearchParams]);

  async function handleSave(form) {
    if (editItem) {
      await api.updateInsight(editItem.id, form);
      showAlert('success', 'Insight updated successfully.');
    } else {
      await api.createInsight(form);
      showAlert('success', 'Insight created successfully.');
    }
    setModalOpen(false);
    setEditItem(null);
    load();
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await api.deleteInsight(deleteItem.id);
      setDeleteItem(null);
      showAlert('success', 'Insight deleted.');
      load();
    } catch (err) {
      showAlert('danger', err.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  function showAlert(type, message) {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  }

  function openCreate() { setEditItem(null); setModalOpen(true); }
  function openEdit(item) { setEditItem(item); setModalOpen(true); }

  const totalPages = Math.ceil(total / limit);

  return (
    <Layout
      title="Insights"
      actions={<button className="btn btn-primary" onClick={openCreate}>+ New Insight</button>}
    >
      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.type === 'success' ? '✅' : '⚠️'} {alert.message}
        </div>
      )}

      <div className="filters-bar">
        <select className="form-control" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ width: 'auto' }}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <select className="form-control" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} style={{ width: 'auto' }}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /> Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💡</div>
            <h3>No insights yet</h3>
            <p>Click &ldquo;New Insight&rdquo; to add your first insight.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Tags</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    let tags = [];
                    try { tags = JSON.parse(item.tags || '[]'); } catch { tags = []; }
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500, maxWidth: 280 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                          {item.summary && <div className="content-preview" style={{ fontSize: 12 }}>{item.summary}</div>}
                        </td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{item.category || '—'}</td>
                        <td>
                          {tags.length > 0 ? (
                            <div className="tag-list">
                              {tags.slice(0, 3).map((t) => <span key={t} className="tag-pill">{t}</span>)}
                              {tags.length > 3 && <span className="tag-pill">+{tags.length - 3}</span>}
                            </div>
                          ) : '—'}
                        </td>
                        <td><StatusBadge status={item.status} /></td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                          {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>Edit</button>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => setDeleteItem(item)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="pagination">
                <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
                <div className="pagination-controls">
                  <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <span style={{ padding: '0 8px', fontSize: 13 }}>{page} / {totalPages}</span>
                  <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editItem ? 'Edit Insight' : 'New Insight'}</h3>
              <button className="btn-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <InsightForm
                initial={editItem || {}}
                onSave={handleSave}
                onCancel={() => setModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {deleteItem && (
        <ConfirmModal
          title="Delete Insight"
          message={`Are you sure you want to delete "${deleteItem.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
          loading={deleteLoading}
        />
      )}
    </Layout>
  );
}
