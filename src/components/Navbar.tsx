import React, { useState } from 'react';
import {
  Stethoscope, CalendarCheck, ShieldCheck, User, LogOut, ChevronDown,
  ClipboardList, Menu, X, PhoneCall, Search, Home
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { NotificationBell } from './NotificationBell.js';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { user, logout, lang, setLang, t } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isCompounder = user?.role === 'compounder';

  const navigateTo = (view: string) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top micro bar: emergency hotline & language switcher */}
      <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={() => navigateTo('emergency')}
            className="flex items-center gap-1.5 text-[11px] text-rose-300 hover:text-white transition font-medium cursor-pointer truncate"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span className="font-bold text-rose-400 shrink-0">🚨 {t('Emergency:', 'জরুরি:')}</span>
            <span className="font-mono text-slate-300 truncate">999 • 16263</span>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              className="hover:text-emerald-400 transition font-medium cursor-pointer text-[11px] sm:text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200"
            >
              {lang === 'en' ? 'বাংলা' : 'EN'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo — clickable brand mark that routes home ("/") */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            aria-label="Doctor Serial — Home"
            title="Doctor Serial"
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl overflow-hidden shadow-xs ring-1 ring-slate-900/5 group-hover:scale-[1.03] transition-transform flex items-center justify-center p-0.5">
              <img
                src="/logo.png"
                alt="Doctor Serial"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm sm:text-lg md:text-xl font-bold tracking-tight text-slate-900 leading-tight">
                Doctor <span className="text-emerald-600">Serial</span>
              </span>
              <span className="text-[8px] sm:text-[10px] uppercase font-semibold tracking-wider text-slate-400 block -mt-0.5">
                {t('Chamber Booking', 'চেম্বার বুকিং')}
              </span>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => navigateTo('home')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                currentView === 'home'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {t('Home', 'হোম')}
            </button>
            <button
              onClick={() => navigateTo('doctors')}
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
                onClick={() => navigateTo('patient-dashboard')}
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
                onClick={() => navigateTo('doctor-dashboard')}
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
                onClick={() => navigateTo('compounder-dashboard')}
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
                onClick={() => navigateTo('admin-dashboard')}
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
          <div className="flex items-center gap-1.5 sm:gap-3">
            {user && (
              <NotificationBell
                role={user.role as any}
                onNavigate={navigateTo}
              />
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 p-1 sm:p-1.5 sm:pl-2 rounded-full border border-slate-200 hover:border-slate-300 bg-white transition cursor-pointer"
                >
                  <img
                    src={user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                    alt={user.name}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-100"
                  />
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[100px] md:max-w-[120px]">{user.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-medium">{user.role}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
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
                        onClick={() => navigateTo('patient-dashboard')}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <CalendarCheck className="w-4 h-4 text-slate-400" />
                        {t('My Appointments', 'আমার অ্যাপয়েন্টমেন্ট')}
                      </button>
                    )}

                    {user.role === 'doctor' && (
                      <button
                        onClick={() => navigateTo('doctor-dashboard')}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Stethoscope className="w-4 h-4 text-slate-400" />
                        {t('Doctor Dashboard', 'ডাক্তার ড্যাশবোর্ড')}
                      </button>
                    )}

                    {user.role === 'compounder' && (
                      <button
                        onClick={() => navigateTo('compounder-dashboard')}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <ClipboardList className="w-4 h-4 text-slate-400" />
                        {t('Compounder Panel', 'কম্পাউন্ডার প্যানেল')}
                      </button>
                    )}

                    {user.role === 'admin' && (
                      <button
                        onClick={() => navigateTo('admin-dashboard')}
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
                        navigateTo('home');
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
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => navigateTo('login')}
                  className="px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  {t('Sign In', 'সাইন ইন')}
                </button>
                <button
                  onClick={() => navigateTo('register-patient')}
                  className="hidden xs:inline-flex px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition cursor-pointer"
                >
                  {t('Register', 'নিবন্ধন')}
                </button>
              </div>
            )}

            {/* Mobile Menu Hamburger Button (visible on mobile < md) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile navigation menu"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition md:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-md px-4 py-3 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => navigateTo('home')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition ${
              currentView === 'home'
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Home className="w-4 h-4 text-emerald-600" />
            <span>{t('Home', 'হোম')}</span>
          </button>

          <button
            onClick={() => navigateTo('doctors')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition ${
              currentView === 'doctors'
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Search className="w-4 h-4 text-emerald-600" />
            <span>{t('Find Doctors & Chambers', 'ডাক্তার খুঁজুন')}</span>
          </button>

          <button
            onClick={() => navigateTo('emergency')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition ${
              currentView === 'emergency'
                ? 'bg-rose-50 text-rose-800'
                : 'text-rose-600 hover:bg-rose-50'
            }`}
          >
            <PhoneCall className="w-4 h-4 text-rose-500" />
            <span>{t('Emergency Helpline (999)', 'জরুরি সেবা (৯৯৯)')}</span>
          </button>

          {user?.role === 'patient' && (
            <button
              onClick={() => navigateTo('patient-dashboard')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition ${
                currentView === 'patient-dashboard'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>{t('My Appointments', 'আমার অ্যাপয়েন্টমেন্ট')}</span>
            </button>
          )}

          {user?.role === 'doctor' && (
            <button
              onClick={() => navigateTo('doctor-dashboard')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition ${
                currentView === 'doctor-dashboard'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-emerald-600" />
              <span>{t('Doctor Portal', 'ডাক্তার পোর্টাল')}</span>
            </button>
          )}

          {isCompounder && (
            <button
              onClick={() => navigateTo('compounder-dashboard')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition ${
                currentView === 'compounder-dashboard'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              <span>{t('Compounder Panel', 'কম্পাউন্ডার প্যানেল')}</span>
            </button>
          )}

          {user?.role === 'admin' && (
            <button
              onClick={() => navigateTo('admin-dashboard')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition ${
                currentView === 'admin-dashboard'
                  ? 'bg-amber-100 text-amber-900'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>{t('Admin Panel', 'অ্যাডমিন প্যানেল')}</span>
            </button>
          )}

          {!user && (
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                onClick={() => navigateTo('login')}
                className="py-2 rounded-xl border border-slate-200 text-slate-800 font-semibold text-xs text-center hover:bg-slate-50 transition"
              >
                {t('Sign In', 'সাইন ইন')}
              </button>
              <button
                onClick={() => navigateTo('register-patient')}
                className="py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs text-center hover:bg-emerald-700 transition"
              >
                {t('Register', 'নিবন্ধন')}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
