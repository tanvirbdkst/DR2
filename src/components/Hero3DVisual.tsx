import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Stethoscope, Heart, Calendar, Hospital, ShieldCheck, Sparkles, Plus, Clock } from 'lucide-react';
import doctor3dImage from '../assets/images/hero_3d_doctor_1793815477088.jpg';

interface Hero3DVisualProps {
  onPrimaryCta: () => void;
  onSecondaryCta: () => void;
  t: (en: string, bn: string) => string;
}

export const Hero3DVisual: React.FC<Hero3DVisualProps> = ({ onPrimaryCta, onSecondaryCta, t }) => {
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile || shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  };

  // Parallax calculations
  const rotateX = isHovered && !isMobile && !shouldReduceMotion ? -mousePos.y * 14 : 0;
  const rotateY = isHovered && !isMobile && !shouldReduceMotion ? mousePos.x * 14 : 0;

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-lg lg:max-w-xl mx-auto perspective-1000 select-none"
      style={{ perspective: '1200px' }}
    >
      {/* Dynamic 3D depth container */}
      <motion.div
        animate={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
        className="relative rounded-3xl p-3 sm:p-5 bg-gradient-to-b from-white/90 via-white/80 to-emerald-50/70 backdrop-blur-md border border-white/80 shadow-2xl shadow-emerald-950/20"
      >
        {/* Soft Ambient Glow in 3D space */}
        <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/15 via-teal-400/20 to-sky-400/15 rounded-3xl blur-2xl -z-10 pointer-events-none" />

        {/* Floating 3D Badge: Instant Chamber Serial */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  y: [-4, 6, -4],
                  rotateZ: [-1, 1.5, -1],
                }
          }
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-3 sm:-top-5 -left-2 sm:-left-4 z-20 flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg shadow-emerald-900/10 border border-emerald-100 text-slate-800 text-xs sm:text-sm font-semibold pointer-events-none"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
            <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-emerald-700 font-bold leading-tight">
              {t('Live Serial', 'লাইভ সিরিয়াল')}
            </span>
            <span className="text-xs sm:text-xs font-extrabold text-slate-900 leading-tight">
              {t('Serial #03 Reserved', 'সিরিয়াল ০৩ সংরক্ষিত')}
            </span>
          </div>
        </motion.div>

        {/* Floating 3D Badge: Verified BMDC Doctor */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  y: [5, -5, 5],
                  rotateZ: [1, -1, 1],
                }
          }
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute -bottom-3 sm:-bottom-4 -right-2 sm:-right-4 z-20 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg shadow-emerald-900/10 border border-teal-100 text-slate-800 text-xs sm:text-sm font-semibold pointer-events-none"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-teal-700 font-bold leading-tight">
              {t('BMDC Verified', 'বিএমডিসি ভেরিফাইড')}
            </span>
            <span className="text-xs font-extrabold text-slate-900 leading-tight">
              {t('100% Genuine Doctors', '১০০% নিবন্ধিত ডাক্তার')}
            </span>
          </div>
        </motion.div>

        {/* Floating Medical 3D Icon Orbs */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  y: [-8, 4, -8],
                  x: [2, -2, 2],
                }
          }
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 -right-4 sm:-right-6 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white shadow-xl shadow-rose-500/20 border border-rose-100 flex items-center justify-center text-rose-500 pointer-events-none"
        >
          <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-rose-500 text-rose-500" />
        </motion.div>

        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  y: [6, -6, 6],
                  x: [-3, 3, -3],
                }
          }
          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-1/4 -left-4 sm:-left-5 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-white shadow-xl shadow-teal-500/20 border border-teal-100 flex items-center justify-center text-teal-600 pointer-events-none"
        >
          <Stethoscope className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" />
        </motion.div>

        {/* Main 3D Artwork Frame */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-slate-100/80 via-white to-emerald-50/50 border border-slate-200/60 shadow-inner">
          <img
            src={doctor3dImage}
            alt="3D Medical Illustration - Daktar Serial Doctor"
            className="w-full h-auto object-cover object-center transform transition-transform duration-500 group-hover:scale-102"
            loading="eager"
            width={640}
            height={360}
          />

          {/* Bottom subtle overlay shadow inside artwork */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/10 to-transparent pointer-events-none" />
        </div>
      </motion.div>
    </div>
  );
};
