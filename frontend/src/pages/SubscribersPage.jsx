import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import { api } from '../utils/api';

const EMPTY_FORM = { email: '', name: '', status: 'active', subscription_source: 'manual', expires_at: '' };

function SubscriberForm({ initial, onSave, onCancel }) {
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

  const isEdit = !!initial?.id;

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger"><span>⚠️</span> {error}</div>}

      <div className="form-group">
        <label className="form-label">Email address <span className="required">*</span></label>
        <input
          type="email"
          className="form-control"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          required
          disabled={isEdit}
          placeholder="subscriber@example.com"
        />
        {isEdit && <p className="form-hint">Email cannot be changed.</p>}
      </div>

      <div className="form-group">
        <label className="form-label">Full name</label>
        <input className="form-control" value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Jane Smith" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {!isEdit && (
          <div className="form-group">
            <label className="form-label">Source</label>
            <select className="form-control" value={form.subscription_source} onChange={(e) => set('subscription_source', e.target.value)}>
              <option value="manual">Manual</option>
              <option value="substack">Substack</option>
              <option value="import">Import</option>
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Expiry date</label>
          <input type="date" className="form-control" value={form.expires_at || ''} onChange={(e) => set('expires_at', e.target.value)} />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving…' : isEdit ? 'Update Subscriber' : 'Add Subscriber'}
        </button>
      </div>
    </form>
  );
}

export default function SubscribersPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const limit = 20;

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit };
    if (statusFilter) params.status = statusFilter;
    api.getSubscribers(params)
      .then((data) => { setItems(data.items); setTotal(data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    if (editItem) {
      await api.updateSubscriber(editItem.id, { name: form.name, status: form.status, expires_at: form.expires_at || null });
      showAlert('success', 'Subscriber updated.');
    } else {
      await api.createSubscriber(form);
      showAlert('success', 'Subscriber added.');
    }
    setModalOpen(false);
    setEditItem(null);
    load();
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await api.deleteSubscriber(deleteItem.id);
      setDeleteItem(null);
      showAlert('success', 'Subscriber removed.');
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
      title="Subscribers"
      actions={<button className="btn btn-primary" onClick={openCreate}>+ Add Subscriber</button>}
    >
      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.type === 'success' ? '✅' : '⚠️'} {alert.message}
        </div>
      )}

      <div className="filters-bar">
        <select className="form-control" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ width: 'auto' }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--color-text-muted)' }}>
          {total} subscriber{total !== 1 ? 's' : ''} total
        </span>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /> Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No subscribers yet</h3>
            <p>Add subscribers manually or connect via Substack webhook.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Subscribed</th>
                    <th>Expires</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.email}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{item.name || '—'}</td>
                      <td><StatusBadge status={item.status} /></td>
                      <td>
                        <span className={`badge badge-${item.subscription_source}`}>
                          {item.subscription_source}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                        {new Date(item.subscribed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                        {item.expires_at
                          ? new Date(item.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>Edit</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => setDeleteItem(item)}>Remove</button>
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editItem ? 'Edit Subscriber' : 'Add Subscriber'}</h3>
              <button className="btn-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <SubscriberForm
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
          title="Remove Subscriber"
          message={`Are you sure you want to remove "${deleteItem.email}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
          loading={deleteLoading}
        />
      )}
    </Layout>
  );
}
