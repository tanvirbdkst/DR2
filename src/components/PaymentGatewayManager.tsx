import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, CheckCircle2, XCircle, AlertTriangle, ShieldCheck,
  RefreshCw, Settings, ToggleLeft, ToggleRight, Eye, EyeOff,
  History, Key, Lock, Globe, ExternalLink, Zap, HelpCircle,
  Percent, DollarSign, Check, X, ShieldAlert, Cpu
} from 'lucide-react';
import { getAuthToken } from '../config/api.js';

export interface PaymentGatewayPublicView {
  id: 'paymently' | 'bkash' | 'nagad' | 'rocket' | 'upay' | 'sslcommerz';
  name: string;
  description: string | null;
  logo_url: string | null;
  is_enabled: boolean;
  is_sandbox: boolean;
  supported_methods: string[];
  surcharge_percentage: number;
  surcharge_fixed: number;
  sort_order: number;
  last_tested_at: string | null;
  last_test_status: 'success' | 'failed' | 'untested';
  last_test_message: string | null;
  masked_config?: Record<string, any>;
  has_credentials: boolean;
}

export interface GatewayAuditLog {
  id: number;
  gateway_id: string;
  admin_id: number | null;
  admin_email: string | null;
  action: string;
  changes: string | Record<string, any>;
  ip_address: string | null;
  created_at: string;
}

export const PaymentGatewayManager: React.FC = () => {
  const [gateways, setGateways] = useState<PaymentGatewayPublicView[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'enabled' | 'sandbox' | 'live'>('all');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Testing State
  const [testingGatewayId, setTestingGatewayId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Configuration Modal State
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayPublicView | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [surchargePercent, setSurchargePercent] = useState<number>(0);
  const [surchargeFixed, setSurchargeFixed] = useState<number>(0);
  const [isSandbox, setIsSandbox] = useState<boolean>(true);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Audit Log Modal State
  const [auditGatewayId, setAuditGatewayId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<GatewayAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Warning Modal for Untested Enable
  const [confirmWarning, setConfirmWarning] = useState<{
    gateway: PaymentGatewayPublicView;
    proceed: () => void;
  } | null>(null);

  const fetchGateways = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/payment-gateways', {
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch gateways');
      setGateways(data.gateways || []);
    } catch (err: any) {
      setActionError(err.message || 'Error loading payment gateways');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  // Handle Toggle Gateway
  const handleToggleGateway = async (gateway: PaymentGatewayPublicView) => {
    const nextState = !gateway.is_enabled;

    // If enabling an untested or failed gateway, show warning modal first
    if (nextState && gateway.last_test_status !== 'success') {
      setConfirmWarning({
        gateway,
        proceed: () => executeToggle(gateway.id, nextState),
      });
      return;
    }

    await executeToggle(gateway.id, nextState);
  };

  const executeToggle = async (gatewayId: string, nextState: boolean) => {
    setConfirmWarning(null);
    setActionError(null);
    setActionSuccess(null);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/payment-gateways/${gatewayId}/toggle`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ is_enabled: nextState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status');

      if (data.warning) {
        setActionError(`Warning: ${data.warning}`);
      } else {
        setActionSuccess(data.message || `Gateway status updated to ${nextState ? 'Enabled' : 'Disabled'}`);
      }
      fetchGateways();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Test Connection
  const handleTestConnection = async (gatewayId: string, customConfig?: Record<string, any>, customSandbox?: boolean) => {
    setTestingGatewayId(gatewayId);
    setTestResult(null);
    setActionError(null);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/payment-gateways/${gatewayId}/test-connection`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          credentials: customConfig,
          is_sandbox: customSandbox,
        }),
      });
      const data = await res.json();
      setTestResult({
        id: gatewayId,
        success: data.success,
        message: data.message || (data.success ? 'Test connection successful' : 'Test connection failed'),
      });
      fetchGateways();
    } catch (err: any) {
      setTestResult({
        id: gatewayId,
        success: false,
        message: `Network error: ${err.message}`,
      });
    } finally {
      setTestingGatewayId(null);
    }
  };

  // Open Edit Modal
  const openEditModal = (gw: PaymentGatewayPublicView) => {
    setSelectedGateway(gw);
    setConfigForm(gw.masked_config || {});
    setSurchargePercent(gw.surcharge_percentage || 0);
    setSurchargeFixed(gw.surcharge_fixed || 0);
    setIsSandbox(gw.is_sandbox);
    setSelectedMethods(gw.supported_methods || []);
    setShowSecrets({});
    setTestResult(null);
  };

  // Save Configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGateway) return;

    setSavingConfig(true);
    setActionError(null);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/payment-gateways/${selectedGateway.id}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          is_sandbox: isSandbox,
          surcharge_percentage: Number(surchargePercent),
          surcharge_fixed: Number(surchargeFixed),
          supported_methods: selectedMethods,
          credentials: configForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save gateway config');

      setActionSuccess(`Gateway '${selectedGateway.name}' configured successfully.`);
      setSelectedGateway(null);
      fetchGateways();
    } catch (err: any) {
      setActionError(err.message || 'Error saving gateway configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  // Fetch Audit Logs
  const handleViewAudit = async (gatewayId: string) => {
    setAuditGatewayId(gatewayId);
    setLoadingAudit(true);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/payment-gateways/${gatewayId}/audit-logs`, {
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (err: any) {
      console.error('Audit fetch error:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const filteredGateways = gateways.filter((gw) => {
    if (filterMode === 'enabled') return gw.is_enabled;
    if (filterMode === 'sandbox') return gw.is_sandbox;
    if (filterMode === 'live') return !gw.is_sandbox;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Payment Gateway Management</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Configure, test, and manage supported payment gateways with modular adapters. 
            All sensitive API keys and secrets are AES-256 encrypted at rest and never exposed to the client.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchGateways}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Gateways</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">
              {gateways.filter((g) => g.is_enabled).length}
            </span>
            <span className="text-xs text-slate-400">/ {gateways.length} Total</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Default Booking Fee</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">৳10.00</span>
            <span className="text-xs text-slate-400">BDT fixed</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sandbox Mode</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">
              {gateways.filter((g) => g.is_sandbox).length}
            </span>
            <span className="text-xs text-slate-400">Gateways in Test</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Production Live</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600">
              {gateways.filter((g) => !g.is_sandbox && g.is_enabled).length}
            </span>
            <span className="text-xs text-slate-400">Ready for Checkout</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-medium">
        <span className="text-slate-400 mr-2">Filter Gateways:</span>
        {(['all', 'enabled', 'sandbox', 'live'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setFilterMode(mode)}
            className={`px-3 py-1.5 rounded-lg capitalize transition cursor-pointer ${
              filterMode === mode
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            {mode === 'all' ? 'All Gateways' : mode}
          </button>
        ))}
      </div>

      {/* Gateway Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGateways.map((gw) => {
          const isTestingThis = testingGatewayId === gw.id;
          const currentTest = testResult?.id === gw.id ? testResult : null;

          return (
            <div
              key={gw.id}
              className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-xs ${
                gw.is_enabled ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-slate-200 opacity-90'
              }`}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={gw.logo_url || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80'}
                      alt={gw.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                    />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{gw.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                            gw.is_sandbox
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {gw.is_sandbox ? 'Sandbox Mode' : 'Live Production'}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            gw.has_credentials
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {gw.has_credentials ? 'Keys Installed' : 'Credentials Required'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() => handleToggleGateway(gw)}
                    title={gw.is_enabled ? 'Disable Gateway' : 'Enable Gateway'}
                    className="cursor-pointer transition transform active:scale-95"
                  >
                    {gw.is_enabled ? (
                      <ToggleRight className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300 hover:text-slate-400" />
                    )}
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 mt-3 line-clamp-2">
                  {gw.description || 'Secure online payment adapter for Daktar Serial bookings.'}
                </p>

                {/* Methods & Surcharge Information */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Supported Methods:</span>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {gw.supported_methods && gw.supported_methods.length > 0 ? (
                        gw.supported_methods.map((method) => (
                          <span
                            key={method}
                            className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium uppercase"
                          >
                            {method}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-[11px]">Default</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Gateway Surcharge:</span>
                    <span className="font-semibold text-slate-800">
                      {gw.surcharge_percentage > 0 || gw.surcharge_fixed > 0
                        ? `৳${gw.surcharge_fixed} + ${gw.surcharge_percentage}%`
                        : 'No surcharge (0%)'}
                    </span>
                  </div>

                  {/* Last Test Status */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400">Connection Health:</span>
                    <div className="flex items-center gap-1">
                      {gw.last_test_status === 'success' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Connected</span>
                        </span>
                      )}
                      {gw.last_test_status === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600" title={gw.last_test_message || 'Test failed'}>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
                      {(!gw.last_test_status || gw.last_test_status === 'untested') && (
                        <span className="text-[11px] text-slate-400">Untested</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline Test Result Message */}
                {currentTest && (
                  <div
                    className={`mt-3 p-2.5 rounded-xl text-[11px] flex items-start gap-2 ${
                      currentTest.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {currentTest.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="line-clamp-2">{currentTest.message}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleTestConnection(gw.id)}
                  disabled={isTestingThis}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingThis ? 'animate-spin' : ''}`} />
                  <span>{isTestingThis ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleViewAudit(gw.id)}
                    title="Audit History"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <History className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(gw)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Configure</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Untested Warning Confirmation Modal */}
      {confirmWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-amber-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Warning: Connection Untested</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>{confirmWarning.gateway.name}</strong> has not passed a live connection test yet.
              Enabling it may cause live patients to experience checkout errors or failed payment sessions.
            </p>
            <div className="p-3 bg-amber-50/70 rounded-xl text-[11px] text-amber-900">
              Tip: Click <strong>"Test Connection"</strong> to verify credentials against the provider’s server before going live.
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmWarning(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmWarning.proceed}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
              >
                Enable Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Gateway Modal */}
      {selectedGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedGateway.logo_url || ''}
                  alt={selectedGateway.name}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedGateway.name}</h3>
                  <p className="text-xs text-slate-500">Configure API credentials, sandbox mode, and surcharges</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGateway(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Environment / Mode Selection */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <label className="text-xs font-bold text-slate-800 block">Gateway Environment Mode</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="envMode"
                      checked={isSandbox}
                      onChange={() => setIsSandbox(true)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Sandbox / Test Mode</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="envMode"
                      checked={!isSandbox}
                      onChange={() => setIsSandbox(false)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-emerald-700 font-bold">Live Production</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">
                  Sandbox enables simulated payment flows with mock bKash/Paymently accounts.
                </p>
              </div>

              {/* Dynamic Credentials Form Fields based on Gateway ID */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>API Credentials & Secrets (AES-256 Encrypted)</span>
                </h4>

                {selectedGateway.id === 'paymently' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Paymently API Key</label>
                      <div className="relative">
                        <input
                          type={showSecrets['apiKey'] ? 'text' : 'password'}
                          value={configForm['apiKey'] || ''}
                          onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                          placeholder="Paste Paymently / UddoktaPay API Key"
                          className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecrets((p) => ({ ...p, apiKey: !p['apiKey'] }))}
                          className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                        >
                          {showSecrets['apiKey'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">API Base URL</label>
                      <input
                        type="text"
                        value={configForm['baseUrl'] || 'https://daktarserial.paymently.io/api'}
                        onChange={(e) => setConfigForm({ ...configForm, baseUrl: e.target.value })}
                        placeholder="https://daktarserial.paymently.io/api"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </>
                )}

                {selectedGateway.id === 'bkash' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">bKash App Key</label>
                        <input
                          type="text"
                          value={configForm['app_key'] || configForm['appKey'] || ''}
                          onChange={(e) => setConfigForm({ ...configForm, app_key: e.target.value })}
                          placeholder="App Key"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">bKash Username</label>
                        <input
                          type="text"
                          value={configForm['username'] || ''}
                          onChange={(e) => setConfigForm({ ...configForm, username: e.target.value })}
                          placeholder="Merchant Username"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">bKash App Secret</label>
                      <div className="relative">
                        <input
                          type={showSecrets['app_secret'] ? 'text' : 'password'}
                          value={configForm['app_secret'] || configForm['appSecret'] || ''}
                          onChange={(e) => setConfigForm({ ...configForm, app_secret: e.target.value })}
                          placeholder="App Secret"
                          className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecrets((p) => ({ ...p, app_secret: !p['app_secret'] }))}
                          className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                        >
                          {showSecrets['app_secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">bKash Password</label>
                      <div className="relative">
                        <input
                          type={showSecrets['password'] ? 'text' : 'password'}
                          value={configForm['password'] || ''}
                          onChange={(e) => setConfigForm({ ...configForm, password: e.target.value })}
                          placeholder="Merchant Password"
                          className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecrets((p) => ({ ...p, password: !p['password'] }))}
                          className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                        >
                          {showSecrets['password'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {selectedGateway.id === 'nagad' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nagad Merchant ID</label>
                      <input
                        type="text"
                        value={configForm['merchant_id'] || ''}
                        onChange={(e) => setConfigForm({ ...configForm, merchant_id: e.target.value })}
                        placeholder="e.g. 68300000000"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Merchant Private Key (PEM format)</label>
                      <textarea
                        rows={3}
                        value={configForm['merchant_private_key'] || ''}
                        onChange={(e) => setConfigForm({ ...configForm, merchant_private_key: e.target.value })}
                        placeholder="-----BEGIN RSA PRIVATE KEY-----"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nagad Public Key</label>
                      <textarea
                        rows={2}
                        value={configForm['nagad_public_key'] || ''}
                        onChange={(e) => setConfigForm({ ...configForm, nagad_public_key: e.target.value })}
                        placeholder="-----BEGIN PUBLIC KEY-----"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 font-mono"
                      />
                    </div>
                  </>
                )}

                {selectedGateway.id === 'sslcommerz' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Store ID</label>
                      <input
                        type="text"
                        value={configForm['store_id'] || ''}
                        onChange={(e) => setConfigForm({ ...configForm, store_id: e.target.value })}
                        placeholder="e.g. daktarseriallive"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Store Password</label>
                      <input
                        type="password"
                        value={configForm['store_passwd'] || ''}
                        onChange={(e) => setConfigForm({ ...configForm, store_passwd: e.target.value })}
                        placeholder="Store Secret"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 font-mono"
                      />
                    </div>
                  </div>
                )}

                {(selectedGateway.id === 'rocket' || selectedGateway.id === 'upay') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Merchant ID</label>
                      <input
                        type="text"
                        value={configForm['merchant_id'] || ''}
                        onChange={(e) => setConfigForm({ ...configForm, merchant_id: e.target.value })}
                        placeholder="Merchant ID"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Secret / API Key</label>
                      <input
                        type="password"
                        value={configForm['secret_key'] || configForm['merchant_key'] || ''}
                        onChange={(e) => setConfigForm({ ...configForm, secret_key: e.target.value })}
                        placeholder="Secret Key"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Surcharge Configuration */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Gateway Surcharge Policy</span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fixed Surcharge (BDT)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={surchargeFixed}
                      onChange={(e) => setSurchargeFixed(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Fixed convenience fee (e.g. ৳2.00)</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Percentage Surcharge (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="20"
                      value={surchargePercent}
                      onChange={(e) => setSurchargePercent(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Calculated over ৳10 booking fee</span>
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-900 text-xs font-medium flex items-center justify-between">
                  <span>Effective Total Customer Booking Payable:</span>
                  <span className="font-bold text-emerald-700">
                    ৳{(10.0 + Number(surchargeFixed) + (10.0 * Number(surchargePercent)) / 100).toFixed(2)} BDT
                  </span>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleTestConnection(selectedGateway.id, configForm, isSandbox)}
                  disabled={testingGatewayId === selectedGateway.id}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingGatewayId === selectedGateway.id ? 'animate-spin' : ''}`} />
                  <span>Test This Config</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGateway(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {savingConfig ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {auditGatewayId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Audit History: <span className="uppercase text-indigo-700">{auditGatewayId}</span>
                </h3>
              </div>
              <button
                onClick={() => setAuditGatewayId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Audit log records all administrative modifications, test pings, and toggles without storing raw credentials.
            </p>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 pr-1">
              {loadingAudit ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading audit events...</div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No audit events recorded yet for this gateway.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-100 text-[11px]">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-600 font-mono text-[11px]">
                      By: <span className="text-slate-800 font-semibold">{log.admin_email || 'System'}</span>
                      {log.ip_address && <span className="text-slate-400 ml-2">({log.ip_address})</span>}
                    </div>
                    {log.changes && (
                      <div className="p-2 bg-slate-50 rounded-lg text-[10px] font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap">
                        {typeof log.changes === 'string' ? log.changes : JSON.stringify(log.changes, null, 2)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setAuditGatewayId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
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
