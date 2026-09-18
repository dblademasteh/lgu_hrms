import React, { useState, useMemo } from 'react';

const TabContext = React.createContext(null);

/** Compound component API: <Tabs defaultValue={} onValueChange={}><TabList><Tab value="x">Label</Tab></TabList><TabPanel value="x">Content</TabPanel></Tabs> */
function Tabs({ defaultValue, onValueChange, children, className }) {
  const [value, setValue] = useState(defaultValue);
  const contextValue = useMemo(() => ({ value, onChange: v => { setValue(v); onValueChange?.(v); } }), [onValueChange]);

  return (
    <TabContext.Provider value={contextValue}>
      <div className={className}>{children}</div>
    </TabContext.Provider>
  );
}

function TabList({ children, 'aria-label': ariaLabel, className }) {
  const { value, onChange } = React.useContext(TabContext);
  return (
    <div className={`tabbar ${className || ''}`} role="tablist" aria-label={ariaLabel}>
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child;
        const childValue = child.props.value;
        return React.cloneElement(child, {
          'aria-selected': value === childValue,
          className: `tab ${value === childValue ? 'tab-active' : ''}`,
          onClick: () => onChange(childValue),
        });
      })}
    </div>
  );
}

function Tab({ children, value, className, disabled, ...props }) {
  return (
    <button
      type="button"
      role="tab"
      disabled={disabled}
      className={`tab ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
}

function TabPanel({ children, value, className, ...props }) {
  const { value: activeValue } = React.useContext(TabContext);
  const isActive = activeValue === value;
  return (
    <div
      role="tabpanel"
      hidden={!isActive}
      className={className}
      {...props}
    >
      {isActive ? children : null}
    </div>
  );
}

/** Legacy array-based API: <Tabs tabs={[{id, label, content}]} active={} onChange={} /> */
export function TabsLegacy({ tabs, label = 'Detail sections', active: controlledActive, onChange }) {
  const [internal, setInternal] = useState(null);
  const active = controlledActive ?? internal ?? tabs[0]?.id;
  const setActive = v => { setInternal(v); onChange?.(v); };
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

Tabs.TabList = TabList;
Tabs.Tab = Tab;
Tabs.TabPanel = TabPanel;
Tabs.Legacy = TabsLegacy;

export default Tabs;
export { TabList, Tab, TabPanel };