import React from 'react';

const STYLES = {
  Draft: 'bg-gray-100 text-gray-600',
  Sent: 'bg-blue-100 text-blue-700',
  UnderNegotiation: 'bg-amber-100 text-amber-700',
  Revised: 'bg-amber-100 text-amber-700',
  Confirmed: 'bg-lime-100 text-lime-800',
  Cancelled: 'bg-red-100 text-red-700',

  QuotationCreated: 'bg-gray-100 text-gray-600',
  Negotiation: 'bg-amber-100 text-amber-700',
  AdvancePaid: 'bg-blue-100 text-blue-700',
  MaterialOrdered: 'bg-indigo-100 text-indigo-700',
  WorkStarted: 'bg-purple-100 text-purple-700',
  Installation: 'bg-purple-100 text-purple-700',
  Completed: 'bg-lime-100 text-lime-800',
  FullyPaid: 'bg-green-100 text-green-700',

  Pending: 'bg-red-100 text-red-700',
  'Partially Paid': 'bg-amber-100 text-amber-700',
  'Fully Paid': 'bg-green-100 text-green-700',

  Active: 'bg-lime-100 text-lime-800',
  Inactive: 'bg-gray-100 text-gray-500',
};

function splitLabel(status) {
  return String(status).replace(/([a-z])([A-Z])/g, '$1 $2');
}

export default function StatusBadge({ status }) {
  const style = STYLES[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${style}`}>
      {splitLabel(status)}
    </span>
  );
}
