import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil } from 'lucide-react';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';
import CustomerForm from './CustomerForm';
import * as customersApi from '../../api/customers';
import { formatCurrency, formatDate } from '../../utils/format';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(() => {
    customersApi.getCustomer(id).then((res) => setCustomer(res.data.data));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!customer) {
    return (
      <Layout>
        <Spinner size={36} label="Loading customer..." className="py-24" />
      </Layout>
    );
  }

  const totalBusiness = customer.quotations
    .filter((q) => q.status === 'Confirmed')
    .reduce((sum, q) => sum + q.total, 0);

  return (
    <Layout>
      <p className="text-xs text-gray-400 mb-1">Dashboard &gt; Customers &gt; {customer.name}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-bold text-navy-900">{customer.name}</h2>
            <button
              onClick={() => setEditOpen(true)}
              className="text-gray-400 hover:text-navy-900 p-1"
              title="Edit customer details"
            >
              <Pencil size={15} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-4">Customer ID: {customer.customerCode}</p>

          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 border-b border-gray-100 pb-1">
            Contact Details
          </h4>
          <div className="space-y-2 text-sm mb-4">
            <p><span className="text-gray-400">Phone: </span>{customer.mobile}</p>
            {customer.altMobile && <p><span className="text-gray-400">Alt: </span>{customer.altMobile}</p>}
            {customer.email && <p><span className="text-gray-400">Email: </span>{customer.email}</p>}
            <p><span className="text-gray-400">Address: </span>{customer.address}, {customer.city}, {customer.state} - {customer.pincode}</p>
            {customer.gstNumber && <p><span className="text-gray-400">GSTIN: </span>{customer.gstNumber}</p>}
          </div>

          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 border-b border-gray-100 pb-1">
            Summary
          </h4>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-400">Total Quotations: </span>{customer.quotations.length}</p>
            <p><span className="text-gray-400">Confirmed Business: </span>{formatCurrency(totalBusiness)}</p>
            <p><span className="text-gray-400">Type: </span>{customer.customerType}</p>
          </div>

          <Button
            variant="primary"
            className="w-full justify-center mt-5"
            onClick={() => navigate('/quotations/new', { state: { customerId: customer.id } })}
          >
            <Plus size={15} /> New Quotation
          </Button>
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-navy-900 mb-4">Quotation History</h3>
          {customer.quotations.length === 0 ? (
            <p className="text-sm text-gray-400">No quotations yet for this customer.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {customer.quotations.map((q) => (
                <Link
                  key={q.id}
                  to={`/quotations/${q.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 px-2 -mx-2 rounded"
                >
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{q.quotationNumber}</p>
                    <p className="text-xs text-gray-400">{formatDate(q.createdAt)} &middot; {q.quotationType}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatCurrency(q.total)}</span>
                    <StatusBadge status={q.status} />
                    {q.order && <StatusBadge status={q.order.currentStatus} />}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Customer">
        <CustomerForm initialValues={customer} onSuccess={() => { setEditOpen(false); load(); }} />
      </Modal>
    </Layout>
  );
}
