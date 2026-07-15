import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Eye, Pencil, FileText, ReceiptText, StickyNote, Trash2, Send, MoreVertical } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Tooltip from '../components/Tooltip';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import TrackingStatusModal from '../components/TrackingStatusModal';
import ShareDocumentModal from '../components/ShareDocumentModal';
import { useConfirm } from '../components/ConfirmDialog';
import * as quotationsApi from '../api/quotations';
import { formatCurrency } from '../utils/format';

const STATUSES = ['Draft', 'Sent', 'UnderNegotiation', 'Revised', 'Confirmed', 'Cancelled'];

/** Per-row ⋮ menu holding all quotation features — keeps the Action column tidy. */
function RowActionsMenu({ quotation: q, onPreview, onCustomize, onShare, onDelete }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = React.useRef(null);

  const memoBill = q.order?.bills?.find((b) => b.billType === 'Memo');
  const gstBill = q.order?.bills?.find((b) => b.billType === 'GST');

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      // fixed-position dropdown: never clipped by the table's scroll container
      setPos({ top: Math.min(r.bottom + 4, window.innerHeight - 260), left: r.right - 200 });
    }
    setOpen((o) => !o);
  };

  const Item = ({ icon: Icon, label, danger, onClick }) => (
    <button
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-gray-50 ${danger ? 'text-red-600' : 'text-gray-700'}`}
      onClick={() => { setOpen(false); onClick(); }}
    >
      <Icon size={14} className={danger ? 'text-red-400' : 'text-gray-400'} /> {label}
    </button>
  );

  return (
    <>
      <button ref={btnRef} onClick={toggle} className="p-1.5 rounded-md text-gray-400 hover:text-navy-900 hover:bg-gray-100" title="More actions">
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="fixed z-40 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1" style={{ top: pos.top, left: pos.left }}>
            {q.order && (
              <Item icon={StickyNote} label={memoBill ? 'View Memo' : 'Create Memo'} onClick={() => (memoBill ? onPreview(q, 'memo') : onCustomize(q, 'Memo'))} />
            )}
            {q.order && q.quotationType === 'GST' && (
              <Item icon={ReceiptText} label={gstBill ? 'View GST Bill' : 'Create GST Bill'} onClick={() => (gstBill ? onPreview(q, 'gst') : onCustomize(q, 'GST'))} />
            )}
            <Item icon={Send} label="Share on WhatsApp" onClick={onShare} />
            <Item icon={Eye} label="Open Details" onClick={() => navigate(`/quotations/${q.id}`)} />
            {q.status !== 'Confirmed' && q.status !== 'Cancelled' && (
              <Item icon={Pencil} label="Edit Quotation" onClick={() => navigate(`/quotations/${q.id}/edit`)} />
            )}
            {q.status !== 'Confirmed' && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <Item icon={Trash2} label="Delete" danger onClick={onDelete} />
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function Quotations() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [payFilter, setPayFilter] = useState('');
  const [billFilter, setBillFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [trackingTarget, setTrackingTarget] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [previewQuotation, setPreviewQuotation] = useState(null);
  const [previewTab, setPreviewTab] = useState('quotation');

  const filterParams = useCallback(() => ({
    search: search || undefined,
    status: status || undefined,
    type: typeFilter || undefined,
    paymentStatus: payFilter || undefined,
    hasBill: billFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [search, status, typeFilter, payFilter, billFilter, dateFrom, dateTo]);

  const load = useCallback(() => {
    setLoading(true);
    quotationsApi.listQuotations({ page, limit: 10, ...filterParams() })
      .then((res) => {
        setRows(res.data.data);
        setPagination(res.data.pagination);
      })
      .finally(() => setLoading(false));
    quotationsApi.getQuotationStats().then((res) => setStats(res.data.data));
  }, [page, filterParams]);

  useEffect(() => { load(); }, [load]);

  const clearFilters = () => {
    setSearch(''); setStatus(''); setTypeFilter(''); setPayFilter(''); setBillFilter(''); setDateFrom(''); setDateTo(''); setPage(1);
  };
  const hasFilters = search || status || typeFilter || payFilter || billFilter || dateFrom || dateTo;

  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const [exporting, setExporting] = useState(false);

  // Downloads exactly what the current filters show on screen
  const handleExport = async (format) => {
    setExportMenuOpen(false);
    setExporting(true);
    try {
      const res = await quotationsApi.exportQuotations(format, filterParams());
      const ext = format === 'csv' ? 'csv' : format === 'pdf' ? 'pdf' : 'xlsx';
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quotations.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };


  const handleDelete = async (quotation) => {
    const ok = await confirm({
      title: `Delete ${quotation.quotationNumber}?`,
      message: `This permanently removes the quotation for ${quotation.customer?.name || 'this customer'} along with its revision history. This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await quotationsApi.deleteQuotation(quotation.id);
      toast.success('Quotation deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete quotation');
    }
  };

  const openPreview = (quotation, tab) => {
    setPreviewQuotation(quotation);
    setPreviewTab(tab);
  };

  const openCustomize = (quotation, billType) => {
    if (!quotation.order) {
      toast.error('Confirm the order before generating a bill');
      return;
    }
    navigate(`/bills/new?type=${billType}&orderId=${quotation.order.id}`);
  };

  const columns = [
    {
      header: 'Quote No',
      accessorKey: 'quotationNumber',
      cell: ({ row }) => (
        <Link to={`/quotations/${row.original.id}`} className="font-semibold text-navy-900 hover:underline">
          {row.original.quotationNumber}
        </Link>
      ),
    },
    { header: 'Customer Name', accessorKey: 'customer', cell: ({ row }) => row.original.customer?.name },
    { header: 'Mobile', accessorKey: 'mobile', cell: ({ row }) => row.original.customer?.mobile },
    { header: 'Initial Price', accessorKey: 'initialPrice', cell: ({ row }) => formatCurrency(row.original.initialPrice) },
    { header: 'Final Price', accessorKey: 'total', cell: ({ row }) => <span className="font-semibold">{formatCurrency(row.original.total)}</span> },
    {
      header: 'Tracking Customer',
      id: 'tracking',
      cell: ({ row }) => {
        const q = row.original;
        if (!q.order) {
          return (
            <Tooltip content={q.remarks ? `Internal notes:\n${q.remarks}` : null}>
              <button
                className="flex items-center gap-1.5 group"
                onClick={() => setTrackingTarget(q)}
                title="Update tracking status (pre-confirmation)"
              >
                <StatusBadge status={q.status} />
                <Pencil size={12} className="text-gray-300 group-hover:text-gray-500" />
              </button>
            </Tooltip>
          );
        }
        return (
          <Tooltip content={q.remarks ? `Internal notes:\n${q.remarks}` : null}>
            <button
              className="flex items-center gap-1.5 group"
              onClick={() => setTrackingTarget(q)}
              title="Update tracking status"
            >
              <StatusBadge status={q.order.currentStatus} />
              <Pencil size={12} className="text-gray-300 group-hover:text-gray-500" />
            </button>
          </Tooltip>
        );
      },
    },
    {
      header: 'Advance Pay',
      id: 'advancePay',
      cell: ({ row }) => row.original.paymentInfo ? formatCurrency(row.original.paymentInfo.paid) : '-',
    },
    {
      header: 'Pending',
      id: 'pending',
      cell: ({ row }) => {
        const info = row.original.paymentInfo;
        if (!info) return '-';
        return (
          <span className={info.pending > 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
            {formatCurrency(info.pending)}
          </span>
        );
      },
    },
    {
      header: 'Payment Status',
      id: 'paymentStatus',
      cell: ({ row }) => row.original.paymentInfo ? <StatusBadge status={row.original.paymentInfo.status} /> : <StatusBadge status={row.original.status} />,
    },
    {
      header: 'Action',
      id: 'actions',
      cell: ({ row }) => {
        const q = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <button
              className="text-xs px-2 py-1 rounded-md bg-lime-100 text-navy-900 font-semibold hover:bg-lime-200 flex items-center gap-1"
              onClick={() => openPreview(q, 'quotation')}
              title="View / print quotation"
            >
              <FileText size={12} /> Quote
            </button>
            <RowActionsMenu
              quotation={q}
              onPreview={openPreview}
              onCustomize={openCustomize}
              onShare={() => setShareTarget(q)}
              onDelete={() => handleDelete(q)}
            />
          </div>
        );
      },
    },
  ];

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1">Dashboard &gt; Quotations</p>
          <h1 className="text-2xl font-bold text-navy-900">Quotation Management</h1>
          <p className="text-sm text-gray-500">Manage, track, and version-control project estimates from a single hub.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Button variant="outline" onClick={() => setExportMenuOpen((o) => !o)} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => handleExport('excel')}>Excel (.xlsx)</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => handleExport('csv')}>CSV</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => handleExport('pdf')}>PDF</button>
                </div>
              </>
            )}
          </div>
          <Button variant="accent" onClick={() => navigate('/quotations/new')}><Plus size={15} /> Create Quotation</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Quotations" value={stats?.totalQuotations ?? '-'} />
        <StatCard label="Approved" value={stats ? `${stats.approvedCount}` : '-'} trend={stats ? `${stats.approvedRate}% Rate` : undefined} />
        <StatCard label="Total Value" value={stats ? formatCurrency(stats.totalValue) : '-'} />
        <StatCard label="Memo Generated" value={stats?.memoGeneratedCount ?? '-'} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          className="w-full max-w-xs border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy-300"
          placeholder="Search quotation no, customer or mobile..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Types</option>
          <option value="GST">GST</option>
          <option value="NonGST">Non-GST</option>
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
          value={payFilter}
          onChange={(e) => { setPayFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Payments</option>
          <option value="Pending">Pending</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Fully Paid">Fully Paid</option>
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
          value={billFilter}
          onChange={(e) => { setBillFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Documents</option>
          <option value="Memo">Has Memo</option>
          <option value="GST">Has GST Bill</option>
          <option value="None">No Bills Yet</option>
        </select>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <span className="text-xs">From</span>
          <input
            type="date"
            className="border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          />
          <span className="text-xs">To</span>
          <input
            type="date"
            className="border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          />
        </div>
        {hasFilters && (
          <button className="text-xs text-red-500 hover:underline" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        pagination={pagination}
        onPageChange={setPage}
        loading={loading}
        emptyMessage={hasFilters ? 'No quotations match the current filters.' : 'No quotations yet. Create your first quotation to get started.'}
      />

      {shareTarget && (
        <ShareDocumentModal quotation={shareTarget} onClose={() => setShareTarget(null)} />
      )}

      {trackingTarget && (
        <TrackingStatusModal
          quotation={trackingTarget}
          onClose={() => setTrackingTarget(null)}
          onSaved={() => { setTrackingTarget(null); load(); }}
        />
      )}

      {previewQuotation && (
        <DocumentPreviewModal
          quotation={previewQuotation}
          initialTab={previewTab}
          onClose={() => setPreviewQuotation(null)}
          onRequestCustomize={(billType) => { setPreviewQuotation(null); openCustomize(previewQuotation, billType); }}
        />
      )}

    </Layout>
  );
}
