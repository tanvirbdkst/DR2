import React, { useState, useEffect } from 'react';
import { Home, Search, CalendarCheck, PhoneCall, User as UserIcon, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { HomePage } from './pages/HomePage.js';
import { DoctorsPage } from './pages/DoctorsPage.js';
import { DoctorProfilePage } from './pages/DoctorProfilePage.js';
import { BookingConfirmationPage } from './pages/BookingConfirmationPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPatientPage } from './pages/RegisterPatientPage.js';
import { RegisterDoctorPage } from './pages/RegisterDoctorPage.js';
import { PatientDashboardPage } from './pages/PatientDashboardPage.js';
import { DoctorDashboardPage } from './pages/DoctorDashboardPage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';
import { CompounderDashboardPage } from './pages/CompounderDashboardPage.js';
import { EmergencyHelplinePage } from './pages/EmergencyHelplinePage.js';
import { PolicyPage } from './pages/PolicyPage.js';
import { setupBackButtonHandler } from './services/capacitorService.js';
import { initializePushNotifications } from './services/notificationService.js';

function parseRouteFromUrl(): { view: string; doctorSlugOrId: string | null } {
  if (typeof window === 'undefined') return { view: 'home', doctorSlugOrId: null };
  const path = window.location.pathname;
  const hash = window.location.hash;

  // Check /doctor/:slugOrId, /doctor-profile/:slugOrId or hash format #/doctor/:slugOrId
  const doctorMatch =
    path.match(/^\/doctor(?:-profile)?\/([^/?#]+)/i) ||
    hash.match(/#\/?doctor(?:-profile)?\/([^/?#]+)/i);

  if (doctorMatch && doctorMatch[1]) {
    return {
      view: 'doctor-profile',
      doctorSlugOrId: decodeURIComponent(doctorMatch[1]),
    };
  }

  const pathLower = path.toLowerCase();
  const hashLower = hash.toLowerCase();

  if (pathLower.includes('/emergency') || hashLower.includes('emergency')) return { view: 'emergency', doctorSlugOrId: null };
  if (pathLower.includes('/privacy') || hashLower.includes('privacy')) return { view: 'privacy', doctorSlugOrId: null };
  if (pathLower.includes('/terms') || hashLower.includes('terms')) return { view: 'terms', doctorSlugOrId: null };
  if (pathLower.includes('/admin') || hashLower.includes('admin')) return { view: 'admin-dashboard', doctorSlugOrId: null };
  if (pathLower.includes('/compounder') || hashLower.includes('compounder')) return { view: 'compounder-dashboard', doctorSlugOrId: null };
  if (pathLower.includes('/doctor-dashboard') || hashLower.includes('doctor-dashboard')) return { view: 'doctor-dashboard', doctorSlugOrId: null };
  if (pathLower.includes('/patient-dashboard') || hashLower.includes('patient-dashboard')) return { view: 'patient-dashboard', doctorSlugOrId: null };
  if (pathLower.includes('/doctors') || hashLower.includes('doctors')) return { view: 'doctors', doctorSlugOrId: null };
  if (pathLower.includes('/login') || hashLower.includes('login')) return { view: 'login', doctorSlugOrId: null };
  if (pathLower.includes('/register-patient') || hashLower.includes('register-patient')) return { view: 'register-patient', doctorSlugOrId: null };
  if (pathLower.includes('/register-doctor') || hashLower.includes('register-doctor')) return { view: 'register-doctor', doctorSlugOrId: null };

  return { view: 'home', doctorSlugOrId: null };
}

function MainApp() {
  const { user } = useAuth();
  const initialRoute = parseRouteFromUrl();
  const [currentView, setCurrentView] = useState<string>(initialRoute.view);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | number | null>(initialRoute.doctorSlugOrId);
  const selectedDoctorSlugOrId = selectedDoctorId;
  const setSelectedDoctorSlugOrId = setSelectedDoctorId;
  const [searchFilters, setSearchFilters] = useState<{ search: string; specialty: string; location: string }>({
    search: '',
    specialty: '',
    location: '',
  });
  const [lastBookingData, setLastBookingData] = useState<any>(null);
  const [paymentNotice, setPaymentNotice] = useState<{ type: 'success' | 'error' | 'warning'; message: string; messageBn: string } | null>(null);

  // Handle Paymently gateway redirection return (success, cancelled, failed)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchStr = window.location.search;
    if (!searchStr) return;

    const urlParams = new URLSearchParams(searchStr);
    const paymentStatus = urlParams.get('payment_status');
    const appointmentId = urlParams.get('appointment_id');
    const txn = urlParams.get('txn');
    const reason = urlParams.get('reason');

    if (!paymentStatus) return;

    if (paymentStatus === 'success' && appointmentId) {
      // Fetch confirmed appointment and verified payment details
      Promise.all([
        fetch(`/api/appointments/details/${encodeURIComponent(appointmentId)}`).then((r) => (r.ok ? r.json() : null)),
        txn ? fetch(`/api/payments/status/${encodeURIComponent(txn)}`).then((r) => (r.ok ? r.json() : null)) : Promise.resolve(null),
      ])
        .then(([apptData, pmtData]) => {
          if (apptData?.appointment) {
            const appt = apptData.appointment;
            setLastBookingData({
              message: 'Appointment Confirmed & Booking Fee Paid',
              serialNumber: appt.serial_number < 10 ? `0${appt.serial_number}` : `${appt.serial_number}`,
              appointmentId: appt.appointment_id,
              paymentStatus: 'paid',
              bookingFee: 10,
              transactionRef: txn || appt.transaction_ref,
              paymentMethod: pmtData?.paymentMethod || appt.payment_method || 'Paymently MFS',
              details: {
                doctorName: appt.doctor_name,
                chamberName: appt.chamber_name,
                chamberAddress: appt.chamber_address,
                scheduleDate: appt.schedule_date,
                appointmentTime: appt.appointment_time,
                consultationFee: appt.fee,
                patientName: appt.patient_name,
                patientPhone: appt.patient_phone,
                status: appt.status,
              },
            });
            setCurrentView('booking-confirmed');
            setPaymentNotice({
              type: 'success',
              message: 'Payment verified! Your serial booking has been confirmed successfully.',
              messageBn: 'পেমেন্ট সফলভাবে যাচাই হয়েছে! আপনার সিরিয়াল বুকিং নিশ্চিত করা হয়েছে।',
            });
          }
        })
        .catch((err) => {
          console.error('Failed to load verified appointment:', err);
        });
    } else if (paymentStatus === 'cancelled') {
      setPaymentNotice({
        type: 'warning',
        message: 'Payment cancelled. Your temporary serial reservation was released.',
        messageBn: 'পেমেন্ট বাতিল করা হয়েছে। আপনার সাময়িক সিরিয়াল স্লটটি মুক্ত করে দেওয়া হয়েছে।',
      });
    } else if (paymentStatus === 'failed') {
      setPaymentNotice({
        type: 'error',
        message: `Payment could not be completed${reason ? `: ${reason}` : ''}. Please select a serial and try again.`,
        messageBn: 'পেমেন্ট সম্পন্ন করা সম্ভব হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
      });
    }

    // Clean query parameters from address bar without page reload
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      const detected = parseRouteFromUrl();
      if (detected.view !== currentView) {
        setCurrentView(detected.view);
      }
      if (detected.doctorSlugOrId) {
        setSelectedDoctorId(detected.doctorSlugOrId);
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [currentView]);

  const handleNavigate = (view: string, customParam?: string) => {
    setCurrentView(view);
    try {
      if (view === 'home') {
        window.history.pushState({}, '', '/');
      } else if (view === 'admin-dashboard') {
        window.history.pushState({}, '', '/admin');
      } else if (view === 'compounder-dashboard') {
        window.history.pushState({}, '', '/compounder');
      } else if (view === 'doctor-profile' && (customParam || selectedDoctorId)) {
        const idOrSlug = customParam || selectedDoctorId;
        window.history.pushState({}, '', `/doctor/${idOrSlug}`);
      } else {
        window.history.pushState({}, '', `/${view}`);
      }
    } catch {
      // Fallback if pushState fails
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    // 1. Initialize FCM Push Notifications safely after UI loads (if on native device and already granted)
    const timer = setTimeout(() => {
      initializePushNotifications();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 2. Hardware Android Back Button Navigation
    const cleanup = setupBackButtonHandler(() => {
      if (currentView !== 'home') {
        if (currentView === 'doctor-profile') {
          handleNavigate('doctors');
        } else {
          handleNavigate('home');
        }
        return true;
      }
      return false; // Exit app if already at home
    });

    return cleanup;
  }, [currentView]);

  // A compounder is confined to their own panel: they must never land on the
  // admin, doctor, or patient dashboards (server-side guards back this up too).
  useEffect(() => {
    if (user?.role === 'compounder' && currentView !== 'compounder-dashboard') {
      const forbidden = ['admin-dashboard', 'doctor-dashboard', 'patient-dashboard'];
      if (forbidden.includes(currentView)) {
        handleNavigate('compounder-dashboard');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentView]);

  const handleSearchFromHome = (filters: { search: string; specialty: string; location: string }) => {
    setSearchFilters(filters);
    handleNavigate('doctors');
  };

  const handleSelectDoctor = (doctorIdentifier: number | string) => {
    setSelectedDoctorId(doctorIdentifier);
    handleNavigate('doctor-profile', String(doctorIdentifier));
  };

  const handleBookingSuccess = (bookingData: any) => {
    setLastBookingData(bookingData);
    handleNavigate('booking-confirmed');
  };

  const handleLoginSuccess = (role: string) => {
    if (role === 'admin') {
      handleNavigate('admin-dashboard');
    } else if (role === 'doctor') {
      handleNavigate('doctor-dashboard');
    } else if (role === 'compounder') {
      handleNavigate('compounder-dashboard');
    } else {
      handleNavigate('patient-dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      <Navbar
        currentView={currentView}
        setCurrentView={handleNavigate}
      />

      {paymentNotice && (
        <aside aria-label="Payment Status Notification" className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4 animate-in fade-in duration-200">
          <div
            className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-medium border shadow-xs ${
              paymentNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : paymentNotice.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {paymentNotice.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className={`w-5 h-5 shrink-0 ${paymentNotice.type === 'warning' ? 'text-amber-600' : 'text-rose-600'}`} />
              )}
              <span className="leading-snug">{paymentNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setPaymentNotice(null)}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-800 transition shrink-0 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 pb-16 md:pb-0">
        {currentView === 'home' && (
          <HomePage
            onSearch={handleSearchFromHome}
            onSelectDoctor={handleSelectDoctor}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'doctors' && (
          <DoctorsPage
            initialFilters={searchFilters}
            onSelectDoctor={handleSelectDoctor}
          />
        )}

        {currentView === 'doctor-profile' && selectedDoctorId ? (
          <DoctorProfilePage
            doctorId={selectedDoctorId}
            onBack={() => handleNavigate('doctors')}
            onBookingSuccess={handleBookingSuccess}
          />
        ) : currentView === 'doctor-profile' ? (
          <DoctorsPage
            initialFilters={searchFilters}
            onSelectDoctor={handleSelectDoctor}
          />
        ) : null}

        {currentView === 'booking-confirmed' && (
          lastBookingData ? (
            <BookingConfirmationPage
              bookingData={lastBookingData}
              onGoToDashboard={() => handleNavigate('patient-dashboard')}
              onBookAnother={() => handleNavigate('doctors')}
            />
          ) : (
            <DoctorsPage
              initialFilters={searchFilters}
              onSelectDoctor={handleSelectDoctor}
            />
          )
        )}

        {currentView === 'login' && (
          <LoginPage
            onSuccess={handleLoginSuccess}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'register-patient' && (
          <RegisterPatientPage
            onSuccess={() => handleNavigate('patient-dashboard')}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'register-doctor' && (
          <RegisterDoctorPage
            onSuccess={() => handleNavigate('doctor-dashboard')}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'patient-dashboard' && (
          <PatientDashboardPage
            onFindDoctor={() => handleNavigate('doctors')}
          />
        )}

        {currentView === 'doctor-dashboard' && (
          <DoctorDashboardPage />
        )}

        {currentView === 'compounder-dashboard' && (
          <CompounderDashboardPage onNavigate={handleNavigate} />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboardPage onNavigate={handleNavigate} />
        )}

        {currentView === 'emergency' && (
          <EmergencyHelplinePage onNavigate={handleNavigate} />
        )}

        {(currentView === 'privacy' || currentView === 'terms') && (
          <PolicyPage
            initialTab={currentView === 'terms' ? 'terms' : 'privacy'}
            onNavigate={handleNavigate}
          />
        )}

        {/* Fallback to HomePage if view is unmatched */}
        {!['home', 'doctors', 'doctor-profile', 'booking-confirmed', 'login', 'register-patient', 'register-doctor', 'patient-dashboard', 'doctor-dashboard', 'admin-dashboard', 'compounder-dashboard', 'emergency', 'privacy', 'terms'].includes(currentView) && (
          <HomePage
            onSearch={handleSearchFromHome}
            onSelectDoctor={handleSelectDoctor}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      <Footer onNavigate={handleNavigate} />

      {/* Mobile Bottom Navigation Bar (compact mobile thumb navigation) */}
      {currentView !== 'doctor-profile' && (
        <nav
          aria-label="Mobile Navigation"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 md:hidden shadow-lg pb-safe flex items-center justify-around"
        >
          <button
            onClick={() => handleNavigate('home')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer ${
              currentView === 'home' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">হোম</span>
          </button>

          <button
            onClick={() => handleNavigate('doctors')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer ${
              currentView === 'doctors' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">ডাক্তার</span>
          </button>

          <button
            onClick={() => {
              if (!user) {
                handleNavigate('login');
              } else if (user.role === 'patient') {
                handleNavigate('patient-dashboard');
              } else if (user.role === 'doctor') {
                handleNavigate('doctor-dashboard');
              } else if (user.role === 'compounder') {
                handleNavigate('compounder-dashboard');
              } else {
                handleNavigate('admin-dashboard');
              }
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer ${
              ['patient-dashboard', 'doctor-dashboard', 'compounder-dashboard', 'admin-dashboard'].includes(currentView)
                ? 'text-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">সিরিয়াল</span>
          </button>

          <button
            onClick={() => handleNavigate('emergency')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer ${
              currentView === 'emergency' ? 'text-rose-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <PhoneCall className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">জরুরি</span>
          </button>

          <button
            onClick={() => {
              if (user) {
                if (user.role === 'patient') handleNavigate('patient-dashboard');
                else if (user.role === 'doctor') handleNavigate('doctor-dashboard');
                else if (user.role === 'compounder') handleNavigate('compounder-dashboard');
                else handleNavigate('admin-dashboard');
              } else {
                handleNavigate('login');
              }
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer ${
              ['login', 'register-patient', 'register-doctor'].includes(currentView)
                ? 'text-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{user ? 'প্রোফাইল' : 'লগইন'}</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
