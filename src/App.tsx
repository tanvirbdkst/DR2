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

function getViewFromUrl(): string {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  if (path.includes('/admin') || hash.includes('admin')) return 'admin-dashboard';
  if (path.includes('/doctor-dashboard') || hash.includes('doctor-dashboard')) return 'doctor-dashboard';
  if (path.includes('/patient-dashboard') || hash.includes('patient-dashboard')) return 'patient-dashboard';
  if (path.includes('/doctors') || hash.includes('doctors')) return 'doctors';
  if (path.includes('/login') || hash.includes('login')) return 'login';
  if (path.includes('/register-patient') || hash.includes('register-patient')) return 'register-patient';
  if (path.includes('/register-doctor') || hash.includes('register-doctor')) return 'register-doctor';

  return 'home';
}

function MainApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<string>(getViewFromUrl);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [searchFilters, setSearchFilters] = useState<{ search: string; specialty: string; location: string }>({
    search: '',
    specialty: '',
    location: '',
  });
  const [lastBookingData, setLastBookingData] = useState<any>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  useEffect(() => {
    const handleLocationChange = () => {
      const detected = getViewFromUrl();
      if (detected !== currentView) {
        setCurrentView(detected);
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [currentView]);

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    try {
      if (view === 'home') {
        window.history.pushState({}, '', '/');
      } else if (view === 'admin-dashboard') {
        window.history.pushState({}, '', '/admin');
      } else {
        window.history.pushState({}, '', `/${view}`);
      }
    } catch {
      // Fallback if pushState fails
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchFromHome = (filters: { search: string; specialty: string; location: string }) => {
    setSearchFilters(filters);
    handleNavigate('doctors');
  };

  const handleSelectDoctor = (doctorId: number) => {
    setSelectedDoctorId(doctorId);
    handleNavigate('doctor-profile');
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
