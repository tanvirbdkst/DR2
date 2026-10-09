import React, { useState } from 'react';
import { Stethoscope, Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
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
      setError(
        res.error ||
          t(
            'Invalid credentials. Please verify your mobile number/email and password.',
            'লগইন ব্যর্থ হয়েছে। সঠিক মোবাইল নম্বর/ইমেইল এবং পাসওয়ার্ড দিন।'
          )
      );
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20">
            <Stethoscope className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('Sign In', 'লগইন করুন')}
          </h1>
          <p className="text-xs text-slate-500">
            {t(
              'Enter your mobile number or email and password to access your account',
              'আপনার একাউন্টে প্রবেশ করতে মোবাইল নম্বর বা ইমেইল এবং পাসওয়ার্ড দিন'
            )}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Single Unified Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('Email or Mobile Number', 'ইমেইল অথবা মোবাইল নম্বর')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('017xxxxxxxx or name@example.com', '০১৭xxxxxxxx বা name@example.com')}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-medium"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {t('Enter registered phone (01X...) or email address', 'নিবন্ধিত মোবাইল নম্বর (০১X...) বা ইমেইল এড্রেস লিখুন')}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {t('Password', 'পাসওয়ার্ড')}
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-medium"
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
                <span>{t('Sign In', 'লগইন করুন')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Clean Registration Link */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-3">
          <p className="text-xs text-slate-500">
            {t("Don't have an account?", 'কোনো একাউন্ট নেই?')}
          </p>
          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-center">
            <p className="text-xs text-slate-600 mb-2">
              {t(
                'Register with Bangladesh Mobile Number or Email',
                'বাংলাদেশ মোবাইল নম্বর অথবা ইমেইল দিয়ে নিবন্ধন করুন'
              )}
            </p>
            <button
              onClick={() => onNavigate('register-patient')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer w-full"
            >
              <span>{t('Register New Account', 'নতুন অ্যাকাউন্ট নিবন্ধন করুন')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="pt-1">
            <button
              onClick={() => onNavigate('register-doctor')}
              className="text-[11px] text-slate-500 hover:text-emerald-700 hover:underline cursor-pointer"
            >
              {t('Are you a Doctor? Register Practice', 'আপনি কি ডাক্তার? প্র্যাকটিস নিবন্ধন করুন')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
