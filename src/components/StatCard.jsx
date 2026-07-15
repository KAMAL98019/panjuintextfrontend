import React from 'react';

export default function StatCard({ label, value, icon, trend, trendPositive = true }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-navy-900">{value}</span>
        {trend && (
          <span className={`text-xs font-semibold mb-1 ${trendPositive ? 'text-lime-700' : 'text-red-500'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
