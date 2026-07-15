import React from 'react';
import { formatDateTime } from '../utils/format';

export default function Timeline({ items }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-gray-400">No history yet.</p>;
  }

  return (
    <ol className="relative border-l-2 border-gray-200 ml-2">
      {items.map((item, idx) => (
        <li key={idx} className="mb-6 ml-5 last:mb-0">
          <span className="absolute -left-[9px] w-4 h-4 rounded-full bg-navy-900 border-4 border-white" />
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-navy-900">{item.title}</p>
            <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(item.date)}</span>
          </div>
          {item.description && <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>}
        </li>
      ))}
    </ol>
  );
}
