import React from 'react';
import { Stethoscope, ShieldCheck, Clock, MapPin, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const Footer: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const { t } = useAuth();

  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-base font-bold tracking-tight">
                Daktar <span className="text-emerald-400">Serial</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              {t(
                'Direct chamber doctor serial booking platform in Bangladesh. Pick serial number, check live queue status, and visit chamber without long waiting.',
                'বাংলাদেশের আধুনিক ডাক্তার চেম্বার সিরিয়াল বুকিং প্ল্যাটফর্ম। সিরিয়াল নম্বর বুক করুন এবং দীর্ঘ লাইন ছাড়াই চেম্বারে সেবা নিন।'
              )}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>BMDC Verified Physicians Only</span>
            </div>
          </div>

          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
              {t('For Patients', 'রোগীদের জন্য')}
            </h4>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate?.('doctors')} className="hover:text-white transition cursor-pointer text-left">{t('Search Specialist Doctors', 'বিশেষজ্ঞ ডাক্তার খুঁজুন')}</button></li>
              <li><button onClick={() => onNavigate?.('doctors')} className="hover:text-white transition cursor-pointer text-left">{t('Book Chamber Serial', 'চেম্বার সিরিয়াল বুক করুন')}</button></li>
              <li><button onClick={() => onNavigate?.('patient-dashboard')} className="hover:text-white transition cursor-pointer text-left">{t('Check Serial Status', 'সিরিয়াল স্ট্যাটাস চেক করুন')}</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
              {t('For Doctors & Clinics', 'ডাক্তার ও ক্লিনিকের জন্য')}
            </h4>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate?.('register-doctor')} className="hover:text-white transition cursor-pointer text-left">{t('Doctor Registration', 'ডাক্তার রেজিস্ট্রেশন')}</button></li>
              <li><button onClick={() => onNavigate?.('doctor-dashboard')} className="hover:text-white transition cursor-pointer text-left">{t('Manage Chambers & Schedules', 'চেম্বার ও সময়সূচী নির্ধারণ')}</button></li>
              <li><button onClick={() => onNavigate?.('doctor-dashboard')} className="hover:text-white transition cursor-pointer text-left">{t('Live Serial & Queue Management', 'লাইভ সিরিয়াল ব্যবস্থাপনা')}</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
              {t('Administration & Support', 'অ্যাডমিন ও সাপোর্ট')}
            </h4>
            <div className="space-y-2.5 text-xs">
              <button
                onClick={() => onNavigate?.('admin-dashboard')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/20 font-medium transition cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>{t('Admin Panel Portal', 'অ্যাডমিন প্যানেল পোর্টাল')}</span>
                </span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                  Super Admin
                </span>
              </button>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>09612-DAKTAR (09612-325827)</span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>8:00 AM – 10:00 PM (Daily)</span>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dhanmondi, Dhaka-1205, Bangladesh</span>
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <p>© {new Date().getFullYear()} Daktar Serial MVP. All rights reserved. Phase 1 Core Booking Engine.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => onNavigate?.('admin-dashboard')}
              className="hover:text-amber-400 transition cursor-pointer underline underline-offset-4"
            >
              Admin Portal
            </button>
            <span>•</span>
            <span>Double Booking Protection</span>
            <span>•</span>
            <span>ACID Transactional Guarantee</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
