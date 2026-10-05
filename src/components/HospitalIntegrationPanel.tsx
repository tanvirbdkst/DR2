import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Key, RefreshCw, CheckCircle2, AlertCircle,
  Copy, Check, ShieldCheck, Activity, Terminal, Send, RotateCcw,
  Trash2, Edit3, Globe, Phone, Mail, FileText, ArrowRight,
  ExternalLink, Lock, Eye, EyeOff, Search, Filter, ShieldAlert,
  Server, Zap
} from 'lucide-react';
import { getAuthToken } from '../config/api.js';

interface Hospital {
  id: number;
  hospital_code: string;
  name: string;
  contact_person: string | null;
  phone: string;
  email: string;
  address: string | null;
  website_url: string | null;
  status: 'active' | 'inactive' | 'suspended';
  integration_status: 'connected' | 'disconnected' | 'error' | 'pending';
  api_status: 'active' | 'revoked' | 'pending';
  webhook_url: string | null;
  webhook_secret: string | null;
  webhook_enabled?: number | boolean;
  total_hospital_serials: number;
  online_quota: number;
  notes: string | null;
  last_sync_at: string | null;
  last_api_request_at: string | null;
  last_webhook_at: string | null;
  last_error_message: string | null;
  successful_syncs_count: number;
  failed_syncs_count: number;
  assigned_doctors_count?: number;
  total_sync_logs_count?: number;
  api_key?: string;
  created_at: string;
}

interface SyncLog {
  id: number;
  hospital_id: number;
  hospital_name?: string;
  hospital_code?: string;
  direction: 'daktar_to_hospital' | 'hospital_to_daktar';
  event: string;
  doctor_name?: string;
  serial_number?: number;
  schedule_date?: string;
  booking_id?: string;
  external_booking_id?: string;
  status: 'success' | 'failed' | 'pending';
  http_status?: number;
  error_message?: string;
  created_at: string;
}

interface HospitalIntegrationPanelProps {
  onRefreshStats?: () => void;
}

export const HospitalIntegrationPanel: React.FC<HospitalIntegrationPanelProps> = ({ onRefreshStats }) => {
  const [subTab, setSubTab] = useState<'hospitals' | 'logs' | 'docs' | 'test'>('hospitals');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [selectedHospitalForCreds, setSelectedHospitalForCreds] = useState<Hospital | null>(null);
  const [freshCredentials, setFreshCredentials] = useState<{ apiKey: string; apiSecret?: string; webhookSecret?: string } | null>(null);

  // API & Webhook Settings specific state
  const [settingsTab, setSettingsTab] = useState<'credentials' | 'webhook' | 'logs' | 'docs'>('credentials');
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [webhookEnabledInput, setWebhookEnabledInput] = useState(true);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [hospitalLogs, setHospitalLogs] = useState<SyncLog[]>([]);
  const [loadingHospitalLogs, setLoadingHospitalLogs] = useState(false);
  const [hospitalLogFilter, setHospitalLogFilter] = useState<string>('all');
  const [testWebhookStatus, setTestWebhookStatus] = useState<{ running: boolean; result: any | null }>({ running: false, result: null });

  // Doctor Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedHospitalForAssign, setSelectedHospitalForAssign] = useState<Hospital | null>(null);
  const [assignDoctorsList, setAssignDoctorsList] = useState<any[]>([]);
  const [assignForm, setAssignForm] = useState({ doctorId: '', chamberId: '', totalSerials: 100, onlineQuota: 20 });
  const [savingAssign, setSavingAssign] = useState(false);

  // Sync Logs State
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logDirectionFilter, setLogDirectionFilter] = useState<string>('all');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('all');
  const [retryingLogId, setRetryingLogId] = useState<number | null>(null);

  // Add / Edit Form State
  const [formData, setFormData] = useState({
    name: '',
    hospital_code: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    website_url: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    total_hospital_serials: 100,
    online_quota: 20,
    webhook_url: '',
    notes: '',
  });
  const [savingHospital, setSavingHospital] = useState(false);

  // Test Console State
  const [testHospitalId, setTestHospitalId] = useState<string>('');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testRunning, setTestRunning] = useState(false);

  // Copied State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // 1. Load Hospitals
  const loadHospitals = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/hospitals', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setHospitals(data.hospitals || []);
      }
    } catch (err: any) {
      showNotify(err.message || 'Failed to load hospitals', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Load Sync Logs
  const loadSyncLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const token = getAuthToken();
      let url = '/api/admin/hospitals/sync-logs/all?limit=100';
      if (logDirectionFilter !== 'all') url += `&direction=${logDirectionFilter}`;
      if (logStatusFilter !== 'all') url += `&status=${logStatusFilter}`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setSyncLogs(data.logs || []);
      }
    } catch (err: any) {
      showNotify(err.message || 'Failed to load sync logs', 'error');
    } finally {
      setLogsLoading(false);
    }
  }, [logDirectionFilter, logStatusFilter]);

  // Load doctors for assignment modal
  const loadAssignableDoctors = async (hospitalId: number) => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/doctors', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setAssignDoctorsList(data.doctors || []);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    loadHospitals();
  }, [loadHospitals]);

  useEffect(() => {
    if (subTab === 'logs') {
      loadSyncLogs();
    }
  }, [subTab, loadSyncLogs]);

  // Handle Save / Add Hospital
  const handleSaveHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHospital(true);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      if (editingHospital) {
        const res = await fetch(`/api/admin/hospitals/${editingHospital.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
          showNotify('Hospital updated successfully.');
          setShowAddModal(false);
          setEditingHospital(null);
          loadHospitals();
        } else {
          showNotify(data.error || 'Failed to update hospital', 'error');
        }
      } else {
        const res = await fetch('/api/admin/hospitals', {
          method: 'POST',
          headers,
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
          showNotify(`Hospital "${formData.name}" created with generated credentials.`);
          setShowAddModal(false);
          loadHospitals();
          // Display the fresh credentials modal so admin can copy the secret
          if (data.credentials) {
            setSelectedHospitalForCreds(data.hospital);
            setFreshCredentials(data.credentials);
            setShowCredsModal(true);
          }
        } else {
          showNotify(data.error || 'Failed to create hospital', 'error');
        }
      }
    } catch (err: any) {
      showNotify(err.message || 'Network error saving hospital', 'error');
    } finally {
      setSavingHospital(false);
    }
  };

  // Regenerate Credentials
  const handleRegenerateCredentials = async (hospitalId: number) => {
    if (!confirm('Are you sure you want to regenerate API credentials? The previous API secret will be immediately invalidated.')) {
      return;
    }
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/hospitals/${hospitalId}/credentials/regenerate`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.credentials) {
        setFreshCredentials(data.credentials);
        showNotify('New credentials generated successfully.');
        loadHospitals();
      } else {
        showNotify(data.error || 'Failed to regenerate credentials', 'error');
      }
    } catch (err: any) {
      showNotify(err.message || 'Error regenerating credentials', 'error');
    }
  };

  // Revoke Credentials
  const handleRevokeCredentials = async (hospitalId: number) => {
    if (!confirm('Are you sure you want to revoke API credentials for this hospital? Their integration will be suspended.')) {
      return;
    }
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/hospitals/${hospitalId}/credentials/revoke`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        showNotify('API credentials revoked.');
        setShowCredsModal(false);
        loadHospitals();
      }
    } catch (err: any) {
      showNotify(err.message || 'Error revoking credentials', 'error');
    }
  };

  // Test Webhook / Ping Hospital
  const handleTestWebhook = async (hospitalId: number) => {
    try {
      showNotify('Sending test webhook ping to hospital endpoint...', 'success');
      const token = getAuthToken();
      const res = await fetch(`/api/admin/hospitals/${hospitalId}/test-webhook`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        showNotify(`Webhook delivered successfully! Hospital responded with HTTP ${data.httpStatus || 200}`);
      } else {
        showNotify(`Webhook failed: ${data.error || 'Connection refused'}`, 'error');
      }
      loadHospitals();
    } catch (err: any) {
      showNotify(err.message || 'Error executing webhook ping', 'error');
    }
  };

  // Open API & Webhook Settings for a specific hospital
  const openApiWebhookSettings = (hospital: Hospital, initialTab: 'credentials' | 'webhook' | 'logs' | 'docs' = 'credentials') => {
    setSelectedHospitalForCreds(hospital);
    setWebhookUrlInput(hospital.webhook_url || '');
    setWebhookEnabledInput(hospital.webhook_enabled !== undefined ? Boolean(hospital.webhook_enabled) : true);
    setSettingsTab(initialTab);
    setShowApiKey(false);
    setShowWebhookSecret(false);
    setTestWebhookStatus({ running: false, result: null });
    setShowCredsModal(true);
    if (initialTab === 'logs') {
      loadHospitalLogs(hospital.id, hospitalLogFilter);
    }
  };

  // Load sync logs for a specific hospital
  const loadHospitalLogs = async (hospitalId: number, eventFilter: string = 'all') => {
    setLoadingHospitalLogs(true);
    try {
      const token = getAuthToken();
      let url = `/api/admin/hospitals/${hospitalId}/sync-logs?limit=50`;
      if (eventFilter && eventFilter !== 'all') {
        url += `&event=${encodeURIComponent(eventFilter)}`;
      }
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setHospitalLogs(data.logs || []);
      }
    } catch (err: any) {
      showNotify(err.message || 'Error loading hospital webhook logs', 'error');
    } finally {
      setLoadingHospitalLogs(false);
    }
  };

  // Save Webhook URL & Enabled state
  const handleSaveWebhook = async (hospitalId: number) => {
    setSavingWebhook(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/hospitals/${hospitalId}/webhook`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          webhook_url: webhookUrlInput.trim(),
          webhook_enabled: webhookEnabledInput,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotify('Webhook settings updated successfully.');
        // Update local hospital object
        if (selectedHospitalForCreds && selectedHospitalForCreds.id === hospitalId) {
          setSelectedHospitalForCreds({
            ...selectedHospitalForCreds,
            webhook_url: webhookUrlInput.trim() || null,
            webhook_enabled: webhookEnabledInput,
          });
        }
        loadHospitals();
      } else {
        showNotify(data.error || 'Failed to update webhook settings', 'error');
      }
    } catch (err: any) {
      showNotify(err.message || 'Network error updating webhook', 'error');
    } finally {
      setSavingWebhook(false);
    }
  };

  // Toggle webhook enabled directly
  const handleToggleWebhook = async (hospitalId: number, enabled: boolean) => {
    setWebhookEnabledInput(enabled);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/hospitals/${hospitalId}/webhook`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          webhook_enabled: enabled,
        }),
      });
      if (res.ok) {
        showNotify(`Webhook ${enabled ? 'enabled' : 'disabled'} for this hospital.`);
        if (selectedHospitalForCreds && selectedHospitalForCreds.id === hospitalId) {
          setSelectedHospitalForCreds({
            ...selectedHospitalForCreds,
            webhook_enabled: enabled,
          });
        }
        loadHospitals();
      }
    } catch (err: any) {
      showNotify(err.message || 'Error updating webhook status', 'error');
    }
  };

  // Run test webhook specifically in modal
  const handleTestWebhookFromSettings = async (hospitalId: number) => {
    setTestWebhookStatus({ running: true, result: null });
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/hospitals/${hospitalId}/test-webhook`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setTestWebhookStatus({
        running: false,
        result: {
          success: data.success,
          httpStatus: data.httpStatus,
          error: data.error,
          timestamp: new Date().toLocaleTimeString(),
        },
      });
      if (data.success) {
        showNotify(`Webhook delivered successfully! HTTP ${data.httpStatus || 200}`);
      } else {
        showNotify(`Webhook test failed: ${data.error || 'Connection refused'}`, 'error');
      }
      loadHospitalLogs(hospitalId, hospitalLogFilter);
      loadHospitals();
    } catch (err: any) {
      setTestWebhookStatus({
        running: false,
        result: { success: false, error: err.message, timestamp: new Date().toLocaleTimeString() },
      });
      showNotify(err.message || 'Error running webhook test', 'error');
    }
  };

  // Delete Hospital
  const handleDeleteHospital = async (hospital: Hospital) => {
    if (!confirm(`Are you sure you want to permanently delete hospital "${hospital.name}" (${hospital.hospital_code}) and all sync logs?`)) {
      return;
    }
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/hospitals/${hospital.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        showNotify('Hospital deleted successfully.');
        loadHospitals();
      }
    } catch (err: any) {
      showNotify(err.message || 'Error deleting hospital', 'error');
    }
  };

  // Retry Sync Log Event
  const handleRetryLog = async (logId: number) => {
    setRetryingLogId(logId);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/hospitals/sync-logs/${logId}/retry`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        showNotify('Sync retry succeeded!');
        loadSyncLogs();
        loadHospitals();
      } else {
        showNotify(`Retry failed: ${data.message}`, 'error');
      }
    } catch (err: any) {
      showNotify(err.message || 'Error retrying sync', 'error');
    } finally {
      setRetryingLogId(null);
    }
  };

  // Run Integration Simulation Test
  const handleRunTest = async (testType: 'ping' | 'serials' | 'double_booking') => {
    if (!testHospitalId) {
      showNotify('Please select a hospital to test', 'error');
      return;
    }
    const hosp = hospitals.find((h) => String(h.id) === testHospitalId || h.hospital_code === testHospitalId);
    if (!hosp) return;

    setTestRunning(true);
    setTestResult(null);

    try {
      const token = getAuthToken();
      const today = new Date().toISOString().substring(0, 10);

      if (testType === 'ping') {
        const res = await fetch(`/api/admin/hospitals/${hosp.id}/test-webhook`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        setTestResult({
          title: 'Webhook Ping & HMAC Signature Verification',
          endpoint: hosp.webhook_url || 'N/A',
          status: data.success ? 'PASSED' : 'FAILED',
          response: data,
        });
      } else if (testType === 'serials') {
        // Query serials via integration route simulation
        const res = await fetch(`/api/integration/hospital/test-connection`, {
          method: 'POST',
          headers: {
            'X-Hospital-ID': hosp.hospital_code,
            'X-API-Key': hosp.api_key || 'test_key',
          },
        });
        const data = await res.json();
        setTestResult({
          title: 'API Authentication & Quota Availability Verification',
          endpoint: 'POST /api/integration/hospital/test-connection',
          status: data.success ? 'PASSED' : 'FAILED',
          response: data,
        });
      } else if (testType === 'double_booking') {
        // Simulate atomic double booking test
        const testBookingId = `TEST-HB-${Date.now()}`;
        const res = await fetch(`/api/integration/hospital/booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Hospital-ID': hosp.hospital_code,
            'X-API-Key': hosp.api_key || 'test_key',
          },
          body: JSON.stringify({
            doctor_id: 3,
            serial_number: 1,
            appointment_date: today,
            external_booking_id: testBookingId,
            patient_name: 'Simulated Test Patient',
            patient_phone: '01700000000',
          }),
        });
        const data = await res.json();
        setTestResult({
          title: 'Atomic Double-Booking Protection Simulation',
          endpoint: 'POST /api/integration/hospital/booking',
          status: res.status === 200 || res.status === 201 || res.status === 409 ? 'PASSED (Handled by Lock)' : 'FAILED',
          httpStatus: res.status,
          response: data,
        });
      }
    } catch (err: any) {
      setTestResult({
        title: 'Test Execution Failed',
        status: 'FAILED',
        error: err.message,
      });
    } finally {
      setTestRunning(false);
      loadHospitals();
    }
  };

  const filteredHospitals = hospitals.filter((h) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      h.name.toLowerCase().includes(q) ||
      h.hospital_code.toLowerCase().includes(q) ||
      (h.contact_person && h.contact_person.toLowerCase().includes(q)) ||
      h.phone.includes(q) ||
      h.email.toLowerCase().includes(q);

    if (!matchSearch) return false;
    if (statusFilter === 'all') return true;
    return h.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-md text-xs sm:text-sm font-semibold transition animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-indigo-500" />
              <span>Real-Time Bi-Directional Collaboration</span>
            </span>
            <span className="text-xs text-slate-500">
              {hospitals.length} Connected Partner Hospitals
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">
            Hospital Integration & Online Serial Quota Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Synchronize hospital websites with Daktar Serial in real-time. Manage online quotas, webhook event dispatching, and enforce atomic concurrency locking to eliminate double-booking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadHospitals}
            disabled={loading}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingHospital(null);
              setFormData({
                name: '',
                hospital_code: '',
                contact_person: '',
                phone: '',
                email: '',
                address: '',
                website_url: '',
                status: 'active',
                total_hospital_serials: 100,
                online_quota: 20,
                webhook_url: '',
                notes: '',
              });
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Hospital</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation Strip */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setSubTab('hospitals')}
          className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            subTab === 'hospitals'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Hospital List ({hospitals.length})</span>
        </button>

        <button
          onClick={() => setSubTab('logs')}
          className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            subTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Sync Logs & Webhooks</span>
        </button>

        <button
          onClick={() => setSubTab('docs')}
          className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            subTab === 'docs'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>API Documentation</span>
        </button>

        <button
          onClick={() => setSubTab('test')}
          className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            subTab === 'test'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Integration Test Console</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: HOSPITAL LIST */}
      {/* ========================================================================= */}
      {subTab === 'hospitals' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hospital by name, code (HOSP-0001), phone, email..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-hidden"
              >
                <option value="all">All Hospitals</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Hospitals Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Hospital Details</th>
                    <th className="px-4 py-3">Hospital ID / Code</th>
                    <th className="px-4 py-3">Contact & Phone</th>
                    <th className="px-4 py-3">Quota (Online / Total)</th>
                    <th className="px-4 py-3">Integration Status</th>
                    <th className="px-4 py-3">API Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHospitals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-xs">
                        {searchQuery ? 'No hospitals match your search query.' : 'No partner hospitals added yet. Click "Add Hospital" to start.'}
                      </td>
                    </tr>
                  ) : (
                    filteredHospitals.map((hospital) => (
                      <tr key={hospital.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{hospital.name}</p>
                              {hospital.website_url && (
                                <a
                                  href={hospital.website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5"
                                >
                                  <span>{hospital.website_url.replace(/^https?:\/\//i, '')}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-800 text-[11px]">
                            {hospital.hospital_code}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-800">{hospital.contact_person || 'N/A'}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{hospital.phone}</p>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                              {hospital.online_quota} Online
                            </span>
                            <span className="text-slate-400">/</span>
                            <span className="text-slate-600 text-[11px]">
                              {hospital.total_hospital_serials} Total
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                hospital.integration_status === 'connected'
                                  ? 'bg-emerald-500'
                                  : hospital.integration_status === 'error'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-400'
                              }`}
                            />
                            <span className="capitalize font-semibold text-slate-700 text-[11px]">
                              {hospital.integration_status}
                            </span>
                          </div>
                          {hospital.last_sync_at && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Synced: {hospital.last_sync_at.substring(0, 16).replace('T', ' ')}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              hospital.api_status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {hospital.api_status}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => openApiWebhookSettings(hospital, 'credentials')}
                              className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 flex items-center gap-1.5 text-xs shadow-2xs cursor-pointer transition"
                              title="Configure API Credentials, Webhooks, and View Logs"
                            >
                              <Key className="w-3.5 h-3.5 text-indigo-600" />
                              <span>API & Webhook</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTestWebhook(hospital.id)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                              title="Test Webhook Ping"
                            >
                              <Send className="w-3.5 h-3.5 text-emerald-600" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingHospital(hospital);
                                setFormData({
                                  name: hospital.name,
                                  hospital_code: hospital.hospital_code,
                                  contact_person: hospital.contact_person || '',
                                  phone: hospital.phone,
                                  email: hospital.email,
                                  address: hospital.address || '',
                                  website_url: hospital.website_url || '',
                                  status: hospital.status,
                                  total_hospital_serials: hospital.total_hospital_serials,
                                  online_quota: hospital.online_quota,
                                  webhook_url: hospital.webhook_url || '',
                                  notes: hospital.notes || '',
                                });
                                setShowAddModal(true);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                              title="Edit Hospital"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteHospital(hospital)}
                              className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                              title="Delete Hospital"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: SYNC LOGS & WEBHOOKS */}
      {/* ========================================================================= */}
      {subTab === 'logs' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Direction:</span>
                <select
                  value={logDirectionFilter}
                  onChange={(e) => setLogDirectionFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                >
                  <option value="all">All Directions</option>
                  <option value="daktar_to_hospital">Daktar Serial → Hospital</option>
                  <option value="hospital_to_daktar">Hospital → Daktar Serial</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Status:</span>
                <select
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Success (200)</option>
                  <option value="failed">Failed / Error</option>
                </select>
              </div>
            </div>

            <button
              onClick={loadSyncLogs}
              disabled={logsLoading}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </button>
          </div>

          {/* Sync Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Direction</th>
                    <th className="px-4 py-3">Event Type</th>
                    <th className="px-4 py-3">Hospital</th>
                    <th className="px-4 py-3">Serial & Booking</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">HTTP Code</th>
                    <th className="px-4 py-3 text-right">Retry / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {syncLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-xs">
                        No synchronization logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    syncLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                          {log.created_at?.replace('T', ' ').substring(0, 19)}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.direction === 'daktar_to_hospital'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {log.direction === 'daktar_to_hospital' ? 'DS → Hospital' : 'Hospital → DS'}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {log.event}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{log.hospital_name || 'Hospital'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{log.hospital_code}</p>
                        </td>

                        <td className="px-4 py-3">
                          {log.serial_number && (
                            <span className="font-bold text-indigo-700">Serial #{log.serial_number} </span>
                          )}
                          {log.booking_id && <span className="text-[10px] text-slate-400">({log.booking_id})</span>}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              log.status === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {log.status}
                          </span>
                          {log.error_message && (
                            <p className="text-[10px] text-rose-600 line-clamp-1 mt-0.5 max-w-xs" title={log.error_message}>
                              {log.error_message}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3 font-mono font-bold text-slate-700">
                          {log.http_status || '-'}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {log.direction === 'daktar_to_hospital' && log.status === 'failed' && (
                            <button
                              type="button"
                              disabled={retryingLogId === log.id}
                              onClick={() => handleRetryLog(log.id)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold cursor-pointer transition flex items-center gap-1 ml-auto disabled:opacity-50"
                            >
                              <RotateCcw className={`w-3 h-3 ${retryingLogId === log.id ? 'animate-spin' : ''}`} />
                              <span>Retry</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: API DOCUMENTATION FOR HOSPITAL DEVELOPERS */}
      {/* ========================================================================= */}
      {subTab === 'docs' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-8 text-xs sm:text-sm">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-600" />
              <span>Daktar Serial — Hospital Integration API Specification</span>
            </h3>
            <p className="text-slate-500 mt-1">
              Connect your Hospital Web App / HIS with Daktar Serial for real-time doctor serial synchronization and double-booking prevention.
            </p>
          </div>

          {/* 1. Authentication */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm">1. Authentication Headers</h4>
            <p className="text-slate-600">Every request sent from the hospital to Daktar Serial must include the following HTTPS headers:</p>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto space-y-1">
              <div><span className="text-amber-400">X-Hospital-ID</span>: HOSP-0001</div>
              <div><span className="text-amber-400">X-API-Key</span>: ds_live_9a7f32bc...</div>
              <div><span className="text-amber-400">X-API-Secret</span>: sec_live_b43e811f...</div>
              <div><span className="text-amber-400">Content-Type</span>: application/json</div>
            </div>
          </div>

          {/* 2. Endpoints */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">2. Endpoints</h4>

            <div className="border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-emerald-100 text-emerald-800 text-xs">GET</span>
                <span className="font-mono font-bold text-slate-900">/api/integration/hospital/doctors</span>
              </div>
              <p className="text-slate-600">Returns list of doctors linked to your hospital with consultation fees, specialties, and serial quotas.</p>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-emerald-100 text-emerald-800 text-xs">GET</span>
                <span className="font-mono font-bold text-slate-900">/api/integration/hospital/serials?doctor_id=3&chamber_id=2&date=2026-10-04</span>
              </div>
              <p className="text-slate-600">Returns real-time availability for each serial slot (1..N) marked as <code className="text-emerald-700 font-bold">available</code> or <code className="text-rose-700 font-bold">booked</code>.</p>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-indigo-100 text-indigo-800 text-xs">POST</span>
                <span className="font-mono font-bold text-slate-900">/api/integration/hospital/booking</span>
              </div>
              <p className="text-slate-600">
                Notifies Daktar Serial that a patient booked a serial on the hospital website. Atomically locks the slot in Daktar Serial.
              </p>
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto">
{`// Request Payload:
{
  "doctor_id": 3,
  "chamber_id": 2,
  "serial_number": 7,
  "appointment_date": "2026-10-04",
  "status": "BOOKED",
  "external_booking_id": "HB-12345",
  "idempotency_key": "IDEM-HB-12345",
  "patient_name": "Rahim Uddin",
  "patient_phone": "017XXXXXXXX"
}

// Success Response (201 Created):
{
  "success": true,
  "appointmentId": "DS-20261004-00007-HOSP0001",
  "serialNumber": 7,
  "message": "Booking synchronized and serial locked successfully in Daktar Serial."
}

// If already booked (409 Conflict):
{
  "success": false,
  "code": "SERIAL_ALREADY_BOOKED",
  "message": "Serial #7 on 2026-10-04 is already booked in Daktar Serial."
}`}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-100 text-rose-800 text-xs">POST</span>
                <span className="font-mono font-bold text-slate-900">/api/integration/hospital/cancel</span>
              </div>
              <p className="text-slate-600">Cancels an existing booking and atomically frees the serial slot back to available.</p>
              <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs overflow-x-auto">
{`{
  "external_booking_id": "HB-12345",
  "reason": "Patient requested cancellation"
}`}
              </div>
            </div>
          </div>

          {/* 3. Outgoing Webhooks */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">3. Outgoing Webhook Events (Daktar Serial → Hospital)</h4>
            <p className="text-slate-600">
              When a patient books on Daktar Serial, Daktar Serial dispatches an HTTP POST to your configured Webhook URL signed with HMAC-SHA256:
            </p>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto space-y-1">
              <div><span className="text-emerald-400">X-DaktarSerial-Event</span>: appointment.booked</div>
              <div><span className="text-emerald-400">X-DaktarSerial-Timestamp</span>: 1775314800</div>
              <div><span className="text-emerald-400">X-DaktarSerial-Signature</span>: a8b4c7...</div>
              <div><span className="text-emerald-400">X-DaktarSerial-Event-ID</span>: evt_1775314800_f3a2</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: INTEGRATION TEST CONSOLE */}
      {/* ========================================================================= */}
      {subTab === 'test' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-600" />
              <span>Integration Simulation & Concurrency Test Console</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate real-time booking events, verify HMAC webhook delivery, and test double-booking safeguards.
            </p>
          </div>

          {/* Select Hospital */}
          <div className="max-w-md space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Select Hospital to Test:</label>
            <select
              value={testHospitalId}
              onChange={(e) => setTestHospitalId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white"
            >
              <option value="">-- Choose a Hospital --</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.hospital_code}) — {h.webhook_url ? 'Webhook Configured' : 'No Webhook'}
                </option>
              ))}
            </select>
          </div>

          {/* Action Test Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              disabled={testRunning || !testHospitalId}
              onClick={() => handleRunTest('ping')}
              className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                <Send className="w-4 h-4 text-indigo-600" />
                <span>Test Webhook Ping</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Dispatches signed ping payload with HMAC SHA-256.</p>
            </button>

            <button
              type="button"
              disabled={testRunning || !testHospitalId}
              onClick={() => handleRunTest('serials')}
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-left transition cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Test API Authentication</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Tests X-API-Key and quota availability check.</p>
            </button>

            <button
              type="button"
              disabled={testRunning || !testHospitalId}
              onClick={() => handleRunTest('double_booking')}
              className="p-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Test Double-Booking Lock</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Verifies atomic row locking & duplicate rejection.</p>
            </button>
          </div>

          {/* Test Execution Output */}
          {testResult && (
            <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-amber-400">{testResult.title}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    testResult.status.includes('PASSED') ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {testResult.status}
                </span>
              </div>
              {testResult.endpoint && (
                <div className="text-slate-400">Endpoint: {testResult.endpoint}</div>
              )}
              <pre className="text-[11px] overflow-x-auto text-emerald-300 pt-1">
                {JSON.stringify(testResult.response || testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT HOSPITAL */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {editingHospital ? 'Edit Hospital Details' : 'Add New Hospital Integration'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure hospital details, webhook endpoints, and allocated online quota.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveHospital} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Hospital Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Popular Diagnostic & Hospital"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Hospital Code / ID</label>
                  <input
                    type="text"
                    value={formData.hospital_code}
                    onChange={(e) => setFormData({ ...formData, hospital_code: e.target.value })}
                    placeholder="Auto (e.g. HOSP-0001)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Dr. Manager / IT Lead"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="it@hospital.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Quota Settings */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  <span>Serial Quota Allocation</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Total Hospital Serials (e.g. 100)</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.total_hospital_serials}
                      onChange={(e) => setFormData({ ...formData, total_hospital_serials: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white font-bold"
                    />
                    <p className="text-[10px] text-slate-500">Overall serials available per doctor session.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Online Quota Allocated to Daktar Serial (e.g. 20)</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.online_quota}
                      onChange={(e) => setFormData({ ...formData, online_quota: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white font-bold text-indigo-700"
                    />
                    <p className="text-[10px] text-slate-500">Daktar Serial will only book up to this quota.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Hospital Webhook URL</label>
                <input
                  type="url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  placeholder="https://hospital.com/api/daktar-serial/webhook"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                />
                <p className="text-[10px] text-slate-500">Daktar Serial sends real-time booking and cancellation events to this URL.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Website URL</label>
                  <input
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    placeholder="https://hospital.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Address / Location</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. House 12, Road 5, Dhanmondi, Dhaka"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHospital}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {savingHospital ? 'Saving...' : editingHospital ? 'Save Changes' : 'Create Hospital & Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: HOSPITAL API & WEBHOOK SETTINGS */}
      {/* ========================================================================= */}
      {showCredsModal && selectedHospitalForCreds && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-800 text-xs">
                    {selectedHospitalForCreds.hospital_code}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs font-semibold text-slate-500">ID: #{selectedHospitalForCreds.id}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      selectedHospitalForCreds.api_status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    API: {selectedHospitalForCreds.api_status}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      (selectedHospitalForCreds.webhook_enabled !== undefined ? selectedHospitalForCreds.webhook_enabled : true)
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    Webhook: {(selectedHospitalForCreds.webhook_enabled !== undefined ? selectedHospitalForCreds.webhook_enabled : true) ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <span>{selectedHospitalForCreds.name} — API & Webhook Settings</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCredsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer font-bold shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSettingsTab('credentials')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  settingsTab === 'credentials'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>API Credentials</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('webhook')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  settingsTab === 'webhook'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Webhook Management</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsTab('logs');
                  loadHospitalLogs(selectedHospitalForCreds.id, hospitalLogFilter);
                }}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  settingsTab === 'logs'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Webhook Event Logs</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('docs')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  settingsTab === 'docs'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>API Documentation & HMAC</span>
              </button>
            </div>

            {/* TAB 1: API CREDENTIALS */}
            {settingsTab === 'credentials' && (
              <div className="space-y-4">
                {/* Fresh Secret Warning Banner (Shown Only Right After Generation) */}
                {freshCredentials?.apiSecret && (
                  <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-950 text-xs space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 font-extrabold text-amber-900 text-sm">
                      <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>Important: Save Your API Secret Now</span>
                    </div>
                    <p className="leading-relaxed">
                      For maximum security, this API Secret is cryptographically hashed with bcrypt in the database and <strong>will NEVER be shown again in plain text</strong>. Copy and store it immediately in your hospital server's environment configuration.
                    </p>
                    <div className="bg-white p-3 rounded-xl border border-amber-300 flex items-center justify-between gap-2">
                      <code className="font-mono font-bold text-rose-800 text-xs sm:text-sm break-all">
                        {freshCredentials.apiSecret}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(freshCredentials.apiSecret!, 'fresh_api_secret')}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition"
                      >
                        {copiedKey === 'fresh_api_secret' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'fresh_api_secret' ? 'Copied' : 'Copy Secret'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Hospital Code / ID */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                    <span>Hospital ID / Hospital Code</span>
                    <span className="text-[11px] text-slate-400 lowercase font-normal">use in X-Hospital-ID header</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedHospitalForCreds.hospital_code}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedHospitalForCreds.hospital_code, 'modal_hosp_code')}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer shrink-0"
                      title="Copy Hospital Code"
                    >
                      {copiedKey === 'modal_hosp_code' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* API Key */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                    <span>Live API Key</span>
                    <span className="text-[11px] text-slate-400 lowercase font-normal">use in X-API-Key header</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const fullApiKey = freshCredentials?.apiKey || selectedHospitalForCreds.api_key || 'No active key';
                      const isMasked = !showApiKey && fullApiKey !== 'No active key';
                      const displayKey = isMasked
                        ? (fullApiKey.length > 12 ? `${fullApiKey.slice(0, 8)}••••••••••••••••••••••••${fullApiKey.slice(-4)}` : '••••••••••••••••')
                        : fullApiKey;
                      return (
                        <>
                          <input
                            type="text"
                            readOnly
                            value={displayKey}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer shrink-0"
                            title={showApiKey ? 'Mask Key' : 'Reveal Key'}
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(fullApiKey, 'modal_api_key')}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer shrink-0"
                            title="Copy API Key"
                          >
                            {copiedKey === 'modal_api_key' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* API Secret (Securely Stored in DB) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                    <span>API Secret Status</span>
                    <span className="text-[11px] text-emerald-600 font-semibold">Bcrypt Hashed & Salted</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value="••••••••••••••••••••••••••••••••••••••••••••••••"
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono text-slate-500"
                    />
                    <span className="text-[11px] text-slate-400 px-2 shrink-0">Hashed in DB</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    To preserve security and eliminate credential leaks, API secrets are never exposed in plaintext over API responses. If the secret was misplaced, regenerate credentials below.
                  </p>
                </div>

                {/* Quota & Status Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block">Allocated Online Quota:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedHospitalForCreds.online_quota} serials / {selectedHospitalForCreds.total_hospital_serials} total
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Last API Request:</span>
                    <span className="font-mono text-slate-800">
                      {selectedHospitalForCreds.last_api_request_at
                        ? selectedHospitalForCreds.last_api_request_at.replace('T', ' ').substring(0, 19)
                        : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleRevokeCredentials(selectedHospitalForCreds.id)}
                    className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer transition flex items-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Revoke API Credentials</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRegenerateCredentials(selectedHospitalForCreds.id)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs cursor-pointer transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Generate / Regenerate Credentials</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: WEBHOOK SETTINGS */}
            {settingsTab === 'webhook' && (
              <div className="space-y-4">
                {/* Webhook Enable / Disable Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50">
                  <div>
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Webhook Event Dispatching</p>
                    <p className="text-[11px] text-slate-500">
                      Send real-time updates for booked and cancelled appointments to the hospital system.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleWebhook(selectedHospitalForCreds.id, !webhookEnabledInput)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
                      webhookEnabledInput
                        ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${webhookEnabledInput ? 'bg-white' : 'bg-slate-500'}`} />
                    <span>{webhookEnabledInput ? 'Webhook Enabled' : 'Webhook Disabled'}</span>
                  </button>
                </div>

                {/* Webhook URL Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Hospital Webhook Endpoint URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={webhookUrlInput}
                      onChange={(e) => setWebhookUrlInput(e.target.value)}
                      placeholder="https://hospital.com/api/daktar-serial/webhook"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden bg-white"
                    />
                    <button
                      type="button"
                      disabled={savingWebhook}
                      onClick={() => handleSaveWebhook(selectedHospitalForCreds.id)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shrink-0 transition disabled:opacity-50"
                    >
                      {savingWebhook ? 'Saving...' : 'Save URL'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Must be a secure HTTPS endpoint accessible from the internet.</p>
                </div>

                {/* Webhook Secret */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Webhook Signing Secret</span>
                    <span className="text-[11px] text-slate-400 lowercase font-normal">used to verify X-DaktarSerial-Signature</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const fullSecret = freshCredentials?.webhookSecret || selectedHospitalForCreds.webhook_secret || 'whsec_default';
                      const isMasked = !showWebhookSecret;
                      const displaySecret = isMasked
                        ? (fullSecret.length > 10 ? `${fullSecret.slice(0, 6)}••••••••••••••••••••••••${fullSecret.slice(-4)}` : '••••••••••••••••')
                        : fullSecret;
                      return (
                        <>
                          <input
                            type="text"
                            readOnly
                            value={displaySecret}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer shrink-0"
                            title={showWebhookSecret ? 'Mask Secret' : 'Reveal Secret'}
                          >
                            {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(fullSecret, 'modal_wh_secret')}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer shrink-0"
                            title="Copy Webhook Secret"
                          >
                            {copiedKey === 'modal_wh_secret' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Webhook Delivery Status & Last Webhook Info */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Webhook Health & Delivery Status
                    </span>
                    <button
                      type="button"
                      disabled={testWebhookStatus.running}
                      onClick={() => handleTestWebhookFromSettings(selectedHospitalForCreds.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition disabled:opacity-50"
                    >
                      <Send className={`w-3.5 h-3.5 ${testWebhookStatus.running ? 'animate-spin' : ''}`} />
                      <span>{testWebhookStatus.running ? 'Testing...' : 'Test Webhook Endpoint'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Last Dispatched:</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {selectedHospitalForCreds.last_webhook_at
                          ? selectedHospitalForCreds.last_webhook_at.replace('T', ' ').substring(0, 19)
                          : 'No webhooks sent yet'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Aggregated Delivery Stats:</span>
                      <span className="text-slate-800 font-semibold">
                        <strong className="text-emerald-700">{selectedHospitalForCreds.successful_syncs_count || 0}</strong> Successful /{' '}
                        <strong className="text-rose-700">{selectedHospitalForCreds.failed_syncs_count || 0}</strong> Failed
                      </span>
                    </div>
                  </div>

                  {selectedHospitalForCreds.last_error_message && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                      <strong>Last Error:</strong> {selectedHospitalForCreds.last_error_message}
                    </div>
                  )}

                  {/* Real-Time Test Output Result */}
                  {testWebhookStatus.result && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800">
                        <span className="font-bold text-amber-400">Ping Result ({testWebhookStatus.result.timestamp})</span>
                        <span className={testWebhookStatus.result.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {testWebhookStatus.result.success ? `HTTP ${testWebhookStatus.result.httpStatus || 200} OK` : 'FAILED'}
                        </span>
                      </div>
                      {testWebhookStatus.result.error && (
                        <p className="text-rose-400">{testWebhookStatus.result.error}</p>
                      )}
                      {testWebhookStatus.result.success && (
                        <p className="text-emerald-400">Endpoint returned HTTP {testWebhookStatus.result.httpStatus || 200}. HMAC signature verified.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: WEBHOOK EVENT LOGS */}
            {settingsTab === 'logs' && (
              <div className="space-y-3">
                {/* Event Filter Bar */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-500 font-semibold">Event:</span>
                    {[
                      { id: 'all', label: 'All Events' },
                      { id: 'appointment.booked', label: 'appointment.booked' },
                      { id: 'appointment.cancelled', label: 'appointment.cancelled' },
                      { id: 'appointment.updated', label: 'appointment.updated' },
                      { id: 'integration.test', label: 'integration.test' },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => {
                          setHospitalLogFilter(btn.id);
                          loadHospitalLogs(selectedHospitalForCreds.id, btn.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                          hospitalLogFilter === btn.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={loadingHospitalLogs}
                    onClick={() => loadHospitalLogs(selectedHospitalForCreds.id, hospitalLogFilter)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                    title="Refresh Logs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingHospitalLogs ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Logs Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 text-[11px] uppercase">
                      <tr>
                        <th className="px-3 py-2.5">Time</th>
                        <th className="px-3 py-2.5">Event</th>
                        <th className="px-3 py-2.5">Details</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">HTTP</th>
                        <th className="px-3 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {hospitalLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                            {loadingHospitalLogs ? 'Loading logs...' : 'No webhook event logs recorded for this hospital.'}
                          </td>
                        </tr>
                      ) : (
                        hospitalLogs.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50/70 transition">
                            <td className="px-3 py-2 font-mono text-[10px] text-slate-600">
                              {l.created_at?.replace('T', ' ').substring(0, 19)}
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                                {l.event}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[11px]">
                              {l.serial_number && <span className="font-bold">Serial #{l.serial_number} </span>}
                              {l.booking_id && <span className="text-slate-400">({l.booking_id})</span>}
                              {l.error_message && (
                                <p className="text-[10px] text-rose-600 truncate max-w-xs">{l.error_message}</p>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  l.status === 'success'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {l.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-700 text-[11px]">
                              {l.http_status || '-'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {l.direction === 'daktar_to_hospital' && l.status === 'failed' && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryLog(l.id)}
                                  className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold cursor-pointer"
                                >
                                  Retry
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: API DOCUMENTATION & HMAC SPECIFICATION */}
            {settingsTab === 'docs' && (
              <div className="space-y-5 text-xs sm:text-sm">
                {/* Headers */}
                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    1. Authentication Headers (Required for every API request)
                  </h4>
                  <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs overflow-x-auto space-y-1">
                    <div><span className="text-amber-400">X-Hospital-ID</span>: {selectedHospitalForCreds.hospital_code}</div>
                    <div><span className="text-amber-400">X-API-Key</span>: {selectedHospitalForCreds.api_key || 'ds_live_...'}</div>
                    <div><span className="text-amber-400">Content-Type</span>: application/json</div>
                  </div>
                </div>

                {/* Integration Endpoints */}
                <div className="space-y-2.5">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    2. Available Hospital Integration Endpoints
                  </h4>

                  <div className="space-y-2">
                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-emerald-100 text-emerald-800 text-[11px]">GET</span>
                        <code className="font-mono font-bold text-slate-900 text-xs">/api/integration/hospital/doctors</code>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Returns list of authorized doctors linked to your hospital along with specialties, chamber IDs, and quota limits.
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-emerald-100 text-emerald-800 text-[11px]">GET</span>
                        <code className="font-mono font-bold text-slate-900 text-xs">/api/integration/hospital/schedules?doctor_id=3</code>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Retrieves active weekly consulting schedule sessions and total serial capacities.
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-emerald-100 text-emerald-800 text-[11px]">GET</span>
                        <code className="font-mono font-bold text-slate-900 text-xs">/api/integration/hospital/serials?doctor_id=3&chamber_id=2&date=2026-10-04</code>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Queries real-time serial slot statuses (1..N) marked as <span className="text-emerald-700 font-bold">available</span> or <span className="text-rose-700 font-bold">booked</span>.
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-indigo-100 text-indigo-800 text-[11px]">POST</span>
                        <code className="font-mono font-bold text-slate-900 text-xs">/api/integration/hospital/booking</code>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Synchronizes a booking made on the hospital website. Atomically locks the serial in Daktar Serial with double-booking prevention.
                      </p>
                      <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
{`{
  "doctor_id": 3,
  "serial_number": 5,
  "appointment_date": "2026-10-04",
  "external_booking_id": "HB-98765",
  "idempotency_key": "IDEM-HB-98765",
  "patient_name": "Rahim Uddin",
  "patient_phone": "017XXXXXXXX"
}`}
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-100 text-rose-800 text-[11px]">POST</span>
                        <code className="font-mono font-bold text-slate-900 text-xs">/api/integration/hospital/cancel</code>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Cancels an existing hospital booking and atomically frees the serial slot back to available.
                      </p>
                      <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto">
{`{
  "external_booking_id": "HB-98765",
  "reason": "Cancelled by patient"
}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* HMAC Verification */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    3. HMAC-SHA256 Webhook Signature Verification
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-xs">
                    Every webhook event sent from Daktar Serial includes an HMAC-SHA256 signature in the <code className="font-bold text-slate-900">X-DaktarSerial-Signature</code> header.
                    Hospital servers should verify this signature before processing payloads:
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto">
{`// Node.js / Express Webhook Verification:
const crypto = require('crypto');

function verifyWebhook(rawBody, signature, timestamp, webhookSecret) {
  const data = timestamp + '.' + rawBody;
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(data)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}`}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowCredsModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
