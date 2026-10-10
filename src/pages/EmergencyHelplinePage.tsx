import React, { useState, useEffect } from 'react';
import { Phone, PhoneCall, ShieldAlert, Clock, MapPin, HeartPulse, AlertTriangle, ArrowLeft, Ambulance, Droplets, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface EmergencyContact {
  id: string;
  title: string;
  title_bn?: string;
  number: string;
  category?: string;
}

interface EmergencyData {
  hotline_number: string;
  national_emergency: string;
  ambulance_number: string;
  doctor_helpline: string;
  blood_bank_helpline: string;
  operating_hours: string;
  operating_hours_bn: string;
  address: string;
  address_bn: string;
  emergency_note: string;
  emergency_note_en: string;
  quick_contacts: EmergencyContact[];
}

const defaultEmergencyData: EmergencyData = {
  hotline_number: '09612-DAKTAR (09612-325827)',
  national_emergency: '999',
  ambulance_number: '199 / 01700-112233',
  doctor_helpline: '16263',
  blood_bank_helpline: '+880 1819-223344',
  operating_hours: '8:00 AM – 10:00 PM (Daily)',
  operating_hours_bn: 'সকাল ৮:০০ – রাত ১০:০০ (প্রতিদিন)',
  address: 'Dhanmondi, Dhaka-1205, Bangladesh',
  address_bn: 'ধানমন্ডি, ঢাকা-১২০৫, বাংলাদেশ',
  emergency_note: 'জরুরি ও সংকটজনক পরিস্থিতিতে অবিলম্বে নিকটস্থ জরুরি বিভাগে বা জাতীয় জরুরি সেবা ৯৯৯ এ যোগাযোগ করুন।',
  emergency_note_en: 'In life-threatening emergencies, immediately contact the nearest hospital emergency room or dial 999.',
  quick_contacts: [
    { id: '1', title: 'National Emergency Service (Police, Fire, Ambulance)', title_bn: 'জাতীয় জরুরি সেবা (পুলিশ, অ্যাম্বুলেন্স, ফায়ার)', number: '999', category: 'national' },
    { id: '2', title: 'Government Health Hotline (Shastho Batayan)', title_bn: 'সরকারি স্বাস্থ্য বাতায়ন হেল্পলাইন', number: '16263', category: 'health' },
    { id: '3', title: 'Daktar Serial Chamber Support', title_bn: 'ডাক্তার সিরিয়াল চেম্বার সাপোর্ট', number: '09612-325827', category: 'support' },
    { id: '4', title: 'Dhaka Medical College Emergency', title_bn: 'ঢাকা মেডিকেল জরুরি বিভাগ', number: '+880 2-55165088', category: 'hospital' },
    { id: '5', title: 'Central Red Crescent Blood Bank', title_bn: 'রেড ক্রিসেন্ট কেন্দ্রীয় ব্লাড ব্যাংক', number: '+880 2-9352226', category: 'blood' },
    { id: '6', title: '24/7 Ambulance Fleet Hotline', title_bn: '২৪/৭ সার্বক্ষণিক অ্যাম্বুলেন্স সার্ভিস', number: '+880 1711-000999', category: 'ambulance' }
  ]
};

export const EmergencyHelplinePage: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const { t, lang } = useAuth();
  const [data, setData] = useState<EmergencyData>(defaultEmergencyData);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/public/site-settings')
      .then((res) => res.json())
      .then((json) => {
        if (json.emergency) {
          setData(json.emergency);
        }
      })
      .catch((err) => console.warn('Could not load site emergency settings:', err));
  }, []);

  const handleCopy = (num: string) => {
    navigator.clipboard?.writeText(num.replace(/[^0-9+]/g, ''));
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in duration-300">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate?.('home')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('Back to Home', 'হোমে ফিরে যান')}</span>
        </button>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          {t('Emergency Assistance', 'জরুরি সহায়তা')}
        </span>
      </div>

      {/* Hero Alert Header */}
      <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
            <ShieldAlert className="w-4 h-4 text-rose-200" />
            <span>{t('Emergency & Helpline Center', 'জরুরী যোগাযোগ ও হেল্পলাইন')}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            {t('Immediate Medical Assistance & Hotlines', 'জরুরি চিকিৎসা সেবা ও হটলাইন')}
          </h1>
          <p className="text-sm sm:text-base text-rose-100 leading-relaxed font-medium">
            {lang === 'bn' ? data.emergency_note : (data.emergency_note_en || data.emergency_note)}
          </p>
        </div>
      </div>

      {/* Key Quick Call Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* National 999 */}
        <div className="bg-white rounded-2xl border-2 border-rose-200 p-5 shadow-xs hover:border-rose-400 transition relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">National Emergency</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
              999
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {t('Police, Ambulance & Fire Service (Toll-Free)', 'পুলিশ, অ্যাম্বুলেন্স ও ফায়ার সার্ভিস')}
          </p>
          <a
            href={`tel:${data.national_emergency || '999'}`}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call {data.national_emergency || '999'}</span>
          </a>
        </div>

        {/* Shastho Batayan 16263 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Health Helpline</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              16263
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {t('Govt 24/7 Doctor Medical Advice', 'স্বাস্থ্য বাতায়ন সার্বক্ষণিক ডাক্তার পরামর্শ')}
          </p>
          <a
            href={`tel:${data.doctor_helpline || '16263'}`}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call {data.doctor_helpline || '16263'}</span>
          </a>
        </div>

        {/* Chamber Hotline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Chamber Support</span>
            <Phone className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xs text-slate-500 mb-4 truncate font-mono font-medium">
            {data.hotline_number}
          </p>
          <a
            href={`tel:${data.hotline_number.replace(/[^0-9+]/g, '')}`}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
          >
            <PhoneCall className="w-4 h-4" />
            <span>{t('Call Chamber Hotline', 'হটলাইনে কল করুন')}</span>
          </a>
        </div>

        {/* Ambulance Hotline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Ambulance Service</span>
            <Ambulance className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs text-slate-500 mb-4 truncate font-medium">
            {data.ambulance_number}
          </p>
          <a
            href={`tel:${data.ambulance_number.replace(/[^0-9+]/g, '')}`}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
          >
            <PhoneCall className="w-4 h-4" />
            <span>{t('Request Ambulance', 'অ্যাম্বুলেন্স কল করুন')}</span>
          </a>
        </div>
      </div>

      {/* Directory of Emergency Contacts */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {t('Directory of Emergency Services', 'জরুরি সেবাসমূহের তালিকা')}
            </h2>
            <p className="text-xs text-slate-500">
              {t('Verified contact numbers configured by Doctor Serial Platform', 'ডাক্তার সিরিয়াল প্ল্যাটফর্ম কর্তৃক পরিচালিত জরুরি নম্বরসমূহ')}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'bn' ? data.operating_hours_bn || data.operating_hours : data.operating_hours}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'bn' ? data.address_bn || data.address : data.address}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {data.quick_contacts && data.quick_contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 transition"
            >
              <div className="space-y-1 pr-3">
                <p className="text-xs font-bold text-slate-800">
                  {lang === 'bn' && c.title_bn ? c.title_bn : c.title}
                </p>
                <p className="text-xs font-mono font-semibold text-emerald-700">
                  {c.number}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(c.number)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-600 cursor-pointer"
                >
                  {copiedNumber === c.number ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Copied
                    </span>
                  ) : (
                    'Copy'
                  )}
                </button>
                <a
                  href={`tel:${c.number.replace(/[^0-9+]/g, '')}`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Call</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guidelines Box */}
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 space-y-3">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{t('When to Visit the Emergency Department Immediately', 'কখন অবিলম্বে জরুরি বিভাগে যাবেন?')}</span>
        </div>
        <ul className="text-xs text-amber-950 space-y-1.5 list-disc list-inside">
          <li>{t('Severe chest pain or difficulty breathing', 'তীব্র বুকে ব্যথা বা শ্বাসকষ্ট অনুভব হওয়া')}</li>
          <li>{t('Sudden weakness, numbness, or difficulty speaking (signs of stroke)', 'হঠাৎ মুখ বেঁকে যাওয়া, কথা জড়িয়ে যাওয়া বা শরীরের একপাশ অবশ হওয়া')}</li>
          <li>{t('Severe trauma, uncontrolled bleeding, or deep wound injury', 'মারাত্মক দুর্ঘটনা, অতিরিক্ত রক্তক্ষরণ বা গভীর ক্ষত')}</li>
          <li>{t('Sudden loss of consciousness or convulsions', 'হঠাৎ অজ্ঞান হয়ে যাওয়া বা তীব্র খিঁচুনি')}</li>
        </ul>
      </div>
    </div>
  );
};
