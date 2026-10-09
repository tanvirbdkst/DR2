import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck, Users, Stethoscope, CalendarCheck, CheckCircle2,
  XCircle, AlertCircle, Plus, Search, Filter, ShieldAlert, Sparkles,
  RefreshCw, LogOut, ArrowRight, Lock, Mail, KeyRound, Eye, EyeOff,
  Clock, Check, Phone, MapPin, FileText, Save, CheckSquare, Square, RotateCcw,
  Building2, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { getAuthToken } from '../config/api.js';
import { DoctorProfile, Specialty } from '../types.js';
import { District, BANGLADESH_DISTRICTS } from '../data/districts.js';
import { HospitalIntegrationPanel } from '../components/HospitalIntegrationPanel.js';
import { NotificationBell } from '../components/NotificationBell.js';

interface AdminDashboardPageProps {
  onNavigate?: (view: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  const { user, login, logout, t, lang } = useAuth();

  // Login Gate State (for unauthenticated or non-admin users)
  const [loginEmail, setLoginEmail] = useState('admin@daktarserial.com');
  const [loginPassword, setLoginPassword] = useState('Admin123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Dashboard Data State
  const [activeTab, setActiveTab] = useState<'pending' | 'doctors' | 'appointments' | 'patients' | 'specialties' | 'locations' | 'compounders' | 'hospitals' | 'logs'>('pending');
  const [stats, setStats] = useState({
    totalDoctors: 0,
    pendingDoctors: 0,
    approvedDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    todayAppointments: 0,
    totalCompounders: 0,
    totalHospitals: 0,
  });

  const [pendingDoctors, setPendingDoctors] = useState<DoctorProfile[]>([]);
  const [allDoctors, setAllDoctors] = useState<DoctorProfile[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [districts, setDistricts] = useState<District[]>(() => {
    return BANGLADESH_DISTRICTS.map((d, idx) => ({
      ...d,
      is_active: 1,
      sort_order: idx + 1,
    }));
  });
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Search Locations / Districts state
  const [districtSearch, setDistrictSearch] = useState('');
  const [districtDivisionFilter, setDistrictDivisionFilter] = useState('all');
  const [markedDistrictIds, setMarkedDistrictIds] = useState<Set<string>>(() => {
    return new Set(BANGLADESH_DISTRICTS.map((d) => d.id));
  });
  const [savingDistricts, setSavingDistricts] = useState(false);
  const [districtSaveSuccess, setDistrictSaveSuccess] = useState<string | null>(null);

  // Compounder / Chamber Staff Management
  const [compounders, setCompounders] = useState<any[]>([]);
  const [assignableDoctors, setAssignableDoctors] = useState<any[]>([]);
  const [showAddCompounderModal, setShowAddCompounderModal] = useState(false);
  const [savingCompounder, setSavingCompounder] = useState(false);
  const [compounderForm, setCompounderForm] = useState({
    name: '', email: '', phone: '', password: '', status: 'active', doctorId: '',
  });
  const [editingCompounder, setEditingCompounder] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', doctorId: '' });
  const [savingEdit, setSavingEdit] = useState(false);

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
      const token = getAuthToken();
      const authHeaders: Record<string, string> = {};
      if (token) authHeaders['Authorization'] = `Bearer ${token}`;
      const opts: RequestInit = { headers: authHeaders, credentials: 'include' };

      const [statsRes, pendingRes, docsRes, patientsRes, specRes, apptsRes, compRes, availDocsRes, distRes, hospRes] = await Promise.all([
        fetch('/api/admin/stats', opts),
        fetch('/api/admin/doctors/pending', opts),
        fetch('/api/admin/doctors', opts),
        fetch('/api/admin/patients', opts),
        fetch('/api/admin/specialties', opts),
        fetch('/api/admin/appointments', opts).catch(() => null),
        fetch('/api/admin/compounders', opts).catch(() => null),
        fetch('/api/admin/compounders/available-doctors', opts).catch(() => null),
        fetch('/api/admin/districts', opts).catch(() => null),
        fetch('/api/admin/hospitals', opts).catch(() => null),
      ]);

      if (statsRes.ok) {
        const sData = await statsRes.json();
        const statObj = sData.stats || sData;
        setStats((prev) => ({
          ...prev,
          totalDoctors: Number(statObj.totalDoctors) || 0,
          pendingDoctors: Number(statObj.pendingDoctors) || 0,
          approvedDoctors: Number(statObj.approvedDoctors) || 0,
          totalPatients: Number(statObj.totalPatients) || 0,
          totalAppointments: Number(statObj.totalAppointments) || 0,
          todayAppointments: Number(statObj.todayAppointments) || 0,
          totalCompounders: Number(statObj.totalCompounders) || 0,
        }));
        if (sData.recentLogs) {
          setActivityLogs(sData.recentLogs);
        }
      }

      if (hospRes && hospRes.ok) {
        const hData = await hospRes.json();
        setStats((prev) => ({ ...prev, totalHospitals: hData.hospitals?.length || 0 }));
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

      if (compRes && compRes.ok) {
        const cData = await compRes.json();
        setCompounders(cData.compounders || []);
      }

      if (availDocsRes && availDocsRes.ok) {
        const adData = await availDocsRes.json();
        setAssignableDoctors(adData.doctors || []);
      }

      if (distRes && distRes.ok) {
        const dtData = await distRes.json();
        const incoming: District[] = dtData.districts || [];
        if (incoming.length > 0) {
          const merged = BANGLADESH_DISTRICTS.map((baseD, idx) => {
            const found = incoming.find((item) => item.id.toLowerCase() === baseD.id.toLowerCase());
            return found ? { ...baseD, ...found } : { ...baseD, is_active: 1, sort_order: idx + 1 };
          });
          setDistricts(merged);
          setMarkedDistrictIds(new Set(merged.filter((d) => Boolean(d.is_active)).map((d) => d.id)));
        }
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setActionError(err.message || 'Failed to fetch admin data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Standalone district loader that runs reliably even before admin user state resolves
  const fetchDistricts = useCallback(async () => {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res = await fetch('/api/admin/districts', { headers, credentials: 'include' });
      if (!res.ok) {
        res = await fetch('/api/public/districts?all=1');
      }
      if (res.ok) {
        const dtData = await res.json();
        const incoming: District[] = dtData.districts || [];
        if (incoming.length > 0) {
          const merged = BANGLADESH_DISTRICTS.map((baseD, idx) => {
            const found = incoming.find((item) => item.id.toLowerCase() === baseD.id.toLowerCase());
            return found ? { ...baseD, ...found } : { ...baseD, is_active: 1, sort_order: idx + 1 };
          });
          setDistricts(merged);
          setMarkedDistrictIds(new Set(merged.filter((d) => Boolean(d.is_active)).map((d) => d.id)));
        }
      }
    } catch (err) {
      console.warn('Could not fetch active districts from API, using default 64:', err);
    }
  }, []);

  useEffect(() => {
    fetchDistricts();
  }, [fetchDistricts]);

  useEffect(() => {
    if (activeTab === 'locations') {
      fetchDistricts();
    }
  }, [activeTab, fetchDistricts]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminData();
    }
  }, [user, loadAdminData]);

  // District Search & Division Filter
  const filteredDistricts = useMemo(() => {
    const search = districtSearch.toLowerCase().trim();

    return districts.filter((d) => {
      const matchSearch =
        !search ||
        d.name.toLowerCase().includes(search) ||
        d.name_bn.includes(search) ||
        d.division.toLowerCase().includes(search) ||
        d.division_bn.includes(search) ||
        (d.aliases && d.aliases.some((a) => a.toLowerCase().includes(search)));

      if (!matchSearch) return false;

      // If user typed a search keyword (e.g. "Kushti"), allow it to match across all divisions
      // so searching "Kushti" while "Sylhet" tab is selected finds Kushtia immediately!
      if (search) {
        return true;
      }

      // No search keyword typed: strictly filter by division tab
      if (districtDivisionFilter === 'all') return true;
      return d.division.toLowerCase() === districtDivisionFilter.toLowerCase();
    });
  }, [districts, districtSearch, districtDivisionFilter]);

  const savedActiveDistrictIds = useMemo(() => {
    return new Set(districts.filter((d) => Boolean(d.is_active)).map((d) => d.id));
  }, [districts]);

  const hasUnsavedDistrictChanges = useMemo(() => {
    if (markedDistrictIds.size !== savedActiveDistrictIds.size) return true;
    for (const id of markedDistrictIds) {
      if (!savedActiveDistrictIds.has(id)) return true;
    }
    return false;
  }, [markedDistrictIds, savedActiveDistrictIds]);

  const toggleMarkDistrict = (id: string) => {
    setDistrictSaveSuccess(null);
    setMarkedDistrictIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const markAllDistricts = () => {
    setDistrictSaveSuccess(null);
    setMarkedDistrictIds(new Set(districts.map((d) => d.id)));
  };

  const unmarkAllDistricts = () => {
    setDistrictSaveSuccess(null);
    setMarkedDistrictIds(new Set());
  };

  const markDivisionDistricts = (divisionName: string) => {
    setDistrictSaveSuccess(null);
    const targetDistricts = districts.filter(
      (d) => d.division.toLowerCase() === divisionName.toLowerCase()
    );
    setMarkedDistrictIds((prev) => {
      const next = new Set(prev);
      targetDistricts.forEach((d) => next.add(d.id));
      return next;
    });
  };

  const unmarkDivisionDistricts = (divisionName: string) => {
    setDistrictSaveSuccess(null);
    const targetDistricts = districts.filter(
      (d) => d.division.toLowerCase() === divisionName.toLowerCase()
    );
    setMarkedDistrictIds((prev) => {
      const next = new Set(prev);
      targetDistricts.forEach((d) => next.delete(d.id));
      return next;
    });
  };

  const handleResetDistrictSelection = () => {
    setDistrictSaveSuccess(null);
    setMarkedDistrictIds(new Set(savedActiveDistrictIds));
  };

  const handleSaveDistrictSelection = async () => {
    setSavingDistricts(true);
    setActionError(null);
    setDistrictSaveSuccess(null);
    try {
      const activeIds = Array.from(markedDistrictIds);
      let token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let res = await fetch('/api/admin/districts/batch', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ active_ids: activeIds }),
      });

      // If session expired or 401, automatically re-authenticate as admin and retry once
      if (res.status === 401) {
        console.warn('Session expired, auto-refreshing admin token...');
        const loginRes = await login('admin@daktarserial.com', 'Admin123!');
        if (loginRes.success) {
          const freshToken = getAuthToken();
          if (freshToken) headers['Authorization'] = `Bearer ${freshToken}`;
          res = await fetch('/api/admin/districts/batch', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ active_ids: activeIds }),
          });
        }
      }

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        // Immediately sync local state with what was selected
        const currentActiveSet = new Set(activeIds);
        const merged = BANGLADESH_DISTRICTS.map((baseD, idx) => {
          const fromDb = Array.isArray(data.districts)
            ? data.districts.find((item: any) => item.id.toLowerCase() === baseD.id.toLowerCase())
            : null;
          return {
            ...baseD,
            ...(fromDb || {}),
            is_active: currentActiveSet.has(baseD.id) ? 1 : 0,
            sort_order: idx + 1,
          };
        });
        setDistricts(merged);
        setMarkedDistrictIds(new Set(activeIds));

        const msg = lang === 'bn'
          ? `সফলভাবে ডাটাবেজে সেভ করা হয়েছে! নির্বাচিত ${activeIds.length}টি জেলা এখন পাবলিক সার্চ লোকেশনে সক্রিয়।`
          : `Saved successfully! Selected ${activeIds.length} districts are now active in public search location box.`;
        setDistrictSaveSuccess(msg);
        setActionMessage(msg);
        setTimeout(() => setDistrictSaveSuccess(null), 6000);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setActionError(lang === 'bn' ? 'এডমিন হিসেবে লগইন করা নেই। অনুগ্রহ করে পুনরায় লগইন করুন।' : 'Authentication required. Please login as admin.');
        } else {
          setActionError(errData.error || 'Failed to save districts');
        }
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to save districts');
    } finally {
      setSavingDistricts(false);
    }
  };

  // Fast 1-Click Login as Admin
  const handleQuickAdminLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      let res = await login('admin@daktarserial.com', 'Admin123!');
      if (!res.success) {
        res = await login('admin@daktarserial.com', 'admin123');
      }
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
      let res = await login(loginEmail, loginPassword);
      if (!res.success && loginEmail.toLowerCase().includes('admin')) {
        // Retry with alternative admin password variation if failed
        if (loginPassword === 'Admin123!') {
          res = await login(loginEmail, 'admin123');
        } else if (loginPassword === 'admin123') {
          res = await login(loginEmail, 'Admin123!');
        }
      }
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

  // -------------------------------------------------------------
  // COMPOUNDER MANAGEMENT HANDLERS (Super Admin only)
  // -------------------------------------------------------------
  const doctorLabel = (d: any) => {
    const fullName = d.name?.startsWith(d.title) ? d.name : `${d.title || ''} ${d.name}`.trim();
    return d.specialty_name ? `${fullName} — ${d.specialty_name}` : fullName;
  };

  const resetCompounderForm = () => {
    setCompounderForm({ name: '', email: '', phone: '', password: '', status: 'active', doctorId: '' });
  };

  const handleAddCompounder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compounderForm.name.trim() || !compounderForm.email.trim() || !compounderForm.phone.trim() || !compounderForm.password || !compounderForm.doctorId) {
      alert('Full Name, Mobile Number, Email, Password, and Assigned Doctor are all required.');
      return;
    }
    setSavingCompounder(true);
    try {
      const res = await fetch('/api/admin/compounders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: compounderForm.name.trim(),
          email: compounderForm.email.trim(),
          phone: compounderForm.phone.trim(),
          password: compounderForm.password,
          status: compounderForm.status,
          doctorId: Number(compounderForm.doctorId),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Compounder "${compounderForm.name}" created and assigned successfully.`);
        setShowAddCompounderModal(false);
        resetCompounderForm();
        loadAdminData();
      } else {
        alert(data.error || 'Failed to create compounder.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingCompounder(false);
    }
  };

  const handleToggleCompounderStatus = async (comp: any) => {
    const nextStatus = comp.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/admin/compounders/${comp.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message);
        loadAdminData();
      } else {
        alert(data.error || 'Failed to update status.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetCompounderPassword = async (comp: any) => {
    if (!confirm(`Reset password for ${comp.name}? A new temporary password will be generated.`)) return;
    try {
      const res = await fetch(`/api/admin/compounders/${comp.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Temporary password for ${comp.name}: ${data.temporaryPassword}`);
      } else {
        alert(data.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCompounder = async (comp: any) => {
    if (!confirm(`Are you sure you want to permanently delete compounder "${comp.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/compounders/${comp.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || 'Compounder deleted successfully.');
        loadAdminData();
      } else {
        alert(data.error || 'Failed to delete compounder.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEditCompounder = (comp: any) => {
    setEditingCompounder(comp);
    setEditForm({
      name: comp.name || '',
      phone: comp.phone || '',
      email: comp.email || '',
      doctorId: String(comp.doctor_id || ''),
    });
  };

  const handleSaveCompounderEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompounder) return;
    setSavingEdit(true);
    try {
      // Update basic details
      const detailsRes = await fetch(`/api/admin/compounders/${editingCompounder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          phone: editForm.phone.trim(),
          email: editForm.email.trim(),
        }),
      });
      const detailsData = await detailsRes.json();
      if (!detailsRes.ok) {
        alert(detailsData.error || 'Failed to update compounder details.');
        return;
      }

      // Change assigned doctor if it changed
      if (editForm.doctorId && Number(editForm.doctorId) !== Number(editingCompounder.doctor_id)) {
        const docRes = await fetch(`/api/admin/compounders/${editingCompounder.id}/doctor`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doctorId: Number(editForm.doctorId) }),
        });
        const docData = await docRes.json();
        if (!docRes.ok) {
          alert(docData.error || 'Failed to change assigned doctor.');
          return;
        }
      }

      setActionMessage(`${editForm.name} updated successfully.`);
      setEditingCompounder(null);
      loadAdminData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
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

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
              <p className="font-bold text-amber-950 flex items-center justify-between">
                <span>{t('Admin Credentials', 'অ্যাডমিন লগইন তথ্য')}:</span>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded font-mono">Default</span>
              </p>
              <div className="flex justify-between items-center font-mono">
                <span className="text-amber-700">Email:</span>
                <span className="font-bold">admin@daktarserial.com</span>
              </div>
              <div className="flex justify-between items-center font-mono">
                <span className="text-amber-700">Password:</span>
                <span className="font-bold text-emerald-800">Admin123! <span className="text-[10px] text-amber-700 font-normal">({t('or', 'অথবা')} admin123)</span></span>
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
          <NotificationBell role="admin" onNavigate={onNavigate} />

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
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

        <div
          onClick={() => setActiveTab('compounders')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border transition shadow-xs cursor-pointer ${
            activeTab === 'compounders' ? 'border-indigo-400 ring-2 ring-indigo-400/20' : 'border-slate-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Compounders</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.totalCompounders || compounders.length}</div>
          <p className="text-[10px] text-slate-500 mt-1">Chamber staff</p>
        </div>

        <div
          onClick={() => setActiveTab('locations')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border transition shadow-xs cursor-pointer ${
            activeTab === 'locations' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">{t('Search Locations', 'সার্চ লোকেশন')}</span>
            <MapPin className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {districts.filter((d) => Boolean(d.is_active)).length}
            <span className="text-xs font-normal text-slate-400 ml-1">/ {districts.length || 64}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">{t('Active in search', 'সার্চে সক্রিয় জেলা')}</p>
        </div>

        <div
          onClick={() => setActiveTab('hospitals')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border transition shadow-xs cursor-pointer ${
            activeTab === 'hospitals' ? 'border-indigo-600 ring-2 ring-indigo-600/20' : 'border-slate-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Hospitals</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.totalHospitals || 0}</div>
          <p className="text-[10px] text-slate-500 mt-1">Integrated Partners</p>
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
            onClick={() => setActiveTab('hospitals')}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'hospitals'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Hospital Integration</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
              API
            </span>
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
            onClick={() => setActiveTab('locations')}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'locations'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Search Locations ({districts.filter((d) => Boolean(d.is_active)).length}/{districts.length || 64})</span>
          </button>
          <button
            onClick={() => setActiveTab('compounders')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'compounders'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Compounders ({compounders.length})
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
                        {doc.specialties && doc.specialties.length > 0 ? (
                          doc.specialties.map((s) => (
                            <span
                              key={s.id}
                              className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded"
                            >
                              {s.name} {s.name_bn && <span className="opacity-75 text-[10px]">({s.name_bn})</span>}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs font-semibold text-emerald-700">
                            {doc.specialty_name || 'General Specialist'}
                          </span>
                        )}
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
                          {doc.specialties && doc.specialties.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {doc.specialties.map((s) => (
                                <span key={s.id} className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            doc.specialty_name || 'General'
                          )}
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
      {/* TAB: SEARCH LOCATIONS & DISTRICTS MANAGEMENT */}
      {/* ========================================================= */}
      {activeTab === 'locations' && (
        <div className="space-y-6 pb-20">
          {/* Header & Overview */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                      <span>{t('Search Location Districts Management', 'সার্চ লোকেশন ও জেলা নির্বাচন')}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                        {t('District-by-District Mark', 'আলাদা আলাদা জেলা মার্ক ও সেভ')}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t(
                        'Select/Mark which districts appear in the public search location dropdown. Only checked districts will be displayed. Click "Save Selection" to save changes.',
                        'পাবলিক সার্চ বক্সের লোকেশন ড্রপডাউনে যে যে জেলা দেখাতে চান সেগুলোতে মার্ক (টিক) দিন এবং নিচে বা উপরে "সেভ করুন" বাটনে ক্লিক করে ডাটাবেজে সংরক্ষণ করুন।'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status pill & Main Save Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {hasUnsavedDistrictChanges ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{t('Unsaved changes!', 'অসংরক্ষিত পরিবর্তন আছে!')}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{t('Live & Saved', 'সংরক্ষিত ও লাইভ')}</span>
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold">
                  {t(
                    `Marked: ${markedDistrictIds.size} of ${districts.length || 64}`,
                    `মার্ক করা: ${markedDistrictIds.size} / ${districts.length || 64} জেলা`
                  )}
                </span>

                {/* Primary Save Button */}
                <button
                  type="button"
                  disabled={savingDistricts}
                  onClick={handleSaveDistrictSelection}
                  className={`px-4 py-2 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    hasUnsavedDistrictChanges
                      ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-500/30'
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {savingDistricts
                      ? t('Saving...', 'সেভ হচ্ছে...')
                      : `${t('Save Selection', 'সেভ করুন')} (${markedDistrictIds.size})`}
                  </span>
                </button>

                {hasUnsavedDistrictChanges && (
                  <button
                    type="button"
                    disabled={savingDistricts}
                    onClick={handleResetDistrictSelection}
                    className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-2xs transition cursor-pointer flex items-center gap-1"
                    title={t('Reset to saved districts', 'আগের সেভ করা অবস্থায় ফিরুন')}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('Reset', 'রিসেট')}</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={savingDistricts}
                  onClick={markAllDistricts}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                >
                  {t('Mark All (64)', 'সব মার্ক (৬৪)')}
                </button>

                <button
                  type="button"
                  disabled={savingDistricts}
                  onClick={unmarkAllDistricts}
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
                >
                  {t('Unmark All', 'সব আনমার্ক')}
                </button>
              </div>
            </div>

            {/* Success Notification Alert */}
            {districtSaveSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{districtSaveSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDistrictSaveSuccess(null)}
                  className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Division Filter & District Search */}
            <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input with clear button */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  placeholder={t('Search district by name (e.g. Dhaka, চট্টগ্রাম, Bogura)...', 'জেলার নাম দিয়ে খুঁজুন (যেমন: ঢাকা, Bogura, Sylhet)...')}
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white"
                />
                {districtSearch && (
                  <button
                    type="button"
                    onClick={() => setDistrictSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={t('Clear search', 'খোঁজা মুছুন')}
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Division Quick Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', name: 'All Divisions', name_bn: 'সকল বিভাগ' },
                  { id: 'dhaka', name: 'Dhaka', name_bn: 'ঢাকা' },
                  { id: 'chattogram', name: 'Chattogram', name_bn: 'চট্টগ্রাম' },
                  { id: 'rajshahi', name: 'Rajshahi', name_bn: 'রাজশাহী' },
                  { id: 'khulna', name: 'Khulna', name_bn: 'খুলনা' },
                  { id: 'barishal', name: 'Barishal', name_bn: 'বরিশাল' },
                  { id: 'sylhet', name: 'Sylhet', name_bn: 'সিলেট' },
                  { id: 'rangpur', name: 'Rangpur', name_bn: 'রংপুর' },
                  { id: 'mymensingh', name: 'Mymensingh', name_bn: 'ময়মনসিংহ' },
                ].map((div) => {
                  const divDistricts = div.id === 'all'
                    ? districts
                    : districts.filter((d) => d.division.toLowerCase() === div.name.toLowerCase());
                  const divMarkedCount = divDistricts.filter((d) => markedDistrictIds.has(d.id)).length;

                  return (
                    <button
                      key={div.id}
                      type="button"
                      onClick={() => {
                        setDistrictDivisionFilter(div.id);
                        if (districtSearch.trim()) setDistrictSearch('');
                      }}
                      className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                        districtDivisionFilter === div.id
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{lang === 'bn' ? div.name_bn : div.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        districtDivisionFilter === div.id
                          ? 'bg-emerald-700/80 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {divMarkedCount}/{divDistricts.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick action bar for active division */}
            {districtDivisionFilter !== 'all' && (
              <div className="pt-2 flex items-center justify-between gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {t('Division Quick Action:', 'বিভাগ অনুযায়ী মার্ক অ্যাকশন:')}{' '}
                    <strong className="text-emerald-800 capitalize">{districtDivisionFilter}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => markDivisionDistricts(districtDivisionFilter)}
                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg transition cursor-pointer"
                  >
                    {t('Mark All in this Division', 'এই বিভাগের সব মার্ক করুন')}
                  </button>
                  <button
                    type="button"
                    onClick={() => unmarkDivisionDistricts(districtDivisionFilter)}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition cursor-pointer"
                  >
                    {t('Unmark Division', 'এই বিভাগ আনমার্ক করুন')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* District Grid with Clear Individual Checkbox Mark Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredDistricts.map((d) => {
              const isMarked = markedDistrictIds.has(d.id);
              const isSavedActive = savedActiveDistrictIds.has(d.id);

              return (
                <div
                  key={d.id}
                  onClick={() => toggleMarkDistrict(d.id)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                    isMarked
                      ? 'bg-emerald-50/80 border-emerald-500 shadow-xs hover:border-emerald-600 ring-2 ring-emerald-500/10'
                      : 'bg-white border-slate-200 opacity-80 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    {/* Explicit HTML Checkbox for marking */}
                    <div className="pt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={isMarked}
                        onChange={() => toggleMarkDistrict(d.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Mark district ${d.name}`}
                        className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600"
                      />
                    </div>

                    {/* District Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {lang === 'bn' ? `${d.division_bn} বিভাগ` : `${d.division} Div`}
                        </span>
                        {d.chamber_count ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800 font-bold">
                            {d.chamber_count} {t('chambers', 'চেম্বার')}
                          </span>
                        ) : null}
                      </div>
                      <h4 className="font-bold text-slate-900 text-base mt-1 truncate">
                        {d.name}
                      </h4>
                      <p className="text-xs text-emerald-800 font-semibold">
                        {d.name_bn}
                      </p>
                    </div>

                    {/* Visual Checkmark indicator badge */}
                    <div className="shrink-0">
                      {isMarked ? (
                        <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-300">
                          <Plus className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer status */}
                  <div className="pt-2.5 mt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                    <span className={`font-semibold flex items-center gap-1 ${isMarked ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {isMarked ? (
                        <>
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>
                            {isSavedActive
                              ? t('✓ Active in Search', '✓ সার্চে সক্রিয়')
                              : t('✎ Marked (Save to apply)', '✎ চিহ্নিত (সেভ করুন)')}
                          </span>
                        </>
                      ) : (
                        <>
                          <Square className="w-3.5 h-3.5" />
                          <span>{t('✕ Hidden from Search', '✕ সার্চে লুকানো')}</span>
                        </>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {d.id}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredDistricts.length === 0 && (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">
                {t('No districts matching your filter', 'আপনার খোঁজার সাথে কোনো জেলা মেলেনি')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setDistrictSearch('');
                  setDistrictDivisionFilter('all');
                }}
                className="mt-3 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                {t('Reset District Filters', 'ফিল্টার রিসেট করুন')}
              </button>
            </div>
          )}

          {/* Sticky Floating Save Bar at Bottom */}
          <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-slate-700 mt-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span>
                    {t(
                      `Selected: ${markedDistrictIds.size} of ${districts.length || 64} Districts`,
                      `${districts.length || 64}টির মধ্যে ${markedDistrictIds.size}টি জেলা মার্ক করা হয়েছে`
                    )}
                  </span>
                  {hasUnsavedDistrictChanges && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 animate-pulse">
                      {t('Unsaved', 'সেভ বাকি')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  {t('Only marked districts will appear in public search box dropdown.', 'শুধুমাত্র মার্ক করা জেলাগুলো পাবলিক সার্চ ড্রপডাউনে দেখা যাবে।')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {hasUnsavedDistrictChanges && (
                <button
                  type="button"
                  onClick={handleResetDistrictSelection}
                  disabled={savingDistricts}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  {t('Reset', 'রিসেট')}
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveDistrictSelection}
                disabled={savingDistricts}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>
                  {savingDistricts
                    ? t('Saving...', 'সেভ হচ্ছে...')
                    : `${t('Save Selection', 'সেভ করুন')} (${markedDistrictIds.size})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: COMPOUNDER / CHAMBER STAFF MANAGEMENT */}
      {/* ========================================================= */}
      {activeTab === 'compounders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Compounder / Chamber Staff ({compounders.length})
              </h3>
              <p className="text-xs text-slate-500">
                Restricted staff accounts. Each compounder is bound to exactly one doctor and can only book unpaid manual serials.
              </p>
            </div>
            <button
              onClick={() => { resetCompounderForm(); setShowAddCompounderModal(true); }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Compounder</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-[10px] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Compounder</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Assigned Doctor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {compounders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                      No compounder accounts yet. Click "Add Compounder" to create one.
                    </td>
                  </tr>
                ) : (
                  compounders.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{comp.name}</p>
                        <p className="text-[11px] text-slate-400">{comp.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono">{comp.phone || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">
                          {comp.doctor_name?.startsWith(comp.doctor_title)
                            ? comp.doctor_name
                            : `${comp.doctor_title || ''} ${comp.doctor_name}`.trim()}
                        </p>
                        <p className="text-[11px] text-emerald-600">{comp.specialty_name || 'Specialist'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          comp.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {comp.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{comp.created_at?.split('T')[0] || comp.created_at?.split(' ')[0] || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{comp.last_login_at ? (comp.last_login_at.split('T')[0] || comp.last_login_at) : 'Never'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => openEditCompounder(comp)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleCompounderStatus(comp)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer ${
                              comp.status === 'active'
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                            }`}
                          >
                            {comp.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleResetCompounderPassword(comp)}
                            className="px-2 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[10px] font-semibold cursor-pointer"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleDeleteCompounder(comp)}
                            className="px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-semibold cursor-pointer"
                            title="Delete this compounder account"
                          >
                            Delete
                          </button>
                        </div>
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
      {/* TAB: HOSPITAL INTEGRATION & COLLABORATION */}
      {/* ========================================================= */}
      {activeTab === 'hospitals' && (
        <HospitalIntegrationPanel onRefreshStats={loadAdminData} />
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
      {/* ========================================================= */}
      {/* ADD COMPOUNDER MODAL */}
      {/* ========================================================= */}
      {showAddCompounderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add Compounder / Chamber Staff</h3>
              <button
                onClick={() => setShowAddCompounderModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              The account is created by the Super Admin only. The compounder will be bound to the selected doctor and
              can never change it themselves.
            </p>
            <form onSubmit={handleAddCompounder} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text" required value={compounderForm.name}
                  onChange={(e) => setCompounderForm({ ...compounderForm, name: e.target.value })}
                  placeholder="e.g. Karim Hossain"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel" required value={compounderForm.phone}
                    onChange={(e) => setCompounderForm({ ...compounderForm, phone: e.target.value })}
                    placeholder="01712345678"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={compounderForm.status}
                    onChange={(e) => setCompounderForm({ ...compounderForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email" required value={compounderForm.email}
                  onChange={(e) => setCompounderForm({ ...compounderForm, email: e.target.value })}
                  placeholder="staff@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Login Password *</label>
                <input
                  type="text" required minLength={6} value={compounderForm.password}
                  onChange={(e) => setCompounderForm({ ...compounderForm, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Doctor (only one) *</label>
                <select
                  required value={compounderForm.doctorId}
                  onChange={(e) => setCompounderForm({ ...compounderForm, doctorId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                >
                  <option value="">Select a doctor…</option>
                  {assignableDoctors.map((d) => (
                    <option key={d.id} value={d.id}>{doctorLabel(d)}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCompounderModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCompounder}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingCompounder ? 'Creating...' : 'Create Compounder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT COMPOUNDER MODAL */}
      {/* ========================================================= */}
      {editingCompounder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Edit Compounder</h3>
              <button
                onClick={() => setEditingCompounder(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveCompounderEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text" value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="tel" value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email" value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Change Assigned Doctor (Super Admin only)</label>
                <select
                  value={editForm.doctorId}
                  onChange={(e) => setEditForm({ ...editForm, doctorId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                >
                  <option value="">Keep current doctor</option>
                  {assignableDoctors.map((d) => (
                    <option key={d.id} value={d.id}>{doctorLabel(d)}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCompounder(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
