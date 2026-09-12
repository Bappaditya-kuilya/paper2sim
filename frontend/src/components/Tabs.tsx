import { useState } from 'react';
interface Tab { label: string; content: React.ReactNode; }
interface TabsProps { tabs: Tab[]; defaultIndex?: number; }
export function Tabs({ tabs, defaultIndex = 0 }: TabsProps) {
  const [active, setActive] = useState(defaultIndex);
  return (
    <div>
      <div className="flex border-b border-gray-700">
        {tabs.map((tab, i) => (
          <button key={tab.label} onClick={() => setActive(i)} className={`px-4 py-2 text-sm font-medium ${i === active ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>{tab.label}</button>
        ))}
      </div>
      <div className="py-4">{tabs[active].content}</div>
    </div>
  );
}
