import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊', section: 'Overview' },
  { to: '/people-moves', label: 'People Moves', icon: '👔', section: 'Content' },
  { to: '/insights', label: 'Insights', icon: '💡', section: 'Content' },
  { to: '/subscribers', label: 'Subscribers', icon: '👥', section: 'Audience' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const sections = [...new Set(NAV_ITEMS.map((n) => n.section))];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>IBR Premium</h1>
        <p>Content Management</p>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section}>
            <div className="nav-section-label">{section}</div>
            {NAV_ITEMS.filter((n) => n.section === section).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {user && (
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Sign out</button>
        </div>
      )}
    </aside>
  );
}
