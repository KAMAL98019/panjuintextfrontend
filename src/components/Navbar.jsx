import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Settings, LogOut, FileText, Users, ReceiptText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationsPanel from './NotificationsPanel';
import { listNotifications } from '../api/notifications';
import { globalSearch } from '../api/search';

/** Live global search: type 2+ characters, get quotations/customers/bills, click to jump there. */
function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      globalSearch(query.trim()).then((res) => {
        setResults(res.data.data);
        setOpen(true);
      }).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (path) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  const sections = results ? [
    { title: 'Quotations', icon: FileText, rows: results.quotations, path: (r) => `/quotations/${r.id}` },
    { title: 'Customers', icon: Users, rows: results.customers, path: (r) => `/customers/${r.id}` },
    { title: 'Bills', icon: ReceiptText, rows: results.bills, path: (r) => `/bills/${r.id}/edit` },
  ].filter((s) => s.rows.length > 0) : [];

  return (
    <div className="hidden md:block relative w-full max-w-md">
      <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
        <Search size={16} className="text-gray-400 mr-2" />
        <input
          className="bg-transparent outline-none text-sm w-full placeholder-gray-400"
          placeholder="Search customers, quotations, bills..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results && setOpen(true)}
        />
      </div>
      {open && results && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-96 overflow-y-auto">
            {sections.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No matches for "{query}"</p>
            ) : (
              sections.map((section) => (
                <div key={section.title}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-3 pt-2.5 pb-1">{section.title}</p>
                  {section.rows.map((row) => (
                    <button
                      key={`${section.title}-${row.id}`}
                      onClick={() => go(section.path(row))}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <section.icon size={14} className="text-gray-400 shrink-0" />
                      <span className="text-sm font-semibold text-navy-900">{row.label}</span>
                      <span className="text-xs text-gray-400 truncate">{row.sub}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function Navbar({ title }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(() => {
    listNotifications({ page: 1, limit: 1 }).then((res) => setUnreadCount(res.data.unreadCount || 0)).catch(() => {});
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-6 flex-1">
        <span className="font-bold text-navy-900 text-base whitespace-nowrap">Panju Intext Admin</span>
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button className="relative text-gray-400 hover:text-gray-600" title="Notifications" onClick={() => setNotifOpen((o) => !o)}>
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <NotificationsPanel onClose={() => setNotifOpen(false)} onRead={refreshUnreadCount} />
          )}
        </div>
        <div className="w-px h-6 bg-gray-200" />
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 text-sm"
          >
            <div className="w-8 h-8 rounded-full bg-navy-900 text-white flex items-center justify-center font-semibold text-xs">
              {(admin?.name || 'A').slice(0, 1)}
            </div>
            <div className="text-left hidden sm:block">
              <div className="font-semibold text-gray-800 leading-tight">{admin?.name || 'Admin'}</div>
              <div className="text-xs text-gray-400 leading-tight">Management</div>
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              <button
                onClick={() => navigate('/settings')}
                className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-gray-50"
              >
                <Settings size={14} /> Settings
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
