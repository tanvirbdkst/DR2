import React, { useState } from 'react';
import { Stethoscope, Lock, Mail, ArrowRight, ShieldCheck, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface LoginPageProps {
  onSuccess: (role: string) => void;
  onNavigate: (view: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onNavigate }) => {
  const { login, t } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success && res.user) {
      onSuccess(res.user.role);
    } else {
      setError(res.error || 'Login failed. Please verify credentials.');
    }
  };

  const fillQuickDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Logo and title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('Sign In to Daktar Serial', 'লগইন করুন')}
          </h1>
          <p className="text-xs text-slate-500">
            Access your patient appointments, doctor chambers, or admin panel
          </p>
        </div>

        {/* 1-Click Test Credentials Buttons */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
            One-Click Demo Credentials
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillQuickDemo('admin@daktarserial.com', 'Admin123!')}
              className="py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:border-amber-500 hover:bg-amber-50 text-[11px] font-semibold text-slate-700 transition cursor-pointer text-center"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('doctor@daktarserial.com', 'Doctor123!')}
              className="py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-[11px] font-semibold text-slate-700 transition cursor-pointer text-center"
            >
              🩺 Doctor
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('patient@daktarserial.com', 'Patient123!')}
              className="py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-[11px] font-semibold text-slate-700 transition cursor-pointer text-center"
            >
              👤 Patient
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('Email Address', 'ইমেইল অ্যাড্রেস')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('Password', 'পাসওয়ার্ড')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition shadow-sm shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{t('Sign In', 'লগইন')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Signup links */}
        <div className="pt-4 border-t border-slate-100 space-y-2 text-center text-xs">
          <p className="text-slate-500">
            {t("Don't have an account?", 'কোন একাউন্ট নেই?')}
          </p>
          <div className="flex items-center justify-center gap-4 text-xs font-semibold">
            <button
              onClick={() => onNavigate('register-patient')}
              className="text-emerald-600 hover:underline cursor-pointer"
            >
              Register as Patient
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => onNavigate('register-doctor')}
              className="text-slate-700 hover:text-emerald-600 hover:underline cursor-pointer"
            >
              Doctor Registration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
