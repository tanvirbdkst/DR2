import React, { useState } from 'react';
import {
  X, Copy, Check, Share2, MessageCircle, ExternalLink, ShieldCheck, Stethoscope
} from 'lucide-react';
import { DoctorProfile } from '../types.js';
import { useAuth } from '../context/AuthContext.js';

interface DoctorShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: DoctorProfile;
}

export const DoctorShareModal: React.FC<DoctorShareModalProps> = ({ isOpen, onClose, doctor }) => {
  const { t } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !doctor) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const slugOrId = doctor.slug || doctor.id;
  const profileUrl = `${origin}/doctor/${slugOrId}`;

  const doctorSpecialtiesText =
    doctor.specialties && doctor.specialties.length > 0
      ? doctor.specialties.map((s) => s.name).join(' + ')
      : doctor.specialty_name || 'Medical Specialist';

  const shareTitle = `${doctor.title} ${doctor.name} - ${doctorSpecialtiesText}`;
  const shareText = `${doctor.title} ${doctor.name} (${doctor.qualification || doctorSpecialtiesText})\nBMDC: ${doctor.bmdc_number || 'Verified'}\nঅ্যাপয়েন্টমেন্ট বা চেম্বার সিরিয়াল বুকিং করতে নিচের লিংকে ক্লিক করুন:\n${profileUrl}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(profileUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = profileUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy profile link:', err);
    }
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleMessengerShare = () => {
    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `fb-messenger://share/?link=${encodeURIComponent(profileUrl)}`;
      setTimeout(() => {
        window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(profileUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(profileUrl)}`, '_blank');
      }, 700);
    } else {
      window.open(
        `https://www.facebook.com/dialog/send?link=${encodeURIComponent(profileUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(profileUrl)}`,
        '_blank',
        'noopener,noreferrer,width=600,height=500'
      );
    }
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(`Doctor Appointment & Serial Booking: ${doctor.title} ${doctor.name} (${doctorSpecialtiesText})`)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  const handleDeviceNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `Book appointment serial for ${doctor.title} ${doctor.name} on Daktar Serial`,
          url: profileUrl,
        });
      } catch {
        // User cancelled share or aborted
      }
    } else {
      handleCopyLink();
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all my-8">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {t('Share Doctor Profile', 'ডাক্তারের প্রোফাইল শেয়ার করুন')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {t('Anyone with this link can view profile and book serial', 'এই লিংকের মাধ্যমে যে কেউ সরাসরি প্রোফাইল ও সিরিয়াল বুকিং করতে পারবেন')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200/70 text-slate-500 flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          {/* Doctor Mini Card Preview */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <img
              src={doctor.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'}
              alt={doctor.name}
              className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  BMDC: {doctor.bmdc_number}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm truncate mt-0.5">
                {doctor.title} {doctor.name}
              </h4>
              <p className="text-[11px] text-slate-600 truncate">
                {doctor.qualification}
              </p>
              <p className="text-[10px] text-emerald-700 font-medium truncate mt-0.5">
                {doctorSpecialtiesText}
              </p>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2.5">
              {t('Share via Social Media:', 'সোশ্যাল মিডিয়ায় শেয়ার করুন:')}
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {/* Facebook */}
              <button
                type="button"
                onClick={handleFacebookShare}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-[#1877F2] hover:bg-[#1877F2]/5 transition group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-[11px] font-medium text-slate-700 mt-1.5 group-hover:text-[#1877F2]">
                  Facebook
                </span>
              </button>

              {/* WhatsApp */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-[#25D366] hover:bg-[#25D366]/5 transition group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                </div>
                <span className="text-[11px] font-medium text-slate-700 mt-1.5 group-hover:text-[#25D366]">
                  WhatsApp
                </span>
              </button>

              {/* Messenger */}
              <button
                type="button"
                onClick={handleMessengerShare}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-[#0084FF] hover:bg-[#0084FF]/5 transition group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00B2FF] via-[#006AFF] to-[#9933FF] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                  <MessageCircle className="w-5 h-5 fill-current" />
                </div>
                <span className="text-[11px] font-medium text-slate-700 mt-1.5 group-hover:text-[#0084FF]">
                  Messenger
                </span>
              </button>

              {/* X (Twitter) */}
              <button
                type="button"
                onClick={handleTwitterShare}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <span className="text-[11px] font-medium text-slate-700 mt-1.5 group-hover:text-slate-900">
                  X
                </span>
              </button>
            </div>
          </div>

          {/* Permanent Public Profile URL & Copy Link Bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                {t('Unique Public Profile Link', 'অনন্য পাবলিক প্রোফাইল লিংক')}:
              </label>
              {copied && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  {t('Link copied!', 'লিংক কপি হয়েছে!')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 bg-slate-50/80 focus-within:border-emerald-500 focus-within:bg-white transition">
              <input
                type="text"
                readOnly
                value={profileUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 bg-transparent px-2.5 py-1 text-xs text-slate-800 font-mono outline-hidden select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{t('Copied', 'কপি হয়েছে')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('Copy Link', 'লিংক কপি')}</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              {t(
                'This link is permanent and can be posted anywhere. Patients can open it on any device to book serials without logging in first.',
                'এই লিংকটি স্থায়ী। রোগীরা যেকোনো ডিভাইসে লগইন ছাড়াই সরাসরি চেম্বার ও সিরিয়াল দেখতে পারবেন।'
              )}
            </p>
          </div>

          {/* Native Device Share (Optional extra for mobile browsers) */}
          {canNativeShare && (
            <button
              type="button"
              onClick={handleDeviceNativeShare}
              className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-slate-500" />
              <span>{t('More Sharing Options (Other Apps)...', 'অন্যান্য অ্যাপে শেয়ার করুন...')}</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            {t('Done', 'সম্পন্ন')}
          </button>
        </div>
      </div>
    </div>
  );
};
