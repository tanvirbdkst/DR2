import React, { useState } from 'react';
import { Stethoscope, Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, KeyRound, Smartphone, RefreshCw, ArrowLeft } from 'lucide-react';
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

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [generatedOtpHint, setGeneratedOtpHint] = useState<string | null>(null);
  const [maskedTarget, setMaskedTarget] = useState<string | null>(null);

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

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to request password reset');
      }

      setMaskedTarget(data.maskedPhone || data.maskedEmail || forgotIdentifier);
      if (data.otpCode) {
        setGeneratedOtpHint(data.otpCode);
        setForgotOtpCode(data.otpCode); // convenient auto-fill for testing
      }
      setForgotStep('verify');
      setForgotSuccess(t('Verification OTP code has been generated.', 'যাচাইকরণ ওটিপি কোড পাঠানো হয়েছে।'));
    } catch (err: any) {
      setForgotError(err.message || 'Error sending reset request');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (forgotNewPassword.length < 6) {
      setForgotError(t('Password must be at least 6 characters long.', 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'));
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError(t('Passwords do not match.', 'পাসওয়ার্ড দুটি মিলছে না।'));
      return;
    }

    setForgotLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password/verify-and-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier.trim(),
          otpCode: forgotOtpCode.trim(),
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setForgotSuccess(t('Password reset successfully! Please sign in with your new password.', 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! নতুন পাসওয়ার্ড দিয়ে লগইন করুন।'));
      // Pre-fill login input and return to login view after short delay
      setEmail(forgotIdentifier.trim());
      setPassword('');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotStep('request');
        setForgotOtpCode('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setGeneratedOtpHint(null);
      }, 1800);
    } catch (err: any) {
      setForgotError(err.message || 'Password reset failed');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20">
            {showForgotPassword ? <KeyRound className="w-7 h-7" /> : <Stethoscope className="w-7 h-7" />}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {showForgotPassword ? t('Reset Password', 'পাসওয়ার্ড রিসেট করুন') : t('Sign In', 'লগইন করুন')}
          </h1>
          <p className="text-xs text-slate-500">
            {showForgotPassword
              ? t(
                  'Enter your registered Bangladesh mobile number or email to receive a reset code',
                  'নিবন্ধিত মোবাইল নম্বর বা ইমেইল দিয়ে পাসওয়ার্ড রিসেট করুন'
                )
              : t(
                  'Enter your mobile number or email and password to access your account',
                  'আপনার একাউন্টে প্রবেশ করতে মোবাইল নম্বর বা ইমেইল এবং পাসওয়ার্ড দিন'
                )}
          </p>
        </div>

        {/* Global Error Banner */}
        {error && !showForgotPassword && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* FORGOT PASSWORD FLOW */}
        {showForgotPassword ? (
          <div className="space-y-4">
            {forgotError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {forgotStep === 'request' ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('Registered Phone Number or Email', 'নিবন্ধিত মোবাইল নম্বর বা ইমেইল')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder={t('017xxxxxxxx or name@example.com', '০১৭xxxxxxxx বা name@example.com')}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {t('A 6-digit verification code will be sent to this number/email', 'এই নম্বরে/ইমেইলে ৬ ডিজিটের ওটিপি ভেরিফিকেশন কোড পাঠানো হবে')}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading || !forgotIdentifier.trim()}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition shadow-sm shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{t('Send Verification OTP', 'ওটিপি ভেরিফিকেশন কোড পাঠান')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndReset} className="space-y-4">
                {maskedTarget && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-xs">
                    <span className="font-semibold text-slate-800">{t('Recipient:', 'প্রাপক:')}</span> {maskedTarget}
                  </div>
                )}

                {generatedOtpHint && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                    <span>
                      {t('Verification OTP Code:', 'ভেরিফিকেশন ওটিপি:')} <strong className="font-mono text-sm tracking-wider text-amber-800">{generatedOtpHint}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setForgotOtpCode(generatedOtpHint)}
                      className="text-[11px] font-bold text-amber-700 underline cursor-pointer"
                    >
                      {t('Auto Fill', 'বসিয়ে দিন')}
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('6-Digit Verification OTP', '৬ ডিজিটের ওটিপি কোড')}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtpCode}
                    onChange={(e) => setForgotOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-center font-mono text-base tracking-widest focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('New Password', 'নতুন পাসওয়ার্ড')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      required
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {t('Minimum 6 characters', 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড')}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('Confirm New Password', 'নতুন পাসওয়ার্ড নিশ্চিত করুন')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      required
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading || !forgotOtpCode || !forgotNewPassword || !forgotConfirmPassword}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition shadow-sm shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{t('Reset Password & Sign In', 'পাসওয়ার্ড পরিবর্তন করুন')}</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotStep('request');
                  setForgotError(null);
                  setForgotSuccess(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('Back to Sign In', 'লগইনে ফিরে যান')}</span>
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD UNIFIED LOGIN FORM */
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
                <button
                  type="button"
                  onClick={() => {
                    setForgotIdentifier(email);
                    setShowForgotPassword(true);
                    setForgotStep('request');
                    setForgotError(null);
                    setForgotSuccess(null);
                  }}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                >
                  {t('Forgot Password?', 'পাসওয়ার্ড ভুলে গেছেন?')}
                </button>
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
        )}

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
