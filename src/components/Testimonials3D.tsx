import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Star, Quote, ChevronLeft, ChevronRight, ShieldCheck, CheckCircle2, User } from 'lucide-react';

interface TestimonialsProps {
  t: (en: string, bn: string) => string;
  lang: 'en' | 'bn';
}

interface Review {
  id: number;
  nameEn: string;
  nameBn: string;
  locationEn: string;
  locationBn: string;
  doctorSpecialtyEn: string;
  doctorSpecialtyBn: string;
  serialBadge: string;
  rating: number;
  reviewEn: string;
  reviewBn: string;
  dateEn: string;
  dateBn: string;
}

const REVIEWS: Review[] = [
  {
    id: 1,
    nameEn: 'Md. Shafiqul Islam',
    nameBn: 'মোঃ শফিকুল ইসলাম',
    locationEn: 'Dhanmondi, Dhaka',
    locationBn: 'ধানমন্ডি, ঢাকা',
    doctorSpecialtyEn: 'Cardiology Specialist',
    doctorSpecialtyBn: 'কার্ডিওলজিস্ট সিরিয়াল',
    serialBadge: 'Serial #04 Confirmed',
    rating: 5,
    reviewEn: 'Booked serial 04 for Prof. Dr. Rahman. Reached the chamber 15 minutes before and did not have to stand in a queue at all. The compounder verified the Appointment ID on screen immediately.',
    reviewBn: 'অধ্যাপক ডা. রহমানের ০৪ নম্বর সিরিয়াল বুক করেছিলাম। চেম্বারে পৌঁছানোর পর দীর্ঘ লাইনে দাঁড়াতে হয়নি। কম্পাউন্ডার স্ক্রিনে অ্যাপয়েন্টমেন্ট আইডি দেখেই ডেকে নিয়েছিলেন। অসাধারণ সার্ভিস!',
    dateEn: 'Yesterday',
    dateBn: 'গতকাল',
  },
  {
    id: 2,
    nameEn: 'Farhana Akhter',
    nameBn: 'ফারহানা আক্তার',
    locationEn: 'Uttara, Dhaka',
    locationBn: 'উত্তরা, ঢাকা',
    doctorSpecialtyEn: 'Gynecology & Obstetrics',
    doctorSpecialtyBn: 'গাইনী ও প্রসূতি বিশেষজ্ঞ',
    serialBadge: 'Serial #07 Confirmed',
    rating: 5,
    reviewEn: 'As an expecting mother, waiting in crowded chamber rooms was exhausting. Daktar Serial solved this completely. I got instant SMS confirmation and my exact consultation slot.',
    reviewBn: 'প্রেগন্যান্সির সময় ঘণ্টার পর ঘণ্টা হাসপাতালে বসে থাকা অত্যন্ত কষ্টের ছিল। ডাক্তার সিরিয়াল প্ল্যাটফর্মে ঘরে বসেই নির্দিষ্ট সিরিয়াল পেয়েছি। সাথে সাথেই ডিজিটাল রসিদ পেয়ে গেছি।',
    dateEn: '3 days ago',
    dateBn: '৩ দিন আগে',
  },
  {
    id: 3,
    nameEn: 'Kamrul Hasan',
    nameBn: 'কামরুল হাসান',
    locationEn: 'Mirpur-10, Dhaka',
    locationBn: 'মিরপুর-১০, ঢাকা',
    doctorSpecialtyEn: 'Pediatric Specialist',
    doctorSpecialtyBn: 'শিশু বিশেষজ্ঞ সিরিয়াল',
    serialBadge: 'Serial #02 Confirmed',
    rating: 5,
    reviewEn: 'Took my 4-year-old son to the child specialist. Being able to choose Serial 02 saved us hours of distress. Transparent consultation fee and genuine BMDC verified doctor.',
    reviewBn: 'আমার ৪ বছরের ছেলের জন্য শিশু বিশেষজ্ঞের সিরিয়াল নিয়েছিলাম। ০২ নম্বর সিরিয়াল পাওয়ার কারণে খুব দ্রুত ডাক্তার দেখানো সম্ভব হয়েছে। কোনো মধ্যস্বত্বভোগী বা দালাল ছাড়া সরাসরি সেবা।',
    dateEn: '1 week ago',
    dateBn: '১ সপ্তাহ আগে',
  },
  {
    id: 4,
    nameEn: 'Nasima Begum',
    nameBn: 'নাসিমা বেগম',
    locationEn: 'Agrabad, Chattogram',
    locationBn: 'আগ্রাবাদ, চট্টগ্রাম',
    doctorSpecialtyEn: 'Orthopedics Specialist',
    doctorSpecialtyBn: 'অর্থোপেডিক বিশেষজ্ঞ',
    serialBadge: 'Serial #05 Confirmed',
    rating: 5,
    reviewEn: 'The digital serial slip with QR code was checked by the compounder in seconds. Payment was seamless and secure. Highly recommended for every family in Bangladesh.',
    reviewBn: 'ডিজিটাল সিরিয়াল রসিদ নিয়ে চেম্বারে গিয়ে খুব সহজে সেবা পেয়েছি। কোনো বাড়তি ঝামেলা নেই। বাংলাদেশের সকল পরিবারের জন্য এটি একটি নির্ভরযোগ্য স্বাস্থ্যসেবা মাধ্যম।',
    dateEn: '2 weeks ago',
    dateBn: '২ সপ্তাহ আগে',
  },
];

export const Testimonials3D: React.FC<TestimonialsProps> = ({ t, lang }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const current = REVIEWS[activeIndex];

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % REVIEWS.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + REVIEWS.length) % REVIEWS.length);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 6, y: -y * 6 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <section className="relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-2 shadow-2xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
            <span>{t('Patient Experiences', 'রোগীদের অভিজ্ঞতা')}</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
          >
            {t('What Patients Say About Chamber Booking', 'রোগীরা কেন ডাক্তার সিরিয়াল ব্যবহার করছেন')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xs sm:text-sm text-slate-500 mt-2"
          >
            {t(
              'Real feedback from patients who booked chamber serials and received consultations on time.',
              'চেম্বার সিরিয়াল বুক করে সরাসরি সেবা নেওয়া সাধারণ রোগীদের বাস্তব মতামত।'
            )}
          </motion.p>
        </div>

        {/* 3D Testimonial Presentation Card */}
        <div className="max-w-4xl mx-auto">
          <motion.div
            ref={cardRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            animate={{
              rotateY: isHovered && !shouldReduceMotion ? tilt.x : 0,
              rotateX: isHovered && !shouldReduceMotion ? tilt.y : 0,
              transformStyle: 'preserve-3d',
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative rounded-3xl bg-gradient-to-br from-white via-slate-50 to-blue-50/40 border border-slate-200/90 p-6 sm:p-10 shadow-xl shadow-slate-900/5 hover:shadow-2xl hover:border-blue-300 transition-all overflow-hidden"
          >
            <Quote className="absolute -top-4 -right-4 w-32 h-32 text-slate-100/80 -rotate-12 pointer-events-none" />

            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
                className="relative z-10 space-y-6"
              >
                {/* Header: Star Rating + Verified Chip */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(current.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs font-bold shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>{current.serialBadge}</span>
                  </span>
                </div>

                {/* Review Text */}
                <p className="text-sm sm:text-lg text-slate-700 leading-relaxed font-medium italic">
                  "{lang === 'bn' ? current.reviewBn : current.reviewEn}"
                </p>

                {/* Reviewer Details */}
                <div className="pt-4 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-600 text-white font-bold text-base flex items-center justify-center shadow-md shadow-blue-500/20">
                      {(lang === 'bn' ? current.nameBn : current.nameEn).charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                        {lang === 'bn' ? current.nameBn : current.nameEn}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {lang === 'bn' ? current.locationBn : current.locationEn} •{' '}
                        <span className="text-blue-600 font-semibold">
                          {lang === 'bn' ? current.doctorSpecialtyBn : current.doctorSpecialtyEn}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 transition shadow-xs cursor-pointer group"
                      aria-label="Previous review"
                    >
                      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    </button>

                    <div className="text-xs font-semibold text-slate-400 px-2 font-mono">
                      {activeIndex + 1} / {REVIEWS.length}
                    </div>

                    <button
                      type="button"
                      onClick={handleNext}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 transition shadow-xs cursor-pointer group"
                      aria-label="Next review"
                    >
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-2 mt-5">
            {REVIEWS.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  index === activeIndex ? 'w-6 bg-blue-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
