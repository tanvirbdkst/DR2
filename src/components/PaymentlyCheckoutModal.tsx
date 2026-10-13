import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Info,
  Check,
  Copy,
  CreditCard,
  Lock,
} from 'lucide-react';

export interface BookingCheckoutInfo {
  doctorName: string;
  doctorTitle?: string;
  chamberName: string;
  scheduleDate: string;
  appointmentTime: string;
  serialNumber: number;
  patientName: string;
  patientPhone: string;
  fee: number;
  bookingFee: number;
  gatewayFee?: number;
  totalPayable?: number;
  appointmentId: string;
  transactionRef: string;
  paymentUrl?: string;
  invoiceId?: string;
}

export type MfsMethodKey = 'bkash' | 'nagad' | 'rocket' | 'upay' | 'all';

interface MethodMeta {
  id: MfsMethodKey;
  name: string;
  nameBn: string;
  brandColor: string;
  badgeBg: string;
  badgeText: string;
  active: boolean;
  instructionEn: string;
  instructionBn: string;
  trxPlaceholder: string;
  smsSender: string;
  sampleTrx: string;
  activationNoticeEn?: string;
  activationNoticeBn?: string;
}

interface PaymentlyCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingCheckoutInfo | null;
  language?: 'en' | 'bn';
  onPaymentSuccess: (data: any) => void;
  onPendingVerification: (data: any) => void;
}

export const PaymentlyCheckoutModal: React.FC<PaymentlyCheckoutModalProps> = ({
  isOpen,
  onClose,
  booking,
  language = 'en',
  onPaymentSuccess,
  onPendingVerification,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<MfsMethodKey>('bkash');
  const [trxId, setTrxId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [appOpenAttempted, setAppOpenAttempted] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [verificationState, setVerificationState] = useState<'idle' | 'success' | 'pending'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeMethodsList, setActiveMethodsList] = useState<string[]>(['bkash']);
  const [methodsData, setMethodsData] = useState<any[]>([]);

  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);

  // Detect device platform
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  // Fetch active supported methods from backend on modal open
  useEffect(() => {
    if (isOpen) {
      setTrxId('');
      setSubmitting(false);
      setErrorMsg(null);
      setAppOpenAttempted(false);
      setVerificationState('idle');
      setStatusMessage(null);

      // Fetch dynamic active methods from server
      fetch('/api/payments/methods')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && Array.isArray(data.enabledMethods)) {
            setActiveMethodsList(data.enabledMethods);
            if (Array.isArray(data.methods)) {
              setMethodsData(data.methods);
            }
            // If currently selected method is inactive, auto-switch to first active method
            if (!data.enabledMethods.includes(selectedMethod) && data.enabledMethods.length > 0) {
              setSelectedMethod(data.enabledMethods[0] as MfsMethodKey);
            }
          }
        })
        .catch(() => {
          // Default fallback: bKash is confirmed active
          setActiveMethodsList(['bkash']);
        });
    }
  }, [isOpen]);

  if (!isOpen || !booking) return null;

  // Method metadata configuration
  const methodsMap: Record<MfsMethodKey, MethodMeta> = {
    bkash: {
      id: 'bkash',
      name: 'bKash',
      nameBn: 'বিকাশ',
      brandColor: '#E2136E',
      badgeBg: 'bg-[#E2136E]/10 text-[#E2136E] border-[#E2136E]/30',
      badgeText: 'bKash MFS',
      active: activeMethodsList.includes('bkash'),
      instructionEn: 'Send Money via bKash App or Paymently Gateway',
      instructionBn: 'বিকাশ অ্যাপে সেন্ড মানি বা পেমেন্টলি গেটওয়ের মাধ্যমে পরিশোধ করুন',
      trxPlaceholder: 'e.g. BLK92X4KP1',
      smsSender: 'bKash (16247)',
      sampleTrx: 'BLK92X4KP1',
      activationNoticeEn: 'bKash is active in Paymently merchant dashboard.',
      activationNoticeBn: 'Paymently মার্চেন্ট ড্যাশবোর্ডে bKash চ্যানেল সক্রিয় রয়েছে।',
    },
    nagad: {
      id: 'nagad',
      name: 'Nagad',
      nameBn: 'নগদ',
      brandColor: '#F7941D',
      badgeBg: 'bg-[#F7941D]/10 text-[#F7941D] border-[#F7941D]/30',
      badgeText: 'Nagad MFS',
      active: activeMethodsList.includes('nagad'),
      instructionEn: 'Pay via Paymently Nagad Gateway',
      instructionBn: 'পেমেন্টলি নগদ গেটওয়ের মাধ্যমে পরিশোধ করুন',
      trxPlaceholder: 'e.g. 72K8PL9J',
      smsSender: 'Nagad (16167)',
      sampleTrx: '72K8PL9J',
      activationNoticeEn:
        'To enable Nagad, activate the Nagad channel in your Paymently dashboard and set PAYMENTLY_ENABLED_METHODS in cPanel.',
      activationNoticeBn:
        'নগদ চালু করতে আপনার Paymently মার্চেন্ট ড্যাশবোর্ডে Nagad সক্রিয় করুন এবং cPanel-এ PAYMENTLY_ENABLED_METHODS-এ nagad যোগ করুন।',
    },
    rocket: {
      id: 'rocket',
      name: 'Rocket',
      nameBn: 'রকেট',
      brandColor: '#8C3494',
      badgeBg: 'bg-[#8C3494]/10 text-[#8C3494] border-[#8C3494]/30',
      badgeText: 'Rocket DBBL',
      active: activeMethodsList.includes('rocket'),
      instructionEn: 'Pay via Paymently Rocket Gateway',
      instructionBn: 'পেমেন্টলি রকেট গেটওয়ের মাধ্যমে পরিশোধ করুন',
      trxPlaceholder: 'e.g. 3829104821',
      smsSender: 'Rocket (16216)',
      sampleTrx: '3829104821',
      activationNoticeEn:
        'To enable Rocket, activate the Rocket channel in your Paymently dashboard and set PAYMENTLY_ENABLED_METHODS in cPanel.',
      activationNoticeBn:
        'রকেট চালু করতে আপনার Paymently মার্চেন্ট ড্যাশবোর্ডে Rocket সক্রিয় করুন এবং cPanel-এ PAYMENTLY_ENABLED_METHODS-এ rocket যোগ করুন।',
    },
    upay: {
      id: 'upay',
      name: 'Upay',
      nameBn: 'উপায়',
      brandColor: '#005BAA',
      badgeBg: 'bg-[#005BAA]/10 text-[#005BAA] border-[#005BAA]/30',
      badgeText: 'Upay UCB',
      active: activeMethodsList.includes('upay'),
      instructionEn: 'Pay via Paymently Upay Gateway',
      instructionBn: 'পেমেন্টলি উপায় গেটওয়ের মাধ্যমে পরিশোধ করুন',
      trxPlaceholder: 'e.g. UP91248590',
      smsSender: 'UPAY (16419)',
      sampleTrx: 'UP91248590',
      activationNoticeEn:
        'To enable Upay, activate the Upay channel in your Paymently dashboard and set PAYMENTLY_ENABLED_METHODS in cPanel.',
      activationNoticeBn:
        'উপায় চালু করতে আপনার Paymently মার্চেন্ট ড্যাশবোর্ডে Upay সক্রিয় করুন এবং cPanel-এ PAYMENTLY_ENABLED_METHODS-এ upay যোগ করুন।',
    },
    all: {
      id: 'all',
      name: 'All MFS & Cards',
      nameBn: 'সকল মাধ্যম (গেটওয়ে)',
      brandColor: '#0F766E',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      badgeText: 'Paymently Web',
      active: true,
      instructionEn: 'Open Paymently Hosted Checkout Page (Supports all enabled channels)',
      instructionBn: 'পেমেন্টলি হোস্ট করা চেকআউট পেজে যান (সব সক্রিয় মেথড প্রদর্শিত হবে)',
      trxPlaceholder: '',
      smsSender: 'Paymently',
      sampleTrx: '',
    },
  };

  const currentMethod = methodsMap[selectedMethod];
  const isCurrentActive = currentMethod.active;

  // Fee calculation (Requirement 5)
  const bookingFee = Number(booking.bookingFee || 10).toFixed(2);
  const gatewaySurcharge = Number(booking.gatewayFee || 2).toFixed(2);
  const totalPayable = Number(booking.totalPayable || 12).toFixed(2);

  /**
   * Attempts to open the bKash application on supported devices using documented Android Intent / App Links.
   * If on desktop or if the app is not installed, user falls back to Paymently Web Gateway.
   */
  const handleOpenBkash = () => {
    setAppOpenAttempted(true);
    setErrorMsg(null);

    if (isAndroid) {
      const androidIntentUri = 'intent://#Intent;package=com.bKash.customerapp;scheme=bkash;end;';
      try {
        window.location.href = androidIntentUri;
      } catch {
        window.location.href = 'bkash://';
      }
    } else if (isMobile) {
      window.location.href = 'bkash://';
    } else {
      if (booking.paymentUrl) {
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = booking.paymentUrl;
          } else {
            window.location.href = booking.paymentUrl;
          }
        } catch {
          window.location.href = booking.paymentUrl;
        }
      }
    }
  };

  /**
   * Opens the official Paymently Web Checkout page as a reliable, direct gateway.
   */
  const handleOpenPaymentlyWeb = () => {
    if (booking.paymentUrl) {
      try {
        if (window.top && window.top !== window) {
          window.top.location.href = booking.paymentUrl;
        } else {
          window.location.href = booking.paymentUrl;
        }
      } catch {
        window.location.href = booking.paymentUrl;
      }
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  /**
   * Submits the user-entered TrxID for method-specific verification.
   * Never marks payment paid merely because a TrxID was entered (Requirement 6):
   * Uses verified Paymently server-side API if supported; otherwise records pending state for admin review.
   */
  const handleSubmitTrxId = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isCurrentActive) {
      setErrorMsg(
        t(
          `${currentMethod.name} is currently inactive in your Paymently merchant gateway. Please select an active method.`,
          `পেমেন্টলিতে ${currentMethod.nameBn} বর্তমানে নিষ্ক্রিয় রয়েছে। অনুগ্রহ করে সক্রিয় মেথড বেছে নিন।`
        )
      );
      return;
    }

    if (!trxId.trim() || trxId.trim().length < 6) {
      setErrorMsg(
        t(
          `Please enter a valid ${currentMethod.name} Transaction ID (at least 6-8 characters).`,
          `অনুগ্রহ করে সঠিক ${currentMethod.nameBn} ট্রানজেকশন আইডি (কমপক্ষে ৬-৮ ডিজিট/অক্ষর) লিখুন।`
        )
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/payments/submit-trxid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionRef: booking.transactionRef,
          appointmentId: booking.appointmentId,
          trxId: trxId.trim().toUpperCase(),
          invoiceId: booking.invoiceId,
          method: selectedMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message_bn || data.message || 'Failed to submit Transaction ID.');
        setSubmitting(false);
        return;
      }

      if (data.verified && data.status === 'paid') {
        setVerificationState('success');
        setStatusMessage(
          t(
            'Payment verified successfully by Paymently gateway! Your serial is confirmed.',
            'পেমেন্ট সফলভাবে যাচাই হয়েছে! আপনার সিরিয়াল নিশ্চিত করা হয়েছে।'
          )
        );
        setTimeout(() => {
          onPaymentSuccess(data);
          onClose();
        }, 1500);
      } else {
        // Pending admin or gateway verification
        setVerificationState('pending');
        setStatusMessage(
          t(
            `Your ${currentMethod.name} TrxID has been received and is pending verification. Your serial has been reserved while our team verifies the payment.`,
            `আপনার ${currentMethod.nameBn} TrxID জমা হয়েছে এবং যাচাইয়ের জন্য অপেক্ষমাণ। যাচাই চলাকালীন আপনার সিরিয়ালটি সংরক্ষিত থাকবে।`
          )
        );
        setTimeout(() => {
          onPendingVerification(data);
        }, 2500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while submitting TrxID.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-6">
        {/* Dynamic Header with active method accent */}
        <div
          className="px-5 py-4 text-white flex items-center justify-between transition-colors duration-300"
          style={{ backgroundColor: currentMethod.brandColor }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-lg">
              ৳
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                {t('Paymently Checkout — MFS Payment', 'পেমেন্টলি চেকআউট — এমএফএস পেমেন্ট')}
              </h3>
              <p className="text-xs text-white/90 font-medium">
                {t('Daktar Serial Official Booking Gateway', 'ডাক্তার সিরিয়াল অফিশিয়াল গেটওয়ে')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Booking Summary Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t('Chamber Serial Reserved', 'সিরিয়াল সংরক্ষিত')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                Serial #{booking.serialNumber < 10 ? `0${booking.serialNumber}` : booking.serialNumber}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-semibold">{t('Doctor', 'ডাক্তার')}</p>
                <p className="font-bold text-slate-800 truncate">{booking.doctorName}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-semibold">{t('Chamber & Date', 'চেম্বার ও তারিখ')}</p>
                <p className="font-bold text-slate-800 truncate">{booking.scheduleDate}</p>
              </div>
            </div>

            {/* Transparent Fee Breakdown (Requirement 5) */}
            <div className="pt-2 border-t border-slate-200/60 space-y-1 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>{t('Serial Booking Fee:', 'সিরিয়াল বুকিং ফি:')}</span>
                <span className="font-bold text-slate-800">৳{bookingFee} BDT</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>{t('Paymently MFS Gateway Fee:', 'পেমেন্টলি গেটওয়ে চার্জ:')}</span>
                <span className="font-semibold text-slate-600">+ ৳{gatewaySurcharge} BDT</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200 text-slate-800">
                <span className="font-bold">{t('Total Payable on Gateway:', 'গেটওয়েতে মোট প্রদেয়:')}</span>
                <span className="text-sm font-black text-emerald-700">৳{totalPayable} BDT</span>
              </div>
            </div>
          </div>

          {/* Transparent Notice */}
          <div className="flex items-start gap-2 bg-blue-50/70 border border-blue-200/80 rounded-xl p-2.5 text-[11px] text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {t('Doctor consultation visit fee is payable at chamber reception', 'ডাক্তারের ভিজিট ফি চেম্বারে সরাসরি প্রদেয়')}
              </p>
              <p className="text-blue-700 mt-0.5 text-[10px] leading-relaxed">
                {t(
                  'Only the BDT 10.00 serial booking fee (+ BDT 2.00 gateway surcharge) is paid online to guarantee your slot.',
                  'সিরিয়াল নিশ্চিত করার জন্য শুধুমাত্র নির্ধারিত ৳১০ বুকিং ফি (+ ৳২ গেটওয়ে চার্জ) অনলাইনে পরিশোধ করতে হয়।'
                )}
              </p>
            </div>
          </div>

          {/* STEP 1: Method Selection (Requirements 1, 2, 9) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>{t('Select Payment Method', 'পেমেন্ট মেথড নির্বাচন করুন')}</span>
              </p>
              <button
                type="button"
                onClick={() => handleCopy(booking.appointmentId)}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                title="Copy Appointment ID as Reference"
              >
                {copiedRef ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>
                  Ref: <strong className="font-mono text-slate-700">{booking.appointmentId}</strong>
                </span>
              </button>
            </div>

            {/* MFS Selection Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['bkash', 'nagad', 'rocket', 'upay'] as MfsMethodKey[]).map((mKey) => {
                const m = methodsMap[mKey];
                const isSelected = selectedMethod === mKey;
                const isActive = m.active;

                return (
                  <button
                    key={mKey}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(mKey);
                      setTrxId('');
                      setErrorMsg(null);
                    }}
                    className={`relative p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'border-2 shadow-sm font-bold bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                    style={{
                      borderColor: isSelected ? m.brandColor : undefined,
                    }}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: m.brandColor }}
                    />
                    <span className="text-xs font-bold text-slate-800">{m.name}</span>
                    <span className="text-[10px] text-slate-500">{m.nameBn}</span>

                    {/* Active vs Inactive Badge (Requirement 9) */}
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold border ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      {isActive ? t('Active', 'সক্রিয়') : t('Inactive', 'নিষ্ক্রিয়')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* All-in-One Gateway Option */}
            <button
              type="button"
              onClick={() => {
                setSelectedMethod('all');
                setErrorMsg(null);
              }}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                selectedMethod === 'all'
                  ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>{t('Paymently All-in-One Gateway (All MFS & Cards)', 'পেমেন্টলি অল-ইন-ওয়ান গেটওয়ে (সব মাধ্যম)')}</span>
              </div>
              <span className="text-[10px] text-emerald-700 underline flex items-center gap-0.5">
                {t('Open Page', 'পেজে যান')} <ExternalLink className="w-3 h-3" />
              </span>
            </button>
          </div>

          {/* STEP 2: Method-Specific Action & Guidance (Requirements 3, 4, 9) */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span
                className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px]"
                style={{ backgroundColor: currentMethod.brandColor }}
              >
                2
              </span>
              <span>{t(`Pay via ${currentMethod.name}`, `${currentMethod.nameBn}-এ পেমেন্ট করুন`)}</span>
            </p>

            {/* INACTIVE NOTICE IF METHOD IS DISABLED (Requirement 9) */}
            {!isCurrentActive && selectedMethod !== 'all' ? (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {t(
                        `${currentMethod.name} is currently inactive in Paymently account`,
                        `পেমেন্টলি অ্যাকাউন্টে ${currentMethod.nameBn} বর্তমানে সক্রিয় করা নেই`
                      )}
                    </p>
                    <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                      {t(
                        currentMethod.activationNoticeEn ||
                          'To enable this channel, activate it in your Paymently merchant dashboard and configure PAYMENTLY_ENABLED_METHODS on cPanel.',
                        currentMethod.activationNoticeBn ||
                          'এই মেথডটি চালু করতে আপনার Paymently মার্চেন্ট ড্যাশবোর্ডে চ্যানেলটি সক্রিয় করুন এবং cPanel-এ PAYMENTLY_ENABLED_METHODS যুক্ত করুন।'
                      )}
                    </p>
                  </div>
                </div>

                <div className="pt-1 border-t border-amber-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-amber-800">
                    {t('Use active methods or open gateway:', 'সক্রিয় মেথড বেছে নিন বা সরাসরি গেটওয়েতে যান:')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeMethodsList.length > 0) {
                        setSelectedMethod(activeMethodsList[0] as MfsMethodKey);
                      }
                    }}
                    className="font-bold text-amber-900 underline cursor-pointer"
                  >
                    {t('Switch to active method →', 'সক্রিয় মেথডে যান →')}
                  </button>
                </div>
              </div>
            ) : selectedMethod === 'bkash' ? (
              /* bKash Flow with Android Intent / Deep Link */
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleOpenBkash}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#E2136E] hover:bg-[#C60F5F] active:scale-[0.99] transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{t('Open bKash to Send Money', 'Open bKash to Send Money (বিকাশ অ্যাপ ওপেন করুন)')}</span>
                  <ExternalLink className="w-4 h-4 opacity-80" />
                </button>

                {/* Non-misleading disclaimer (Requirement 3) */}
                <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong>{t('Important Notice:', 'জরুরি তথ্য:')}</strong>{' '}
                    {t(
                      `Clicking opens your bKash app. Money is NOT sent automatically. You must log in, review details, send ৳${bookingFee} (or gateway amount ৳${totalPayable}), and confirm with PIN.`,
                      `বাটনে চাপলে বিকাশ অ্যাপ ওপেন হবে। টাকা স্বয়ংক্রিয়ভাবে কাটা হবে না। অ্যাপে প্রবেশ করে ৳${bookingFee} (বা গেটওয়ে প্রদেয় ৳${totalPayable}) সেন্ড মানি করে পিন দিয়ে নিশ্চিত করুন।`
                    )}
                  </p>
                </div>
              </div>
            ) : selectedMethod === 'all' ? (
              /* All-in-One Gateway Flow */
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleOpenPaymentlyWeb}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{t('Proceed to Paymently Web Checkout', 'পেমেন্টলি ওয়েব চেকআউটে প্রবেশ করুন')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {t(
                    'Opens the official Paymently checkout page with all active payment options enabled by the merchant.',
                    'পেমেন্টলির মূল চেকআউট পেজ ওপেন হবে যেখানে সক্রিয় সকল পেমেন্ট চ্যানেল উপলব্ধ থাকবে।'
                  )}
                </p>
              </div>
            ) : (
              /* Nagad, Rocket, Upay: Documented Paymently Web Checkout flow (Requirement 4) */
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleOpenPaymentlyWeb}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  style={{ backgroundColor: currentMethod.brandColor }}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>
                    {t(
                      `Proceed to ${currentMethod.name} Checkout on Paymently`,
                      `পেমেন্টলিতে ${currentMethod.nameBn} চেকআউটে যান`
                    )}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] text-slate-700 flex items-start gap-2">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    {t(
                      `Official ${currentMethod.name} payment is securely routed via Paymently Web Gateway. After completing payment, return here and enter the transaction ID.`,
                      `${currentMethod.nameBn} পেমেন্ট নিরাপদে পেমেন্টলি গেটওয়ের মাধ্যমে সম্পন্ন হবে। পেমেন্ট শেষে প্রাপ্ত ট্রানজেকশন আইডি নিচে দিন।`
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Desktop / Web Fallback for bKash */}
            {selectedMethod === 'bkash' && (!isAndroid || appOpenAttempted) && booking.paymentUrl && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleOpenPaymentlyWeb}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {!isMobile
                      ? t('Desktop user? Open Paymently Web Checkout →', 'কম্পিউটার ব্যবহারকারী? পেমেন্টলি ওয়েব পেজে যান →')
                      : t('App not opening? Open Paymently Web Checkout →', 'অ্যাপ ওপেন না হলে পেমেন্টলি ওয়েবে যান →')}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* STEP 3: Submit Method-Specific TrxID (Requirements 3 & 6) */}
          {selectedMethod !== 'all' && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>
                  {t(
                    `Submit ${currentMethod.name} Transaction ID (TrxID)`,
                    `${currentMethod.nameBn} ট্রানজেকশন আইডি (TrxID) জমা দিন`
                  )}
                </span>
              </p>

              <form onSubmit={handleSubmitTrxId} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t(
                      `${currentMethod.name} TrxID (from SMS ${currentMethod.smsSender} or Statement)`,
                      `${currentMethod.nameBn} TrxID (এসএমএস ${currentMethod.smsSender} বা স্টেটমেন্ট থেকে)`
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder={currentMethod.trxPlaceholder}
                      maxLength={20}
                      disabled={submitting || verificationState === 'success' || !isCurrentActive}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold tracking-wider placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm uppercase disabled:bg-slate-100 disabled:text-slate-400"
                      style={{
                        outlineColor: currentMethod.brandColor,
                      }}
                    />
                    {trxId.length >= 6 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                        {trxId.length} chars
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {t(
                      `After completing payment in ${currentMethod.name}, copy the ${currentMethod.name} transaction reference from SMS or app.`,
                      `${currentMethod.nameBn}-এ পেমেন্ট সম্পন্ন করার পর ফিরতি এসএমএস থেকে প্রাপ্ত ট্রানজেকশন আইডি এখানে লিখুন।`
                    )}
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Status State Alerts */}
                {verificationState === 'success' && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">{t('Payment Verified!', 'পেমেন্ট যাচাই সম্পন্ন!')}</p>
                      <p className="text-[11px] text-emerald-700">{statusMessage}</p>
                    </div>
                  </div>
                )}

                {verificationState === 'pending' && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">
                        {t('TrxID Submitted — Pending Verification', 'TrxID জমা হয়েছে — যাচাই অপেক্ষমাণ')}
                      </p>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">{statusMessage}</p>
                    </div>
                  </div>
                )}

                {verificationState !== 'success' && (
                  <button
                    type="submit"
                    disabled={submitting || !trxId.trim() || !isCurrentActive}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t('Verifying with Paymently...', 'পেমেন্ট যাচাই হচ্ছে...')}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>
                          {t(
                            `Submit ${currentMethod.name} TrxID for Verification`,
                            `${currentMethod.nameBn} TrxID যাচাইয়ের জন্য জমা দিন`
                          )}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Paymently MFS Security</span>
          </span>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
          >
            {t('Close / Cancel', 'বন্ধ করুন')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentlyCheckoutModal;
