import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, MapPin, Phone, ShieldAlert, Sparkles, MessageCircle, Globe, Heart, Activity } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext.js';
import { AndroidIcon } from './DownloadApkButton.js';

export const Footer: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const { t, lang } = useAuth();
  const shouldReduceMotion = useReducedMotion();
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
    <motion.footer
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6 }}
      className="relative bg-gradient-to-b from-[#0A192F] via-[#091528] to-[#050D1B] text-slate-400 border-t border-slate-800/80 text-xs overflow-hidden"
    >
      {/* Carefinity 3D background depth lighting */}
      <div className="absolute top-0 right-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onNavigate?.('home')}
              aria-label="Doctor Serial — Home"
              title="Doctor Serial"
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 group text-left max-w-full"
            >
              <div className="relative w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl overflow-hidden ring-1 ring-white/10 bg-slate-800 flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform">
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl animate-pulse pointer-events-none" />
                <img
                  src="/logo.png"
                  alt="Doctor Serial"
                  className="w-full h-full object-contain relative z-10"
                />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  Doctor <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 font-extrabold">Serial</span>
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block -mt-0.5 truncate">
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
            <div className="flex items-center gap-2 text-[11px] text-cyan-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-cyan-500 shrink-0" />
              <span>BMDC Verified Physicians Only</span>
            </div>

            {/* Social & Channel Icons with Animated Hover */}
            <div className="pt-2 flex items-center gap-2">
              <a
                href="https://wa.me/8801700112233"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-blue-600 hover:text-white text-slate-300 flex items-center justify-center transition-all duration-200 shadow-xs hover:scale-110"
                aria-label="WhatsApp Support"
                title="WhatsApp Support"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => onNavigate?.('emergency')}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-rose-600 hover:text-white text-slate-300 flex items-center justify-center transition-all duration-200 shadow-xs hover:scale-110 cursor-pointer"
                aria-label="Emergency Helpline"
                title="Emergency Helpline"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.('doctors')}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-cyan-600 hover:text-white text-slate-300 flex items-center justify-center transition-all duration-200 shadow-xs hover:scale-110 cursor-pointer"
                aria-label="Explore Doctors"
                title="Explore Doctors"
              >
                <Globe className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* For Patients */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
              {t('For Patients', 'রোগীদের জন্য')}
            </h4>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate?.('doctors')} className="hover:text-cyan-400 transition cursor-pointer text-left">{t('Search Specialist Doctors', 'বিশেষজ্ঞ ডাক্তার খুঁজুন')}</button></li>
              <li><button onClick={() => onNavigate?.('doctors')} className="hover:text-cyan-400 transition cursor-pointer text-left">{t('Book Chamber Serial', 'চেম্বার সিরিয়াল বুক করুন')}</button></li>
              <li><button onClick={() => onNavigate?.('patient-dashboard')} className="hover:text-cyan-400 transition cursor-pointer text-left">{t('Check Serial Status', 'সিরিয়াল স্ট্যাটাস চেক করুন')}</button></li>
              <li>
                <a
                  href="/downloads/daktar-serial.apk"
                  download="daktar-serial.apk"
                  className="text-cyan-400 hover:text-white transition cursor-pointer text-left flex items-center gap-1.5 font-medium"
                >
                  <AndroidIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{t('Download Android App', 'অ্যান্ড্রয়েড অ্যাপ ডাউনলোড')}</span>
                </a>
              </li>
              <li><button onClick={() => onNavigate?.('emergency')} className="hover:text-rose-400 text-rose-300 transition cursor-pointer text-left flex items-center gap-1.5 font-semibold"><span>🚨 {t('Emergency & Helpline 999', 'জরুরী হেল্পলাইন ৯৯৯')}</span></button></li>
            </ul>
          </div>

          {/* Policies & Governance */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
              {t('Policies & Governance', 'পলিসি ও শর্তাবলী')}
            </h4>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate?.('privacy')} className="hover:text-cyan-400 transition cursor-pointer text-left">{t('Privacy Policy', 'গোপনীয়তা নীতি')}</button></li>
              <li><button onClick={() => onNavigate?.('terms')} className="hover:text-cyan-400 transition cursor-pointer text-left">{t('Terms & Conditions', 'ব্যবহারের শর্তাবলী')}</button></li>
              <li><button onClick={() => onNavigate?.('register-doctor')} className="hover:text-cyan-400 transition cursor-pointer text-left">{t('Doctor Registration', 'ডাক্তার রেজিস্ট্রেশন')}</button></li>
              <li><button onClick={() => onNavigate?.('doctor-dashboard')} className="hover:text-cyan-400 transition cursor-pointer text-left">{t('Live Serial & Queue Management', 'লাইভ সিরিয়াল ব্যবস্থাপনা')}</button></li>
            </ul>
          </div>

          {/* Emergency & Contacts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white text-xs font-semibold uppercase tracking-wider">
                {t('Emergency & Helpline', 'জরুরী যোগাযোগ ও হেল্পলাইন')}
              </h4>
              <button
                onClick={() => onNavigate?.('emergency')}
                className="text-[10px] text-cyan-400 hover:underline font-bold cursor-pointer"
              >
                {t('View All', 'বিস্তারিত')}
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <button
                onClick={() => onNavigate?.('emergency')}
                className="flex items-center gap-2 hover:text-white transition text-left cursor-pointer w-full group"
              >
                <Phone className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="font-mono font-medium">{liveInfo.hotline}</span>
              </button>
              <p className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'bn' ? liveInfo.hoursBn : liveInfo.hours}</span>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
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
          <p className="flex items-center gap-1.5">
            <span>© {new Date().getFullYear()} Doctor Serial Platform.</span>
            <span>Inspired by Carefinity digital healthcare</span>
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => onNavigate?.('privacy')} className="hover:text-slate-300 cursor-pointer">Privacy Policy</button>
            <span>•</span>
            <button onClick={() => onNavigate?.('terms')} className="hover:text-slate-300 cursor-pointer">Terms & Conditions</button>
            <span>•</span>
            <button onClick={() => onNavigate?.('emergency')} className="hover:text-rose-400 cursor-pointer">Emergency 999</button>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};
