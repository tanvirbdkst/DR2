import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Stethoscope, Heart, Calendar, Hospital, ShieldCheck, Sparkles, Activity, Plus } from 'lucide-react';
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

  // 3D Parallax angle calculations with Carefinity smooth responsiveness
  const rotateX = isHovered && !isMobile && !shouldReduceMotion ? -mousePos.y * 14 : 0;
  const rotateY = isHovered && !isMobile && !shouldReduceMotion ? mousePos.x * 14 : 0;

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-lg lg:max-w-xl mx-auto select-none"
      style={{ perspective: '1200px' }}
    >
      {/* Continuous gentle floating motion in 3D space */}
      <motion.div
        animate={
          shouldReduceMotion
            ? { rotateX, rotateY }
            : {
                rotateX,
                rotateY,
                y: isHovered ? -4 : [-4, 6, -4],
                transformStyle: 'preserve-3d',
              }
        }
        transition={
          shouldReduceMotion
            ? { type: 'spring', damping: 20, stiffness: 120 }
            : {
                y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
                rotateX: { type: 'spring', damping: 20, stiffness: 120 },
                rotateY: { type: 'spring', damping: 20, stiffness: 120 },
              }
        }
        className="relative rounded-3xl p-3 sm:p-5 bg-gradient-to-b from-white/95 via-white/85 to-blue-50/70 backdrop-blur-md border border-white/90 shadow-2xl shadow-blue-950/20"
      >
        {/* Soft Ambient Carefinity Glow in 3D space */}
        <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/20 via-cyan-400/25 to-sky-300/20 rounded-3xl blur-2xl -z-10 pointer-events-none" />

        {/* Floating 3D Badge: Live Serial with animated electric cyan pulse */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  y: [-4, 5, -4],
                  rotateZ: [-1, 1.2, -1],
                }
          }
          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-3 sm:-top-5 -left-2 sm:-left-4 z-20 flex items-center gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl shadow-blue-900/10 border border-blue-100 text-slate-800 pointer-events-none"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-xs">
            <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold text-blue-950 tracking-tight leading-tight">
              {t('Live Serial', 'লাইভ সিরিয়াল')}
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
          transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          className="absolute -bottom-3 sm:-bottom-4 -right-2 sm:-right-4 z-20 flex items-center gap-2.5 px-3.5 sm:px-4 py-2 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl shadow-blue-900/10 border border-cyan-100 text-slate-800 text-xs sm:text-sm font-semibold pointer-events-none"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-cyan-700 font-bold leading-tight">
              {t('BMDC Verified', 'বিএমডিসি ভেরিফাইড')}
            </span>
            <span className="text-xs font-extrabold text-slate-900 leading-tight">
              {t('100% Genuine Doctors', '১০০% নিবন্ধিত ডাক্তার')}
            </span>
          </div>
        </motion.div>

        {/* Floating 3D Cardiac Vital Telemetry Orb */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  y: [-7, 5, -7],
                  x: [2, -2, 2],
                }
          }
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 -right-4 sm:-right-6 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-white shadow-xl shadow-cyan-500/20 border border-cyan-100 flex items-center justify-center text-cyan-600 pointer-events-none"
        >
          <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600 animate-pulse" />
        </motion.div>

        {/* Floating 3D Stethoscope Orb */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  y: [6, -6, 6],
                  x: [-3, 3, -3],
                }
          }
          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          className="absolute bottom-1/4 -left-4 sm:-left-5 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white shadow-xl shadow-blue-500/20 border border-blue-100 flex items-center justify-center text-blue-600 pointer-events-none"
        >
          <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6" />
        </motion.div>

        {/* Main 3D Artwork Frame */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-slate-100/90 via-white to-blue-50/50 border border-slate-200/60 shadow-inner">
          <img
            src={doctor3dImage}
            alt="Carefinity 3D Medical Hero - Daktar Serial"
            className="w-full h-auto object-cover object-center transform transition-transform duration-500 group-hover:scale-102"
            loading="eager"
            width={640}
            height={360}
          />

          {/* Bottom subtle gradient shadow inside artwork */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/10 to-transparent pointer-events-none" />
        </div>
      </motion.div>
    </div>
  );
};
