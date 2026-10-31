import {BrightloopLogo} from '../../components/common/BrightloopLogo';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Zap, Shield, Briefcase, UserCheck, ArrowRight, Lock, Mail } from 'lucide-react';
import { UserRole } from '../../types';

interface LoginPageProps {
  onNavigateToRegister: () => void;
  onNavigateToForgot: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateToRegister,
  onNavigateToForgot,
}) => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('error', 'Validation Error', 'Please enter both email and password.');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      showToast('success', 'Welcome back!', `Logged in as ${email}`);
    } catch {
      showToast('error', 'Login Failed', 'Could not authenticate user.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role: UserRole) => {
    setIsLoading(true);
    const demoEmail =
      role === 'admin'
        ? 'admin@billsync.test'
        : role === 'staff'
        ? 'billing@billsync.test'
        : 'customer@billsync.test';
    try {
      await login(demoEmail, 'Password123!', role);
      showToast('success', 'Demo Login Successful', `Logged in as ${role.toUpperCase()} persona.`);
    } catch { showToast('error','Login failed','Run the demo seed first.'); } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-600/20 to-transparent blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/30 mb-4">
          <BrightloopLogo/>
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Brightloop Software
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Subscription Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {/* Quick Demo Access Bar */}
          <div className="mb-6 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                ⚡ Quick Demo Access (1-Click)
              </span>
              <span className="text-[10px] bg-blue-200/70 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                Hackathon Ready
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white text-indigo-700 font-semibold text-xs rounded-lg border border-indigo-200 hover:bg-indigo-50 shadow-sm transition-all"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('staff')}
                className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white text-blue-700 font-semibold text-xs rounded-lg border border-blue-200 hover:bg-blue-50 shadow-sm transition-all"
              >
                <Briefcase className="w-3.5 h-3.5" />
                Staff
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('customer')}
                className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white text-emerald-700 font-semibold text-xs rounded-lg border border-emerald-200 hover:bg-emerald-50 shadow-sm transition-all"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Customer
              </button>
            </div>
          </div>

          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Or sign in with email
            </span>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={onNavigateToForgot}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account yet?{' '}
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="font-semibold text-blue-600 hover:text-blue-700 ml-1"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
