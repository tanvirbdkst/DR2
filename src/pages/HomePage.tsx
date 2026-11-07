import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, MapPin, Stethoscope, Calendar, ArrowRight, ShieldCheck, Clock,
  CheckCircle2, Award, Users, Activity, Sparkles, Building2, HeartPulse,
  Baby, Smile, Brain, Volume2, ChevronRight, Eye, ChevronDown, Smartphone
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext.js';
import { Specialty, DoctorProfile } from '../types.js';
import { District, groupDistrictsByDivision } from '../data/districts.js';
import { getApiUrl } from '../config/api.js';
import { DownloadApkButton } from '../components/DownloadApkButton.js';
import { Hero3DVisual } from '../components/Hero3DVisual.js';
import { BookingProcess3D } from '../components/BookingProcess3D.js';
import { DoctorCard3D } from '../components/DoctorCard3D.js';
import { AnimatedStats3D } from '../components/AnimatedStats3D.js';
import { Testimonials3D } from '../components/Testimonials3D.js';

const getSpecialtyConfig = (slug: string, name?: string) => {
  const s = `${slug || ''} ${name || ''}`.toLowerCase();

  if (s.includes('cardio') || s.includes('heart') || s.includes('হৃদ')) {
    return {
      Icon: HeartPulse,
      iconBg: 'bg-rose-50 text-rose-600 group-hover:bg-gradient-to-tr group-hover:from-rose-500 group-hover:to-cyan-500 group-hover:text-white',
      borderHover: 'hover:border-rose-400 hover:shadow-rose-500/15',
    };
  }
  if (s.includes('dermatol') || s.includes('skin') || s.includes('চর্ম')) {
    return {
      Icon: Sparkles,
      iconBg: 'bg-purple-50 text-purple-600 group-hover:bg-gradient-to-tr group-hover:from-purple-500 group-hover:to-blue-500 group-hover:text-white',
      borderHover: 'hover:border-purple-400 hover:shadow-purple-500/15',
    };
  }
  if (s.includes('dental') || s.includes('tooth') || s.includes('দস্ত') || s.includes('দাঁত')) {
    return {
      Icon: Volume2,
      iconBg: 'bg-sky-50 text-sky-600 group-hover:bg-gradient-to-tr group-hover:from-sky-500 group-hover:to-cyan-500 group-hover:text-white',
      borderHover: 'hover:border-sky-400 hover:shadow-sky-500/15',
    };
  }
  if (s.includes('ent') || s.includes('ear') || s.includes('throat') || s.includes('নাক') || s.includes('কান')) {
    return {
      Icon: Volume2,
      iconBg: 'bg-teal-50 text-teal-600 group-hover:bg-gradient-to-tr group-hover:from-teal-500 group-hover:to-blue-500 group-hover:text-white',
      borderHover: 'hover:border-teal-400 hover:shadow-teal-500/15',
    };
  }
  if (s.includes('gastro') || s.includes('পরিপাক') || s.includes('liver')) {
    return {
      Icon: Volume2,
      iconBg: 'bg-cyan-50 text-cyan-600 group-hover:bg-gradient-to-tr group-hover:from-cyan-500 group-hover:to-blue-500 group-hover:text-white',
      borderHover: 'hover:border-cyan-400 hover:shadow-cyan-500/15',
    };
  }
  if (s.includes('gynecol') || s.includes('women') || s.includes('obs') || s.includes('স্ত্রী') || s.includes('প্রসূতি')) {
    return {
      Icon: Baby,
      iconBg: 'bg-pink-50 text-pink-600 group-hover:bg-gradient-to-tr group-hover:from-pink-500 group-hover:to-cyan-500 group-hover:text-white',
      borderHover: 'hover:border-pink-400 hover:shadow-pink-500/15',
    };
  }
  if (s.includes('pediatric') || s.includes('child') || s.includes('শিশু')) {
    return {
      Icon: Smile,
      iconBg: 'bg-amber-50 text-amber-600 group-hover:bg-gradient-to-tr group-hover:from-amber-500 group-hover:to-blue-500 group-hover:text-white',
      borderHover: 'hover:border-amber-400 hover:shadow-amber-500/15',
    };
  }
  if (s.includes('orthoped') || s.includes('bone') || s.includes('হাড়') || s.includes('হাড়')) {
    return {
      Icon: Activity,
      iconBg: 'bg-blue-50 text-blue-600 group-hover:bg-gradient-to-tr group-hover:from-blue-600 group-hover:to-cyan-500 group-hover:text-white',
      borderHover: 'hover:border-blue-400 hover:shadow-blue-500/15',
    };
  }
  if (s.includes('neuro') || s.includes('brain') || s.includes('psychiat') || s.includes('নিউরো') || s.includes('মানসিক')) {
    return {
      Icon: Brain,
      iconBg: 'bg-indigo-50 text-indigo-600 group-hover:bg-gradient-to-tr group-hover:from-indigo-600 group-hover:to-cyan-500 group-hover:text-white',
      borderHover: 'hover:border-indigo-400 hover:shadow-indigo-500/15',
    };
  }
  if (s.includes('eye') || s.includes('ophthalm') || s.includes('চক্ষু')) {
    return {
      Icon: Eye,
      iconBg: 'bg-cyan-50 text-cyan-600 group-hover:bg-gradient-to-tr group-hover:from-cyan-500 group-hover:to-blue-600 group-hover:text-white',
      borderHover: 'hover:border-cyan-400 hover:shadow-cyan-500/15',
    };
  }

  // Default Carefinity medical blue styling
  return {
    Icon: Stethoscope,
    iconBg: 'bg-blue-50 text-blue-600 group-hover:bg-gradient-to-tr group-hover:from-blue-600 group-hover:to-cyan-500 group-hover:text-white',
    borderHover: 'hover:border-blue-400 hover:shadow-blue-500/15',
  };
};

interface HomePageProps {
  onSearch: (filters: { search: string; specialty: string; location: string }) => void;
  onSelectDoctor: (doctorId: number | string) => void;
  onNavigate: (view: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSearch, onSelectDoctor, onNavigate }) => {
  const { t, lang } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [activeDistricts, setActiveDistricts] = useState<District[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [districtsError, setDistrictsError] = useState<string | null>(null);
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);
  const [featuredDoctors, setFeaturedDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveDistricts = async () => {
    setDistrictsLoading(true);
    setDistrictsError(null);
    try {
      const res = await fetch(getApiUrl('/api/public/districts'));
      if (res.ok) {
        const distData = await res.json();
        const rawDistricts: District[] = distData.districts || [];
        const activeOnly = rawDistricts.filter(
          (d) => d.is_active === undefined || Number(d.is_active) === 1 || d.is_active === true
        );
        setActiveDistricts(activeOnly);
      } else {
        setDistrictsError('Failed to load districts from server');
        setActiveDistricts([]);
      }
    } catch (err: any) {
      console.error('Error fetching public active districts:', err);
      setDistrictsError(err.message || 'Network error');
      setActiveDistricts([]);
    } finally {
      setDistrictsLoading(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [specRes, docRes] = await Promise.all([
          fetch(getApiUrl('/api/public/specialties')),
          fetch(getApiUrl('/api/public/doctors')),
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
    fetchActiveDistricts();
  }, []);

  const divisions = useMemo(() => {
    return groupDistrictsByDivision(activeDistricts);
  }, [activeDistricts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ search: searchTerm, specialty: selectedSpecialty, location: selectedLocation });
  };

  return (
    <div className="space-y-16 sm:space-y-20 pb-16 overflow-hidden">
      {/* 1. Carefinity 3D Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0A192F] via-[#0E2849] to-[#0A192F] text-white pt-10 sm:pt-14 pb-14 sm:pb-20 px-3 sm:px-6 lg:px-8">
        {/* Futuristic medical telemetry grid & ambient light orbs */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e3a5f_1px,transparent_1px),linear-gradient(to_bottom,#1e3a5f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
        <div className="absolute top-10 right-10 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto space-y-8">
          {/* Top Row: Left Content + Right 3D Visual */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center text-center lg:text-left">
            {/* Left Content Column */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 space-y-4 sm:space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[11px] sm:text-xs font-semibold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                <span className="truncate">{t('Carefinity Healthcare Booking Experience', 'সহজেই ডাক্তার দেখানোর সিরিয়াল নিন')}</span>
              </div>

              <motion.h1
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-snug sm:leading-tight"
              >
                {t('Book Doctor Chamber Serial', 'সহজেই ডাক্তার দেখানোর')} <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-sky-200">
                  {t('Without Standing in Crowded Queues', 'সিরিয়াল নিন ঘরে বসেই')}
                </span>
              </motion.h1>

              <motion.p
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-w-xl mx-auto lg:mx-0 text-slate-300 text-xs sm:text-base leading-relaxed"
              >
                {t(
                  'Select doctor, choose your preferred chamber and date, pick your exact serial number (e.g. Serial 03), and receive your unique Appointment ID instantly.',
                  'ডাক্তার ও চেম্বার পছন্দ করুন, তারিখ নির্বাচন করুন, নির্দিষ্ট সিরিয়াল বেছে নিন এবং সাথে সাথে নিশ্চিত অ্যাপয়েন্টমেন্ট আইডি পান।'
                )}
              </motion.p>

              {/* Action CTAs in Carefinity styling */}
              <motion.div
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1"
              >
                <motion.button
                  type="button"
                  whileHover={shouldReduceMotion ? {} : { scale: 1.04, y: -2 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                  onClick={() => onNavigate('doctors')}
                  className="px-5 sm:px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{t('Book Doctor Serial', 'ডাক্তারের সিরিয়াল নিন')}</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={shouldReduceMotion ? {} : { scale: 1.03, y: -1 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                  onClick={() => onNavigate('doctors')}
                  className="px-5 sm:px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs sm:text-sm backdrop-blur-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <Search className="w-4 h-4 text-cyan-300" />
                  <span>{t('Find Doctors', 'ডাক্তার খুঁজুন')}</span>
                </motion.button>
              </motion.div>

              {/* Real-time trust telemetry indicators */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>{t('100% BMDC Verified', 'বিএমডিসি ভেরিফাইড')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span>{t('Zero Waiting Queues', 'দীর্ঘ লাইনে না দাঁড়িয়ে')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <span>{t('Instant SMS & Ticket', 'তাৎক্ষণিক সিরিয়াল রসিদ')}</span>
                </div>
              </div>
            </motion.div>

            {/* Right 3D Medical Illustration Column */}
            <div className="lg:col-span-5 flex justify-center">
              <Hero3DVisual
                onPrimaryCta={() => onNavigate('doctors')}
                onSecondaryCta={() => onNavigate('doctors')}
                t={t}
              />
            </div>
          </div>

          {/* 2. Carefinity Doctor Search Dock (3D Glassmorphic Card) */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="max-w-4xl mx-auto mt-6 sm:mt-8 bg-white/95 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-2xl shadow-blue-950/20 border border-slate-200/90 text-slate-800 text-left relative z-20"
          >
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3">
              {/* Doctor Name / Query */}
              <div className="sm:col-span-4 relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('Doctor name, disease, or qualification...', 'ডাক্তারের নাম বা রোগ...')}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-hidden transition bg-white/90"
                />
              </div>

              {/* Specialty dropdown */}
              <div className="sm:col-span-3 relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-hidden transition bg-white/90"
                >
                  <option value="">{t('All Specialties', 'সকল বিভাগ')}</option>
                  {specialties.map((spec) => (
                    <option key={spec.id} value={spec.slug}>
                      {lang === 'bn' ? (spec.name_bn || spec.name) : spec.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location / District dropdown */}
              <div className="sm:col-span-3 relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <MapPin className="w-4 h-4" />
                </div>
                <select
                  value={selectedLocation}
                  onChange={(e) => {
                    if (districtsError) {
                      fetchActiveDistricts();
                    } else {
                      setSelectedLocation(e.target.value);
                    }
                  }}
                  disabled={districtsLoading}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-hidden transition bg-white/90 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {districtsLoading ? (
                    <option value="">{t('Loading active districts...', 'সক্রিয় জেলা লোড হচ্ছে...')}</option>
                  ) : districtsError ? (
                    <option value="">{t('Could not load districts (Click to retry)', 'জেলা লোড করা যায়নি (পুনরায় চেষ্টা করুন)')}</option>
                  ) : activeDistricts.length === 0 ? (
                    <option value="">{t('No active districts available', 'কোনো সক্রিয় জেলা উপলব্ধ নেই')}</option>
                  ) : (
                    <>
                      <option value="">{t('All Districts (Location)', 'সকল জেলা (লোকেশন)')}</option>
                      {divisions.map((division) => (
                        <optgroup
                          key={division.id}
                          label={lang === 'bn' ? `${division.name_bn} বিভাগ` : `${division.name} Division`}
                        >
                          {division.districts.map((d) => (
                            <option key={d.id} value={d.name}>
                              {lang === 'bn' ? d.name_bn : d.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Submit Button */}
              <div className="sm:col-span-2">
                <motion.button
                  type="submit"
                  whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                  className="w-full h-full min-h-[42px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-sm shadow-blue-600/30 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>{t('Search', 'খুঁজুন')}</span>
                </motion.button>
              </div>
            </form>

            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-slate-700 shrink-0">{t('Popular:', 'জনপ্রিয়:')}</span>
                {[
                  { name: 'Cardiology', name_bn: 'হৃদরোগ', slug: 'cardiology' },
                  { name: 'General Medicine', name_bn: 'সাধারণ চিকিৎসা', slug: 'general-medicine' },
                  { name: 'Pediatrics', name_bn: 'শিশু বিশেষজ্ঞ', slug: 'pediatrics' },
                  { name: 'Gynecology', name_bn: 'স্ত্রী ও প্রসূতি রোগ', slug: 'gynecology' },
                ].map((item) => (
                  <motion.button
                    key={item.slug}
                    type="button"
                    whileHover={shouldReduceMotion ? {} : { y: -1 }}
                    onClick={() => {
                      setSelectedSpecialty(item.slug);
                      onSearch({ search: '', specialty: item.slug, location: '' });
                    }}
                    className="hover:text-blue-600 underline decoration-slate-300 underline-offset-2 cursor-pointer font-medium"
                  >
                    {lang === 'bn' ? item.name_bn : item.name}
                  </motion.button>
                ))}
              </div>
              <span className="text-blue-600 font-medium flex items-center gap-1 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
                {t('Verified BMDC Doctors Only', 'শুধুমাত্র অনুমোদিত ডাক্তার')}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. Medical Specialties (Carefinity Staggered 3D Cards) */}
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
          <motion.button
            whileHover={shouldReduceMotion ? {} : { x: 2 }}
            onClick={() => onNavigate('doctors')}
            className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>{t('View All Doctors', 'সকল ডাক্তার দেখুন')}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Responsive Grid with 3D Tilt Hover and Staggered Viewport Entrance */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {(showAllSpecialties ? specialties : specialties.slice(0, 12)).map((spec, idx) => {
            const conf = getSpecialtyConfig(spec.slug, spec.name);
            const IconComp = conf.Icon;
            return (
              <motion.div
                key={spec.id}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: (idx % 4) * 0.08 }}
                whileHover={shouldReduceMotion ? {} : { y: -6, scale: 1.02 }}
                onClick={() => {
                  setSelectedSpecialty(spec.slug);
                  onSearch({ search: '', specialty: spec.slug, location: '' });
                }}
                className={`p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 ${conf.borderHover} hover:shadow-xl transition-all duration-300 group cursor-pointer text-center flex flex-col items-center justify-center min-h-[115px] sm:min-h-[140px]`}
              >
                <div className={`w-10 h-10 sm:w-13 sm:h-13 mx-auto rounded-xl sm:rounded-2xl ${conf.iconBg} flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-2xs mb-2 sm:mb-3`}>
                  <IconComp className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-blue-600 transition leading-snug line-clamp-1">
                  {lang === 'bn' ? (spec.name_bn || spec.name) : spec.name}
                </h3>
                {lang === 'bn' ? (
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 line-clamp-1 font-normal">
                    {spec.name}
                  </p>
                ) : (
                  spec.name_bn && (
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 line-clamp-1 font-normal">
                      {spec.name_bn}
                    </p>
                  )
                )}
              </motion.div>
            );
          })}
        </div>

        {/* View All / Show Less Specialties Toggle Button */}
        {specialties.length > 12 && (
          <div className="mt-8 text-center">
            <motion.button
              type="button"
              whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
              onClick={() => setShowAllSpecialties((prev) => !prev)}
              className="inline-flex items-center gap-2 px-6 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-400 text-slate-700 hover:text-blue-700 font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer group"
            >
              <span>
                {showAllSpecialties
                  ? t('Show Less', 'কম দেখান')
                  : t(`View All Specialties (${specialties.length})`, `সকল বিভাগ দেখুন (${specialties.length}টি)`)}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ${
                  showAllSpecialties ? 'rotate-180 text-blue-600' : 'text-slate-400 group-hover:text-blue-600'
                }`}
              />
            </motion.button>
          </div>
        )}
      </section>

      {/* 4. Carefinity 3D Booking Process Visualization */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BookingProcess3D t={t} onExploreDoctors={() => onNavigate('doctors')} />
      </section>

      {/* 5. Real-Time Platform Statistics (Carefinity Telemetry Counters) */}
      <AnimatedStats3D
        t={t}
        lang={lang}
        fallbackDoctorsCount={featuredDoctors.length}
        fallbackSpecialtiesCount={specialties.length}
      />

      {/* 6. Featured Approved Doctors with Carefinity 3D Depth Cards */}
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
            <motion.button
              whileHover={shouldReduceMotion ? {} : { x: 2 }}
              onClick={() => onNavigate('doctors')}
              className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>{t('Browse All Doctors', 'সব ডাক্তার')}</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredDoctors.map((doc) => (
              <DoctorCard3D
                key={doc.id}
                doctor={doc}
                lang={lang}
                t={t}
                onSelectDoctor={onSelectDoctor}
              />
            ))}
          </div>
        </section>
      )}

      {/* 7. Patient Testimonials (Carefinity 3D Slide Review Cards) */}
      <Testimonials3D t={t} lang={lang} />

      {/* 8. Carefinity-Inspired Official Android Mobile App Showcase Banner */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <DownloadApkButton variant="banner" />
        </motion.div>
      </section>
    </div>
  );
};
