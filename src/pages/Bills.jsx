import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Download, StickyNote, ReceiptText, Send } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { useConfirm } from '../components/ConfirmDialog';
import ShareDocumentModal from '../components/ShareDocumentModal';
import * as billsApi from '../api/bills';
import { formatCurrency, formatDate } from '../utils/format';

const TYPE_TABS = [
  { key: '', label: 'All Bills' },
  { key: 'Memo', label: 'Memos' },
  { key: 'GST', label: 'GST Bills' },
];

/** Every issued Memo/GST bill (standalone or from an order) with edit / download / delete. */
export default function Bills() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [billType, setBillType] = useState('');
  const [shareTarget, setShareTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    billsApi.listBills({ page, limit: 10, search, billType: billType || undefined })
      .then((res) => {
        setRows(res.data.data);
        setPagination(res.data.pagination);
      })
      .finally(() => setLoading(false));
  }, [page, search, billType]);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async (bill) => {
    const doc = await billsApi.fetchBillPdf(bill.id);
    const a = document.createElement('a');
    a.href = doc.blobUrl;
    a.download = `${bill.billNumber}.pdf`;
    a.click();
  };

  const handleDelete = async (bill) => {
    const ok = await confirm({
      title: `Delete bill ${bill.billNumber}?`,
      message: 'The bill record is removed permanently. Already-printed copies are unaffected.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await billsApi.deleteBill(bill.id);
      toast.success('Bill deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete bill');
    }
  };

  const columns = [
    {
      header: 'Bill No',
      accessorKey: 'billNumber',
      cell: ({ row }) => <span className="font-semibold text-navy-900">{row.original.billNumber}</span>,
    },
    {
      header: 'Type',
      accessorKey: 'billType',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          {row.original.billType === 'Memo' ? <StickyNote size={13} className="text-gray-400" /> : <ReceiptText size={13} className="text-gray-400" />}
          {row.original.billType === 'Memo' ? 'Memo' : 'GST Bill'}
        </span>
      ),
    },
    {
      header: 'Customer',
      id: 'customer',
      cell: ({ row }) => {
        const c = row.original.customer;
        if (!c) return <span className="text-gray-400">-</span>;
        return (
          <Link to={`/customers/${c.id}`} className="hover:underline">
            <span className="font-medium text-navy-900">{c.name}</span>
            <span className="text-gray-400 text-xs block">{c.mobile}</span>
          </Link>
        );
      },
    },
    { header: 'Total', id: 'total', cell: ({ row }) => <span className="font-semibold">{formatCurrency(row.original.total)}</span> },
    {
      header: 'Payment',
      id: 'payment',
      cell: ({ row }) => row.original.paymentInfo ? <StatusBadge status={row.original.paymentInfo.status} /> : '-',
    },
    { header: 'Date', id: 'date', cell: ({ row }) => formatDate(row.original.generatedAt) },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button className="text-gray-400 hover:text-navy-900 p-1" title="Download PDF" onClick={() => handleDownload(row.original)}>
            <Download size={15} />
          </button>
          <button className="text-gray-400 hover:text-navy-900 p-1" title="Share on WhatsApp" onClick={() => setShareTarget(row.original)}>
            <Send size={15} />
          </button>
          <button className="text-gray-400 hover:text-navy-900 p-1" title="Edit bill" onClick={() => navigate(`/bills/${row.original.id}/edit`)}>
            <Pencil size={15} />
          </button>
          <button className="text-gray-400 hover:text-red-600 p-1" title="Delete bill" onClick={() => handleDelete(row.original)}>
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1">Dashboard &gt; Bills</p>
          <h1 className="text-2xl font-bold text-navy-900">Bills</h1>
          <p className="text-sm text-gray-500 max-w-xl">Every Memo and GST bill issued — create directly for any customer, or from a confirmed order.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-initial justify-center" onClick={() => navigate('/bills/new?type=Memo')}><Plus size={15} /> New Memo</Button>
          <Button variant="accent" className="flex-1 sm:flex-initial justify-center" onClick={() => navigate('/bills/new?type=GST')}><Plus size={15} /> New GST Bill</Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:items-center">
        <div className="flex bg-gray-100 rounded-lg p-1 text-xs font-semibold w-fit">
          {TYPE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setBillType(t.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-md transition-colors ${billType === t.key ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy-300"
          placeholder="Search bill no, customer or mobile..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
        emptyMessage="No bills yet. Create a Memo or GST bill to get started."
      />
      {shareTarget && (
        <ShareDocumentModal bill={shareTarget} onClose={() => setShareTarget(null)} />
      )}
    </Layout>
  );
}
