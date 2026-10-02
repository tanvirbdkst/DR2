import React, { useState, useEffect } from 'react';
import {
  Building2, Calendar, Clock, Award, ShieldCheck, Phone, MapPin, User,
  CheckCircle2, AlertCircle, ArrowLeft, Stethoscope, ChevronRight, Lock,
  Share2, Copy, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { DoctorProfile, Chamber, Schedule, SerialSlot } from '../types.js';
import { DoctorShareModal } from '../components/DoctorShareModal.js';
import { getDoctorProfileUrl } from '../config/api.js';

interface DoctorProfilePageProps {
  doctorId: number | string;
  onBack: () => void;
  onBookingSuccess: (appointmentData: any) => void;
}

export const DoctorProfilePage: React.FC<DoctorProfilePageProps> = ({ doctorId, onBack, onBookingSuccess }) => {
  const { user, t } = useAuth();

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Sharing state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Booking widget state
  const [selectedChamberId, setSelectedChamberId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [serials, setSerials] = useState<SerialSlot[]>([]);
  const [loadingSerials, setLoadingSerials] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [selectedSerial, setSelectedSerial] = useState<number | null>(null);

  // Patient Booking Form
  const [patientName, setPatientName] = useState(user?.name || '');
  const [patientPhone, setPatientPhone] = useState(user?.phone || '');
  const [patientAge, setPatientAge] = useState('28');
  const [patientGender, setPatientGender] = useState<'male' | 'female' | 'other'>('male');
  const [problemDescription, setProblemDescription] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Load doctor details (supports numeric id or slug string)
  useEffect(() => {
    async function loadDoctor() {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/doctors/${encodeURIComponent(doctorId)}`);
        if (res.ok) {
          const data = await res.json();
          setDoctor(data.doctor);
          setChambers(data.chambers || []);
          setSchedules(data.schedules || []);

          if (data.chambers && data.chambers.length > 0) {
            setSelectedChamberId(data.chambers[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDoctor();
  }, [doctorId]);

  // Set default initial date (e.g. today or next valid day)
  useEffect(() => {
    if (!selectedDate) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setSelectedDate(`${yyyy}-${mm}-${dd}`);
    }
  }, []);

  // Fetch Serials when Chamber & Date are selected
  useEffect(() => {
    if (!selectedChamberId || !selectedDate) return;

    const actualDoctorId = doctor?.id || (typeof doctorId === 'number' ? doctorId : null);
    if (!actualDoctorId) return;

    async function fetchAvailability() {
      setLoadingSerials(true);
      setAvailabilityMessage(null);
      setSelectedSerial(null);
      setBookingError(null);

      try {
        const res = await fetch(`/api/public/availability?doctorId=${actualDoctorId}&chamberId=${selectedChamberId}&date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          if (data.available) {
            setSerials(data.serials || []);
          } else {
            setSerials([]);
            setAvailabilityMessage(data.message || 'No consultation hours scheduled for this day.');
          }
        }
      } catch (err) {
        console.error(err);
        setAvailabilityMessage('Failed to fetch serials.');
      } finally {
        setLoadingSerials(false);
      }
    }

    fetchAvailability();
  }, [doctor?.id, doctorId, selectedChamberId, selectedDate]);

  // If user signs in while on page, update defaults
  useEffect(() => {
    if (user) {
      if (!patientName) setPatientName(user.name);
      if (!patientPhone) setPatientPhone(user.phone);
    }
  }, [user]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSerial) {
      setBookingError('Please select an available serial number.');
      return;
    }
    if (!patientName || !patientPhone) {
      setBookingError('Patient name and phone number are required.');
      return;
    }

    setSubmitting(true);
    setBookingError(null);

    const actualDoctorId = doctor?.id || (typeof doctorId === 'number' ? doctorId : 0);

    try {
      const res = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: actualDoctorId,
          chamberId: selectedChamberId,
          scheduleDate: selectedDate,
          serialNumber: selectedSerial,
          patientName,
          patientPhone,
          patientAge: Number(patientAge),
          patientGender,
          problemDescription,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setBookingError(data.message || 'Duplicate booking rejected! This serial is already booked.');
          // Refresh availability to reflect booked status
          const refreshRes = await fetch(`/api/public/availability?doctorId=${actualDoctorId}&chamberId=${selectedChamberId}&date=${selectedDate}`);
          if (refreshRes.ok) {
            const rData = await refreshRes.json();
            setSerials(rData.serials || []);
          }
          setSelectedSerial(null);
        } else {
          setBookingError(data.error || 'Failed to confirm serial booking.');
        }
        return;
      }

      // Success! Pass to confirmation
      onBookingSuccess(data);
    } catch (err: any) {
      setBookingError(err.message || 'Network error during serial booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const profileSlugOrId = doctor?.slug || doctor?.id || doctorId;
  const shareUrl = getDoctorProfileUrl(profileSlugOrId);

  const handleQuickCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading doctor profile & schedule...</p>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Doctor Profile Not Found</h2>
        <p className="text-xs text-slate-500">This doctor is either pending approval or does not exist.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl"
        >
          Back to Doctors
        </button>
      </div>
    );
  }

  const scrollToBooking = (chamberId?: number) => {
    if (chamberId) {
      setSelectedChamberId(chamberId);
    }
    const el = document.getElementById('booking-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const selectedChamberObj = chambers.find((c) => c.id === selectedChamberId);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 sm:pb-12">
      {/* Top bar: Back navigation + Share and Copy Link actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('Back to Doctors', 'ডাক্তার তালিকায় ফিরে যান')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollToBooking()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t('Book Serial', 'সিরিয়াল নিন')}</span>
          </button>

          <button
            type="button"
            onClick={handleQuickCopy}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition cursor-pointer ${
              copied
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Copy Public Link"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('Link Copied!', 'লিংক কপি হয়েছে!')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>{t('Copy Link', 'লিংক কপি')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{t('Share Profile', 'শেয়ার করুন')}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: COMPLETE DOCTOR PROFILE CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative shrink-0">
            <img
              src={doctor.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80'}
              alt={doctor.name}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 border-emerald-500/20 shadow-md ring-4 ring-slate-50"
            />
            <span className="absolute -bottom-2 -right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5 border border-white">
              <ShieldCheck className="w-3 h-3" />
              Verified
            </span>
          </div>

          <div className="space-y-2.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {doctor.specialties && doctor.specialties.length > 0 ? (
                doctor.specialties.map((s) => (
                  <span
                    key={s.id}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs"
                  >
                    {s.name} {s.name_bn && <span className="opacity-75 text-[11px] font-normal">({s.name_bn})</span>}
                  </span>
                ))
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {doctor.specialty_name || 'Medical Specialist'}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-mono bg-slate-100 px-2.5 py-0.5 rounded-md">
                BMDC: <strong className="text-slate-800">{doctor.bmdc_number}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {doctor.title} {doctor.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
              {doctor.qualification}
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-slate-600 pt-1">
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-200">
                <Award className="w-4 h-4 text-amber-600" />
                <span><strong>{doctor.experience_years}+ Years</strong> Experience</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-200">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Visiting Fee: <strong className="font-bold text-emerald-700">৳{doctor.consultation_fee}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick CTA & Scroll Action Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="text-center sm:text-left">
            <h3 className="font-bold text-base text-white">
              {t('Consult with this Specialist', 'এই বিশেষজ্ঞ ডাক্তারের চেম্বার সিরিয়াল নিন')}
            </h3>
            <p className="text-emerald-100 text-xs mt-0.5">
              {t('Official instant serial confirmation with double-booking prevention.', 'অনলাইনে দ্রুত সিরিয়াল নিশ্চিত করুন। কোনো অতিরিক্ত ফি নেই।')}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => scrollToBooking()}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>{t('Book Serial Now', 'সিরিয়াল বুক করুন')}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="px-3.5 py-2.5 bg-emerald-800/80 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-500/40"
              title={t('Share Doctor Profile', 'প্রোফাইল শেয়ার করুন')}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Share', 'শেয়ার')}</span>
            </button>
          </div>
        </div>

        {/* About / Bio */}
        {doctor.bio && (
          <div className="pt-5 border-t border-slate-100 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-emerald-600" />
              <span>{t('About Doctor & Clinical Expertise', 'ডাক্তার পরিচিতি ও অভিজ্ঞতা')}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
              {doctor.bio}
            </p>
          </div>
        )}

        {/* Public Shareable Profile Strip */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-800">
                  {t('Permanent Public Profile Link', 'স্থায়ী পাবলিক প্রোফাইল লিংক')}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.2 rounded">
                  Public
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono truncate max-w-xs sm:max-w-md select-all">
                {shareUrl}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleQuickCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? t('Link copied', 'কপি হয়েছে') : t('Copy Link', 'লিংক কপি')}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t('Share', 'শেয়ার')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: COMPLETE CHAMBER LOCATIONS & WEEKLY SCHEDULES */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span>{t('Chamber Locations & Weekly Schedules', 'চেম্বার ও সাপ্তাহিক সময়সূচী')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('Review active visiting chambers, consultation fees, and weekly timings', 'ডাক্তারের চেম্বারের ঠিকানা ও সময়সূচী দেখে আপনার সুবিধাজনক চেম্বার বেছে নিন')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {chambers.map((chamber) => {
            const chamberSchedules = schedules.filter((s) => s.chamber_id === chamber.id);
            const isSelected = selectedChamberId === chamber.id;

            return (
              <div
                key={chamber.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/10'
                    : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-base">{chamber.name}</h4>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Selected for Booking
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{chamber.address}, {chamber.area}, {chamber.city}</span>
                    </p>
                    {chamber.phone && (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{chamber.phone}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="sm:text-right">
                      <span className="text-base font-extrabold text-emerald-700 block leading-tight">
                        ৳{chamber.consultation_fee || doctor.consultation_fee}
                      </span>
                      <span className="text-[10px] text-slate-400">Consultation Fee</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollToBooking(chamber.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{isSelected ? t('Active Selection', 'নির্বাচিত') : t('Select & Book', 'সিরিয়াল নিন')}</span>
                    </button>
                  </div>
                </div>

                {/* Schedule times */}
                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <p className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('Available Visiting Days & Hours:', 'সাপ্তাহিক ভিজিটিং সময়সূচী:')}</span>
                  </p>
                  {chamberSchedules.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No schedules set for this chamber.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {chamberSchedules.map((sch) => (
                        <div
                          key={sch.id}
                          className="text-xs bg-white px-3 py-2 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs"
                        >
                          <span className="font-bold text-slate-800">{sch.day_of_week}</span>
                          <span className="text-slate-600 text-[11px] font-medium">
                            {sch.start_time} – {sch.end_time} ({sch.max_serials} slots)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: DEDICATED SERIAL BOOKING SECTION */}
      <div id="booking-section" className="scroll-mt-6">
        <div className="bg-white rounded-3xl border-2 border-emerald-500/30 p-6 sm:p-8 shadow-lg space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              {t('Book Serial Slot', 'সিরিয়াল বুকিং সেকশন')}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
              {t('Book Serial / Get Serial', 'সিরিয়াল নিন / বুক করুন')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {t('Select chamber location, pick consultation date, choose your exact serial slot, and confirm instantly.', 'চেম্বার নির্বাচন করুন, তারিখ পছন্দ করুন এবং আপনার নির্দিষ্ট সিরিয়াল কনফার্ম করুন।')}
            </p>
          </div>

          {bookingError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Booking Error</p>
                <p className="mt-0.5">{bookingError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleBookingSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Step 1: Select Chamber */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. {t('Select Chamber Location', '১. চেম্বার নির্বাচন করুন')} *
                </label>
                <select
                  value={selectedChamberId || ''}
                  onChange={(e) => setSelectedChamberId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white shadow-2xs"
                >
                  {chambers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.area}, {c.city} (Fee: ৳{c.consultation_fee || doctor.consultation_fee})
                    </option>
                  ))}
                </select>
                {selectedChamberObj && (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    <span>{selectedChamberObj.address}, {selectedChamberObj.area}</span>
                  </p>
                )}
              </div>

              {/* Step 2: Select Date */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. {t('Select Consultation Date', '২. তারিখ নির্বাচন করুন')} *
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white shadow-2xs"
                />
                {selectedDate && (
                  <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-600" />
                    <span>
                      {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Step 3: Choose Serial Slot */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  3. {t('Choose Available Serial Slot', '৩. উপলব্ধ সিরিয়াল নম্বরটি বেছে নিন')} *
                </label>
                {selectedSerial && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                    Selected: Serial {selectedSerial < 10 ? `0${selectedSerial}` : selectedSerial}
                  </span>
                )}
              </div>

              {loadingSerials ? (
                <div className="py-10 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Calculating real-time available serial slots...
                </div>
              ) : availabilityMessage ? (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-center space-y-1">
                  <p className="font-bold text-sm">{availabilityMessage}</p>
                  <p className="text-xs text-amber-700">
                    {t('Please choose another date or chamber according to the doctor schedule above.', 'অনুগ্রহ করে উপরের সময়সূচী অনুযায়ী অন্য দিন বা চেম্বার নির্বাচন করুন।')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 max-h-60 overflow-y-auto p-2 border border-slate-200 rounded-2xl bg-slate-50/50">
                    {serials.map((slot) => {
                      const isBooked = slot.status === 'booked';
                      const isSelected = selectedSerial === slot.serial_number;

                      return (
                        <button
                          key={slot.serial_number}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setSelectedSerial(slot.serial_number)}
                          title={isBooked ? `Serial ${slot.serial_formatted} is already booked` : `Approx. time: ${slot.estimated_time}`}
                          className={`p-2.5 rounded-xl text-center transition flex flex-col items-center justify-center cursor-pointer ${
                            isBooked
                              ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-50'
                              : isSelected
                              ? 'bg-emerald-600 text-white font-extrabold shadow-md shadow-emerald-600/30 scale-105 border-2 border-emerald-600 ring-2 ring-emerald-500/20'
                              : 'bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 border border-slate-200 shadow-xs'
                          }`}
                        >
                          <span className="text-sm font-bold leading-none">
                            {slot.serial_formatted}
                          </span>
                          <span className={`text-[10px] mt-1 leading-none ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {isBooked ? 'Booked' : slot.estimated_time.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-md bg-white border border-slate-300 inline-block" />
                      Available Slot
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block" />
                      Your Selection
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-md bg-slate-200 border border-slate-300 inline-block" />
                      Already Booked
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 4: Patient Details */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                4. {t('Patient Information & Contact', '৪. রোগীর নাম ও মোবাইল নম্বর')} *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder={t('Patient Full Name *', 'রোগীর পুরো নাম *')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white shadow-2xs font-medium"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    required
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder={t('Mobile Number *', 'মোবাইল নম্বর *')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white shadow-2xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder={t('Age', 'বয়স')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white shadow-2xs font-medium"
                  />
                </div>
                <div>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white shadow-2xs font-medium"
                  >
                    <option value="male">{t('Male', 'পুরুষ')}</option>
                    <option value="female">{t('Female', 'মহিলা')}</option>
                    <option value="other">{t('Other', 'অন্যান্য')}</option>
                  </select>
                </div>
              </div>

              <div>
                <textarea
                  rows={2}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder={t('Symptoms or brief reason for visit (optional)...', 'সমস্যা বা উপসর্গ (ঐচ্ছিক)...')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden resize-none bg-white shadow-2xs"
                />
              </div>
            </div>

            {/* Step 5: Summary and Confirmation Button */}
            <div className="pt-4 border-t border-slate-100 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs sm:text-sm text-slate-700">
                <span className="font-medium">
                  {selectedChamberObj?.name ? `Chamber: ${selectedChamberObj.name}` : 'Consultation Fee:'}
                </span>
                <span className="text-lg font-extrabold text-emerald-700">
                  ৳{selectedChamberObj?.consultation_fee || doctor.consultation_fee}
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedSerial}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Confirming Serial Booking...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      {selectedSerial
                        ? `${t('Confirm Serial', 'সিরিয়াল নিশ্চিত করুন')} ${selectedSerial < 10 ? `0${selectedSerial}` : selectedSerial}`
                        : t('Select a Serial Slot to Confirm', 'সিরিয়াল নম্বর নির্বাচন করুন')}
                    </span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified BMDC specialist • Double booking strictly prevented by database</span>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Floating Bottom Action Bar for Mobile Screens */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:hidden shadow-lg flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-900 truncate">{doctor.title} {doctor.name}</p>
          <p className="text-[11px] text-emerald-700 font-bold">Fee: ৳{selectedChamberObj?.consultation_fee || doctor.consultation_fee}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => scrollToBooking()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            {t('Book Serial', 'সিরিয়াল নিন')}
          </button>
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {doctor && (
        <DoctorShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          doctor={doctor}
        />
      )}
    </div>
  );
};
