import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { TestRunnerModal } from './components/TestRunnerModal.js';
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
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

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
        onOpenTestModal={() => setIsTestModalOpen(true)}
      />

      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            onSearch={handleSearchFromHome}
            onSelectDoctor={handleSelectDoctor}
            onNavigate={handleNavigate}
            onOpenTestModal={() => setIsTestModalOpen(true)}
          />
        )}

        {currentView === 'doctors' && (
          <DoctorsPage
            initialFilters={searchFilters}
            onSelectDoctor={handleSelectDoctor}
          />
        )}

        {currentView === 'doctor-profile' && selectedDoctorId && (
          <DoctorProfilePage
            doctorId={selectedDoctorId}
            onBack={() => handleNavigate('doctors')}
            onBookingSuccess={handleBookingSuccess}
          />
        )}

        {currentView === 'booking-confirmed' && lastBookingData && (
          <BookingConfirmationPage
            bookingData={lastBookingData}
            onGoToDashboard={() => handleNavigate('patient-dashboard')}
            onBookAnother={() => handleNavigate('doctors')}
          />
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
      </main>

      <Footer onNavigate={handleNavigate} />

      <TestRunnerModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onSelectDoctor={(docId) => {
          setIsTestModalOpen(false);
          handleSelectDoctor(docId);
        }}
      />
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
