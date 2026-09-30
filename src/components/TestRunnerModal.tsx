import React, { useState } from 'react';
import { CheckCircle2, XCircle, Play, ShieldAlert, Check, Copy, ExternalLink, RefreshCw, X } from 'lucide-react';
import { TestResultItem } from '../types.js';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDoctor?: (doctorId: number) => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResultItem[]>([]);
  const [allPassed, setAllPassed] = useState<boolean | null>(null);
  const [sampleAppt, setSampleAppt] = useState<any>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const runTest = async () => {
    setRunning(true);
    setTestResults([]);
    setAllPassed(null);
    try {
      const res = await fetch('/api/test/run-completion-test', { method: 'POST' });
      const data = await res.json();
      setTestResults(data.results || []);
      setAllPassed(data.allPassed);
      setSampleAppt(data.sampleAppointment || null);
    } catch (err: any) {
      setTestResults([
        {
          step: 0,
          title: 'Test Failed',
          success: false,
          details: err.message || 'Error executing test suite',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setAllPassed(false);
    } finally {
      setRunning(false);
    }
  };

  const copyCredential = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500 text-slate-950 uppercase tracking-wider">
                Phase 1 MVP Test Suite
              </span>
              <h3 className="text-lg font-bold">18-Step End-to-End Completion Verification</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Validates the complete Admin → Doctor Approval → Chamber/Schedule → Patient Booking → Double-Booking Prevention workflow.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Credentials Info Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Test & Demo Accounts (Pre-Seeded)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900">Admin</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 font-medium">Full Access</span>
                </div>
                <p className="text-slate-500 text-[11px] truncate">admin@daktarserial.com</p>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[11px]">
                  <code className="text-slate-600">Admin123!</code>
                  <button
                    onClick={() => copyCredential('admin@daktarserial.com / Admin123!', 'admin')}
                    className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    {copiedText === 'admin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900">Doctor (Approved)</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-medium">Prof. Rahman</span>
                </div>
                <p className="text-slate-500 text-[11px] truncate">doctor@daktarserial.com</p>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[11px]">
                  <code className="text-slate-600">Doctor123!</code>
                  <button
                    onClick={() => copyCredential('doctor@daktarserial.com / Doctor123!', 'doctor')}
                    className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    {copiedText === 'doctor' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900">Patient</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-800 font-medium">Abdur Rahim</span>
                </div>
                <p className="text-slate-500 text-[11px] truncate">patient@daktarserial.com</p>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[11px]">
                  <code className="text-slate-600">Patient123!</code>
                  <button
                    onClick={() => copyCredential('patient@daktarserial.com / Patient123!', 'patient')}
                    className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    {copiedText === 'patient' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between bg-slate-900/5 p-4 rounded-xl border border-slate-200">
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">Execute Live Automated Completion Test</h4>
              <p className="text-xs text-slate-500">
                Runs real transactions against the database, creates doctor, approves, creates chamber/schedule, books serial, and asserts duplicate rejection.
              </p>
            </div>
            <button
              onClick={runTest}
              disabled={running}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {running ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing 18 Steps...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run 18-Step Test</span>
                </>
              )}
            </button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">
                  Test Execution Results ({testResults.filter((r) => r.success).length} / {testResults.length} Steps Passed)
                </h4>
                {allPassed !== null && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      allPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {allPassed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                    {allPassed ? 'ALL 18 ACCEPTANCE STEPS PASSED' : 'TESTS FAILED'}
                  </span>
                )}
              </div>

              {sampleAppt && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-emerald-800">Generated Appointment: </span>
                    <span>ID: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-bold">{sampleAppt.appointmentId}</code></span>
                    <span className="ml-2">Serial: <span className="font-bold bg-emerald-600 text-white px-2 py-0.5 rounded">{sampleAppt.serialNumber}</span></span>
                    <span className="ml-2 text-emerald-700">({sampleAppt.time} on {sampleAppt.date})</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium">Duplicate serial booked simultaneously was securely rejected!</span>
                </div>
              )}

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-72 overflow-y-auto bg-white">
                {testResults.map((item) => (
                  <div key={item.step} className="p-3 hover:bg-slate-50 transition flex items-start gap-3 text-xs">
                    <span className="mt-0.5 shrink-0">
                      {item.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">
                          Step {item.step}: {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5 text-[11px] font-mono leading-relaxed break-all">
                        {item.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verification steps checklist reference */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs">
            <h5 className="font-semibold text-slate-800 mb-2">Phase 1 Specification Checklist</h5>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-600 text-[11px] list-decimal list-inside">
              <li>Register doctor (pending approval)</li>
              <li>Admin login & pending queue</li>
              <li>Approve doctor application</li>
              <li>Doctor dashboard access</li>
              <li>Chamber creation with address/fee</li>
              <li>Schedule creation (Days/Times)</li>
              <li>Auto serial slot generation</li>
              <li>Public search shows approved doctor</li>
              <li>Specialty & location filters</li>
              <li>Doctor public profile page</li>
              <li>Date picker matching active days</li>
              <li>Available serial numbers selection</li>
              <li>Patient details & appointment booking</li>
              <li>DS-YYYYMMDD-XXXXX appointment ID</li>
              <li>Patient dashboard shows serial</li>
              <li>Doctor dashboard shows appointment</li>
              <li>Simulate concurrent duplicate booking</li>
              <li>Database unique constraint rejection</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
