import React, { useState, useEffect } from 'react';
import { CalendarCheck, Clock, Building2, MapPin, Stethoscope, AlertCircle, XCircle, CheckCircle2, Printer, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Appointment } from '../types.js';

interface PatientDashboardPageProps {
  onFindDoctor: () => void;
}

export const PatientDashboardPage: React.FC<PatientDashboardPageProps> = ({ onFindDoctor }) => {
  const { user, t } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModalId, setCancelModalId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/appointments/my-appointments');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancelAppointment = async () => {
    if (!cancelModalId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${cancelModalId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || 'Cancelled by patient' }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage('Appointment cancelled successfully.');
        setCancelModalId(null);
        setCancelReason('');
        fetchAppointments();
      } else {
        alert(data.error || 'Failed to cancel appointment');
      }
    } catch (err: any) {
      alert(err.message || 'Error cancelling appointment');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Profile Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl border border-blue-100">
            {user?.name?.[0] || 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{user?.name}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 uppercase">
                Patient Account
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {user?.email} • {user?.phone}
            </p>
          </div>
        </div>

        <button
          onClick={onFindDoctor}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>{t('Book New Serial', 'নতুন সিরিয়াল বুক করুন')}</span>
        </button>
      </div>

      {/* Notification */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-600 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Appointments List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-600" />
            <span>{t('My Serial Bookings', 'আমার সিরিয়াল সমূহ')}</span>
          </h2>
          <span className="text-xs text-slate-500">
            Total {appointments.length} Appointment(s)
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Appointments Booked Yet</h3>
            <p className="text-xs text-slate-500">
              Browse specialist doctors and book a direct chamber serial in just a few clicks.
            </p>
            <button
              onClick={onFindDoctor}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700 transition cursor-pointer"
            >
              Search Doctors Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointments.map((appt) => {
              const isConfirmed = appt.status === 'confirmed';
              const isCompleted = appt.status === 'completed';
              const isCancelled = appt.status === 'cancelled';

              return (
                <div
                  key={appt.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top status & appointment ID */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded">
                        {appt.appointment_id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                          isConfirmed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isCompleted
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {appt.status}
                      </span>
                    </div>

                    {/* Serial Box */}
                    <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Chamber Serial</p>
                        <p className="text-2xl font-black text-emerald-800 leading-tight">
                          #{appt.serial_number < 10 ? `0${appt.serial_number}` : appt.serial_number}
                        </p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-slate-500">Date: <strong className="text-slate-800">{appt.schedule_date}</strong></p>
                        <p className="text-slate-500">Slot: <strong className="text-slate-800">{appt.appointment_time}</strong></p>
                      </div>
                    </div>

                    {/* Doctor and Chamber info */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{appt.doctor_title} {appt.doctor_name}</span>
                        {appt.specialty_name && (
                          <span className="text-[11px] font-normal text-slate-400">({appt.specialty_name})</span>
                        )}
                      </p>

                      <p className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700">{appt.chamber_name}</span>
                      </p>

                      <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <span>{appt.chamber_address}, {appt.chamber_city}</span>
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span>Patient: <strong className="text-slate-700">{appt.patient_name}</strong></span>
                        <span>Fee: <strong className="text-emerald-700 font-bold">৳{appt.consultation_fee}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isConfirmed && (
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => window.print()}
                        className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Slip</span>
                      </button>
                      <button
                        onClick={() => setCancelModalId(appt.id)}
                        className="py-1.5 px-3 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Booking</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Cancel Appointment?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to cancel this serial booking? This action will free up the serial for other patients.
            </p>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelAppointment}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
