import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Users, FileText, ReceiptText, Package, MessageCircle, Settings as SettingsIcon, Plus, X } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/quotations', label: 'Quotations', icon: FileText },
  { to: '/bills', label: 'Bills', icon: ReceiptText },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const navigate = useNavigate();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-60 bg-white border-r border-gray-200 flex flex-col h-screen overflow-y-auto transition-transform duration-300 lg:sticky lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col items-center text-center gap-1.5 relative">
          {/* Close button for mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-md text-gray-400 hover:text-gray-600 lg:hidden"
          >
            <X size={20} />
          </button>
          
          <img src="/images/logo.png" alt="Panju Intext" className="w-24" />
          <div>
            <div className="text-navy-900 font-extrabold text-xl leading-tight">Panju Intext</div>
            <div className="text-xs text-gray-500">Turnkey Interior Solutions</div>
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={() => {
              setIsOpen(false);
              navigate('/quotations/new');
            }}
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
              onClick={() => setIsOpen(false)}
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
    </>
  );
}
