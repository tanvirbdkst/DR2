import React, { useState } from 'react';
import { Download, CheckCircle2, AlertCircle, Smartphone, ExternalLink, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Capacitor } from '@capacitor/core';

export const AndroidIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9992.4482.9992.9993s-.4482.9997-.9992.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993s-.4482.9997-.9993.9997m11.4045-6.02l1.997-3.459a.416.416 0 00-.152-.569.416.416 0 00-.568.152l-2.022 3.503c-1.543-.703-3.279-1.096-5.1365-1.096-1.8576 0-3.5935.393-5.1365 1.096L4.839 5.4454a.416.416 0 00-.568-.152.416.416 0 00-.152.569l1.997 3.459C2.688 11.038.352 14.735.352 19h23.296c0-4.265-2.336-7.962-5.7665-9.6786" />
  </svg>
);

interface DownloadApkButtonProps {
  variant?: 'hero' | 'navbar' | 'footer' | 'banner' | 'card';
  className?: string;
}

export const DownloadApkButton: React.FC<DownloadApkButtonProps> = ({
  variant = 'hero',
  className = '',
}) => {
  const { t, lang } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<'not_found' | 'already_native' | 'success'>('not_found');
  const [isChecking, setIsChecking] = useState(false);

  const downloadUrl = '/downloads/daktar-serial.apk';

  const handleDownload = async (e: React.MouseEvent) => {
    // If running inside Capacitor Android native webview, notify user
    if (Capacitor.isNativePlatform()) {
      e.preventDefault();
      setModalStatus('already_native');
      setModalOpen(true);
      return;
    }

    setIsChecking(true);
    try {
      // Check if APK exists on server
      const res = await fetch(downloadUrl, { method: 'HEAD' });
      if (!res.ok) {
        // If file doesn't exist yet on server, prevent standard browser 404 navigation and show helpful modal
        e.preventDefault();
        setModalStatus('not_found');
        setModalOpen(true);
      } else {
        // File exists! Proceed with native download
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'daktar-serial.apk';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      // In case HEAD request fails due to network, fallback to direct anchor download
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'daktar-serial.apk';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsChecking(false);
    }
  };

  // Render modal
  const renderModal = () => {
    if (!modalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 relative space-y-4">
          <button
            onClick={() => setModalOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {modalStatus === 'already_native' ? (
            <div className="text-center space-y-3 pt-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {t('You are already using the Android App!', 'আপনি ইতিমধ্যে অ্যান্ড্রয়েড অ্যাপে আছেন!')}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t(
                  'The Daktar Serial official Android app is currently active on your device with full push notifications and instant chamber serial booking.',
                  'আপনার ডিভাইসে ডাক্তার সিরিয়াল অফিশিয়াল অ্যান্ড্রয়েড অ্যাপ সক্রিয় রয়েছে। সকল সুবিধা ও লাইভ নোটিফিকেশন চালু আছে।'
                )}
              </p>
              <button
                onClick={() => setModalOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition"
              >
                {t('Continue', 'ঠিক আছে')}
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AndroidIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {t('Android APK Download Notice', 'অ্যান্ড্রয়েড অ্যাপ ডাউনলোড তথ্য')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('File: daktar-serial.apk', 'ফাইল: daktar-serial.apk (ডাক্তার সিরিয়াল)')}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-2">
                <p className="font-semibold flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  {t('APK File Sync in Progress', 'APK ফাইলটি সার্ভারে আপলোড করা হচ্ছে')}
                </p>
                <p className="leading-relaxed text-slate-700">
                  {t(
                    'The production Android APK file is currently being deployed to the server. If you are the administrator, please place the built APK at the specified path.',
                    'অ্যান্ড্রয়েড অ্যাপের সর্বশেষ APK ফাইলটি সার্ভারে সিঙ্ক হচ্ছে। আপনি অ্যাডমিনিস্ট্রেটর হলে বিল্ড করা APK ফাইলটি সার্ভারের নির্ধারিত স্থানে রাখুন।'
                  )}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-mono text-slate-700 space-y-1">
                <span className="font-bold text-slate-900 block font-sans text-xs">
                  {t('Required File Location on Server:', 'সার্ভারে ফাইলের সঠিক স্থান:')}
                </span>
                <div className="bg-slate-900 text-emerald-400 p-2 rounded-lg break-all select-all text-[11px]">
                  public/downloads/daktar-serial.apk
                </div>
                <p className="text-[10px] text-slate-500 font-sans mt-1">
                  Source: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">android/app/build/outputs/apk/debug/app-debug.apk</code>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition"
                >
                  {t('Close', 'বন্ধ করুন')}
                </button>
                <a
                  href={downloadUrl}
                  download="daktar-serial.apk"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('Retry Direct Download', 'পুনরায় ডাউনলোড')}</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 1. Hero variant
  if (variant === 'hero') {
    return (
      <>
        <div className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isChecking}
            title="Download Daktar Serial Android APK"
            className="group relative inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <AndroidIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[10px] sm:text-[11px] font-normal text-emerald-100 uppercase tracking-wider">
                {t('Direct Android APK', 'সরাসরি ইনস্টল করুন')}
              </span>
              <span className="text-xs sm:text-sm font-extrabold tracking-wide text-white">
                {t('Download Android App', 'অ্যান্ড্রয়েড অ্যাপ ডাউনলোড')}
              </span>
            </div>
            <div className="ml-1 pl-2 border-l border-white/20">
              <Download className="w-4 h-4 text-emerald-100 group-hover:translate-y-0.5 transition-transform" />
            </div>
          </button>
        </div>
        {renderModal()}
      </>
    );
  }

  // 2. Navbar variant
  if (variant === 'navbar') {
    return (
      <>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isChecking}
          title="Download Daktar Serial Android App"
          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 transition shadow-2xs cursor-pointer group ${className}`}
        >
          <AndroidIcon className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform shrink-0" />
          <span className="hidden sm:inline">{t('Download App', 'অ্যাপ ডাউনলোড')}</span>
          <span className="sm:hidden">{t('App', 'অ্যাপ')}</span>
          <Download className="w-3 h-3 text-emerald-600 group-hover:translate-y-0.5 transition-transform" />
        </button>
        {renderModal()}
      </>
    );
  }

  // 3. Footer variant
  if (variant === 'footer') {
    return (
      <>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isChecking}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition text-xs font-medium cursor-pointer w-full sm:w-auto ${className}`}
        >
          <AndroidIcon className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[10px] text-slate-400">{t('Available for Android', 'অ্যান্ড্রয়েড ফোনের জন্য')}</span>
            <span className="font-semibold text-emerald-400">{t('Download Android App', 'অ্যান্ড্রয়েড অ্যাপ ডাউনলোড')}</span>
          </div>
          <Download className="w-3.5 h-3.5 ml-auto text-slate-400" />
        </button>
        {renderModal()}
      </>
    );
  }

  // 4. Banner / Card variant for Home Page feature showcase
  return (
    <>
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-6 sm:p-8 border border-slate-700/60 shadow-xl ${className}`}>
        {/* Decorative background circle */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <AndroidIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('Daktar Serial Mobile Experience', 'ডাক্তার সিরিয়াল অফিশিয়াল মোবাইল অ্যাপ')}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {t('Download Daktar Serial Android App', 'আপনার ফোনে ডাক্তার সিরিয়াল অ্যাপ ইনস্টল করুন')}
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              {t(
                'Get faster doctor appointment bookings, live chamber queue updates, push notification alerts, and access your serial slips anytime right from your Android device.',
                'দ্রুত চেম্বার সিরিয়াল বুকিং, লাইভ কিউ ট্র্যাকিং, তাৎক্ষণিক পুশ নোটিফিকেশন এবং ডিজিটাল অ্যাপয়েন্টমেন্ট রসিদ পেতে সরাসরি অ্যান্ড্রয়েড অ্যাপটি ডাউনলোড করুন।'
              )}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{t('Instant Push Alerts', 'লাইভ নোটিফিকেশন')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{t('Chamber Queue Status', 'রিয়েল-টাইম সিরিয়াল')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{t('No Queue Waiting', 'বিনা লাইনে সেবা')}</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 flex flex-col items-center md:items-end justify-center gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isChecking}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all cursor-pointer"
            >
              <AndroidIcon className="w-6 h-6 text-slate-950" />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] uppercase tracking-wider text-emerald-950 font-bold">
                  {t('Direct APK Download', 'সরাসরি ডাউনলোড')}
                </span>
                <span className="text-sm font-black text-slate-950">
                  {t('অ্যান্ড্রয়েড অ্যাপ ডাউনলোড', 'অ্যান্ড্রয়েড অ্যাপ ডাউনলোড')}
                </span>
              </div>
              <Download className="w-5 h-5 text-slate-950 ml-1" />
            </button>

            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('Free • Safe APK • Package: bd.daktarserial.app', 'সম্পূর্ণ ফ্রি • নিরাপদ APK')}</span>
            </span>
          </div>
        </div>
      </div>
      {renderModal()}
    </>
  );
};
