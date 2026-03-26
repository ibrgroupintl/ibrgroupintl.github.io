import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../utils/api';

function StatCard({ icon, value, label, sub, colorClass }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${colorClass}`}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function RecentTable({ title, items, columns, linkBase }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <Link to={linkBase} className="btn btn-ghost btn-sm">View all</Link>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key}>{c.label}</th>)}
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={columns.length + 2} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 24 }}>No items yet</td></tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                {columns.map((c) => (
                  <td key={c.key}>
                    {c.key === 'title'
                      ? <Link to={`${linkBase}?edit=${item.id}`} style={{ color: 'var(--color-primary-light)', fontWeight: 500 }}>{item[c.key]}</Link>
                      : <span style={{ color: 'var(--color-text-muted)' }}>{item[c.key]}</span>
                    }
                  </td>
                ))}
                <td>
                  <span className={`badge badge-${item.status}`}>{item.status}</span>
                </td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="loading-spinner"><div className="spinner" /> Loading…</div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      <div className="stats-grid">
        <StatCard
          icon="👥"
          colorClass="blue"
          value={stats?.subscribers?.active ?? 0}
          label="Active Subscribers"
          sub={`${stats?.subscribers?.total ?? 0} total`}
        />
        <StatCard
          icon="👔"
          colorClass="green"
          value={stats?.people_moves?.published ?? 0}
          label="Published People Moves"
          sub={`${stats?.people_moves?.total ?? 0} total`}
        />
        <StatCard
          icon="💡"
          colorClass="yellow"
          value={stats?.insights?.published ?? 0}
          label="Published Insights"
          sub={`${stats?.insights?.total ?? 0} total`}
        />
        <StatCard
          icon="📝"
          colorClass="purple"
          value={(stats?.people_moves?.total ?? 0) - (stats?.people_moves?.published ?? 0) +
                 (stats?.insights?.total ?? 0) - (stats?.insights?.published ?? 0)}
          label="Drafts"
          sub="Across all content"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <RecentTable
          title="Recent People Moves"
          items={stats?.recent_people_moves ?? []}
          linkBase="/people-moves"
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'person_name', label: 'Person' },
            { key: 'company_to', label: 'Company' },
          ]}
        />
        <RecentTable
          title="Recent Insights"
          items={stats?.recent_insights ?? []}
          linkBase="/insights"
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'category', label: 'Category' },
          ]}
        />
      </div>
    </Layout>
  );
}
