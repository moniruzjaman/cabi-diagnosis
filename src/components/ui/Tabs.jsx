import React, { useEffect, useRef, useState } from 'react';

export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
  ...rest
}) {
  const tabsRef = useRef([]);
  const [indicatorStyle, setIndicatorStyle] = useState({});

  useEffect(() => {
    const activeIndex = tabs.findIndex((t) => t.id === activeTab);
    if (activeIndex >= 0 && tabsRef.current[activeIndex]) {
      const el = tabsRef.current[activeIndex];
      setIndicatorStyle({
        width: el.offsetWidth,
        transform: `translateX(${el.offsetLeft - 4}px)`,
      });
    }
  }, [activeTab, tabs]);

  return (
    <div
      className={`ud-tabs ${className}`.trim()}
      role="tablist"
      {...rest}
    >
      <div
        className="ud-tabs__indicator"
        style={indicatorStyle}
        aria-hidden="true"
      />
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => { tabsRef.current[index] = el; }}
            role="tab"
            aria-selected={isActive}
            className={`ud-tabs__item${isActive ? ' ud-tabs__item--active' : ''}`}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
