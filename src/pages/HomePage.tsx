import React, { useState, useEffect } from 'react';
import { Search, MapPin, Stethoscope, Calendar, ArrowRight, ShieldCheck, Clock, CheckCircle2, Award, Users, Activity, Sparkles, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Specialty, DoctorProfile } from '../types.js';

interface HomePageProps {
  onSearch: (filters: { search: string; specialty: string; location: string }) => void;
  onSelectDoctor: (doctorId: number) => void;
  onNavigate: (view: string) => void;
  onOpenTestModal: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSearch, onSelectDoctor, onNavigate, onOpenTestModal }) => {
  const { t } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [featuredDoctors, setFeaturedDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [specRes, docRes] = await Promise.all([
          fetch('/api/public/specialties'),
          fetch('/api/public/doctors'),
        ]);

        if (specRes.ok) {
          const specData = await specRes.json();
          setSpecialties(specData.specialties || []);
        }

        if (docRes.ok) {
          const docData = await docRes.json();
          setFeaturedDoctors(docData.doctors?.slice(0, 4) || []);
        }
      } catch (err) {
        console.error('Error loading home data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ search: searchTerm, specialty: selectedSpecialty, location: selectedLocation });
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-900 text-white pt-14 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25" />

        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('Instant Doctor Serial Booking in Bangladesh', 'বাংলাদেশের দ্রুততম ডাক্তার সিরিয়াল বুকিং প্ল্যাটফর্ম')}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            {t('Book Doctor Chamber Serial', 'ডাক্তারের চেম্বার সিরিয়াল নিন')} <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
              {t('Without Standing in Crowded Queues', 'দীর্ঘ লাইনে না দাঁড়িয়ে')}
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-slate-300 text-sm sm:text-base leading-relaxed">
            {t(
              'Select doctor, choose your preferred chamber and date, pick your exact serial number (e.g. Serial 03), and receive your unique Appointment ID instantly.',
              'ডাক্তার ও চেম্বার পছন্দ করুন, তারিখ নির্বাচন করুন, নির্দিষ্ট সিরিয়াল বেছে নিন এবং সাথে সাথে নিশ্চিত অ্যাপয়েন্টমেন্ট আইডি পান।'
            )}
          </p>

          {/* Search Box Card */}
          <div className="max-w-4xl mx-auto mt-8 bg-white p-3 sm:p-4 rounded-2xl shadow-2xl border border-slate-200 text-slate-800 text-left">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3">
              {/* Doctor Name / Query */}
              <div className="sm:col-span-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('Doctor name, disease, or qualification...', 'ডাক্তারের নাম বা রোগ...')}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm outline-hidden transition"
                />
              </div>

              {/* Specialty dropdown */}
              <div className="sm:col-span-3 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm outline-hidden transition bg-white"
                >
                  <option value="">{t('All Specialties', 'সকল বিভাগ')}</option>
                  {specialties.map((spec) => (
                    <option key={spec.id} value={spec.slug}>
                      {spec.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location dropdown/input */}
              <div className="sm:col-span-3 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  placeholder={t('Location (e.g. Dhanmondi, Dhaka)', 'এলাকা (যেমন: ধানমন্ডি)')}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm outline-hidden transition"
                />
              </div>

              {/* Submit Button */}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full h-full min-h-[42px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-sm shadow-emerald-600/30 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>{t('Search', 'খুঁজুন')}</span>
                </button>
              </div>
            </form>

            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
              <span className="flex items-center gap-1">
                <span className="font-semibold text-slate-700">{t('Popular:', 'জনপ্রিয়:')}</span>
                {['Cardiology', 'General Medicine', 'Pediatrics', 'Gynecology'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSelectedSpecialty(item.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                      onSearch({ search: '', specialty: item.toLowerCase().replace(/[^a-z0-9]+/g, '-'), location: '' });
                    }}
                    className="hover:text-emerald-600 underline decoration-slate-300 underline-offset-2 ml-1 cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </span>
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t('Verified BMDC Doctors Only', 'শুধুমাত্র অনুমোদিত ডাক্তার')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Specialty Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t('Explore by Medical Specialty', 'বিভাগ অনুযায়ী বিশেষজ্ঞ ডাক্তার')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {t('Find top verified doctors across common medical departments', 'আপনার প্রয়োজনীয় বিভাগে অভিজ্ঞ ও সার্টিফাইড বিশেষজ্ঞ নির্বাচন করুন')}
            </p>
          </div>
          <button
            onClick={() => onNavigate('doctors')}
            className="text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
          >
            <span>{t('View All Doctors', 'সকল ডাক্তার দেখুন')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {specialties.slice(0, 12).map((spec) => (
            <div
              key={spec.id}
              onClick={() => onSearch({ search: '', specialty: spec.slug, location: '' })}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition group cursor-pointer text-center"
            >
              <div className="w-10 h-10 mx-auto rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-800 text-xs mt-3 line-clamp-1 group-hover:text-emerald-600 transition">
                {spec.name}
              </h3>
              {spec.name_bn && (
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{spec.name_bn}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-10">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider">
              {t('Simple 3-Step Process', 'সহজ ৩ ধাপে সিরিয়াল')}
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              {t('How Chamber Serial Booking Works', 'কীভাবে সিরিয়াল বুক করবেন')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center mb-4 text-sm">
                01
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">
                {t('Find Doctor & Chamber', 'ডাক্তার ও চেম্বার নির্বাচন')}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t(
                  'Search approved doctors by specialty or location. Review qualification, BMDC reg number, chamber address, and fees.',
                  'বিশেষজ্ঞ বা এলাকা দিয়ে অনুমোদিত ডাক্তার খুঁজুন। ডাক্তারের অভিজ্ঞতা ও চেম্বারের ঠিকানা দেখে নিন।'
                )}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center mb-4 text-sm">
                02
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">
                {t('Pick Date & Serial Number', 'তারিখ ও সিরিয়াল বেছে নিন')}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t(
                  'Select an available date. Browse active serial slots (e.g. Serial 01, 02, 03) and select your preferred consultation slot.',
                  'পছন্দের তারিখ নির্বাচন করে উপলব্ধ সিরিয়াল নম্বরটি সিলেক্ট করুন (যেমন: সিরিয়াল ০৩)।'
                )}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center mb-4 text-sm">
                03
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">
                {t('Get Confirmed Serial ID', 'তাৎক্ষণিক সিরিয়াল রসিদ')}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t(
                  'Instantly receive your official Appointment ID (DS-YYYYMMDD-XXXXX). Double-booking protection guarantees your slot.',
                  'সাথে সাথে আপনার অনন্য অ্যাপয়েন্টমেন্ট আইডি ও সিরিয়াল কনফার্মেশন পাবেন। কোনো ডুপ্লিকেট বুকিং এর সুযোগ নেই।'
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Approved Doctors */}
      {featuredDoctors.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {t('Verified Medical Specialists', 'অনুমোদিত বিশেষজ্ঞ ডাক্তার')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {t('Approved by system administration with verified credentials and active chambers', 'অ্যাডমিন কর্তৃক ভেরিফাইড বিএমডিসি সনদপ্রাপ্ত ডাক্তারদের তালিকা')}
              </p>
            </div>
            <button
              onClick={() => onNavigate('doctors')}
              className="text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
            >
              <span>{t('Browse All Doctors', 'সব ডাক্তার')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-lg transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={doc.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'}
                      alt={doc.name}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-100"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {doc.specialty_name || 'Specialist'}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mt-1 truncate">
                        {doc.title} {doc.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate">BMDC: {doc.bmdc_number}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-3 min-h-[32px]">
                    {doc.qualification}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{doc.chambers_list?.[0] || 'Active Chamber'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        {doc.experience_years}+ years exp
                      </span>
                      <span className="font-bold text-slate-900">
                        ৳{doc.consultation_fee}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onSelectDoctor(doc.id)}
                    className="w-full py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    {t('Profile', 'প্রোফাইল')}
                  </button>
                  <button
                    onClick={() => onSelectDoctor(doc.id)}
                    className="w-full py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                  >
                    {t('Get Serial', 'সিরিয়াল নিন')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Verification Suite Quick Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-700 shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-slate-950">
                PHASE 1 ACCEPTANCE CRITERIA
              </span>
            </div>
            <h3 className="text-xl font-bold">18-Step Live Database Verification Suite</h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Test doctor registration, admin approval, chamber creation, automated serial generation, patient booking, and strict database double-booking rejection with one click.
            </p>
          </div>
          <button
            onClick={onOpenTestModal}
            className="shrink-0 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            Launch Test Suite
          </button>
        </div>
      </section>
    </div>
  );
};
