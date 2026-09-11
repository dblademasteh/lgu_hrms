import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { useAuthStore } from '../stores/authStore.js';

function TenantBanner() {
  const user = useAuthStore(s => s.user);
  const tenantId = user?.tenantId;
  if (!tenantId) return null;
  return (
    <div className="px-4 md:px-6 py-1.5 bg-accent/10 border-b border-accent/20 text-[11px] font-mono text-accent truncate" title={`Tenant scope: ${tenantId}`}>
      TENANT · {tenantId}
    </div>
  );
}

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
        <TenantBanner />
        <main className="flex-1 overflow-auto p-6 flex items-start justify-center">
          <div className="w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
