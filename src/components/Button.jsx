import React from 'react';

const VARIANTS = {
  primary: 'bg-navy-900 hover:bg-navy-800 text-white',
  accent: 'bg-lime-400 hover:bg-lime-500 text-navy-900',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100',
  ghost: 'text-gray-500 hover:bg-gray-100',
};

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
