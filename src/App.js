import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ConfirmProvider } from './components/ConfirmDialog';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/customers/CustomerDetail';
import Products from './pages/Products';
import Quotations from './pages/Quotations';
import QuotationFormPage from './pages/quotations/QuotationFormPage';
import QuotationDetail from './pages/quotations/QuotationDetail';
import SettingsPage from './pages/Settings';
import WhatsAppPage from './pages/WhatsApp';
import Bills from './pages/Bills';
import BillFormPage from './pages/bills/BillFormPage';

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
          <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />

          <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />

          <Route path="/quotations" element={<ProtectedRoute><Quotations /></ProtectedRoute>} />
          <Route path="/quotations/new" element={<ProtectedRoute><QuotationFormPage /></ProtectedRoute>} />
          <Route path="/quotations/:id/edit" element={<ProtectedRoute><QuotationFormPage /></ProtectedRoute>} />
          <Route path="/quotations/:id" element={<ProtectedRoute><QuotationDetail /></ProtectedRoute>} />

          <Route path="/bills" element={<ProtectedRoute><Bills /></ProtectedRoute>} />
          <Route path="/bills/new" element={<ProtectedRoute><BillFormPage /></ProtectedRoute>} />
          <Route path="/bills/:id/edit" element={<ProtectedRoute><BillFormPage /></ProtectedRoute>} />

          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/whatsapp" element={<ProtectedRoute><WhatsAppPage /></ProtectedRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
