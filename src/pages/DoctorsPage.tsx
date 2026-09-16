import React, { useState, useEffect } from 'react';
import { Search, MapPin, Stethoscope, Filter, Building2, Calendar, Award, CheckCircle2, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { DoctorProfile, Specialty } from '../types.js';

interface DoctorsPageProps {
  initialFilters?: { search: string; specialty: string; location: string };
  onSelectDoctor: (doctorId: number) => void;
}

export const DoctorsPage: React.FC<DoctorsPageProps> = ({ initialFilters, onSelectDoctor }) => {
  const { t } = useAuth();
  const [searchTerm, setSearchTerm] = useState(initialFilters?.search || '');
  const [specialtyFilter, setSpecialtyFilter] = useState(initialFilters?.specialty || '');
  const [locationFilter, setLocationFilter] = useState(initialFilters?.location || '');
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch specialties
  useEffect(() => {
    fetch('/api/public/specialties')
      .then((r) => r.json())
      .then((data) => setSpecialties(data.specialties || []))
      .catch((err) => console.error(err));
  }, []);

  // Fetch doctors matching filters
  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (specialtyFilter) params.append('specialty', specialtyFilter);
      if (locationFilter) params.append('location', locationFilter);

      const res = await fetch(`/api/public/doctors?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDoctors(data.doctors || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [specialtyFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors();
  };

  const handleReset = () => {
    setSearchTerm('');
    setSpecialtyFilter('');
    setLocationFilter('');
    fetch('/api/public/doctors')
      .then((r) => r.json())
      .then((data) => setDoctors(data.doctors || []));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {t('Find Specialist Doctors', 'বিশেষজ্ঞ ডাক্তার অনুসন্ধান')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {t(
            'Browse verified doctors, check real-time chamber schedules, and book direct serial numbers.',
            'ভেরিফাইড ডাক্তারদের তালিকা থেকে চেম্বারের সময়সূচী দেখে সরাসরি সিরিয়াল বুক করুন।'
          )}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('Search by doctor name or qualification...', 'ডাক্তারের নাম বা যোগ্যতা...')}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
            />
          </div>

          <div className="sm:col-span-3 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Stethoscope className="w-4 h-4" />
            </div>
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden bg-white"
            >
              <option value="">{t('All Specialties', 'সকল বিভাগ')}</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <MapPin className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder={t('Location / City...', 'এলাকা বা শহর...')}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t('Search', 'খুঁজুন')}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Reset Filters"
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Results Count & Badges */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <p>
          Showing <span className="font-bold text-slate-900">{doctors.length}</span> verified approved doctors
        </p>
        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Verified BMDC Registry
        </span>
      </div>

      {/* Doctor Cards Grid */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading specialist doctors...</p>
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No doctors match your criteria</h3>
          <p className="text-xs text-slate-500">
            Try clearing some filters or searching with a different doctor name or specialty.
          </p>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700 transition cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header info */}
                <div className="flex items-start gap-4">
                  <img
                    src={doctor.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80'}
                    alt={doctor.name}
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700">
                      {doctor.specialty_name || 'Specialist'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1 truncate">
                      {doctor.title} {doctor.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">BMDC Reg: {doctor.bmdc_number}</p>
                  </div>
                </div>

                {/* Qualification */}
                <div className="text-xs text-slate-700 font-medium line-clamp-2 min-h-[32px]">
                  {doctor.qualification}
                </div>

                {/* Meta details */}
                <div className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      {t('Experience', 'অভিজ্ঞতা')}:
                    </span>
                    <span className="font-semibold text-slate-800">{doctor.experience_years} years</span>
                  </div>

                  <div className="flex items-start gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-800">
                        {doctor.chambers_list?.[0] || 'Chamber Available'}
                      </span>
                      {doctor.chambers_list && doctor.chambers_list.length > 1 && (
                        <span className="text-[10px] text-emerald-600 ml-1 font-medium">
                          (+{doctor.chambers_list.length - 1} more)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500">{t('Consultation Fee', 'ভিজিট')}:</span>
                    <span className="text-sm font-bold text-emerald-700">
                      ৳{doctor.consultation_fee}
                    </span>
                  </div>

                  {doctor.available_days_list && doctor.available_days_list.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        {t('Available:', 'দিন:')} <span className="font-medium text-slate-700">{doctor.available_days_list.join(', ')}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: View Profile & Get Serial */}
              <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-100">
                <button
                  onClick={() => onSelectDoctor(doctor.id)}
                  className="py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition cursor-pointer"
                >
                  {t('View Profile', 'প্রোফাইল দেখুন')}
                </button>
                <button
                  onClick={() => onSelectDoctor(doctor.id)}
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-xs cursor-pointer"
                >
                  {t('Get Serial', 'সিরিয়াল নিন')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
