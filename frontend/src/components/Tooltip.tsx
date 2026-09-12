import { useState } from 'react';

interface TooltipProps { content: string; children: React.ReactNode; }

export function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  return (<div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
    {children}
    {show && <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap">{content}</div>}
  </div>);
}