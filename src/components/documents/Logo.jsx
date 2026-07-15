import React from 'react';

/** Small triangle brand mark used at the top of every generated document preview. */
export default function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M20 3 L37 34 L3 34 Z" fill="#0f1f4d" />
      <path d="M20 3 L37 34 L3 34 Z" stroke="#c4d600" strokeWidth="1.5" />
      <rect x="14" y="20" width="12" height="10" fill="#ffffff" />
      <rect x="17" y="23" width="2.4" height="7" fill="#0f1f4d" />
      <rect x="20.8" y="23" width="2.4" height="4" fill="#0f1f4d" />
      <path d="M12 21 L20 14 L28 21" stroke="#ffffff" strokeWidth="1.6" fill="none" />
    </svg>
  );
}
