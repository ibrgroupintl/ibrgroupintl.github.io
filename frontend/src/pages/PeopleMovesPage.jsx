import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import { api } from '../utils/api';

const EMPTY_FORM = {
  title: '', summary: '', content: '', person_name: '', person_title: '',
  company_from: '', company_to: '', sector: '', region: '', image_url: '', status: 'draft',
};

const SECTORS = ['Technology', 'Financial Services', 'Healthcare', 'Energy', 'Consumer', 'Industrial', 'Real Estate', 'Other'];
const REGIONS = ['EMEA', 'Americas', 'Asia Pacific', 'Global'];

function PeopleMoveForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
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
        <input className="form-control" value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="e.g. Jane Smith Joins Acme Corp as CFO" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Person Name <span className="required">*</span></label>
          <input className="form-control" value={form.person_name} onChange={(e) => set('person_name', e.target.value)} required placeholder="Jane Smith" />
        </div>
        <div className="form-group">
          <label className="form-label">New Title / Role</label>
          <input className="form-control" value={form.person_title} onChange={(e) => set('person_title', e.target.value)} placeholder="Chief Financial Officer" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Joining Company <span className="required">*</span></label>
          <input className="form-control" value={form.company_to} onChange={(e) => set('company_to', e.target.value)} required placeholder="Acme Corp" />
        </div>
        <div className="form-group">
          <label className="form-label">Previous Company</label>
          <input className="form-control" value={form.company_from} onChange={(e) => set('company_from', e.target.value)} placeholder="Previous Employer Ltd" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Sector</label>
          <select className="form-control" value={form.sector} onChange={(e) => set('sector', e.target.value)}>
            <option value="">— Select sector —</option>
            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Region</label>
          <select className="form-control" value={form.region} onChange={(e) => set('region', e.target.value)}>
            <option value="">— Select region —</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Summary</label>
        <textarea className="form-control" rows={2} value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Brief summary for listings and previews" />
      </div>

      <div className="form-group">
        <label className="form-label">Full Content <span className="required">*</span></label>
        <textarea className="form-control" rows={6} value={form.content} onChange={(e) => set('content', e.target.value)} required placeholder="Full article content…" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Image URL</label>
          <input className="form-control" value={form.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://…" type="url" />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving…' : 'Save People Move'}
        </button>
      </div>
    </form>
  );
}

export default function PeopleMovesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
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
    if (sectorFilter) params.sector = sectorFilter;
    api.getPeopleMoves(params)
      .then((data) => { setItems(data.items); setTotal(data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, statusFilter, sectorFilter]);

  useEffect(() => { load(); }, [load]);

  // Handle ?edit=id in URL (from dashboard links)
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      api.getPeopleMove(editId).then((item) => {
        setEditItem(item);
        setModalOpen(true);
        setSearchParams({});
      }).catch(console.error);
    }
  }, [searchParams, setSearchParams]);

  async function handleSave(form) {
    if (editItem) {
      await api.updatePeopleMove(editItem.id, form);
      showAlert('success', 'People move updated successfully.');
    } else {
      await api.createPeopleMove(form);
      showAlert('success', 'People move created successfully.');
    }
    setModalOpen(false);
    setEditItem(null);
    load();
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await api.deletePeopleMove(deleteItem.id);
      setDeleteItem(null);
      showAlert('success', 'People move deleted.');
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
      title="People Moves"
      actions={<button className="btn btn-primary" onClick={openCreate}>+ New People Move</button>}
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
        <select className="form-control" value={sectorFilter} onChange={(e) => { setSectorFilter(e.target.value); setPage(1); }} style={{ width: 'auto' }}>
          <option value="">All Sectors</option>
          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /> Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👔</div>
            <h3>No people moves yet</h3>
            <p>Click &ldquo;New People Move&rdquo; to add your first entry.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Title / Role</th>
                    <th>Joining Company</th>
                    <th>Sector</th>
                    <th>Region</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.person_name}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{item.person_title || '—'}</td>
                      <td>{item.company_to}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{item.sector || '—'}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{item.region || '—'}</td>
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
                  ))}
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
              <h3 className="modal-title">{editItem ? 'Edit People Move' : 'New People Move'}</h3>
              <button className="btn-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <PeopleMoveForm
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
          title="Delete People Move"
          message={`Are you sure you want to delete "${deleteItem.person_name} → ${deleteItem.company_to}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
          loading={deleteLoading}
        />
      )}
    </Layout>
  );
}
