import React, { useState } from 'react';

/** Accessible tab strip; pass [{ id, label, content }] */
export default function Tabs({ tabs, label = 'Detail sections' }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div>
      <div className="tabbar" role="tablist" aria-label={label}>
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            className={`tab ${active === t.id ? 'tab-active' : ''}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map(t => (
        <div key={t.id} role="tabpanel" hidden={active !== t.id}>{t.content}</div>
      ))}
    </div>
  );
}