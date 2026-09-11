import { useEffect, useState } from 'react';

const KEY = 'lgu-sidebar-style';
export const SIDEBAR_STYLES = ['classic', 'dock', 'rail', 'accordion'];

export const SIDEBAR_STYLE_META = {
  classic: { label: 'Classic list', desc: 'Grouped nav list' },
  dock: { label: 'Icon dock', desc: 'Compact rail + panel' },
  rail: { label: 'Slim rail', desc: 'Icons only, click to jump' },
  accordion: { label: 'Accordion', desc: 'Search + collapsible groups' },
};

export function getSidebarStyle() {
  try {
    const v = localStorage.getItem(KEY);
    if (SIDEBAR_STYLES.includes(v)) return v;
  } catch { /* ignore */ }
  return 'classic';
}

export function setSidebarStyle(style) {
  if (!SIDEBAR_STYLES.includes(style)) return;
  try { localStorage.setItem(KEY, style); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('lgu:sidebar-style', { detail: style }));
}

/** React hook mirroring the sidebar-style preference. */
export function useSidebarStyle() {
  const [style, setStyle] = useState(getSidebarStyle);
  useEffect(() => {
    const onChange = (e) => setStyle(e.detail || getSidebarStyle());
    const onStorage = (e) => { if (!e.key || e.key === KEY) setStyle(getSidebarStyle()); };
    window.addEventListener('lgu:sidebar-style', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('lgu:sidebar-style', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return style;
}
