import React from 'react';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import Spinner from './Spinner';

export default function DataTable({ columns, data, pagination, onPageChange, emptyMessage = 'No records found', loading = false }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading && table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-12">
                  <Spinner label="Loading..." />
                </td>
              </tr>
            )}
            {!loading && table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-10 text-gray-400 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>
            Page {pagination.page} of {Math.max(pagination.totalPages, 1)} &middot; {pagination.total} results
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              Prev
            </button>
            <button
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
