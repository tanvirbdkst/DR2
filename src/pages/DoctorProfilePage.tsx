import React, { useState, useEffect } from 'react';
import {
  Building2, Calendar, Clock, Award, ShieldCheck, Phone, MapPin, User,
  CheckCircle2, AlertCircle, ArrowLeft, Stethoscope, ChevronRight, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { DoctorProfile, Chamber, Schedule, SerialSlot } from '../types.js';

interface DoctorProfilePageProps {
  doctorId: number;
  onBack: () => void;
  onBookingSuccess: (appointmentData: any) => void;
}

export const DoctorProfilePage: React.FC<DoctorProfilePageProps> = ({ doctorId, onBack, onBookingSuccess }) => {
  const { user, t } = useAuth();

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Load doctor details
  useEffect(() => {
    async function loadDoctor() {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/doctors/${doctorId}`);
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

    async function fetchAvailability() {
      setLoadingSerials(true);
      setAvailabilityMessage(null);
      setSelectedSerial(null);
      setBookingError(null);

      try {
        const res = await fetch(`/api/public/availability?doctorId=${doctorId}&chamberId=${selectedChamberId}&date=${selectedDate}`);
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
  }, [doctorId, selectedChamberId, selectedDate]);

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

    try {
      const res = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId,
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
          const refreshRes = await fetch(`/api/public/availability?doctorId=${doctorId}&chamberId=${selectedChamberId}&date=${selectedDate}`);
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

  const selectedChamberObj = chambers.find((c) => c.id === selectedChamberId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t('Back to Doctors', 'ডাক্তার তালিকায় ফিরে যান')}</span>
      </button>

      {/* Main Grid: Left Doctor Bio/Chambers, Right Interactive Serial Booking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Doctor Profile & Chambers */}
        <div className="lg:col-span-7 space-y-6">
          {/* Profile Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <img
                src={doctor.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=250&auto=format&fit=crop&q=80'}
                alt={doctor.name}
                className="w-24 h-24 rounded-2xl object-cover border border-slate-100 shadow-xs shrink-0"
              />
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                    {doctor.specialty_name || 'Medical Specialist'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified BMDC
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {doctor.title} {doctor.name}
                </h1>

                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                  {doctor.qualification}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">
                    BMDC Reg: <strong className="text-slate-800">{doctor.bmdc_number}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <strong>{doctor.experience_years}+ Years</strong> Experience
                  </span>
                  <span>
                    Consultation: <strong className="text-emerald-700 font-bold">৳{doctor.consultation_fee}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* About / Bio */}
            {doctor.bio && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {t('About Doctor', 'ডাক্তার সম্পর্কে')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {doctor.bio}
                </p>
              </div>
            )}
          </div>

          {/* Chambers & Weekly Schedules */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span>{t('Chamber Locations & Weekly Schedules', 'চেম্বার ও সাপ্তাহিক সময়সূচী')}</span>
            </h3>

            <div className="space-y-4">
              {chambers.map((chamber) => {
                const chamberSchedules = schedules.filter((s) => s.chamber_id === chamber.id);
                return (
                  <div
                    key={chamber.id}
                    className={`p-4 rounded-xl border transition ${
                      selectedChamberId === chamber.id
                        ? 'border-emerald-500 bg-emerald-50/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{chamber.name}</h4>
                        <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{chamber.address}, {chamber.area}, {chamber.city}</span>
                        </p>
                        {chamber.phone && (
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{chamber.phone}</span>
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-700 block">
                          ৳{chamber.consultation_fee || doctor.consultation_fee}
                        </span>
                        <span className="text-[10px] text-slate-400">Consultation Fee</span>
                      </div>
                    </div>

                    {/* Schedule times */}
                    <div className="mt-3 pt-3 border-t border-slate-200/60">
                      <p className="text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Available Days & Times:
                      </p>
                      {chamberSchedules.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No schedules set for this chamber.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {chamberSchedules.map((sch) => (
                            <div
                              key={sch.id}
                              className="text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between"
                            >
                              <span className="font-semibold text-slate-800">{sch.day_of_week}</span>
                              <span className="text-slate-600 text-[11px]">
                                {sch.start_time} – {sch.end_time} ({sch.max_serials} Serials)
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
        </div>

        {/* Right Column: Serial Booking Widget */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md sticky top-24 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Core Booking Engine
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {t('Select Serial & Book Appointment', 'সিরিয়াল বেছে নিন ও বুক করুন')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Doctor → Chamber → Date → Serial Slot
              </p>
            </div>

            {bookingError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Booking Error</p>
                  <p className="mt-0.5">{bookingError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              {/* Step 1: Select Chamber */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  1. {t('Select Chamber', 'চেম্বার নির্বাচন করুন')}
                </label>
                <select
                  value={selectedChamberId || ''}
                  onChange={(e) => setSelectedChamberId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white"
                >
                  {chambers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.area}, {c.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  2. {t('Select Appointment Date', 'তারিখ নির্বাচন করুন')}
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white"
                />
              </div>

              {/* Step 3: Select Serial Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    3. {t('Choose Available Serial', 'উপলব্ধ সিরিয়াল নম্বর')}
                  </label>
                  {selectedSerial && (
                    <span className="text-xs font-bold text-emerald-700">
                      Selected: Serial {selectedSerial < 10 ? `0${selectedSerial}` : selectedSerial}
                    </span>
                  )}
                </div>

                {loadingSerials ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Calculating available serial slots...
                  </div>
                ) : availabilityMessage ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center">
                    <p className="font-semibold">{availabilityMessage}</p>
                    <p className="text-[11px] mt-1 text-amber-700">
                      Please pick another day or chamber where the doctor has active schedules.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Serials Grid */}
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                      {serials.map((slot) => {
                        const isBooked = slot.status === 'booked';
                        const isSelected = selectedSerial === slot.serial_number;

                        return (
                          <button
                            key={slot.serial_number}
                            type="button"
                            disabled={isBooked}
                            onClick={() => setSelectedSerial(slot.serial_number)}
                            title={isBooked ? `Serial ${slot.serial_formatted} is already booked` : `Estimated Time: ${slot.estimated_time}`}
                            className={`p-2 rounded-xl text-center transition flex flex-col items-center justify-center cursor-pointer ${
                              isBooked
                                ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
                                : isSelected
                                ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-600/30 scale-105 border border-emerald-600'
                                : 'bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 border border-slate-200 shadow-xs'
                            }`}
                          >
                            <span className="text-xs font-bold leading-none">
                              {slot.serial_formatted}
                            </span>
                            <span className={`text-[9px] mt-0.5 leading-none ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                              {isBooked ? 'Booked' : slot.estimated_time.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-white border border-slate-300 inline-block" />
                        Available
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block" />
                        Selected
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-300 inline-block" />
                        Booked
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 4: Patient Details */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  4. {t('Patient Information', 'রোগীর তথ্য')}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder={t('Patient Full Name *', 'রোগীর পুরো নাম *')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      required
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder={t('Mobile Number *', 'মোবাইল নম্বর *')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder={t('Age', 'বয়স')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden resize-none"
                  />
                </div>
              </div>

              {/* Summary and Confirmation Button */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
                  <span>Consultation Fee:</span>
                  <span className="text-base font-bold text-emerald-700">
                    ৳{selectedChamberObj?.consultation_fee || doctor.consultation_fee}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedSerial}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Confirming Serial...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {selectedSerial
                          ? `${t('Confirm Serial', 'সিরিয়াল নিশ্চিত করুন')} ${selectedSerial < 10 ? `0${selectedSerial}` : selectedSerial}`
                          : t('Select a Serial to Confirm', 'সিরিয়াল নির্বাচন করুন')}
                      </span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Double booking strictly prevented by database constraint</span>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
