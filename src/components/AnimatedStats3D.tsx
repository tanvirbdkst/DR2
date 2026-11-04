import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { Users, Stethoscope, Building2, CalendarCheck, ShieldCheck, Award } from 'lucide-react';
import { getApiUrl } from '../config/api.js';

interface StatsProps {
  t: (en: string, bn: string) => string;
  lang: 'en' | 'bn';
  fallbackDoctorsCount?: number;
  fallbackSpecialtiesCount?: number;
}

interface StatItemProps {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  labelEn: string;
  labelBn: string;
  suffix?: string;
  badgeEn?: string;
  badgeBn?: string;
  colorScheme: 'emerald' | 'teal' | 'cyan' | 'blue';
  lang: 'en' | 'bn';
  delay: number;
}

const NumberCounter: React.FC<{ value: number; duration?: number }> = ({ value, duration = 1.6 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isInView) return;
    if (shouldReduceMotion || value === 0) {
      setDisplayValue(value);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;

    const animateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easedProgress * value));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animateCount);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(animateCount);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isInView, value, duration, shouldReduceMotion]);

  return <span ref={ref}>{displayValue}</span>;
};

const StatCard: React.FC<StatItemProps> = ({
  icon: Icon,
  value,
  labelEn,
  labelBn,
  suffix = '+',
  badgeEn,
  badgeBn,
  colorScheme,
  lang,
  delay,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const colors = {
    emerald: {
      bg: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      border: 'border-emerald-200/80 hover:border-emerald-400',
      iconBg: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
      accent: 'text-emerald-600',
      shadow: 'hover:shadow-emerald-500/15',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    },
    teal: {
      bg: 'from-teal-500/10 via-teal-500/5 to-transparent',
      border: 'border-teal-200/80 hover:border-teal-400',
      iconBg: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white',
      accent: 'text-teal-600',
      shadow: 'hover:shadow-teal-500/15',
      badge: 'bg-teal-50 text-teal-700 border-teal-200/60',
    },
    cyan: {
      bg: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
      border: 'border-cyan-200/80 hover:border-cyan-400',
      iconBg: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white',
      accent: 'text-cyan-600',
      shadow: 'hover:shadow-cyan-500/15',
      badge: 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
    },
    blue: {
      bg: 'from-blue-500/10 via-blue-500/5 to-transparent',
      border: 'border-blue-200/80 hover:border-blue-400',
      iconBg: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
      accent: 'text-blue-600',
      shadow: 'hover:shadow-blue-500/15',
      badge: 'bg-blue-50 text-blue-700 border-blue-200/60',
    },
  }[colorScheme];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 10, y: -y * 10 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: delay * 0.12 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateY: isHovered && !shouldReduceMotion ? tilt.x : 0,
        rotateX: isHovered && !shouldReduceMotion ? tilt.y : 0,
        y: isHovered && !shouldReduceMotion ? -6 : 0,
        transformStyle: 'preserve-3d',
      }}
      className={`group relative rounded-2xl bg-white border ${colors.border} p-5 sm:p-6 shadow-xs ${colors.shadow} hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between`}
    >
      {/* 3D background gradient sheen */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center transition-all duration-300 shadow-2xs group-hover:scale-110`}>
            <Icon className="w-6 h-6" />
          </div>
          {badgeEn && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors.badge}`}>
              {lang === 'bn' ? (badgeBn || badgeEn) : badgeEn}
            </span>
          )}
        </div>

        <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-1">
          <NumberCounter value={value} />
          {value > 0 && <span className={colors.accent}>{suffix}</span>}
        </div>

        <h3 className="text-xs sm:text-sm font-semibold text-slate-700 mt-2 group-hover:text-slate-900 transition-colors">
          {lang === 'bn' ? labelBn : labelEn}
        </h3>
      </div>

      <div className="relative z-10 pt-3 mt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span className="truncate">{lang === 'bn' ? 'সরাসরি ডাটাবেস ভেরিফাইড' : 'Live Verified in System'}</span>
      </div>
    </motion.div>
  );
};

export const AnimatedStats3D: React.FC<StatsProps> = ({
  t,
  lang,
  fallbackDoctorsCount = 0,
  fallbackSpecialtiesCount = 0,
}) => {
  const [stats, setStats] = useState({
    doctors: fallbackDoctorsCount,
    specialties: fallbackSpecialtiesCount,
    chambers: 0,
    appointments: 0,
    coverageCities: 0,
  });

  useEffect(() => {
    fetch(getApiUrl('/api/public/stats'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setStats({
            doctors: data.doctors || fallbackDoctorsCount || 0,
            specialties: data.specialties || fallbackSpecialtiesCount || 0,
            chambers: data.chambers || 0,
            appointments: data.appointments || 0,
            coverageCities: data.coverageCities || 0,
          });
        }
      })
      .catch(() => {
        // Fallback gracefully without breaking
      });
  }, [fallbackDoctorsCount, fallbackSpecialtiesCount]);

  return (
    <section className="relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold mb-2 shadow-2xs"
          >
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('Real-Time Healthcare Impact', 'লাইভ প্ল্যাটফর্ম পরিসংখ্যান')}</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
          >
            {t('Trusted Chamber Care Across Bangladesh', 'সারাদেশে বিশ্বস্ত ডাক্তার চেম্বার নেটওয়ার্ক')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xs sm:text-sm text-slate-500 mt-2"
          >
            {t(
              'Real-time numbers directly from our verified doctor database and chamber consultation records.',
              'আমাদের অনুমোদিত ডাক্তার ডাটাবেস ও চেম্বার বুকিং রেকর্ড থেকে সরাসরি সংগৃহীত বাস্তব তথ্য।'
            )}
          </motion.p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            icon={Stethoscope}
            value={stats.doctors}
            labelEn="Verified Specialists"
            labelBn="অনুমোদিত বিশেষজ্ঞ ডাক্তার"
            badgeEn="BMDC"
            badgeBn="বিএমডিসি"
            colorScheme="emerald"
            lang={lang}
            delay={0}
          />
          <StatCard
            icon={Users}
            value={stats.specialties}
            labelEn="Medical Specialties"
            labelBn="মেডিকেল বিভাগ ও স্পেশালিটি"
            badgeEn="Departments"
            badgeBn="বিভাগসমূহ"
            colorScheme="teal"
            lang={lang}
            delay={1}
          />
          <StatCard
            icon={Building2}
            value={stats.chambers}
            labelEn="Partner Chambers"
            labelBn="হাসপাতাল ও কনসাল্টেশন চেম্বার"
            badgeEn="Active"
            badgeBn="সক্রিয়"
            colorScheme="cyan"
            lang={lang}
            delay={2}
          />
          <StatCard
            icon={CalendarCheck}
            value={stats.appointments}
            labelEn="Serials Booked"
            labelBn="মোট চেম্বার সিরিয়াল বুকিং"
            badgeEn="Confirmed"
            badgeBn="নিশ্চিত"
            colorScheme="blue"
            lang={lang}
            delay={3}
          />
        </div>
      </div>
    </section>
  );
};
