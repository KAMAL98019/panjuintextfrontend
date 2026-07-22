import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, User, Building, Send } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { useConfirm } from '../components/ConfirmDialog';
import { Label, Select, Textarea } from '../components/form/Field';
import CustomerForm from './customers/CustomerForm';
import * as customersApi from '../api/customers';
import * as whatsappApi from '../api/whatsapp';

export default function Customers() {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Row selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    customersApi.listCustomers({ page, limit: 10, search })
      .then((res) => {
        setRows(res.data.data);
        setPagination(res.data.pagination);
      })
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (broadcastModalOpen) {
      whatsappApi.listTemplates('Greetings')
        .then((res) => setTemplates(res.data.data))
        .catch(() => {});
    }
  }, [broadcastModalOpen]);

  const handleDelete = async (customer) => {
    const ok = await confirm({
      title: `Delete ${customer.name}?`,
      message: 'This removes the customer record permanently. Existing quotations and bills for this customer are NOT deleted but will lose their profile link.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await customersApi.deleteCustomer(customer.id);
      toast.success('Customer deleted');
      setSelectedIds((ids) => ids.filter((id) => id !== customer.id));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error('Write a message first');
      return;
    }
    const ok = await confirm({
      title: `Send WhatsApp Broadcast to ${selectedIds.length} customer(s)?`,
      message: 'Messages go out one-by-one with a 6-second delay to keep sending patterns natural.',
      confirmText: 'Send Broadcast',
    });
    if (!ok) return;
    setBroadcasting(true);
    try {
      const res = await whatsappApi.broadcastGreeting({
        message: broadcastMessage,
        customerIds: selectedIds,
        delayMs: 6000,
      });
      toast.success(res.data.message);
      setBroadcastModalOpen(false);
      setBroadcastMessage('');
      setSelectedIds([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start broadcast');
    } finally {
      setBroadcasting(false);
    }
  };

  const isAllPageSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));

  const columns = [
    {
      id: 'selection',
      header: () => (
        <input
          type="checkbox"
          checked={isAllPageSelected}
          onChange={(e) => {
            if (e.target.checked) {
              const newIds = [...selectedIds];
              rows.forEach((r) => {
                if (!newIds.includes(r.id)) newIds.push(r.id);
              });
              setSelectedIds(newIds);
            } else {
              setSelectedIds(selectedIds.filter((id) => !rows.some((r) => r.id === id)));
            }
          }}
          className="rounded border-gray-300 text-navy-900 focus:ring-navy-500 cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.original.id)}
          onChange={() => {
            setSelectedIds((ids) =>
              ids.includes(row.original.id)
                ? ids.filter((id) => id !== row.original.id)
                : [...ids, row.original.id]
            );
          }}
          className="rounded border-gray-300 text-navy-900 focus:ring-navy-500 cursor-pointer"
        />
      ),
    },
    {
      header: 'Name',
      accessorKey: 'name',
      cell: ({ row }) => (
        <Link to={`/customers/${row.original.id}`} className="hover:underline">
          <div className="font-semibold text-navy-900 flex items-center gap-1.5">
            {row.original.customerType === 'Company' ? <Building size={14} className="text-gray-400" /> : <User size={14} className="text-gray-400" />}
            {row.original.name}
          </div>
        </Link>
      )
    },
    {
      header: 'Mobile',
      accessorKey: 'mobile',
      cell: ({ row }) => (
        <div>
          <div>{row.original.mobile}</div>
          {row.original.altMobile && <div className="text-xs text-gray-400">Alt: {row.original.altMobile}</div>}
        </div>
      )
    },
    {
      header: 'Email',
      accessorKey: 'email',
      cell: ({ row }) => row.original.email || '-'
    },
    {
      header: 'Type',
      accessorKey: 'customerType',
    },
    {
      header: 'GSTIN',
      accessorKey: 'gstNumber',
      cell: ({ row }) => row.original.gstNumber || '-'
    },
    {
      header: 'Location',
      id: 'location',
      cell: ({ row }) => `${row.original.city}, ${row.original.state}`
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Link
            to={`/customers/${row.original.id}`}
            className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center font-medium"
          >
            View
          </Link>
          <button
            className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium"
            onClick={() => { setEditing(row.original); setModalOpen(true); }}
          >
            Edit
          </button>
          <button
            className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium"
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1">Dashboard &gt; Customers</p>
          <h1 className="text-2xl font-bold text-navy-900">Customers</h1>
          <p className="text-sm text-gray-500 max-w-xl">Manage customer accounts, profile details, addresses, and view their purchase history.</p>
        </div>
        <Button variant="accent" className="w-full sm:w-auto justify-center" onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={15} /> Add New Customer</Button>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-lime-50 border border-lime-200 rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="text-navy-900 font-semibold text-sm">
            Selected {selectedIds.length} customer(s)
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="accent"
              className="gap-1.5 text-xs py-1.5 flex-1 sm:flex-initial justify-center"
              onClick={() => setBroadcastModalOpen(true)}
            >
              <Send size={13} /> Send WhatsApp Broadcast
            </Button>
            <Button
              variant="outline"
              className="text-xs py-1.5 flex-1 sm:flex-initial justify-center"
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input
          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy-300"
          placeholder="Search name, mobile or email..."
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
        emptyMessage="No customers found. Add a customer to get started."
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Customer' : 'Add New Customer'}>
        <CustomerForm initialValues={editing} onSuccess={() => { setModalOpen(false); load(); }} />
      </Modal>

      <Modal
        open={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        title={`Send WhatsApp Broadcast (${selectedIds.length} customers)`}
      >
        <div className="space-y-4">
          <div>
            <Label>Select Template (Optional)</Label>
            <Select
              onChange={(e) => {
                const t = templates.find((t) => String(t.id) === e.target.value);
                if (t) setBroadcastMessage(t.body);
              }}
              defaultValue=""
            >
              <option value="" disabled>-- Select a Saved Template --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Message</Label>
            <p className="text-[10px] text-gray-400 mb-1">
              Use <code>{"{{customerName}}"}</code> as a placeholder for the customer's name.
            </p>
            <Textarea
              rows={4}
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Type your broadcast message here..."
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            <strong>⚠️ Note:</strong> Messages will be sent one-by-one with a 6-second delay between each. The sending progress can be monitored under the WhatsApp tab.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setBroadcastModalOpen(false)}
              disabled={broadcasting}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              type="button"
              onClick={handleSendBroadcast}
              disabled={broadcasting}
            >
              {broadcasting ? 'Starting...' : 'Send Broadcast'}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
