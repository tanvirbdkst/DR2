import React, { useState, useEffect } from 'react';
import { Stethoscope, Building2, ShieldCheck, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Specialty } from '../types.js';

interface RegisterDoctorPageProps {
  onSuccess: () => void;
  onNavigate: (view: string) => void;
}

export const RegisterDoctorPage: React.FC<RegisterDoctorPageProps> = ({ onSuccess, onNavigate }) => {
  const { refreshUser, t } = useAuth();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);

  // Account details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Professional details
  const [title, setTitle] = useState('Dr.');
  const [bmdcNumber, setBmdcNumber] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState('5');
  const [bio, setBio] = useState('');
  const [consultationFee, setConsultationFee] = useState('800');

  // Chamber details
  const [chamberName, setChamberName] = useState('');
  const [chamberAddress, setChamberAddress] = useState('');
  const [city, setCity] = useState('Dhaka');
  const [area, setArea] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/public/specialties')
      .then((r) => r.json())
      .then((data) => setSpecialties(data.specialties || []))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          title,
          bmdcNumber,
          specialtyId: specialtyId ? Number(specialtyId) : null,
          qualification,
          experienceYears: Number(experienceYears),
          bio,
          consultationFee: Number(consultationFee),
          chamberName,
          chamberAddress,
          city,
          area,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Doctor registration failed');
        setLoading(false);
        return;
      }

      await refreshUser();
      setSubmittedMessage(data.message);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Network error');
      setLoading(false);
    }
  };

  if (submittedMessage) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Application Submitted!</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {submittedMessage}
          </p>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-left">
            <p className="font-bold mb-1">Phase 1 Admin Approval Workflow:</p>
            <p>1. An admin must review your BMDC number & credentials from the Admin Panel.</p>
            <p>2. Once approved, you can log in to create chambers, schedules, and serials.</p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onNavigate('admin-dashboard')}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition cursor-pointer"
            >
              Go to Admin Panel (To Approve)
            </button>
            <button
              onClick={() => onNavigate('doctor-dashboard')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer"
            >
              Open Doctor Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('Doctor Registration', 'ডাক্তার রেজিস্ট্রেশন')}
          </h1>
          <p className="text-xs text-slate-500">
            Register your practice on Daktar Serial. Requires BMDC verification and Admin approval.
          </p>
        </div>

        {/* Admin notice banner */}
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Quality Standard: All doctor registrations undergo administrative approval before being published publicly.</span>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Account */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
              1. Account Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white"
                >
                  <option value="Dr.">Dr.</option>
                  <option value="Prof. Dr.">Prof. Dr.</option>
                  <option value="Assoc. Prof. Dr.">Assoc. Prof. Dr.</option>
                  <option value="Asst. Prof. Dr.">Asst. Prof. Dr.</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. M. A. Rahman"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+8801700000000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {/* Section 2: Professional Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
              2. Professional Credentials & Specialty
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  BMDC Registration Number *
                </label>
                <input
                  type="text"
                  required
                  value={bmdcNumber}
                  onChange={(e) => setBmdcNumber(e.target.value)}
                  placeholder="e.g. A-12345"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Specialty *</label>
                <select
                  required
                  value={specialtyId}
                  onChange={(e) => setSpecialtyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white"
                >
                  <option value="">Select Specialty</option>
                  {specialties.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Medical Degrees & Qualification *
              </label>
              <input
                type="text"
                required
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. MBBS, FCPS (Medicine), MD (Cardiology)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Consultation Fee (BDT) *
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  required
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bio / About</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief professional background..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden resize-none"
              />
            </div>
          </div>

          {/* Section 3: Chamber Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
              3. Primary Chamber Location
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chamber Name</label>
              <input
                type="text"
                value={chamberName}
                onChange={(e) => setChamberName(e.target.value)}
                placeholder="e.g. Popular Diagnostic Centre, Dhanmondi"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chamber Address</label>
              <input
                type="text"
                value={chamberAddress}
                onChange={(e) => setChamberAddress(e.target.value)}
                placeholder="House #16, Road #2, Dhanmondi"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Area</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Dhanmondi"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition shadow-sm shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Submit Application for Approval</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-500">
          Already registered?{' '}
          <button
            onClick={() => onNavigate('login')}
            className="text-emerald-600 font-semibold hover:underline cursor-pointer"
          >
            Sign in here
          </button>
        </div>
      </div>
    </div>
  );
};
