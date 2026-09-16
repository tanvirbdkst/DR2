import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Users, Stethoscope, CalendarCheck, CheckCircle2,
  XCircle, AlertCircle, Plus, Search, Filter, ShieldAlert, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { DoctorProfile, Specialty } from '../types.js';

export const AdminDashboardPage: React.FC = () => {
  const { user, t } = useAuth();

  const [activeTab, setActiveTab] = useState<'pending' | 'doctors' | 'patients' | 'specialties'>('pending');
  const [stats, setStats] = useState({
    totalDoctors: 0,
    pendingDoctors: 0,
    approvedDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
  });

  const [pendingDoctors, setPendingDoctors] = useState<DoctorProfile[]>([]);
  const [allDoctors, setAllDoctors] = useState<DoctorProfile[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);

  // New Specialty modal
  const [showAddSpecialtyModal, setShowAddSpecialtyModal] = useState(false);
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecNameBn, setNewSpecNameBn] = useState('');
  const [newSpecDesc, setNewSpecDesc] = useState('');
  const [savingSpecialty, setSavingSpecialty] = useState(false);

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, docsRes, patientsRes, specRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/doctors/pending'),
        fetch('/api/admin/doctors'),
        fetch('/api/admin/patients'),
        fetch('/api/admin/specialties'),
      ]);

      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData.stats);
      }
      if (pendingRes.ok) {
        const pData = await pendingRes.json();
        setPendingDoctors(pData.pendingDoctors || []);
      }
      if (docsRes.ok) {
        const dData = await docsRes.json();
        setAllDoctors(dData.doctors || []);
      }
      if (patientsRes.ok) {
        const ptData = await patientsRes.json();
        setPatients(ptData.patients || []);
      }
      if (specRes.ok) {
        const spData = await specRes.json();
        setSpecialties(spData.specialties || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleUpdateDoctorStatus = async (doctorId: number, status: 'approved' | 'rejected' | 'suspended') => {
    try {
      const res = await fetch(`/api/admin/doctors/${doctorId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || `Doctor status updated to ${status}`);
        loadAdminData();
      } else {
        alert(data.error || 'Failed to update doctor status');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSpecialty(true);
    try {
      const res = await fetch('/api/admin/specialties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSpecName,
          name_bn: newSpecNameBn,
          description: newSpecDesc,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage('New medical specialty created!');
        setShowAddSpecialtyModal(false);
        setNewSpecName('');
        setNewSpecNameBn('');
        setNewSpecDesc('');
        loadAdminData();
      } else {
        alert(data.error || 'Failed to create specialty');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingSpecialty(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
              Administration Control
            </span>
            <span className="text-xs text-slate-400">Phase 1 Workflow</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Daktar Serial Admin Panel</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Approve registered doctors, manage specialties, and monitor patient serial bookings.
          </p>
        </div>

        <button
          onClick={() => setShowAddSpecialtyModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Specialty</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Pending Approval</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600">{stats.pendingDoctors}</div>
          <p className="text-[11px] text-slate-500 mt-1">Requires admin review</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Approved Doctors</span>
            <Stethoscope className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{stats.approvedDoctors}</div>
          <p className="text-[11px] text-slate-500 mt-1">Active in public search</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Registered Patients</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{stats.totalPatients}</div>
          <p className="text-[11px] text-slate-500 mt-1">Patient user accounts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Serials Booked</span>
            <CalendarCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{stats.totalAppointments}</div>
          <p className="text-[11px] text-slate-500 mt-1">Appointments recorded</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pending'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Pending Applications</span>
            {pendingDoctors.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {pendingDoctors.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('doctors')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'doctors'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            All Doctors ({allDoctors.length})
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'patients'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Patient Registry ({patients.length})
          </button>
          <button
            onClick={() => setActiveTab('specialties')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'specialties'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Medical Specialties ({specialties.length})
          </button>
        </nav>
      </div>

      {/* Tab 1: Pending Applications Queue */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Doctor Applications Pending Review ({pendingDoctors.length})
            </h3>
            <span className="text-xs text-slate-500">
              Approved doctors immediately become visible in the public search
            </span>
          </div>

          {pendingDoctors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">All Doctor Applications Reviewed!</h4>
              <p className="text-xs text-slate-500">
                There are no pending registrations awaiting approval.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingDoctors.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border-2 border-amber-200/80 p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={doc.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'}
                      alt={doc.name}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                          Pending Approval
                        </span>
                        <span className="text-xs font-semibold text-emerald-700">
                          {doc.specialty_name || 'Specialist'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base mt-1 truncate">
                        {doc.title} {doc.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono">BMDC Reg: {doc.bmdc_number}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1 text-slate-700">
                    <p><strong>Qualification:</strong> {doc.qualification}</p>
                    <p><strong>Experience:</strong> {doc.experience_years} years</p>
                    <p><strong>Chamber:</strong> {doc.chambers_list?.[0] || 'Initial Chamber'}</p>
                    <p><strong>Consultation Fee:</strong> ৳{doc.consultation_fee}</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleUpdateDoctorStatus(doc.id, 'rejected')}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold transition cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleUpdateDoctorStatus(doc.id, 'approved')}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Doctor</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: All Doctors */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-[10px] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Specialty</th>
                  <th className="px-4 py-3">BMDC Number</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {allDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 flex items-center gap-3">
                      <img
                        src={doc.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80'}
                        alt={doc.name}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-100"
                      />
                      <div>
                        <p className="font-bold text-slate-900">{doc.title} {doc.name}</p>
                        <p className="text-[11px] text-slate-400">{doc.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {doc.specialty_name || 'General'}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">
                      {doc.bmdc_number}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-700">
                      ৳{doc.consultation_fee}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          doc.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : doc.status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {doc.status !== 'approved' && (
                        <button
                          onClick={() => handleUpdateDoctorStatus(doc.id, 'approved')}
                          className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                      )}
                      {doc.status !== 'suspended' && (
                        <button
                          onClick={() => handleUpdateDoctorStatus(doc.id, 'suspended')}
                          className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold cursor-pointer"
                        >
                          Suspend
                        </button>
                      )}
                      {doc.status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdateDoctorStatus(doc.id, 'rejected')}
                          className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Patient Registry */}
      {activeTab === 'patients' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-[10px] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Blood Group</th>
                  <th className="px-4 py-3">Registered At</th>
                  <th className="px-4 py-3 text-right">Appointments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {patients.map((pat) => (
                  <tr key={pat.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{pat.name}</p>
                      <p className="text-[11px] text-slate-400">{pat.email}</p>
                    </td>
                    <td className="px-4 py-3 font-mono">{pat.phone}</td>
                    <td className="px-4 py-3 capitalize">{pat.gender || 'N/A'}</td>
                    <td className="px-4 py-3 font-bold text-rose-700">{pat.blood_group || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-500">{pat.created_at?.split(' ')[0]}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {pat.appointment_count} Serials
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Specialties */}
      {activeTab === 'specialties' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Active Medical Specialties</h3>
            <button
              onClick={() => setShowAddSpecialtyModal(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Specialty</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {specialties.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    ID #{s.id}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                    {s.slug}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                {s.name_bn && <p className="text-xs text-emerald-700 font-medium">{s.name_bn}</p>}
                {s.description && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 pt-1 border-t border-slate-100">
                    {s.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Specialty Modal */}
      {showAddSpecialtyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Medical Specialty</h3>
            <form onSubmit={handleAddSpecialty} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Specialty Name (English) *</label>
                <input
                  type="text"
                  required
                  value={newSpecName}
                  onChange={(e) => setNewSpecName(e.target.value)}
                  placeholder="e.g. Neurology"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Name in Bengali</label>
                <input
                  type="text"
                  value={newSpecNameBn}
                  onChange={(e) => setNewSpecNameBn(e.target.value)}
                  placeholder="e.g. নিউরোলজি / স্নায়ুরোগ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newSpecDesc}
                  onChange={(e) => setNewSpecDesc(e.target.value)}
                  placeholder="Brief description of field..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSpecialtyModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSpecialty}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingSpecialty ? 'Saving...' : 'Add Specialty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
