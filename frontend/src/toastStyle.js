import { useEffect, useState } from 'react';

const KEY = 'lgu-toast-style';
export const TOAST_STYLES = ['ledger', 'pill', 'banner', 'minimal'];

export const TOAST_STYLE_META = {
  ledger: { label: 'Ledger card', desc: 'Left accent bar · default' },
  pill: { label: 'Pill', desc: 'Floating rounded-full chip' },
  banner: { label: 'Top banner', desc: 'Full-width bar under appbar' },
  minimal: { label: 'Minimal', desc: 'Text + underline, no card' },
};

export function getToastStyle() {
  try {
    const v = localStorage.getItem(KEY);
    if (TOAST_STYLES.includes(v)) return v;
  } catch { /* ignore */ }
  return 'ledger';
}

export function setToastStyle(style) {
  if (!TOAST_STYLES.includes(style)) return;
  try { localStorage.setItem(KEY, style); } catch { /* ignore */ }
  document.documentElement.dataset.toastStyle = style;
  window.dispatchEvent(new CustomEvent('lgu:toast-style', { detail: style }));
}

export function applyToastStyle() {
  document.documentElement.dataset.toastStyle = getToastStyle();
}

/** React hook mirroring the toast-style preference. */
export function useToastStyle() {
  const [style, setStyle] = useState(getToastStyle);
  useEffect(() => {
    const onChange = (e) => setStyle(e.detail || getToastStyle());
    const onStorage = (e) => { if (!e.key || e.key === KEY) setStyle(getToastStyle()); };
    window.addEventListener('lgu:toast-style', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('lgu:toast-style', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return style;
}
