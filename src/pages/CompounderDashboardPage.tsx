import React, { useCallback, useEffect, useState } from 'react';
import {
  Stethoscope, CalendarCheck, Clock, Users, XCircle, CheckCircle2,
  AlertCircle, RefreshCw, MapPin, Phone, Lock, UserPlus, BadgeCheck,
  Search, Filter, Calendar, Award, ShieldCheck, Ticket, CheckSquare,
  Building2, ChevronRight, DollarSign, UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { NotificationBell } from '../components/NotificationBell.js';

interface CompounderDashboardPageProps {
  onNavigate?: (view: string) => void;
}

interface SerialRow {
  serial_number: number;
  serial_formatted: string;
  estimated_time: string;
  status: 'available' | 'online' | 'manual' | 'cancelled';
  record_id?: number;
  payment_status?: string;
  booking_source?: string;
  appointment_id?: string;
  appointment_status?: string;
  patient_name?: string;
  patient_phone?: string;
  patient_age?: number;
  patient_gender?: string;
  can_book: boolean;
}

interface WeeklySchedule {
  id: number;
  doctor_id: number;
  chamber_id: number;
  chamber_name: string;
  chamber_address: string;
  chamber_city: string;
  chamber_area: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  max_serials: number;
  slot_duration_minutes: number;
  fee: number;
}

interface DashboardData {
  doctor: any;
  chambers: any[];
  weeklySchedules?: WeeklySchedule[];
  date: string;
  dayOfWeek: string;
  selectedChamberId: number | null;
  chamber: any;
  schedule: any;
  stats: { total: number; online: number; manual: number; available: number; cancelled: number; booked: number };
  serials: SerialRow[];
  message?: string;
}

function todayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const STATUS_META: Record<string, { label: string; labelBn: string; className: string; badge: string }> = {
  available: {
    label: 'Available',
    labelBn: 'খালি আছে',
    className: 'border-emerald-300 bg-emerald-50/50 hover:border-emerald-500 hover:bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  online: {
    label: 'Booked (Online)',
    labelBn: 'অনলাইন বুকড',
    className: 'border-blue-200 bg-blue-50/40 opacity-90',
    badge: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  manual: {
    label: 'Booked (Staff)',
    labelBn: 'ম্যানুয়াল বুকড',
    className: 'border-amber-200 bg-amber-50/40 opacity-90',
    badge: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  cancelled: {
    label: 'Cancelled',
    labelBn: 'বাতিল',
    className: 'border-rose-200 bg-rose-50/40 opacity-70',
    badge: 'bg-rose-100 text-rose-700 border-rose-200'
  },
};

const CLINICAL_STATUS_META: Record<string, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed (Not Arrived)', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  waiting: { label: 'In Waiting Room', className: 'bg-purple-100 text-purple-800 font-bold border-purple-200' },
  in_consultation: { label: 'In Doctor Room', className: 'bg-indigo-100 text-indigo-900 font-bold border-indigo-300' },
  completed: { label: 'Consultation Done', className: 'bg-emerald-100 text-emerald-800 font-bold border-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-100 text-rose-700 border-rose-200' },
};

export const CompounderDashboardPage: React.FC<CompounderDashboardPageProps> = ({ onNavigate }) => {
  const { user, logout, t } = useAuth();

  // Top navigation menu: 'serial-booking' | 'schedule' | 'queue'
  const [activeMenu, setActiveMenu] = useState<'serial-booking' | 'schedule' | 'queue'>('serial-booking');

  const [date, setDate] = useState<string>(todayString());
  const [chamberId, setChamberId] = useState<number | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'booked' | 'waiting' | 'in_consultation' | 'completed'>('all');

  // Updating appointment status state
  const [updatingRecordId, setUpdatingRecordId] = useState<number | null>(null);

  // Manual booking modal state
  const [selectedSerial, setSelectedSerial] = useState<SerialRow | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('other');
  const [problemDescription, setProblemDescription] = useState('');
  const [booking, setBooking] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!user || user.role !== 'compounder') return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date });
      if (chamberId) params.set('chamberId', String(chamberId));
      const res = await fetch(`/api/compounder/dashboard?${params.toString()}`);
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error || 'Failed to load dashboard.');
        setData(null);
        return;
      }
      setData(payload);
      if (payload.selectedChamberId) setChamberId(Number(payload.selectedChamberId));
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [user, date, chamberId]);

  useEffect(() => {
    if (user?.role === 'compounder') {
      loadDashboard();
    }
  }, [user, date, chamberId, loadDashboard]);

  // Periodic polling every 20 seconds so compounder immediately sees new online bookings
  useEffect(() => {
    if (!user || user.role !== 'compounder') return;
    const interval = setInterval(() => {
      loadDashboard();
    }, 20000);
    return () => clearInterval(interval);
  }, [user, loadDashboard]);

  const openBookingModal = (serial: SerialRow) => {
    if (!serial.can_book) return;
    setSelectedSerial(serial);
    setPatientName('');
    setPatientPhone('');
    setPatientAge('');
    setPatientGender('other');
    setProblemDescription('');
    setBookingError(null);
  };

  const closeBookingModal = () => {
    setSelectedSerial(null);
    setBookingError(null);
  };

  const handleUpdateStatus = async (recordId: number, nextStatus: string, serialNum: number) => {
    if (nextStatus === 'cancelled') {
      if (!confirm(`Are you sure you want to cancel Serial ${serialNum}? The slot will be released back to Available for new bookings.`)) {
        return;
      }
    }
    setUpdatingRecordId(recordId);
    try {
      const res = await fetch(`/api/compounder/appointments/${recordId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await res.json();
      if (!res.ok) {
        alert(payload.error || 'Failed to update status.');
        return;
      }
      setNotice(`Serial ${serialNum} status updated to: ${nextStatus}`);
      await loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Status update failed.');
    } finally {
      setUpdatingRecordId(null);
    }
  };

  const handleBookSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSerial || !data?.chamber) return;

    setBooking(true);
    setBookingError(null);
    try {
      const res = await fetch('/api/compounder/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chamberId: data.chamber.id,
          scheduleDate: date,
          serialNumber: selectedSerial.serial_number,
          patientName: patientName.trim(),
          patientPhone: patientPhone.trim(),
          patientAge: patientAge ? Number(patientAge) : null,
          patientGender,
          problemDescription: problemDescription.trim() || null,
        }),
      });
      const payload = await res.json();

      if (!res.ok) {
        setBookingError(payload.message_bn || payload.message || payload.error || 'Booking failed.');
        if (res.status === 409) {
          // Slot already booked concurrently: refresh board to show locked
          loadDashboard();
        }
        return;
      }

      setNotice(
        `সিরিয়াল ${payload.serialNumber} সফলভাবে বুক ও লক করা হয়েছে (${payload.appointmentId}) — Payment: Cash / Unpaid at Chamber`
      );
      closeBookingModal();
      await loadDashboard();
    } catch (err: any) {
      setBookingError(err.message || 'Booking failed.');
    } finally {
      setBooking(false);
    }
  };

  // -------------------------------------------------------------
  // Access gate: only compounders may see this panel.
  // -------------------------------------------------------------
  if (!user || user.role !== 'compounder') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Compounder Access Only</h1>
          <p className="text-xs text-slate-500">
            This panel is restricted to Compounder / Chamber Staff accounts created by the Super Admin.
          </p>
        </div>
      </div>
    );
  }

  const doctor = data?.doctor;
  const chamber = data?.chamber;
  const schedule = data?.schedule;
  const stats = data?.stats;
  const weeklySchedules = data?.weeklySchedules || [];
  const doctorDisplayName = doctor
    ? (doctor.name?.startsWith(doctor.title) ? doctor.name : `${doctor.title || ''} ${doctor.name}`.trim())
    : '—';

  // Filtered serials
  const filteredSerials = (data?.serials || []).filter((s) => {
    // Status filter
    if (statusFilter === 'available' && s.status !== 'available') return false;
    if (statusFilter === 'booked' && (s.status === 'available' || s.status === 'cancelled')) return false;
    if (statusFilter === 'waiting' && s.appointment_status !== 'waiting') return false;
    if (statusFilter === 'in_consultation' && s.appointment_status !== 'in_consultation') return false;
    if (statusFilter === 'completed' && s.appointment_status !== 'completed') return false;

    // Search query (serial number 1, 2, 3..., patient name, phone)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNum = String(s.serial_number) === q || s.serial_formatted === q || String(s.serial_number).includes(q);
      const matchName = s.patient_name ? s.patient_name.toLowerCase().includes(q) : false;
      const matchPhone = s.patient_phone ? s.patient_phone.includes(q) : false;
      const matchApptId = s.appointment_id ? s.appointment_id.toLowerCase().includes(q) : false;
      return matchNum || matchName || matchPhone || matchApptId;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-slate-950 uppercase tracking-wider">
              Daktar Serial
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 uppercase tracking-wider border border-emerald-500/30">
              Chamber Staff / Compounder Panel
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2.5 flex items-center gap-2">
            <Stethoscope className="w-7 h-7 text-emerald-400 shrink-0" />
            <span>Assigned Doctor: {doctorDisplayName}</span>
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {doctor?.specialty_name || 'Medical Specialist'} ({doctor?.qualification || 'MBBS'})
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Active Chamber: <strong className="text-white">{chamber ? chamber.name : 'Choose chamber'}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <NotificationBell role="compounder" onNavigate={onNavigate} />

          <button
            onClick={loadDashboard}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 border border-slate-700"
            title="Refresh slot statuses"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live Board</span>
          </button>
          <button
            onClick={async () => { await logout(); }}
            className="px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold transition border border-rose-500/30 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-xs">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </span>
          <button onClick={() => setNotice(null)} className="font-bold underline cursor-pointer text-emerald-800">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Menu Navigation: Doctor Schedule & Serial Booking */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
        <div className="flex space-x-2">
          {/* Menu 1: Doctor Schedule */}
          <button
            onClick={() => setActiveMenu('schedule')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeMenu === 'schedule'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className={`w-4 h-4 ${activeMenu === 'schedule' ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>Doctor Schedule (ডাক্তার শিডিউল)</span>
            {weeklySchedules.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeMenu === 'schedule' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
              }`}>
                {weeklySchedules.length}
              </span>
            )}
          </button>

          {/* Menu 2: Serial Booking */}
          <button
            onClick={() => setActiveMenu('serial-booking')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeMenu === 'serial-booking'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Ticket className={`w-4 h-4 ${activeMenu === 'serial-booking' ? 'text-white' : 'text-emerald-600'}`} />
            <span>Serial Booking (সিরিয়াল বুকিং)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeMenu === 'serial-booking' ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              1, 2, 3...
            </span>
          </button>

          {/* Menu 3: Patient Queue & Attendance */}
          <button
            onClick={() => setActiveMenu('queue')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeMenu === 'queue'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CheckSquare className={`w-4 h-4 ${activeMenu === 'queue' ? 'text-indigo-200' : 'text-slate-400'}`} />
            <span>Patient Queue (হাজিরা ও চেম্বার কিউ)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeMenu === 'queue' ? 'bg-white text-indigo-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {stats?.booked || 0}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MENU 1: DOCTOR SCHEDULE TAB */}
      {/* ========================================================================= */}
      {activeMenu === 'schedule' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  <span>Assigned Doctor's Weekly Chamber Schedule</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consultation sessions and visiting timetables for {doctorDisplayName}. Select any schedule to book serials.
                </p>
              </div>
              <button
                onClick={() => setActiveMenu('serial-booking')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 self-start cursor-pointer shadow-xs"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Go to Serial Booking ➔</span>
              </button>
            </div>

            {weeklySchedules.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No active consultation schedules found for this doctor. Please contact the administrator.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weeklySchedules.map((sch) => {
                  const isToday = sch.day_of_week.toLowerCase() === data?.dayOfWeek.toLowerCase();

                  return (
                    <div
                      key={sch.id}
                      className={`rounded-2xl border p-5 transition flex flex-col justify-between space-y-4 ${
                        isToday
                          ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                            isToday ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {sch.day_of_week} {isToday && '• Today'}
                          </span>
                          <span className="text-xs font-extrabold text-emerald-700 font-mono">
                            ৳{sch.fee}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{sch.chamber_name}</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 flex items-start gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span>{sch.chamber_address}, {sch.chamber_area || sch.chamber_city}</span>
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                          <p className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Visiting Time: <strong className="text-slate-900">{sch.start_time} – {sch.end_time}</strong>
                          </p>
                          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Ticket className="w-3.5 h-3.5 text-slate-400" />
                            Max Serials: <strong className="text-slate-800 font-mono">{sch.max_serials} patients</strong> ({sch.slot_duration_minutes} min/slot)
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setChamberId(sch.chamber_id);
                          setActiveMenu('serial-booking');
                        }}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          isToday
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Book Serials for this Schedule</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MENU 2: SERIAL BOOKING TAB (1, 2, 3, 4, 5...) */}
      {/* ========================================================================= */}
      {activeMenu === 'serial-booking' && (
        <div className="space-y-6">
          {/* Chamber & Date Control Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-3 flex-1">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  1. Booking Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white shadow-2xs"
                />
              </div>

              {data?.chambers && (
                <div className="min-w-56">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    2. Chamber Location
                  </label>
                  <select
                    value={chamberId || ''}
                    onChange={(e) => setChamberId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white shadow-2xs"
                  >
                    {data.chambers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                Day: <strong className="text-slate-900">{data?.dayOfWeek}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">
                Consultation: <strong className="text-emerald-700 font-bold font-mono">৳{schedule?.fee || doctor?.consultation_fee}</strong>
              </span>
            </div>
          </div>

          {/* Schedule Status & Stat Counters */}
          {schedule ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-700">Visiting Hours:</span>
                  <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                    {schedule.startTime} – {schedule.endTime}
                  </span>
                  <span className="text-slate-400">({schedule.slotDurationMinutes} min/patient)</span>
                </div>

                <div className="text-[11px] text-slate-500">
                  Double Booking Protection: <strong className="text-emerald-600">Active (Atomic ACID Locked)</strong>
                </div>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Serials" value={stats?.total ?? 0} tone="slate" icon={<Users className="w-4 h-4" />} />
                <StatCard label="Available To Book" value={stats?.available ?? 0} tone="emerald" icon={<CheckCircle2 className="w-4 h-4" />} />
                <StatCard label="Online Patient Booked" value={stats?.online ?? 0} tone="blue" icon={<BadgeCheck className="w-4 h-4" />} />
                <StatCard label="Compounder Manual Booked" value={stats?.manual ?? 0} tone="amber" icon={<UserPlus className="w-4 h-4" />} />
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-center space-y-2">
              <p className="text-sm font-bold">No consultation session is scheduled for {data?.dayOfWeek} at this chamber.</p>
              <p className="text-amber-700">
                Please check the <strong>Doctor Schedule</strong> tab to see which days and chambers Dr. {doctor?.name} is available.
              </p>
              <button
                onClick={() => setActiveMenu('schedule')}
                className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl cursor-pointer"
              >
                View Doctor Schedule
              </button>
            </div>
          )}

          {/* Serial Board: 1, 2, 3, 4, 5... Grid */}
          {schedule && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-emerald-600" />
                    <span>Serials: 1, 2, 3, 4, 5... (Select Serial To Book)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any green available serial to book and lock it instantly. Booked serials are locked from online patients.
                  </p>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Available
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    <Lock className="w-3 h-3 text-blue-600" />
                    Online Booked
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    <Lock className="w-3 h-3 text-amber-600" />
                    Manual Booked
                  </span>
                </div>
              </div>

              {/* Serials Interactive Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {data?.serials.map((s) => {
                  const meta = STATUS_META[s.status];
                  const isAvailable = s.status === 'available';
                  const isOnline = s.status === 'online';
                  const isManual = s.status === 'manual';

                  return (
                    <div
                      key={s.serial_number}
                      onClick={() => {
                        if (isAvailable) openBookingModal(s);
                      }}
                      className={`rounded-2xl border-2 p-3 transition flex flex-col justify-between relative select-none ${
                        isAvailable
                          ? 'border-emerald-300 bg-white hover:border-emerald-500 hover:shadow-md cursor-pointer hover:scale-[1.02]'
                          : isOnline
                          ? 'border-blue-200 bg-blue-50/50 cursor-not-allowed opacity-90'
                          : isManual
                          ? 'border-amber-200 bg-amber-50/50 cursor-not-allowed opacity-90'
                          : 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {/* Top Header of the slot */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Serial
                        </span>
                        {isAvailable ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        ) : (
                          <Lock className={`w-3.5 h-3.5 ${isOnline ? 'text-blue-600' : 'text-amber-600'}`} />
                        )}
                      </div>

                      {/* Prominent Serial Number: 1, 2, 3... */}
                      <div className="py-1 text-center">
                        <div className={`text-3xl font-black font-mono leading-none ${
                          isAvailable
                            ? 'text-emerald-700'
                            : isOnline
                            ? 'text-blue-800'
                            : isManual
                            ? 'text-amber-800'
                            : 'text-slate-400'
                        }`}>
                          {s.serial_number}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{s.estimated_time}</span>
                        </div>
                      </div>

                      {/* Footer Badge or Patient Name */}
                      <div className="pt-2 border-t border-slate-100 text-center">
                        {isAvailable ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openBookingModal(s);
                            }}
                            className="w-full py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition shadow-2xs"
                          >
                            Book Serial #{s.serial_number}
                          </button>
                        ) : (
                          <div className="text-[10px]">
                            <span className={`inline-block px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${meta.badge}`}>
                              {isOnline ? 'Locked (Online)' : 'Locked (Manual)'}
                            </span>
                            {s.patient_name && (
                              <p className="text-slate-700 font-semibold truncate mt-1">
                                {s.patient_name}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {data?.serials.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No serials configured for this session.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MENU 3: PATIENT QUEUE & ATTENDANCE MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeMenu === 'queue' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-600" />
                <span>Chamber Queue & Patient Attendance Management</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mark patient arrival in chamber, call patient to doctor's room, and complete consultation.
              </p>
            </div>

            {/* Quick search */}
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search patient or serial..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
              />
            </div>
          </div>

          {/* List of booked appointments in serial order */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {data?.serials.filter(s => s.status === 'online' || s.status === 'manual').length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No patients booked yet for this session. Use the <strong>Serial Booking</strong> tab to book serials.
              </div>
            ) : (
              data?.serials
                .filter(s => (s.status === 'online' || s.status === 'manual'))
                .filter(s => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase().trim();
                  return (
                    String(s.serial_number) === q ||
                    s.patient_name?.toLowerCase().includes(q) ||
                    s.patient_phone?.includes(q)
                  );
                })
                .map((s) => {
                  const clinMeta = s.appointment_status ? CLINICAL_STATUS_META[s.appointment_status] : null;

                  return (
                    <div key={s.serial_number} className="p-4 bg-white hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-mono font-black text-xl flex items-center justify-center shrink-0">
                          {s.serial_number}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">
                              {s.patient_name}
                            </h4>
                            {clinMeta && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${clinMeta.className}`}>
                                {clinMeta.label}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_META[s.status]?.badge}`}>
                              {s.status === 'online' ? 'Online' : 'Manual'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {s.patient_phone}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Estimated: {s.estimated_time}
                            </span>
                            {s.appointment_id && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[10px] text-slate-400">ID: {s.appointment_id}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      {s.record_id && (
                        <div className="flex items-center gap-1.5 self-end sm:self-center flex-wrap">
                          {s.appointment_status !== 'waiting' && s.appointment_status !== 'completed' && (
                            <button
                              disabled={updatingRecordId === s.record_id}
                              onClick={() => handleUpdateStatus(s.record_id!, 'waiting', s.serial_number)}
                              className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                            >
                              Arrived / Waiting
                            </button>
                          )}
                          {s.appointment_status !== 'in_consultation' && s.appointment_status !== 'completed' && (
                            <button
                              disabled={updatingRecordId === s.record_id}
                              onClick={() => handleUpdateStatus(s.record_id!, 'in_consultation', s.serial_number)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-900 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                            >
                              Call to Room
                            </button>
                          )}
                          {s.appointment_status !== 'completed' && (
                            <button
                              disabled={updatingRecordId === s.record_id}
                              onClick={() => handleUpdateStatus(s.record_id!, 'completed', s.serial_number)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                            >
                              Done
                            </button>
                          )}
                          <button
                            disabled={updatingRecordId === s.record_id}
                            onClick={() => handleUpdateStatus(s.record_id!, 'cancelled', s.serial_number)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INSTANT MANUAL SERIAL BOOKING MODAL */}
      {/* ========================================================================= */}
      {selectedSerial && data?.chamber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold mb-1">
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Locking Serial #{selectedSerial.serial_number}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  Book Serial #{selectedSerial.serial_number}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {data.chamber.name} • {date} • {selectedSerial.estimated_time}
                </p>
              </div>
              <button
                onClick={closeBookingModal}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <DollarSign className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Chamber Counter Payment (Non-Payment / Unpaid in system):</strong> No online payment is collected. Patient pays consultation fee (৳{schedule?.fee || doctor?.consultation_fee}) directly at the chamber counter.
              </div>
            </div>

            {bookingError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleBookSerial} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Patient Full Name *</label>
                <input
                  type="text" required value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Abul Kalam"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Patient Mobile Number *</label>
                <input
                  type="tel" required value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="e.g. 01712345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-mono font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Age</label>
                  <input
                    type="number" min={0} max={130} value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="e.g. 35"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white font-medium text-slate-900"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Health Complaint / Notes (Optional)</label>
                <textarea
                  rows={2} value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Brief symptoms or reason for visit..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden resize-none font-medium text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeBookingModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={booking}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
                >
                  {booking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{booking ? 'Locking...' : `Confirm & Lock Serial #${selectedSerial.serial_number}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; tone: string; icon: React.ReactNode }> = ({ label, value, tone, icon }) => {
  const tones: Record<string, string> = {
    slate: 'text-slate-900',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
    emerald: 'text-emerald-700',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 shadow-2xs">
      <div className="flex items-center justify-between text-slate-400 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-black ${tones[tone] || 'text-slate-900'}`}>{value}</div>
    </div>
  );
};
