import React, { useState } from 'react';
import { Stethoscope, CalendarCheck, ShieldCheck, User, LogOut, ChevronDown, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { NotificationBell } from './NotificationBell.js';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { user, logout, lang, setLang, t } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isCompounder = user?.role === 'compounder';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top micro bar: emergency hotline & language switcher */}
      <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={() => setCurrentView('emergency')}
            className="flex items-center gap-1.5 text-[11px] text-rose-300 hover:text-white transition font-medium cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span className="font-bold text-rose-400">🚨 {t('Emergency & Helpline:', 'জরুরি হেল্পলাইন:')}</span>
            <span className="font-mono text-slate-300">999 • 16263</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              className="hover:text-emerald-400 transition font-medium cursor-pointer"
            >
              {lang === 'en' ? 'বাংলা' : 'English'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo — clickable brand mark that routes home ("/") */}
          <button
            type="button"
            onClick={() => setCurrentView('home')}
            aria-label="Doctor Serial — Home"
            title="Doctor Serial"
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <img
              src="/logo.png"
              alt="Doctor Serial"
              width={1254}
              height={1254}
              className="h-10 w-auto sm:h-12 max-w-[44px] sm:max-w-[52px] object-contain rounded-xl shadow-sm ring-1 ring-slate-900/5 group-hover:scale-[1.03] transition-transform"
            />
            <div className="flex flex-col text-left">
              <span className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-slate-900 leading-tight">
                Doctor <span className="text-emerald-600">Serial</span>
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold tracking-wider text-slate-400 block -mt-0.5">
                {t('Doctor Chamber Booking', 'ডাক্তার চেম্বার বুকিং')}
              </span>
            </div>
          </button>

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

            {isCompounder && (
              <button
                onClick={() => setCurrentView('compounder-dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                  currentView === 'compounder-dashboard'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-emerald-600" />
                  {t('Compounder Panel', 'কম্পাউন্ডার প্যানেল')}
                </span>
              </button>
            )}

            {user?.role === 'admin' && (
              <button
                onClick={() => setCurrentView('admin-dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                  currentView === 'admin-dashboard'
                    ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>{t('Admin Panel', 'অ্যাডমিন')}</span>
                </span>
              </button>
            )}
          </nav>

          {/* User Auth actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user && (
              <NotificationBell
                role={user.role as any}
                onNavigate={setCurrentView}
              />
            )}

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

                    {user.role === 'compounder' && (
                      <button
                        onClick={() => {
                          setCurrentView('compounder-dashboard');
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <ClipboardList className="w-4 h-4 text-slate-400" />
                        {t('Compounder Panel', 'কম্পাউন্ডার প্যানেল')}
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
