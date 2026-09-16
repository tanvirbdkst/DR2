import React, { useState } from 'react';
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

function MainApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [searchFilters, setSearchFilters] = useState<{ search: string; specialty: string; location: string }>({
    search: '',
    specialty: '',
    location: '',
  });
  const [lastBookingData, setLastBookingData] = useState<any>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const handleNavigate = (view: string) => {
    setCurrentView(view);
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
          <AdminDashboardPage />
        )}
      </main>

      <Footer />

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
