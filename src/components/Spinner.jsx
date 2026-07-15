import React from 'react';

/** Brand-coloured loading spinner. size in px; label optional text underneath. */
export default function Spinner({ size = 28, label, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <span
        className="inline-block rounded-full border-[3px] border-gray-200 border-t-navy-900 animate-spin"
        style={{ width: size, height: size }}
      />
      {label && <span className="text-xs text-gray-400">{label}</span>}
    </div>
  );
}
