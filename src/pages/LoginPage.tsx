import React, { useState } from 'react';
import { Stethoscope, Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle, Shield, User, Users, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface LoginPageProps {
  onSuccess: (role: string) => void;
  onNavigate: (view: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onNavigate }) => {
  const { login, t } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email.trim(), password);
    setLoading(false);

    if (res.success && res.user) {
      onSuccess(res.user.role);
    } else {
      setError(res.error || t('Login failed. Please verify your email/phone and password.', 'লগইন ব্যর্থ হয়েছে। ইমেইল/মোবাইল এবং পাসওয়ার্ড যাচাই করুন।'));
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Logo and title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20">
            <Stethoscope className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('Sign In to Doctor Serial', 'ডাক্তার সিরিয়াল লগইন')}
          </h1>
          <p className="text-xs text-slate-500">
            {t(
              'Unified portal for Patients, Doctors, Staff & Administrators',
              'রোগী, ডাক্তার, স্টাফ ও অ্যাডমিনদের কেন্দ্রীয় লগইন পোর্টাল'
            )}
          </p>
        </div>

        {/* Roles Supported Banner */}
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3">
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="p-1.5 rounded-lg bg-white border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] font-bold text-blue-700 block">👤 {t('Patient', 'রোগী')}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-white border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-700 block">🩺 {t('Doctor', 'ডাক্তার')}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-white border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] font-bold text-teal-700 block">🧑‍⚕️ {t('Staff', 'স্টাফ')}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-white border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-700 block">👑 {t('Admin', 'অ্যাডমিন')}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-2 leading-tight">
            {t(
              'Enter your credentials to enter your dedicated dashboard.',
              'আপনার আইডি ও পাসওয়ার্ড দিয়ে সরাসরি আপনার ড্যাশবোর্ডে প্রবেশ করুন।'
            )}
          </p>
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
              {t('Email or Phone Number', 'ইমেইল অথবা মোবাইল নম্বর')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('e.g. name@example.com or 017xxxxxxxx', 'উদা: admin@drbd.com বা 017xxxxxxxx')}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-medium"
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
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition shadow-sm shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{t('Sign In to Account', 'একাউন্টে লগইন করুন')}</span>
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
              {t('Register as Patient', 'রোগী হিসেবে নিবন্ধন')}
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => onNavigate('register-doctor')}
              className="text-slate-700 hover:text-emerald-600 hover:underline cursor-pointer"
            >
              {t('Doctor Registration', 'ডাক্তার নিবন্ধন')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
