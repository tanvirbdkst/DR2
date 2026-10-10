import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileText, ArrowLeft, Clock, Calendar, CheckCircle, Scale } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface PolicyPageProps {
  initialTab?: 'privacy' | 'terms';
  onNavigate?: (view: string) => void;
}

export const PolicyPage: React.FC<PolicyPageProps> = ({ initialTab = 'privacy', onNavigate }) => {
  const { t } = useAuth();
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [termsConditions, setTermsConditions] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    fetch('/api/public/site-settings')
      .then((res) => res.json())
      .then((json) => {
        if (json.privacy_policy) setPrivacyPolicy(json.privacy_policy);
        if (json.terms_conditions) setTermsConditions(json.terms_conditions);
      })
      .catch((err) => console.warn('Could not load site policies:', err))
      .finally(() => setLoading(false));
  }, []);

  const currentContent = activeTab === 'privacy' ? privacyPolicy : termsConditions;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in duration-300">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate?.('home')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('Back to Home', 'হোমে ফিরে যান')}</span>
        </button>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Doctor Serial Legal & Compliance</span>
        </span>
      </div>

      {/* Header and Tab Switcher */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5 text-emerald-600" />
            <span>Platform Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {activeTab === 'privacy' ? t('Privacy Policy', 'গোপনীয়তা নীতি') : t('Terms & Conditions', 'ব্যবহারের শর্তাবলী')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t(
              'Our policies ensure transparent patient privacy and professional doctor chamber compliance in Bangladesh.',
              'রোগীদের তথ্যের নিরাপত্তা ও নিয়মানুগ চেম্বার সিরিয়াল বুকিং সেবায় আমাদের অঙ্গীকার।'
            )}
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t('Privacy Policy', 'গোপনীয়তা নীতি')}</span>
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t('Terms & Conditions', 'ব্যবহারের শর্তাবলী')}</span>
          </button>
        </div>

        {/* Document Content */}
        {loading ? (
          <div className="py-12 flex items-center justify-center text-slate-400 gap-2">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Loading document...</span>
          </div>
        ) : (
          <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-sans">
            {currentContent || (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No policy content configured. Please update from the Admin Panel.
              </div>
            )}
          </div>
        )}

        {/* Footer info badge */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-slate-400 text-[11px] gap-2">
          <span>Doctor Serial Digital Chamber Platform • BMDC Physician Directory</span>
          <span className="text-emerald-700 font-semibold">Protected under Bangladesh Digital Security & Tele-Health Framework</span>
        </div>
      </div>
    </div>
  );
};
