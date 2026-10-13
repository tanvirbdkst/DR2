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
  appointmentId: string;
  transactionRef: string;
  paymentUrl?: string;
  invoiceId?: string;
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
  const [trxId, setTrxId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [appOpenAttempted, setAppOpenAttempted] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [verificationState, setVerificationState] = useState<'idle' | 'success' | 'pending'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);

  // Detect device platform
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    if (isOpen) {
      setTrxId('');
      setSubmitting(false);
      setErrorMsg(null);
      setAppOpenAttempted(false);
      setVerificationState('idle');
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen || !booking) return null;

  /**
   * Attempts to open the bKash application on supported devices using documented Android Intent / App Links.
   * If on desktop or if the app is not installed, the user can easily fall back to Paymently Web Gateway.
   */
  const handleOpenBkash = () => {
    setAppOpenAttempted(true);
    setErrorMsg(null);

    if (isAndroid) {
      // Documented Android Intent URI for official bKash Customer App (com.bKash.customerapp)
      const androidIntentUri = 'intent://#Intent;package=com.bKash.customerapp;scheme=bkash;end;';

      // Attach temporary listener to see if app successfully took focus
      const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          document.removeEventListener('visibilitychange', onVisibilityChange);
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      try {
        window.location.href = androidIntentUri;
      } catch {
        window.location.href = 'bkash://';
      }
    } else if (isMobile) {
      // iOS / other mobile custom scheme
      window.location.href = 'bkash://';
    } else {
      // Desktop browser cannot run native mobile apps
      // Provide immediate fallback option
      if (booking.paymentUrl) {
        window.open(booking.paymentUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  /**
   * Opens the official Paymently Web Checkout page as a reliable fallback.
   */
  const handleOpenPaymentlyWeb = () => {
    if (booking.paymentUrl) {
      window.open(booking.paymentUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  /**
   * Submits the user-entered TrxID for verification.
   * Never marks payment paid merely because a TrxID was entered:
   * Uses verified Paymently server-side API if supported; otherwise records pending state for admin review.
   */
  const handleSubmitTrxId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId.trim() || trxId.trim().length < 6) {
      setErrorMsg(
        t(
          'Please enter a valid bKash Transaction ID (at least 6-8 characters, e.g., 9J38SDF2).',
          'অনুগ্রহ করে সঠিক বিকাশ ট্রানজেকশন আইডি (TrxID) লিখুন (কমপক্ষে ৬-৮ অক্ষর/ডিজিট)।'
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
            'Your TrxID has been received and is pending verification. Your serial has been reserved while our team verifies the payment.',
            'আপনার TrxID জমা হয়েছে এবং যাচাইয়ের জন্য অপেক্ষমাণ। যাচাই চলাকালীন আপনার সিরিয়ালটি সংরক্ষিত থাকবে।'
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
        {/* Header with bKash Brand Accent */}
        <div className="bg-gradient-to-r from-[#E2136E] to-[#C60F5F] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-lg">
              ৳
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                {t('bKash Payment & Verification', 'বিকাশ পেমেন্ট ও যাচাই')}
              </h3>
              <p className="text-xs text-pink-100 font-medium">
                {t('Daktar Serial — Paymently Checkout', 'ডাক্তার সিরিয়াল — পেমেন্টলি চেকআউট')}
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
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
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

            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-xs">
              <span className="text-slate-600 font-medium">{t('Intended Booking Fee:', 'বুকিং ফি:')}</span>
              <div className="text-right">
                <span className="text-sm font-black text-emerald-700">৳{Number(booking.bookingFee).toFixed(2)} BDT</span>
              </div>
            </div>
          </div>

          {/* Transparent Fee Notice */}
          <div className="flex items-start gap-2 bg-blue-50/70 border border-blue-200/80 rounded-xl p-2.5 text-[11px] text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('Intended Booking Fee is strictly BDT 10.00', 'সিরিয়াল বুকিং ফি নির্ধারিত ৳১০.০০')}</p>
              <p className="text-blue-700 mt-0.5 text-[10px] leading-relaxed">
                {t(
                  'Doctor consultation visit fee is payable separately at chamber reception. (Note: Paymently web gateway may display BDT 12.00 due to their configured BDT 2.00 MFS gateway fee).',
                  'ডাক্তারের ভিজিট ফি চেম্বারে প্রদেয়। (দ্রষ্টব্য: পেমেন্টলি গেটওয়ে তাদের কনফিগার করা ৳২ চার্জের কারণে ৳১২ প্রদর্শন করতে পারে)।'
                )}
              </p>
            </div>
          </div>

          {/* STEP 1: Open bKash to Send Money */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#E2136E] text-white flex items-center justify-center text-[10px]">1</span>
                <span>{t('Send Money via bKash', 'বিকাশ অ্যাপে সেন্ড মানি করুন')}</span>
              </p>
              <button
                type="button"
                onClick={() => handleCopy(booking.appointmentId)}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                title="Copy Appointment ID as Reference"
              >
                {copiedRef ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>Ref: <strong className="font-mono text-slate-700">{booking.appointmentId}</strong></span>
              </button>
            </div>

            {/* Main Action Button: Open bKash to Send Money */}
            <button
              type="button"
              onClick={handleOpenBkash}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#E2136E] hover:bg-[#C60F5F] active:scale-[0.99] transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>{t('Open bKash to Send Money', 'Open bKash to Send Money (বিকাশ অ্যাপ ওপেন করুন)')}</span>
              <ExternalLink className="w-4 h-4 opacity-80" />
            </button>

            {/* Mandatory Non-misleading Disclaimer (Requirement 3) */}
            <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong>{t('Important Notice:', 'জরুরি তথ্য:')}</strong>{' '}
                {t(
                  'Clicking will attempt to open your bKash app. Money is NOT sent automatically. You must log in, review the details, send ৳10 (intended fee), and confirm with your bKash PIN.',
                  'বাটনে চাপলে বিকাশ অ্যাপ ওপেন হবে। কোনো টাকা স্বয়ংক্রিয়ভাবে কাটা হবে না। আপনাকে বিকাশ অ্যাপে প্রবেশ করে ৳১০ সেন্ড মানি করতে হবে এবং পিন দিয়ে নিশ্চিত করতে হবে।'
                )}
              </p>
            </div>

            {/* Desktop or App-Link Fallback Option (Requirement 2 & 8) */}
            {(!isAndroid || appOpenAttempted) && booking.paymentUrl && (
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

          {/* STEP 2: Submit TrxID for Verification */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">2</span>
              <span>{t('Submit bKash Transaction ID (TrxID)', 'ট্রানজেকশন আইডি (TrxID) জমা দিন')}</span>
            </p>

            <form onSubmit={handleSubmitTrxId} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {t('bKash TrxID (from SMS or Statement)', 'বিকাশ TrxID (এসএমএস বা স্টেটমেন্ট থেকে)')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="e.g. BLK92X4KP1"
                    maxLength={20}
                    disabled={submitting || verificationState === 'success'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold tracking-wider placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E2136E] focus:border-transparent text-sm uppercase"
                  />
                  {trxId.length >= 6 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                      {trxId.length} chars
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {t(
                    'After completing Send Money in bKash, copy the 8-10 character TrxID from your SMS or app statement.',
                    'বিকাশে সেন্ড মানি সম্পন্ন করার পর ফিরতি এসএমএস বা অ্যাপ থেকে প্রাপ্ত ট্রানজেকশন আইডি এখানে লিখুন।'
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
                    <p className="font-bold">{t('TrxID Submitted — Pending Verification', 'TrxID জমা হয়েছে — যাচাই অপেক্ষমাণ')}</p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">{statusMessage}</p>
                  </div>
                </div>
              )}

              {verificationState !== 'success' && (
                <button
                  type="submit"
                  disabled={submitting || !trxId.trim()}
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
                      <span>{t('Submit for Verification', 'Submit for Verification (যাচাইয়ের জন্য জমা দিন)')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secure MFS Gateway</span>
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
