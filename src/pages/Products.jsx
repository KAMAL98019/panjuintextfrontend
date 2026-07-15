import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useConfirm } from '../components/ConfirmDialog';
import ProductForm from './products/ProductForm';
import * as productsApi from '../api/products';
import { formatCurrency } from '../utils/format';

export default function Products() {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    productsApi.listProducts({ page, limit: 10, search })
      .then((res) => {
        setRows(res.data.data);
        setPagination(res.data.pagination);
      })
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (product) => {
    const ok = await confirm({
      title: `Delete ${product.name}?`,
      message: 'This removes the product from the master list. Existing quotations that used it are not affected.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await productsApi.deleteProduct(product.id);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const columns = [
    { header: 'Name', accessorKey: 'name', cell: ({ row }) => <span className="font-semibold text-navy-900">{row.original.name}</span> },
    { header: 'Category', accessorKey: 'category' },
    { header: 'Unit', accessorKey: 'unit' },
    { header: 'HSN', accessorKey: 'hsnCode', cell: ({ row }) => row.original.hsnCode || '-' },
    { header: 'GST %', accessorKey: 'gstPercent', cell: ({ row }) => `${row.original.gstPercent}%` },
    { header: 'Rate', accessorKey: 'defaultRate', cell: ({ row }) => formatCurrency(row.original.defaultRate) },
    { header: 'Status', accessorKey: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50"
            onClick={() => { setEditing(row.original); setModalOpen(true); }}
          >
            Edit
          </button>
          <button
            className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
            onClick={() => handleDelete(row.original)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1">Dashboard &gt; Products</p>
          <h1 className="text-2xl font-bold text-navy-900">Product Management</h1>
          <p className="text-sm text-gray-500">Manage all products, pricing, GST and categories used in quotations.</p>
        </div>
        <Button variant="accent" onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={15} /> Add New Product</Button>
      </div>

      <div className="mb-4">
        <input
          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy-300"
          placeholder="Search name or HSN code..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        pagination={pagination}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No products yet. Add your first product to get started."
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Product' : 'Add New Product'}>
        <ProductForm initialValues={editing} onSuccess={() => { setModalOpen(false); load(); }} />
      </Modal>
    </Layout>
  );
}
