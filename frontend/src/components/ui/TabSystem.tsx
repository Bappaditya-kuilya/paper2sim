import React, { useState, useCallback } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  closable?: boolean;
}

export interface TabSystemProps {
  tabs: Tab[];
  activeTab?: string;
  onChange?: (tabId: string) => void;
  onClose?: (tabId: string) => void;
  onAdd?: () => void;
  persistKey?: string;
}

export function TabSystem({
  tabs,
  activeTab,
  onChange,
  onClose,
  onAdd,
  persistKey,
}: TabSystemProps) {
  const [internalActive, setInternalActive] = useState(() => {
    if (persistKey) {
      const saved = localStorage.getItem(`tab-${persistKey}`);
      if (saved && tabs.find((t) => t.id === saved)) return saved;
    }
    return activeTab || tabs[0]?.id || '';
  });

  const currentTab = activeTab ?? internalActive;

  const handleTabClick = useCallback(
    (tabId: string) => {
      setInternalActive(tabId);
      onChange?.(tabId);
      if (persistKey) {
        localStorage.setItem(`tab-${persistKey}`, tabId);
      }
    },
    [onChange, persistKey]
  );

  const handleClose = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      onClose?.(tabId);
    },
    [onClose]
  );

  return (
    <div className="flex items-center border-b border-zinc-800 bg-zinc-900">
      <div className="flex overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              currentTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            {tab.label}
            {tab.closable !== false && onClose && (
              <span
                onClick={(e) => handleClose(e, tab.id)}
                className="ml-1 text-zinc-500 hover:text-zinc-300"
              >
                ×
              </span>
            )}
          </button>
        ))}
      </div>
      {onAdd && (
        <button
          onClick={onAdd}
          className="px-3 py-2 text-zinc-400 hover:text-zinc-200"
        >
          +
        </button>
      )}
    </div>
  );
}

export interface PaperHeaderProps {
  title?: string;
  author?: string;
  abstract?: string;
  url?: string;
  onOpenUrl?: () => void;
}

export function PaperHeader({
  title = 'Untitled Paper',
  author = 'Unknown Author',
  abstract,
  url,
  onOpenUrl,
}: PaperHeaderProps) {
  return (
    <div className="border-b border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-zinc-100 truncate">{title}</h1>
          <p className="text-sm text-zinc-400 mt-1">{author}</p>
          {abstract && (
            <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{abstract}</p>
          )}
        </div>
        {url && (
          <button
            onClick={onOpenUrl}
            className="ml-4 px-3 py-1 text-xs text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/10"
          >
            View Paper
          </button>
        )}
      </div>
    </div>
  );
}
