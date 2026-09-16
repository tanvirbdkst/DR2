import React from 'react';
import { CheckCircle2, Calendar, Clock, MapPin, Building2, User, Printer, ArrowRight, ShieldCheck, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface BookingConfirmationPageProps {
  bookingData: {
    message?: string;
    serialNumber: string;
    appointmentId: string;
    details: {
      doctorName: string;
      chamberName: string;
      chamberAddress: string;
      scheduleDate: string;
      appointmentTime: string;
      consultationFee: number;
      patientName: string;
      patientPhone: string;
      status: string;
    };
  };
  onGoToDashboard: () => void;
  onBookAnother: () => void;
}

export const BookingConfirmationPage: React.FC<BookingConfirmationPageProps> = ({
  bookingData,
  onGoToDashboard,
  onBookAnother,
}) => {
  const { t } = useAuth();
  const { serialNumber, appointmentId, details } = bookingData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden print:shadow-none print:border-none">
        {/* Confirmed Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 sm:p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto text-white">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Appointment Confirmed
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm max-w-md mx-auto">
            Your chamber serial has been secured in the system. Please present this ticket at the doctor chamber reception.
          </p>
        </div>

        {/* Big Serial Number & ID Badge */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-6 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Your Confirmed Serial
            </span>
            <div className="text-5xl sm:text-6xl font-black text-emerald-800 tracking-tight my-1">
              {serialNumber}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-300 shadow-xs text-xs font-mono font-bold text-slate-800">
              <span>Appointment ID:</span>
              <span className="text-emerald-700 font-extrabold">{appointmentId}</span>
            </div>
          </div>

          {/* Ticket Details Grid */}
          <div className="space-y-4 text-xs sm:text-sm border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase">{t('Doctor', 'ডাক্তার')}</p>
                <p className="text-slate-900 font-bold text-base mt-0.5">{details.doctorName}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase">{t('Patient', 'রোগী')}</p>
                <p className="text-slate-900 font-bold mt-0.5">{details.patientName}</p>
                <p className="text-slate-500 text-xs">{details.patientPhone}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase">{t('Date & Time', 'তারিখ ও সময়')}</p>
                <p className="text-slate-900 font-bold mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{details.scheduleDate}</span>
                </p>
                <p className="text-slate-600 text-xs flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Estimated Slot: {details.appointmentTime}</span>
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase">{t('Consultation Fee', 'ভিজিট ফি')}</p>
                <p className="text-slate-900 font-bold text-base text-emerald-700 mt-0.5">
                  ৳{details.consultationFee}
                </p>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                  Pay at Chamber Reception
                </span>
              </div>
            </div>

            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase">{t('Chamber Address', 'চেম্বারের ঠিকানা')}</p>
              <p className="text-slate-900 font-bold mt-0.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{details.chamberName}</span>
              </p>
              <p className="text-slate-600 text-xs mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{details.chamberAddress}</span>
              </p>
            </div>
          </div>

          {/* Verification info note */}
          <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Serial slot authenticated & locked in database</span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 print:hidden">
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onGoToDashboard}
              className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <span>View in Patient Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onBookAnother}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
            >
              Book Another
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
