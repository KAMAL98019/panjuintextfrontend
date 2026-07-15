import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Users, FileText, ReceiptText, Package, MessageCircle, Settings as SettingsIcon, Plus } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/quotations', label: 'Quotations', icon: FileText },
  { to: '/bills', label: 'Bills', icon: ReceiptText },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 overflow-y-auto">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col items-center text-center gap-1.5">
        <img src="/images/logo.png" alt="Panju Intext" className="w-24" />
        <div>
          <div className="text-navy-900 font-extrabold text-xl leading-tight">Panju Intext</div>
          <div className="text-xs text-gray-500">Turnkey Interior Solutions</div>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={() => navigate('/quotations/new')}
          className="w-full bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={16} /> New Quotation
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-lime-400 text-navy-900' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
