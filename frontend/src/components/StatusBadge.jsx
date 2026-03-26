export default function StatusBadge({ status }) {
  const cls = {
    published: 'badge badge-published',
    draft: 'badge badge-draft',
    active: 'badge badge-active',
    inactive: 'badge badge-inactive',
    substack: 'badge badge-substack',
    manual: 'badge badge-draft',
  }[status] || 'badge badge-draft';

  return <span className={cls}>{status}</span>;
}
