import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('lgu-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  useEffect(() => { try { localStorage.setItem('lgu-sidebar-collapsed', String(collapsed)); } catch {} }, [collapsed]);
  return (
    <div className="h-screen flex bg-bg">
      <Sidebar collapsed={collapsed} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleSidebar={() => setCollapsed(c => !c)} sidebarCollapsed={collapsed} />
        <main className="flex-1 overflow-auto p-6 flex items-start justify-center">
          <div className="w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
