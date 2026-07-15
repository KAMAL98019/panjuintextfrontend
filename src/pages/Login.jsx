import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Users, FileStack, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Input, Label } from '../components/form/Field';
import Button from '../components/Button';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@panjuintext.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-gray-50">
      <div className="hidden lg:flex flex-col justify-center px-16 bg-gradient-to-br from-navy-50 to-lime-50">
        <h1 className="text-3xl font-bold text-navy-900 mb-4">
          Welcome to <span className="text-navy-900">Panju Intext</span> Admin Portal
        </h1>
        <p className="text-gray-600 mb-10 max-w-md">
          Streamline your furnishing operations. Manage global customers, automate version-controlled
          quotations, and optimize follow-up workflows from a single command center.
        </p>
        <div className="grid grid-cols-3 gap-4 max-w-lg">
          <FeatureCard icon={Users} title="Customer CRM" desc="Centralized client records with deep interaction history." />
          <FeatureCard icon={FileStack} title="Quotation Versions" desc="Track revision history and negotiation stages." />
          <FeatureCard icon={Wallet} title="Payment Tracking" desc="Automated advance, partial and final payment status." />
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <div className="text-center mb-6">
            <img src="/images/logo.png" alt="Panju Intext" className="w-20 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-navy-900">Super Admin Login</h2>
            <p className="text-sm text-gray-400">Sign in with your company credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Work Email Address</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@panjuintext.com"
              />
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full justify-center" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </Button>
          </form>

          <div className="mt-6 bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs text-gray-400 text-center">
            Authorized access only. All activities are monitored and audit logged for security compliance.
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <Icon size={16} className="text-navy-900 mb-1.5" />
      <p className="text-sm font-semibold text-navy-900">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </div>
  );
}
