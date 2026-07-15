import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, FileText, ReceiptText, AlertTriangle, Plus, StickyNote, ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import { getDashboardStats, getDashboardAnalytics } from '../api/dashboard';
import { formatCurrency, formatDate } from '../utils/format';

const STATUS_COLORS = {
  Draft: '#9ca3af',
  Sent: '#3b82f6',
  UnderNegotiation: '#f59e0b',
  Revised: '#d97706',
  Confirmed: '#84cc16',
  Cancelled: '#ef4444',
};

function QuickAction({ icon: Icon, label, sub, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
        accent ? 'bg-navy-900 border-navy-900 text-white hover:bg-navy-800' : 'bg-white border-gray-200 hover:border-navy-300 hover:bg-gray-50'
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${accent ? 'bg-lime-400 text-navy-900' : 'bg-navy-50 text-navy-900'}`}>
        <Icon size={17} />
      </div>
      <div>
        <p className={`text-sm font-bold ${accent ? 'text-white' : 'text-navy-900'}`}>{label}</p>
        <p className={`text-xs ${accent ? 'text-gray-300' : 'text-gray-400'}`}>{sub}</p>
      </div>
    </button>
  );
}

function AttentionList({ title, emptyText, rows, renderRow }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="font-bold text-navy-900 mb-3">{title}</h3>
      {rows?.length ? (
        <div className="space-y-1">{rows.map(renderRow)}</div>
      ) : (
        <p className="text-sm text-gray-400">{emptyText}</p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    getDashboardStats().then((res) => setStats(res.data.data));
    getDashboardAnalytics().then((res) => setAnalytics(res.data.data));
  }, []);

  const attention = stats?.attention;

  return (
    <Layout>
      <div className="mb-6">
        <p className="text-xs text-gray-400 mb-1">Panju Intext &gt; Dashboard</p>
        <h1 className="text-2xl font-bold text-navy-900">Welcome Back, Super Admin</h1>
      </div>

      {/* One-click starting points for the three everyday jobs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <QuickAction accent icon={Plus} label="New Quotation" sub="Start a new customer quote" onClick={() => navigate('/quotations/new')} />
        <QuickAction icon={StickyNote} label="New Memo Bill" sub="Write a memo like the pad" onClick={() => navigate('/bills/new?type=Memo')} />
        <QuickAction icon={ReceiptText} label="New GST Bill" sub="Issue a tax invoice" onClick={() => navigate('/bills/new?type=GST')} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Customers" value={stats?.totalCustomers ?? '-'} icon={<Users size={18} />} />
        <StatCard label="Active Quotations" value={stats?.activeQuotations ?? '-'} icon={<FileText size={18} />} />
        <StatCard label="Confirmed Orders" value={stats?.confirmedOrders ?? '-'} icon={<ReceiptText size={18} />} />
        <StatCard
          label="Pending Payments"
          value={stats ? formatCurrency(stats.pendingPayments) : '-'}
          icon={<AlertTriangle size={18} />}
          trendPositive={false}
        />
      </div>

      {/* The admin's actual to-do list: collect, bill, follow up */}
      {attention && (attention.paymentsDue.length > 0 || attention.unbilledOrders.length > 0 || attention.openQuotations.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <AttentionList
            title="💰 Payments to Collect"
            emptyText="Nothing pending — all collected."
            rows={attention.paymentsDue}
            renderRow={(r) => (
              <Link key={r.orderNumber} to={`/quotations/${r.quotationId}`} className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-gray-50 group">
                <div>
                  <p className="text-sm font-semibold text-navy-900">{r.customerName}</p>
                  <p className="text-xs text-gray-400">{r.orderNumber}</p>
                </div>
                <span className="text-sm font-semibold text-red-500 flex items-center gap-1">
                  {formatCurrency(r.pending)} <ArrowRight size={13} className="text-gray-300 group-hover:text-navy-900" />
                </span>
              </Link>
            )}
          />
          <AttentionList
            title="🧾 Orders Waiting for a Bill"
            emptyText="Every confirmed order is billed."
            rows={attention.unbilledOrders}
            renderRow={(r) => (
              <Link key={r.orderNumber} to={`/bills/new?type=Memo&orderId=${r.orderId}`} className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-gray-50 group">
                <div>
                  <p className="text-sm font-semibold text-navy-900">{r.customerName}</p>
                  <p className="text-xs text-gray-400">{r.orderNumber}</p>
                </div>
                <span className="text-sm font-semibold flex items-center gap-1">
                  {formatCurrency(r.total)} <ArrowRight size={13} className="text-gray-300 group-hover:text-navy-900" />
                </span>
              </Link>
            )}
          />
          <AttentionList
            title="🤝 Quotations to Follow Up"
            emptyText="No open quotations."
            rows={attention.openQuotations}
            renderRow={(r) => (
              <Link key={r.id} to={`/quotations/${r.id}`} className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-gray-50 group">
                <div>
                  <p className="text-sm font-semibold text-navy-900">{r.customerName}</p>
                  <p className="text-xs text-gray-400">{r.quotationNumber}</p>
                </div>
                <StatusBadge status={r.status} />
              </Link>
            )}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-navy-900 mb-1">Revenue Trend</h3>
          <p className="text-xs text-gray-400 mb-4">Quoted value vs. amount actually collected, last 6 months</p>
          {analytics?.revenueTrend ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={analytics.revenueTrend} margin={{ left: -10 }}>
                <defs>
                  <linearGradient id="quotedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f1f4d" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0f1f4d" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#84cc16" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#84cc16" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip formatter={(v) => formatCurrency(v)} />
                <Area type="monotone" dataKey="quoted" name="Quoted" stroke="#0f1f4d" fill="url(#quotedGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="collected" name="Collected" stroke="#65a30d" fill="url(#collectedGrad)" strokeWidth={2} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Spinner className="h-[260px]" label="Loading chart..." />
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-navy-900 mb-1">Quotation Status Mix</h3>
          <p className="text-xs text-gray-400 mb-4">Across all quotations</p>
          {analytics?.statusBreakdown?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={analytics.statusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {analytics.statusBreakdown.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#9ca3af'} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400">No quotations yet.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-navy-900 mb-4">Recent Quotations</h3>
          {stats?.recentQuotations?.length ? (
            <div className="space-y-3">
              {stats.recentQuotations.map((q) => (
                <Link
                  key={q.id}
                  to={`/quotations/${q.id}`}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 -mx-2 rounded"
                >
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{q.quotationNumber}</p>
                    <p className="text-xs text-gray-400">{q.customer?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(q.total)}</p>
                    <StatusBadge status={q.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No quotations yet.</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-navy-900 mb-4">Recent Customers</h3>
          {stats?.recentCustomers?.length ? (
            <div className="space-y-3">
              {stats.recentCustomers.map((c) => (
                <Link
                  key={c.id}
                  to={`/customers/${c.id}`}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 -mx-2 rounded"
                >
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.mobile}</p>
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(c.createdAt)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No customers yet.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
