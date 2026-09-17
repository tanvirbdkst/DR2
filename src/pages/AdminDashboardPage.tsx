import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Users, Stethoscope, CalendarCheck, CheckCircle2,
  XCircle, AlertCircle, Plus, Search, Filter, ShieldAlert, Sparkles,
  RefreshCw, LogOut, ArrowRight, Lock, Mail, KeyRound, Eye, EyeOff,
  Clock, Check, Phone, MapPin, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { DoctorProfile, Specialty } from '../types.js';

interface AdminDashboardPageProps {
  onNavigate?: (view: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  const { user, login, logout, t } = useAuth();

  // Login Gate State (for unauthenticated or non-admin users)
  const [loginEmail, setLoginEmail] = useState('admin@daktarserial.com');
  const [loginPassword, setLoginPassword] = useState('Admin123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Dashboard Data State
  const [activeTab, setActiveTab] = useState<'pending' | 'doctors' | 'appointments' | 'patients' | 'specialties' | 'logs'>('pending');
  const [stats, setStats] = useState({
    totalDoctors: 0,
    pendingDoctors: 0,
    approvedDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    todayAppointments: 0,
  });

  const [pendingDoctors, setPendingDoctors] = useState<DoctorProfile[]>([]);
  const [allDoctors, setAllDoctors] = useState<DoctorProfile[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorStatusFilter, setDoctorStatusFilter] = useState<'all' | 'approved' | 'pending' | 'suspended' | 'rejected'>('all');
  const [patientSearch, setPatientSearch] = useState('');
  const [appointmentSearch, setAppointmentSearch] = useState('');

  // Add Specialty Modal
  const [showAddSpecialtyModal, setShowAddSpecialtyModal] = useState(false);
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecNameBn, setNewSpecNameBn] = useState('');
  const [newSpecDesc, setNewSpecDesc] = useState('');
  const [savingSpecialty, setSavingSpecialty] = useState(false);

  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load all admin data
  const loadAdminData = useCallback(async () => {
    if (!user || user.role !== 'admin') return;

    setLoading(true);
    setActionError(null);
    try {
      const [statsRes, pendingRes, docsRes, patientsRes, specRes, apptsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/doctors/pending'),
        fetch('/api/admin/doctors'),
        fetch('/api/admin/patients'),
        fetch('/api/admin/specialties'),
        fetch('/api/admin/appointments').catch(() => null),
      ]);

      if (statsRes.ok) {
        const sData = await statsRes.json();
        const statObj = sData.stats || sData;
        setStats({
          totalDoctors: Number(statObj.totalDoctors) || 0,
          pendingDoctors: Number(statObj.pendingDoctors) || 0,
          approvedDoctors: Number(statObj.approvedDoctors) || 0,
          totalPatients: Number(statObj.totalPatients) || 0,
          totalAppointments: Number(statObj.totalAppointments) || 0,
          todayAppointments: Number(statObj.todayAppointments) || 0,
        });
        if (sData.recentLogs) {
          setActivityLogs(sData.recentLogs);
        }
      }

      if (pendingRes.ok) {
        const pData = await pendingRes.json();
        setPendingDoctors(pData.pendingDoctors || pData.doctors || []);
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

      if (apptsRes && apptsRes.ok) {
        const apData = await apptsRes.json();
        setAppointments(apData.appointments || []);
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setActionError(err.message || 'Failed to fetch admin data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminData();
    }
  }, [user, loadAdminData]);

  // Fast 1-Click Login as Admin
  const handleQuickAdminLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await login('admin@daktarserial.com', 'Admin123!');
      if (!res.success) {
        setLoginError(res.error || 'Failed to authenticate as admin.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login error occurred.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await login(loginEmail, loginPassword);
      if (!res.success) {
        setLoginError(res.error || 'Invalid credentials.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login error occurred.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleUpdateDoctorStatus = async (doctorId: number, status: 'approved' | 'rejected' | 'suspended') => {
    let reason = '';
    if (status === 'rejected') {
      const input = prompt('Please provide rejection reason for this doctor application (optional):');
      if (input === null) return; // cancelled
      reason = input;
    }

    try {
      // First try PATCH /status
      let res = await fetch(`/api/admin/doctors/${doctorId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      });

      // If PATCH is not available, fallback to POST action
      if (!res.ok && res.status === 404) {
        res = await fetch(`/api/admin/doctors/${doctorId}/${status}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || `Doctor status updated to "${status}"`);
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
    if (!newSpecName.trim()) return;

    setSavingSpecialty(true);
    try {
      const res = await fetch('/api/admin/specialties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSpecName.trim(),
          name_bn: newSpecNameBn.trim() || undefined,
          description: newSpecDesc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Specialty "${newSpecName}" successfully added!`);
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

  // -------------------------------------------------------------
  // ACCESS GATE: Rendered if not logged in or role is not admin
  // -------------------------------------------------------------
  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
              {t('Administration Access', 'অ্যাডমিন এক্সেস')}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t('Daktar Serial Admin Panel', 'ডাক্তার সিরিয়াল অ্যাডমিন প্যানেল')}
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {t(
                'BMDC Doctor Verification, Chamber approvals, Specialty management, and live appointment serial oversight.',
                'ডাক্তারদের বিএমডিসি ভেরিফিকেশন, চেম্বার অনুমোদন, স্পেশালিটি ব্যবস্থাপনা এবং লাইভ সিরিয়াল মনিটরিং।'
              )}
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* 1-Click Quick Access Button */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 p-5 rounded-2xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>{t('Instant Demo Access', '১-ক্লিকে অ্যাডমিন প্রবেশ')}</span>
              </span>
              <span className="text-[10px] font-mono text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded">
                Super Admin
              </span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {t(
                'Log in instantly with preset administrative credentials to review pending doctors and system diagnostics.',
                'আগে থেকে নির্ধারিত সুপার অ্যাডমিন একাউন্ট দিয়ে এক ক্লিকে অ্যাডমিন ড্যাশবোর্ডে প্রবেশ করুন।'
              )}
            </p>
            <button
              onClick={handleQuickAdminLogin}
              disabled={loginLoading}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-bold text-xs tracking-wide transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{loginLoading ? t('Authenticating...', 'প্রবেশ করা হচ্ছে...') : t('Login as Super Admin (১-ক্লিকে প্রবেশ)', 'সুপার অ্যাডমিন হিসেবে প্রবেশ')}</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] text-slate-400 uppercase font-medium">
              {t('Or Enter Admin Credentials', 'অথবা তথ্য দিয়ে লগইন করুন')}
            </span>
          </div>

          {/* Standard Login Form */}
          <form onSubmit={handleManualLogin} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t('Admin Email Address', 'অ্যাডমিন ইমেইল')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t('Admin Password', 'অ্যাডমিন পাসওয়ার্ড')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{loginLoading ? t('Verifying...', 'যাচাই করা হচ্ছে...') : t('Sign In to Admin Panel', 'অ্যাডমিন প্যানেলে সাইন ইন')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={() => onNavigate?.('home')}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition cursor-pointer"
            >
              ← {t('Back to Patient Booking Portal', 'মূল বুকিং পোর্টালে ফিরে যান')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED ADMIN DASHBOARD
  // -------------------------------------------------------------

  // Filtered doctors
  const filteredDoctors = allDoctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.bmdc_number?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.specialty_name?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.phone?.toLowerCase().includes(doctorSearch.toLowerCase());

    const matchesStatus =
      doctorStatusFilter === 'all' || doc.approval_status === doctorStatusFilter || doc.status === doctorStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filtered patients
  const filteredPatients = patients.filter((p) => {
    return (
      p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone?.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.email?.toLowerCase().includes(patientSearch.toLowerCase())
    );
  });

  // Filtered appointments
  const filteredAppointments = appointments.filter((a) => {
    return (
      a.patient_name?.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
      a.patient_phone?.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
      a.doctor_name?.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
      a.chamber_name?.toLowerCase().includes(appointmentSearch.toLowerCase())
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Super Admin Active</span>
            </span>
            <span className="text-xs text-slate-400">{user.email}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1.5">
            Daktar Serial Admin Panel (অ্যাডমিন কন্ট্রোল)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Doctor verification, chamber approvals, patient registries, and double-booking safeguards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadAdminData}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Reload live database counts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <button
            onClick={() => setShowAddSpecialtyModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Specialty</span>
          </button>

          <button
            onClick={async () => {
              await logout();
              onNavigate?.('home');
            }}
            className="px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-rose-500/30"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </span>
          <button onClick={() => setActionMessage(null)} className="font-bold underline cursor-pointer text-emerald-900">
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </span>
          <button onClick={() => setActionError(null)} className="font-bold underline cursor-pointer text-rose-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab('pending')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border transition shadow-xs cursor-pointer ${
            activeTab === 'pending' ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending Review</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">{stats.pendingDoctors}</div>
          <p className="text-[10px] text-slate-500 mt-1">Awaiting BMDC review</p>
        </div>

        <div
          onClick={() => setActiveTab('doctors')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border transition shadow-xs cursor-pointer ${
            activeTab === 'doctors' ? 'border-emerald-400 ring-2 ring-emerald-400/20' : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Approved Doctors</span>
            <Stethoscope className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.approvedDoctors}</div>
          <p className="text-[10px] text-slate-500 mt-1">Active in search</p>
        </div>

        <div
          onClick={() => setActiveTab('patients')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border transition shadow-xs cursor-pointer ${
            activeTab === 'patients' ? 'border-blue-400 ring-2 ring-blue-400/20' : 'border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Registered Patients</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.totalPatients}</div>
          <p className="text-[10px] text-slate-500 mt-1">Patient user accounts</p>
        </div>

        <div
          onClick={() => setActiveTab('appointments')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border transition shadow-xs cursor-pointer ${
            activeTab === 'appointments' ? 'border-purple-400 ring-2 ring-purple-400/20' : 'border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Total Bookings</span>
            <CalendarCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.totalAppointments}</div>
          <p className="text-[10px] text-slate-500 mt-1">Serial bookings recorded</p>
        </div>

        <div
          onClick={() => setActiveTab('specialties')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border transition shadow-xs cursor-pointer ${
            activeTab === 'specialties' ? 'border-teal-400 ring-2 ring-teal-400/20' : 'border-slate-200 hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Specialties</span>
            <Sparkles className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{specialties.length}</div>
          <p className="text-[10px] text-slate-500 mt-1">Active categories</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex space-x-6 text-xs sm:text-sm font-semibold whitespace-nowrap">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pending'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Pending Reviews</span>
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
            onClick={() => setActiveTab('appointments')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'appointments'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Serials & Appointments ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'patients'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Patient Registry ({patients.length})
          </button>
          <button
            onClick={() => setActiveTab('specialties')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'specialties'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Medical Specialties ({specialties.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'logs'
                ? 'border-slate-800 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Activity Audit
          </button>
        </nav>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: PENDING DOCTOR APPLICATIONS */}
      {/* ========================================================= */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Doctor Applications Pending BMDC Review ({pendingDoctors.length})
              </h3>
              <p className="text-xs text-slate-500">
                Approved doctors immediately become publicly searchable and able to publish serial booking slots.
              </p>
            </div>
            <button
              onClick={loadAdminData}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Queue</span>
            </button>
          </div>

          {pendingDoctors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">All Doctor Applications Reviewed!</h4>
              <p className="text-xs text-slate-500">
                There are no pending doctor registrations awaiting review at this time. All active doctors are live.
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                          Pending Approval
                        </span>
                        <span className="text-xs font-semibold text-emerald-700">
                          {doc.specialty_name || 'General Specialist'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base mt-1 truncate">
                        {doc.title} {doc.name}
                      </h4>
                      <p className="text-xs text-slate-600 font-mono font-medium">BMDC Reg: {doc.bmdc_number}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 text-slate-700">
                    <p><strong>Qualification:</strong> {doc.qualification || 'MBBS'}</p>
                    <p><strong>Experience:</strong> {doc.experience_years || 0} years</p>
                    <p><strong>Contact:</strong> {doc.email} • {doc.phone || 'Phone not provided'}</p>
                    <p><strong>Fee:</strong> ৳{doc.consultation_fee || 500}</p>
                    {doc.bio && <p className="text-slate-500 italic">"{doc.bio}"</p>}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleUpdateDoctorStatus(doc.id, 'rejected')}
                      className="px-3.5 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold transition cursor-pointer"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => handleUpdateDoctorStatus(doc.id, 'approved')}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Activate Doctor</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ALL DOCTORS DIRECTORY */}
      {/* ========================================================= */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                placeholder="Search doctors by name, phone, BMDC..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
              <span className="text-slate-400 text-[11px] mr-1">Status:</span>
              {(['all', 'approved', 'pending', 'suspended', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setDoctorStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer ${
                    doctorStatusFilter === st
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-[10px] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Specialty</th>
                  <th className="px-4 py-3">BMDC Reg #</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredDoctors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                      No doctors matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map((doc) => {
                    const status = doc.approval_status || doc.status || 'pending';
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 flex items-center gap-3">
                          <img
                            src={doc.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80'}
                            alt={doc.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-100"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{doc.title} {doc.name}</p>
                            <p className="text-[11px] text-slate-400">{doc.email} • {doc.phone || 'No phone'}</p>
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
                              status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700'
                                : status === 'pending'
                                ? 'bg-amber-50 text-amber-700'
                                : status === 'suspended'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                          {status !== 'approved' && (
                            <button
                              onClick={() => handleUpdateDoctorStatus(doc.id, 'approved')}
                              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {status !== 'suspended' && (
                            <button
                              onClick={() => handleUpdateDoctorStatus(doc.id, 'suspended')}
                              className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold cursor-pointer"
                            >
                              Suspend
                            </button>
                          )}
                          {status !== 'rejected' && (
                            <button
                              onClick={() => handleUpdateDoctorStatus(doc.id, 'rejected')}
                              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold cursor-pointer"
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SERIALS & APPOINTMENTS OVERVIEW */}
      {/* ========================================================= */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Live Chamber Serials & Bookings ({appointments.length})
              </h3>
              <p className="text-xs text-slate-500">
                Monitors ACID sequential serial allocations and prevents double-booking.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={appointmentSearch}
                onChange={(e) => setAppointmentSearch(e.target.value)}
                placeholder="Search patient, doctor, chamber..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-[10px] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Serial #</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Doctor & Specialty</th>
                  <th className="px-4 py-3">Chamber</th>
                  <th className="px-4 py-3">Schedule Date</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                      {appointments.length === 0 ? 'No serial bookings in database yet.' : 'No matching bookings found.'}
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold font-mono">
                          {a.serial_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{a.patient_name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{a.patient_phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{a.doctor_name}</p>
                        <p className="text-[11px] text-emerald-600">{a.specialty_name || 'Specialist'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {a.chamber_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {a.schedule_date?.split('T')[0] || a.schedule_date}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-700">
                        ৳{a.consultation_fee}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            a.status === 'confirmed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : a.status === 'completed'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: PATIENT REGISTRY */}
      {/* ========================================================= */}
      {activeTab === 'patients' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Registered Patient Database ({patients.length})
              </h3>
              <p className="text-xs text-slate-500">
                User profiles with linked serial booking histories.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search by name, phone, email..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-[10px] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Blood Group</th>
                  <th className="px-4 py-3">Registered At</th>
                  <th className="px-4 py-3 text-right">Appointments Booked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                      No patients found matching search.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((pat) => (
                    <tr key={pat.id || pat.user_id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{pat.name}</p>
                        <p className="text-[11px] text-slate-400">{pat.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono">{pat.phone || 'N/A'}</td>
                      <td className="px-4 py-3 capitalize">{pat.gender || 'N/A'}</td>
                      <td className="px-4 py-3 font-bold text-rose-700">{pat.blood_group || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-500">{pat.created_at?.split('T')[0] || pat.created_at?.split(' ')[0]}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {pat.total_appointments || pat.appointment_count || 0} Serials
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: MEDICAL SPECIALTIES */}
      {/* ========================================================= */}
      {activeTab === 'specialties' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Active Medical Specialties ({specialties.length})</h3>
              <p className="text-xs text-slate-500">Departments shown on homepage and doctor discovery filters.</p>
            </div>
            <button
              onClick={() => setShowAddSpecialtyModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Specialty</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {specialties.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    ID #{s.id}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 font-medium">
                    {s.slug}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                  {s.name_bn && <p className="text-xs text-emerald-700 font-medium">{s.name_bn}</p>}
                </div>
                {s.description && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 pt-1 border-t border-slate-100">
                    {s.description}
                  </p>
                )}
                <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>{(s as any).doctor_count !== undefined ? `${(s as any).doctor_count} Doctors` : 'Specialty'}</span>
                  <span className="text-emerald-600 font-semibold">Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: ACTIVITY AUDIT LOGS */}
      {/* ========================================================= */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">System Activity Audit Trail</h3>
              <p className="text-xs text-slate-500">Immutable record of admin approvals, cancellations, and config updates.</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent audit logs recorded.</p>
            ) : (
              activityLogs.map((log: any) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[11px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                        {log.action}
                      </span>
                      <span className="font-semibold text-slate-900">{log.user_name || 'Admin'}</span>
                    </div>
                    <p className="text-slate-600 mt-1 text-xs">{log.details || log.description}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap font-mono">
                    {log.created_at?.split('T')[0] || log.created_at}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD SPECIALTY MODAL */}
      {/* ========================================================= */}
      {showAddSpecialtyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add Medical Specialty</h3>
              <button
                onClick={() => setShowAddSpecialtyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>
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
                  placeholder="Brief description of clinical specialty..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSpecialtyModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-medium cursor-pointer"
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
