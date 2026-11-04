import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { UserCheck, Building2, Ticket, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

interface BookingProcess3DProps {
  t: (en: string, bn: string) => string;
  onExploreDoctors: () => void;
}

interface StepItemProps {
  num: string;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  shadow: string;
  badge: string;
  idx: number;
  t: (en: string, bn: string) => string;
}

const StepCard: React.FC<StepItemProps> = ({
  num,
  titleEn,
  titleBn,
  descEn,
  descBn,
  icon: Icon,
  gradient,
  shadow,
  idx,
  t,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 8, y: -y * 8 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: idx * 0.12 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateY: isHovered && !shouldReduceMotion ? tilt.x : 0,
        rotateX: isHovered && !shouldReduceMotion ? tilt.y : 0,
        y: isHovered && !shouldReduceMotion ? -6 : 0,
        transformStyle: 'preserve-3d',
      }}
      className="group relative rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs hover:shadow-2xl hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between z-10"
    >
      <div>
        {/* Top Bar: Icon + Step Number */}
        <div className="flex items-center justify-between mb-4">
          <div
            className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${gradient} text-white flex items-center justify-center shadow-md ${shadow} group-hover:scale-108 transition-transform duration-300`}
          >
            <Icon className="w-6 h-6" />
          </div>
          <span className="font-mono text-2xl font-black text-slate-200 group-hover:text-emerald-500 transition-colors">
            {num}
          </span>
        </div>

        <h3 className="font-extrabold text-slate-900 text-base sm:text-lg mb-1.5 group-hover:text-emerald-700 transition-colors">
          {t(titleEn, titleBn)}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          {t(descEn, descBn)}
        </p>
      </div>

      {/* Bottom Step Indicator */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-400 group-hover:text-emerald-600 transition-colors">
        <span>{t(`Step ${idx + 1}`, `ধাপ ${idx + 1}`)}</span>
        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.div>
  );
};

export const BookingProcess3D: React.FC<BookingProcess3DProps> = ({ t, onExploreDoctors }) => {
  const steps = [
    {
      num: '01',
      titleEn: 'Select Doctor',
      titleBn: 'ডাক্তার নির্বাচন করুন',
      descEn: 'Browse BMDC certified specialists by department, qualification, or city location.',
      descBn: 'বিভাগ, যোগ্যতা বা এলাকা অনুযায়ী অভিজ্ঞ ও সনদপ্রাপ্ত বিশেষজ্ঞ ডাক্তার বেছে নিন।',
      icon: UserCheck,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/25',
      badge: 'Step 1',
    },
    {
      num: '02',
      titleEn: 'Choose Chamber',
      titleBn: 'চেম্বার নির্বাচন করুন',
      descEn: 'Pick your convenient hospital or diagnostic consultation chamber and visit date.',
      descBn: 'আপনার সুবিধাজনক হাসপাতাল বা ডায়াগনস্টিক চেম্বার এবং সাক্ষাতের তারিখ পছন্দ করুন।',
      icon: Building2,
      gradient: 'from-teal-500 to-cyan-600',
      shadow: 'shadow-teal-500/25',
      badge: 'Step 2',
    },
    {
      num: '03',
      titleEn: 'Book Serial Slot',
      titleBn: 'সিরিয়াল বুক করুন',
      descEn: 'Select an available serial number (e.g. Serial 03). Real-time lock prevents double bookings.',
      descBn: 'উপলব্ধ সিরিয়াল নম্বর নির্বাচন করুন। তাৎক্ষণিক লক থাকায় অন্য কেউ একই স্লট নিতে পারবে না।',
      icon: Ticket,
      gradient: 'from-cyan-600 to-blue-600',
      shadow: 'shadow-blue-500/25',
      badge: 'Step 3',
    },
    {
      num: '04',
      titleEn: 'Complete Payment',
      titleBn: 'পেমেন্ট সম্পন্ন করুন',
      descEn: 'Pay the nominal ৳10 booking fee via bKash, Nagad or cards. Pay doctor fee at chamber.',
      descBn: 'অনলাইন সিরিয়াল ফি মাত্র ১০ টাকা পেমেন্টলি বা এমএফএস দিয়ে পরিশোধ করে রসিদ পান।',
      icon: CheckCircle2,
      gradient: 'from-blue-600 to-indigo-600',
      shadow: 'shadow-indigo-500/25',
      badge: 'Step 4',
    },
  ];

  return (
    <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="relative rounded-3xl bg-gradient-to-b from-slate-50/90 via-white to-emerald-50/40 border border-slate-200/80 p-6 sm:p-10 lg:p-12 shadow-xl shadow-slate-900/5 overflow-hidden">
        {/* Soft decorative glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold mb-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('Simple & Transparent Process', 'সহজ ও স্বচ্ছ ৪ ধাপ')}</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
          >
            {t('How Chamber Serial Booking Works', 'কীভাবে চেম্বার সিরিয়াল বুক করবেন')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed"
          >
            {t(
              'Follow 4 effortless steps to confirm your doctor appointment in under 2 minutes.',
              'মাত্র ৪টি সহজ ধাপে ঘরে বসেই ২ মিনিটের মধ্যে ডাক্তার চেম্বারের সিরিয়াল নিশ্চিত করুন।'
            )}
          </motion.p>
        </div>

        {/* Steps Grid with Animated Connection Bar */}
        <div className="relative">
          {/* Animated Connecting Pipeline for Desktop */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 -translate-y-8 h-1 bg-gradient-to-r from-emerald-300 via-teal-300 to-blue-400 rounded-full opacity-30 z-0 pointer-events-none" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 relative z-10">
            {steps.map((step, idx) => (
              <StepCard
                key={step.num}
                {...step}
                idx={idx}
                t={t}
              />
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 text-center relative z-10"
        >
          <button
            type="button"
            onClick={onExploreDoctors}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-slate-900/10 hover:shadow-lg transition-all cursor-pointer group"
          >
            <span>{t('Browse Doctors & Check Slots', 'ডাক্তারের তালিকা ও সিরিয়াল স্লট দেখুন')}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};
