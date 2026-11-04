import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Building2, Award } from 'lucide-react';
import { DoctorProfile } from '../types.js';

interface DoctorCard3DProps {
  doctor: DoctorProfile;
  lang: 'en' | 'bn';
  t: (en: string, bn: string) => string;
  onSelectDoctor: (doctorId: number | string) => void;
}

export const DoctorCard3D: React.FC<DoctorCard3DProps> = ({
  doctor,
  lang,
  t,
  onSelectDoctor,
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateY: isHovered && !shouldReduceMotion ? tilt.x : 0,
        rotateX: isHovered && !shouldReduceMotion ? tilt.y : 0,
        y: isHovered && !shouldReduceMotion ? -6 : 0,
        transformStyle: 'preserve-3d',
      }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="group relative rounded-2xl bg-white border border-slate-200/90 p-5 shadow-xs hover:shadow-2xl hover:shadow-emerald-950/10 hover:border-emerald-300 transition-colors duration-300 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start gap-3 mb-3">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-100 shadow-2xs">
            <img
              src={doctor.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'}
              alt={doctor.name}
              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
              loading="lazy"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 flex-wrap">
              {doctor.specialties && doctor.specialties.length > 0 ? (
                doctor.specialties.map((s) => (
                  <span
                    key={s.id}
                    className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded"
                  >
                    {lang === 'bn' ? (s.name_bn || s.name) : s.name}
                  </span>
                ))
              ) : (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {lang === 'bn' ? (doctor.specialty_name_bn || doctor.specialty_name || 'বিশেষজ্ঞ') : (doctor.specialty_name || 'Specialist')}
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 text-sm mt-1 truncate group-hover:text-emerald-700 transition-colors">
              {doctor.title} {doctor.name}
            </h3>
            <p className="text-[11px] text-slate-500 truncate">BMDC: {doctor.bmdc_number}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 line-clamp-2 mb-3 min-h-[32px]">
          {doctor.qualification}
        </p>

        <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 truncate">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{doctor.chambers_list?.[0] || 'Active Chamber'}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 text-slate-600">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              {doctor.experience_years}+ years exp
            </span>
            <span className="font-extrabold text-slate-900">
              ৳{doctor.consultation_fee}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onSelectDoctor(doctor.slug || doctor.id)}
          className="w-full py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer text-center"
        >
          {t('Profile', 'প্রোফাইল')}
        </button>
        <button
          type="button"
          onClick={() => onSelectDoctor(doctor.slug || doctor.id)}
          className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/30 hover:shadow-md transition-all cursor-pointer text-center"
        >
          {t('Get Serial', 'সিরিয়াল নিন')}
        </button>
      </div>
    </motion.div>
  );
};
