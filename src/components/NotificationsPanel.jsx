import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, TrendingUp, Truck } from 'lucide-react';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';
import { formatDateTime } from '../utils/format';

const ICONS = {
  QuotationStatusChanged: TrendingUp,
  TrackingStatusChanged: Truck,
};

export default function NotificationsPanel({ onClose, onRead }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNotifications({ page: 1, limit: 15 })
      .then((res) => setRows(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  const handleOpen = async (n) => {
    if (!n.isRead) {
      await markNotificationRead(n.id);
      setRows((rs) => rs.map((r) => (r.id === n.id ? { ...r, isRead: true } : r)));
      onRead?.();
    }
    if (n.quotationId) navigate(`/quotations/${n.quotationId}`);
    onClose?.();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setRows((rs) => rs.map((r) => ({ ...r, isRead: true })));
    onRead?.();
  };

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-sm text-navy-900">Notifications</span>
          <button onClick={handleMarkAllRead} className="text-xs text-gray-400 hover:text-navy-900 flex items-center gap-1">
            <CheckCheck size={13} /> Mark all read
          </button>
        </div>
        <div className="overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-6">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No notifications yet.</p>
          ) : (
            rows.map((n) => {
              const Icon = ICONS[n.type] || TrendingUp;
              return (
                <button
                  key={n.id}
                  onClick={() => handleOpen(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 flex gap-3 ${n.isRead ? '' : 'bg-lime-50/60'}`}
                >
                  <div className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${n.isRead ? 'bg-gray-100 text-gray-400' : 'bg-lime-100 text-navy-900'}`}>
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-navy-900 truncate">{n.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-lime-500 shrink-0 mt-1.5" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
