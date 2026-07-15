import React from 'react';
import Logo from './Logo';

/** A4-proportioned white page shell shared by every document preview. */
export function DocPage({ children }) {
  return (
    <div className="bg-white shadow-lg mx-auto w-full max-w-[560px] text-[11px] leading-snug text-gray-800" style={{ aspectRatio: '595 / 842' }}>
      <div className="p-6 h-full overflow-y-auto">{children}</div>
    </div>
  );
}

export function DocHeader({ company, title, meta = [] }) {
  return (
    <div className="bg-navy-900 text-white -m-6 mb-4 p-5 flex items-start justify-between">
      <div className="flex items-center gap-3">
        <Logo size={34} />
        <div>
          <p className="font-bold text-sm leading-tight">{(company?.name || 'PANJU INTEXT').toUpperCase()}</p>
          <p className="text-[9px] text-navy-100 opacity-80 max-w-[220px]">{company?.address}</p>
          <p className="text-[9px] text-navy-100 opacity-80">Ph: {company?.phone || '-'}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lime-400 font-bold text-sm">{title}</p>
        {meta.map((line, idx) => (
          <p key={idx} className="text-[9px] text-navy-100 opacity-80">{line}</p>
        ))}
      </div>
    </div>
  );
}

export function DocTwoCol({ leftTitle, left = [], rightTitle, right = [] }) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-3">
      <div>
        <p className="text-[9px] font-bold text-gray-400 uppercase border-b border-gray-200 pb-1 mb-1">{leftTitle}</p>
        {left.filter(Boolean).map((l, i) => <p key={i} className="text-[10px]">{l}</p>)}
      </div>
      <div>
        <p className="text-[9px] font-bold text-gray-400 uppercase border-b border-gray-200 pb-1 mb-1">{rightTitle}</p>
        {right.filter(Boolean).map((l, i) => <p key={i} className="text-[10px]">{l}</p>)}
      </div>
    </div>
  );
}

export function DocTable({ columns, rows }) {
  return (
    <table className="w-full text-[9.5px] mb-3 border-collapse">
      <thead>
        <tr className="bg-navy-900 text-white">
          {columns.map((c, i) => (
            <th key={i} className={`px-1.5 py-1.5 font-semibold ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'}`}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={columns.length} className="text-center text-gray-300 py-4">Add items to see them here</td></tr>
        ) : rows.map((row, ri) => (
          <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            {row.map((cell, ci) => (
              <td key={ci} className={`px-1.5 py-1 border-b border-gray-100 ${columns[ci]?.align === 'right' ? 'text-right' : columns[ci]?.align === 'center' ? 'text-center' : 'text-left'}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DocTotalsBox({ lines = [], grandLabel, grandValue }) {
  return (
    <div className="ml-auto w-[62%] mb-3">
      {lines.map(([label, value], i) => (
        <div key={i} className="flex justify-between text-[10px] py-0.5">
          <span className="text-gray-500">{label}</span>
          <span>{value}</span>
        </div>
      ))}
      <div className="bg-navy-900 text-white flex justify-between px-2 py-1.5 mt-1 font-bold text-[11px]">
        <span>{grandLabel}</span>
        <span>{grandValue}</span>
      </div>
    </div>
  );
}

export function DocSignatures({ left, right }) {
  return (
    <div className="flex justify-between mt-6 pt-3">
      <div className="text-center w-32">
        <div className="border-t border-gray-300 pt-1 text-[9px] text-gray-400">{left}</div>
      </div>
      <div className="text-center w-32">
        <div className="border-t border-gray-300 pt-1 text-[9px] text-gray-400">{right}</div>
      </div>
    </div>
  );
}
