import React from 'react';

export function Label({ children }) {
  return <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 select-none">{children}</label>;
}

export function ErrorText({ children }) {
  if (!children) return null;
  return <p className="text-xs text-red-500 mt-1">{children.message || children}</p>;
}

export const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 bg-white';

export function Input(props) {
  return <input {...props} className={`${inputClass} ${props.className || ''}`} />;
}

export function Select(props) {
  return <select {...props} className={`${inputClass} ${props.className || ''}`} />;
}

export function Textarea(props) {
  return <textarea {...props} className={`${inputClass} ${props.className || ''}`} />;
}
