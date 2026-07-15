import React from 'react';

/** Pure-CSS hover tooltip. Renders children unwrapped when there's no content to show. */
export default function Tooltip({ content, children }) {
  if (!content) return children;

  return (
    <div className="relative inline-flex group/tooltip">
      {children}
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-30">
        <div className="bg-navy-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-pre-wrap text-left">
          {content}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-navy-900 rotate-45 -mt-1" />
      </div>
    </div>
  );
}
