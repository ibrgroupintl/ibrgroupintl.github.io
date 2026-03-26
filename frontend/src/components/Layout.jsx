import Sidebar from './Sidebar';

export default function Layout({ title, actions, children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <h2 className="topbar-title">{title}</h2>
          {actions && <div className="topbar-actions">{actions}</div>}
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
