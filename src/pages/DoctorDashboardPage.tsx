import React, { useState, useEffect } from 'react';
import {
  Stethoscope, Building2, Calendar, Clock, Plus, Users, CheckCircle2,
  AlertCircle, X, Check, Filter, ChevronRight, Phone, MapPin, Award, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { DoctorProfile, Chamber, Schedule, Appointment } from '../types.js';

export const DoctorDashboardPage: React.FC = () => {
  const { user, t } = useAuth();

  const [activeTab, setActiveTab] = useState<'appointments' | 'chambers' | 'schedules' | 'profile'>('appointments');
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for appointments
  const [filterChamberId, setFilterChamberId] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');

  // Modals
  const [showAddChamberModal, setShowAddChamberModal] = useState(false);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);

  // Form states for Add Chamber
  const [newChamberName, setNewChamberName] = useState('');
  const [newChamberAddress, setNewChamberAddress] = useState('');
  const [newChamberCity, setNewChamberCity] = useState('Dhaka');
  const [newChamberArea, setNewChamberArea] = useState('');
  const [newChamberPhone, setNewChamberPhone] = useState('');
  const [newChamberFee, setNewChamberFee] = useState('1000');
  const [savingChamber, setSavingChamber] = useState(false);

  // Form states for Add Schedule
  const [newSchChamberId, setNewSchChamberId] = useState<string>('');
  const [newSchDay, setNewSchDay] = useState('Friday');
  const [newSchStart, setNewSchStart] = useState('17:00');
  const [newSchEnd, setNewSchEnd] = useState('20:00');
  const [newSchMax, setNewSchMax] = useState('20');
  const [newSchDuration, setNewSchDuration] = useState('10');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Action status message
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [profRes, chamRes, schRes] = await Promise.all([
        fetch('/api/doctor/profile'),
        fetch('/api/doctor/chambers'),
        fetch('/api/doctor/schedules'),
      ]);

      if (profRes.ok) {
        const pData = await profRes.json();
        setProfile(pData.doctor);
      }
      if (chamRes.ok) {
        const cData = await chamRes.json();
        setChambers(cData.chambers || []);
        if (cData.chambers?.length > 0 && !newSchChamberId) {
          setNewSchChamberId(String(cData.chambers[0].id));
        }
      }
      if (schRes.ok) {
        const sData = await schRes.json();
        setSchedules(sData.schedules || []);
      }

      // Fetch appointments
      const apptRes = await fetch('/api/doctor/appointments');
      if (apptRes.ok) {
        const aData = await apptRes.json();
        setAppointments(aData.appointments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateChamber = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingChamber(true);
    try {
      const res = await fetch('/api/doctor/chambers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChamberName,
          address: newChamberAddress,
          city: newChamberCity,
          area: newChamberArea,
          phone: newChamberPhone,
          consultationFee: Number(newChamberFee),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: 'Chamber added successfully!' });
        setShowAddChamberModal(false);
        setNewChamberName('');
        setNewChamberAddress('');
        fetchDashboardData();
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to add chamber' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setSavingChamber(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSchedule(true);
    try {
      const res = await fetch('/api/doctor/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chamberId: Number(newSchChamberId),
          dayOfWeek: newSchDay,
          startTime: newSchStart,
          endTime: newSchEnd,
          maxSerials: Number(newSchMax),
          slotDurationMinutes: Number(newSchDuration),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: 'Weekly schedule configured! Serials are now generated.' });
        setShowAddScheduleModal(false);
        fetchDashboardData();
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to configure schedule' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleUpdateStatus = async (appointmentId: number, status: string) => {
    try {
      const res = await fetch(`/api/doctor/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setNotification({ type: 'success', message: `Appointment status updated to ${status}` });
        // Refresh appointments
        const apptRes = await fetch('/api/doctor/appointments');
        if (apptRes.ok) {
          const aData = await apptRes.json();
          setAppointments(aData.appointments || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    if (filterChamberId && String(a.chamber_id) !== filterChamberId) return false;
    if (filterDate && a.schedule_date !== filterDate) return false;
    return true;
  });

  const isPending = profile?.status === 'pending';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Pending Approval Warning if applicable */}
      {isPending && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <h4 className="font-bold">Doctor Application Pending Admin Approval</h4>
            <p className="text-amber-800 mt-0.5">
              Your profile is currently awaiting verification by the administrator. Once approved, your chambers and schedules will appear in public patient search results.
            </p>
          </div>
        </div>
      )}

      {/* Notification toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="font-bold underline cursor-pointer">
            Close
          </button>
        </div>
      )}

      {/* Doctor Header Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={profile?.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80'}
            alt={profile?.name}
            className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {profile?.title} {profile?.name}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                  profile?.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {profile?.status || 'Active'}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">{profile?.qualification}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">BMDC Reg: {profile?.bmdc_number}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddChamberModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Chamber</span>
          </button>
          <button
            onClick={() => setShowAddScheduleModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Schedule</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'appointments'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Appointments & Queue ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('chambers')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'chambers'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Chambers ({chambers.length})
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'schedules'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Weekly Schedules ({schedules.length})
          </button>
        </nav>
      </div>

      {/* Tab 1: Appointments */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-600">Filter Chamber:</span>
                <select
                  value={filterChamberId}
                  onChange={(e) => setFilterChamberId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="">All Chambers</option>
                  {chambers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Date:</span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              {(filterChamberId || filterDate) && (
                <button
                  onClick={() => {
                    setFilterChamberId('');
                    setFilterDate('');
                  }}
                  className="text-emerald-600 font-semibold hover:underline"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="text-slate-500">
              Showing <strong className="text-slate-900">{filteredAppointments.length}</strong> serial(s)
            </div>
          </div>

          {/* Appointments Table */}
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Patient Appointments Found</h3>
              <p className="text-xs text-slate-500">
                Appointments booked by patients for your configured serial slots will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-[10px] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Serial</th>
                      <th className="px-4 py-3">Appointment ID</th>
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3">Chamber</th>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Fee</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredAppointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-sm">
                            {appt.serial_number < 10 ? `0${appt.serial_number}` : appt.serial_number}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          {appt.appointment_id}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{appt.patient_name}</p>
                          <p className="text-[11px] text-slate-400">{appt.patient_phone}</p>
                          {appt.patient_age && (
                            <p className="text-[10px] text-slate-400">
                              {appt.patient_age} yrs • {appt.patient_gender}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{appt.chamber_name}</p>
                          <p className="text-[10px] text-slate-400">{appt.chamber_area}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{appt.schedule_date}</p>
                          <p className="text-[11px] text-slate-500">{appt.appointment_time}</p>
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-700">
                          ৳{appt.consultation_fee}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              appt.status === 'confirmed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : appt.status === 'completed'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {appt.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5">
                          {appt.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(appt.id, 'completed')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                              >
                                Completed
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-[11px] font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Chambers */}
      {activeTab === 'chambers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Your Practice Chambers</h3>
            <button
              onClick={() => setShowAddChamberModal(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Chamber</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chambers.map((chamber) => (
              <div
                key={chamber.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Fee: ৳{chamber.consultation_fee}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{chamber.name}</h4>
                  <p className="text-xs text-slate-600 mt-1 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span>{chamber.address}, {chamber.area}, {chamber.city}</span>
                  </p>
                  {chamber.phone && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{chamber.phone}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Schedules */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Configured Weekly Consultation Hours</h3>
            <button
              onClick={() => setShowAddScheduleModal(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Schedule</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((sch) => (
              <div
                key={sch.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs">
                    {sch.day_of_week}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {sch.max_serials} Max Serials
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-xs">
                    {sch.chamber_name || 'Chamber'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sch.start_time} – {sch.end_time}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Slot duration: {sch.slot_duration_minutes} mins / patient
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Chamber Modal */}
      {showAddChamberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Chamber</h3>
              <button
                onClick={() => setShowAddChamberModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChamber} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chamber Name *</label>
                <input
                  type="text"
                  required
                  value={newChamberName}
                  onChange={(e) => setNewChamberName(e.target.value)}
                  placeholder="e.g. Ibn Sina Diagnostic, Badda"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={newChamberAddress}
                  onChange={(e) => setNewChamberAddress(e.target.value)}
                  placeholder="Street & Building info"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={newChamberCity}
                    onChange={(e) => setNewChamberCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Area</label>
                  <input
                    type="text"
                    value={newChamberArea}
                    onChange={(e) => setNewChamberArea(e.target.value)}
                    placeholder="e.g. Badda"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chamber Phone</label>
                  <input
                    type="tel"
                    value={newChamberPhone}
                    onChange={(e) => setNewChamberPhone(e.target.value)}
                    placeholder="e.g. +8801900000000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Consultation Fee (৳)</label>
                  <input
                    type="number"
                    value={newChamberFee}
                    onChange={(e) => setNewChamberFee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddChamberModal(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingChamber}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingChamber ? 'Saving...' : 'Save Chamber'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showAddScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Weekly Schedule</h3>
              <button
                onClick={() => setShowAddScheduleModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Chamber *</label>
                <select
                  required
                  value={newSchChamberId}
                  onChange={(e) => setNewSchChamberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white"
                >
                  {chambers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Day of Week *</label>
                <select
                  value={newSchDay}
                  onChange={(e) => setNewSchDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white"
                >
                  {['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time (24h) *</label>
                  <input
                    type="time"
                    required
                    value={newSchStart}
                    onChange={(e) => setNewSchStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time (24h) *</label>
                  <input
                    type="time"
                    required
                    value={newSchEnd}
                    onChange={(e) => setNewSchEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Serials Per Day</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newSchMax}
                    onChange={(e) => setNewSchMax(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Slot Duration (Mins)</label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={newSchDuration}
                    onChange={(e) => setNewSchDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingSchedule ? 'Configuring...' : 'Configure Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
