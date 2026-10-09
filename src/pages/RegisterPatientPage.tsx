import React, { useState } from 'react';
import { User, Mail, Lock, Phone, MapPin, Calendar, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface RegisterPatientPageProps {
  onSuccess: () => void;
  onNavigate: (view: string) => void;
}

export const RegisterPatientPage: React.FC<RegisterPatientPageProps> = ({ onSuccess, onNavigate }) => {
  const { refreshUser, t } = useAuth();

  // Registration Option: 'phone' or 'email'
  const [registerMethod, setRegisterMethod] = useState<'phone' | 'email'>('phone');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [gender, setGender] = useState('male');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [dateOfBirth, setDateOfBirth] = useState('1995-01-01');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate based on registration method
    if (registerMethod === 'phone') {
      const cleanDigits = phone.replace(/[^0-9]/g, '');
      if (cleanDigits.length < 10) {
        setError(t('Please enter a valid 11-digit Bangladesh phone number (e.g. 01712345678)', 'দয়া করে একটি সঠিক ১১ ডিজিটের বাংলাদেশ মোবাইল নম্বর লিখুন (উদা: 01712345678)'));
        return;
      }
    } else {
      if (!email || !email.includes('@')) {
        setError(t('Please enter a valid email address.', 'দয়া করে একটি সঠিক ইমেইল এড্রেস লিখুন।'));
        return;
      }
    }

    if (!password || password.length < 6) {
      setError(t('Password must be at least 6 characters long.', 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: registerMethod === 'email' ? email.trim() : (email.trim() || undefined),
          phone: registerMethod === 'phone' ? phone.trim() : (phone.trim() || undefined),
          password,
          gender,
          bloodGroup,
          dateOfBirth,
          address: address.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('Registration failed. Please try again.', 'নিবন্ধন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।'));
        setLoading(false);
        return;
      }

      await refreshUser();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Network error');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-100 shadow-2xs">
            <User className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('Patient Registration', 'রোগী নিবন্ধন')}
          </h1>
          <p className="text-xs text-slate-500">
            {t(
              'Create your account using Bangladesh mobile number or email',
              'বাংলাদেশ মোবাইল নম্বর অথবা ইমেইল দিয়ে সহজে একাউন্ট তৈরি করুন'
            )}
          </p>
        </div>

        {/* Registration Method Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            {t('Choose Registration Option', 'নিবন্ধন অপশন নির্বাচন করুন')}:
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setRegisterMethod('phone')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                registerMethod === 'phone'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>{t('🇧🇩 Mobile Number', '🇧🇩 মোবাইল নম্বর')}</span>
            </button>
            <button
              type="button"
              onClick={() => setRegisterMethod('email')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                registerMethod === 'email'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-4 h-4 text-emerald-600" />
              <span>{t('Email Address', 'ইমেইল এড্রেস')}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('Full Name *', 'পুরো নাম *')}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('e.g. Abdur Rahim', 'উদা: মো: আব্দুর রহিম')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-medium"
            />
          </div>

          {/* Conditional Input based on Chosen Method */}
          {registerMethod === 'phone' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('Bangladesh Mobile Number *', 'বাংলাদেশ মোবাইল নম্বর *')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                    <span>🇧🇩</span>
                    <span>+880</span>
                  </span>
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="1712345678"
                  className="w-full pl-22 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {t('Enter 10 or 11 digit Bangladesh mobile number (e.g. 017xxxxxxxx)', '১০ বা ১১ ডিজিটের মোবাইল নম্বর লিখুন (উদা: 017xxxxxxxx)')}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('Email Address *', 'ইমেইল এড্রেস *')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-medium"
                />
              </div>
            </div>
          )}

          {/* Optional secondary contact */}
          {registerMethod === 'phone' ? (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t('Email Address (Optional)', 'ইমেইল এড্রেস (ঐচ্ছিক)')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t('Mobile Number (Optional)', 'মোবাইল নম্বর (ঐচ্ছিক)')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017xxxxxxxx"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
              />
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('Password *', 'পাসওয়ার্ড *')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('Minimum 6 characters', 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড')}
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

          {/* Gender & Blood Group */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('Gender', 'লিঙ্গ')}
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white"
              >
                <option value="male">{t('Male', 'পুরুষ')}</option>
                <option value="female">{t('Female', 'মহিলা')}</option>
                <option value="other">{t('Other', 'অন্যান্য')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('Blood Group', 'রক্তের গ্রুপ')}
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('Address (Optional)', 'ঠিকানা (ঐচ্ছিক)')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('e.g. Dhanmondi, Dhaka', 'উদা: ধানমন্ডি, ঢাকা')}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
              />
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
                <span>{t('Complete Registration', 'নিবন্ধন সম্পন্ন করুন')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-500">
          {t('Already have an account?', 'ইতোমধ্যে একাউন্ট আছে?')}{' '}
          <button
            onClick={() => onNavigate('login')}
            className="text-emerald-600 font-bold hover:underline cursor-pointer ml-1"
          >
            {t('Sign in here', 'লগইন করুন')}
          </button>
        </div>
      </div>
    </div>
  );
};
