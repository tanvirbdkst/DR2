import React, { useState } from 'react';
import { Stethoscope, CalendarCheck, ShieldCheck, User, LogOut, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onOpenTestModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView, onOpenTestModal }) => {
  const { user, logout, lang, setLang, t } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top micro bar for Phase 1 verification badge & quick switcher */}
      <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Phase 1 MVP Active
            </span>
            <span className="hidden sm:inline text-slate-400">
              Complete Flow: Admin Approval → Doctor Chamber/Schedule → Patient Serial Booking → Double Booking Protected
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenTestModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition cursor-pointer text-[11px]"
            >
              <span>Run 18-Step Test Suite</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </button>
            <div className="flex items-center border-l border-slate-700 pl-3">
              <button
                onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
                className="hover:text-emerald-400 transition font-medium cursor-pointer"
              >
                {lang === 'en' ? 'বাংলা' : 'English'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">
                Daktar <span className="text-emerald-600">Serial</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                {t('Doctor Chamber Booking', 'ডাক্তার চেম্বার বুকিং')}
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setCurrentView('home')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                currentView === 'home'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {t('Home', 'হোম')}
            </button>
            <button
              onClick={() => setCurrentView('doctors')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                currentView === 'doctors'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {t('Find Doctors', 'ডাক্তার খুঁজুন')}
            </button>

            {user?.role === 'patient' && (
              <button
                onClick={() => setCurrentView('patient-dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                  currentView === 'patient-dashboard'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  {t('My Appointments', 'আমার অ্যাপয়েন্টমেন্ট')}
                </span>
              </button>
            )}

            {user?.role === 'doctor' && (
              <button
                onClick={() => setCurrentView('doctor-dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                  currentView === 'doctor-dashboard'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-emerald-600" />
                  {t('Doctor Portal', 'ডাক্তার ড্যাশবোর্ড')}
                </span>
              </button>
            )}

            {user?.role === 'admin' && (
              <button
                onClick={() => setCurrentView('admin-dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                  currentView === 'admin-dashboard'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  {t('Admin Panel', 'অ্যাডমিন প্যানেল')}
                </span>
              </button>
            )}
          </nav>

          {/* User Auth actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 pl-2 rounded-full border border-slate-200 hover:border-slate-300 bg-white transition cursor-pointer"
                >
                  <img
                    src={user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-100"
                  />
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">{user.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-medium">{user.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-700 capitalize">
                        Role: {user.role} ({user.status})
                      </span>
                    </div>

                    {user.role === 'patient' && (
                      <button
                        onClick={() => {
                          setCurrentView('patient-dashboard');
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <CalendarCheck className="w-4 h-4 text-slate-400" />
                        {t('My Appointments', 'আমার অ্যাপয়েন্টমেন্ট')}
                      </button>
                    )}

                    {user.role === 'doctor' && (
                      <button
                        onClick={() => {
                          setCurrentView('doctor-dashboard');
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Stethoscope className="w-4 h-4 text-slate-400" />
                        {t('Doctor Dashboard', 'ডাক্তার ড্যাশবোর্ড')}
                      </button>
                    )}

                    {user.role === 'admin' && (
                      <button
                        onClick={() => {
                          setCurrentView('admin-dashboard');
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4 text-slate-400" />
                        {t('Admin Panel', 'অ্যাডমিন প্যানেল')}
                      </button>
                    )}

                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                        setCurrentView('home');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      {t('Sign Out', 'লগআউট')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('login')}
                  className="px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  {t('Sign In', 'সাইন ইন')}
                </button>
                <button
                  onClick={() => setCurrentView('register-patient')}
                  className="px-3.5 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition cursor-pointer"
                >
                  {t('Register', 'নিবন্ধন')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
