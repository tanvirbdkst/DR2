import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, MapPin, Phone, ShieldAlert, FileText, Scale } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const Footer: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const { t, lang } = useAuth();
  const [liveInfo, setLiveInfo] = useState({
    hotline: '09612-DAKTAR (09612-325827)',
    hours: '8:00 AM – 10:00 PM (Daily)',
    hoursBn: 'সকাল ৮:০০ – রাত ১০:০০ (প্রতিদিন)',
    address: 'Dhanmondi, Dhaka-1205, Bangladesh',
    addressBn: 'ধানমন্ডি, ঢাকা-১২০৫, বাংলাদেশ',
  });

  useEffect(() => {
    fetch('/api/public/site-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.emergency || data.hotline_phone) {
          setLiveInfo({
            hotline: data.emergency?.hotline_number || data.hotline_phone || '09612-DAKTAR (09612-325827)',
            hours: data.emergency?.operating_hours || '8:00 AM – 10:00 PM (Daily)',
            hoursBn: data.emergency?.operating_hours_bn || 'সকাল ৮:০০ – রাত ১০:০০ (প্রতিদিন)',
            address: data.emergency?.address || data.address || 'Dhanmondi, Dhaka-1205, Bangladesh',
            addressBn: data.emergency?.address_bn || 'ধানমন্ডি, ঢাকা-১২০৫, বাংলাদেশ',
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onNavigate?.('home')}
              aria-label="Doctor Serial — Home"
              title="Doctor Serial"
              className="flex items-center gap-3 cursor-pointer w-fit rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 group"
            >
              <img
                src="/logo.png"
                alt="Doctor Serial"
                width={1254}
                height={1254}
                className="h-12 w-auto max-w-[64px] object-contain rounded-xl ring-1 ring-white/10"
              />
              <div className="flex flex-col text-left">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  Doctor <span className="text-emerald-400">Serial</span>
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block -mt-0.5">
                  {t('Chamber Booking Platform', 'চেম্বার বুকিং প্ল্যাটফর্ম')}
                </span>
              </div>
            </button>
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
              <li><button onClick={() => onNavigate?.('emergency')} className="hover:text-rose-400 text-rose-300 transition cursor-pointer text-left flex items-center gap-1.5 font-semibold"><span>🚨 {t('Emergency & Helpline 999', 'জরুরী হেল্পলাইন ৯৯৯')}</span></button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
              {t('Policies & Governance', 'পলিসি ও শর্তাবলী')}
            </h4>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate?.('privacy')} className="hover:text-white transition cursor-pointer text-left">{t('Privacy Policy', 'গোপনীয়তা নীতি')}</button></li>
              <li><button onClick={() => onNavigate?.('terms')} className="hover:text-white transition cursor-pointer text-left">{t('Terms & Conditions', 'ব্যবহারের শর্তাবলী')}</button></li>
              <li><button onClick={() => onNavigate?.('register-doctor')} className="hover:text-white transition cursor-pointer text-left">{t('Doctor Registration', 'ডাক্তার রেজিস্ট্রেশন')}</button></li>
              <li><button onClick={() => onNavigate?.('doctor-dashboard')} className="hover:text-white transition cursor-pointer text-left">{t('Live Serial & Queue Management', 'লাইভ সিরিয়াল ব্যবস্থাপনা')}</button></li>
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white text-xs font-semibold uppercase tracking-wider">
                {t('Emergency & Helpline', 'জরুরী যোগাযোগ ও হেল্পলাইন')}
              </h4>
              <button
                onClick={() => onNavigate?.('emergency')}
                className="text-[10px] text-emerald-400 hover:underline font-bold cursor-pointer"
              >
                {t('View All', 'বিস্তারিত')}
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <button
                onClick={() => onNavigate?.('emergency')}
                className="flex items-center gap-2 hover:text-white transition text-left cursor-pointer w-full group"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="font-mono font-medium">{liveInfo.hotline}</span>
              </button>
              <p className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'bn' ? liveInfo.hoursBn : liveInfo.hours}</span>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'bn' ? liveInfo.addressBn : liveInfo.address}</span>
              </p>
              <div className="pt-1">
                <button
                  onClick={() => onNavigate?.('emergency')}
                  className="w-full py-2 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t('National Emergency (999, 16263, Ambulance)', 'জাতীয় জরুরি সেবা (৯৯৯, ১৬২৬৩)')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <p>© {new Date().getFullYear()} Doctor Serial Platform. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => onNavigate?.('privacy')} className="hover:text-slate-300 cursor-pointer">Privacy Policy</button>
            <span>•</span>
            <button onClick={() => onNavigate?.('terms')} className="hover:text-slate-300 cursor-pointer">Terms & Conditions</button>
            <span>•</span>
            <button onClick={() => onNavigate?.('emergency')} className="hover:text-rose-400 cursor-pointer">Emergency 999</button>
          </div>
        </div>
      </div>
    </footer>
  );
};
