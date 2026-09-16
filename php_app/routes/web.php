<?php
declare(strict_types=1);

use App\Controllers\HomeController;
use App\Controllers\AuthController;
use App\Controllers\DoctorController;
use App\Controllers\AppointmentController;
use App\Controllers\PatientController;
use App\Controllers\DoctorPortalController;
use App\Controllers\AdminController;
use App\Middleware\AuthMiddleware;
use App\Middleware\DoctorMiddleware;
use App\Middleware\AdminMiddleware;

/** @var App\Core\Router $router */

// Public Pages
$router->get('/', [HomeController::class, 'index']);
$router->get('/home', [HomeController::class, 'index']);
$router->get('/index', [HomeController::class, 'index']);
$router->get('/index.php', [HomeController::class, 'index']);
$router->get('/page', [HomeController::class, 'index']);
$router->get('/page/{slug}', [HomeController::class, 'page']);
$router->get('/how-it-works', [HomeController::class, 'howItWorks']);
$router->get('/about', [HomeController::class, 'about']);
$router->get('/contact', [HomeController::class, 'contact']);
$router->get('/terms', [HomeController::class, 'terms']);
$router->get('/privacy', [HomeController::class, 'privacy']);

// Doctor Directory & Booking
$router->get('/doctors', [DoctorController::class, 'index']);
$router->get('/doctor', [DoctorController::class, 'index']);
$router->get('/doctor/{id}', [DoctorController::class, 'show']);
$router->get('/lang/{lang}', [AuthController::class, 'switchLang']);
$router->get('/appointment/{id}', [AppointmentController::class, 'show']);

// Authentication Routes
$router->get('/login', [AuthController::class, 'showLogin']);
$router->post('/login', [AuthController::class, 'login']);
$router->get('/register/patient', [AuthController::class, 'showRegisterPatient']);
$router->post('/register/patient', [AuthController::class, 'registerPatient']);
$router->get('/register/doctor', [AuthController::class, 'showRegisterDoctor']);
$router->post('/register/doctor', [AuthController::class, 'registerDoctor']);
$router->get('/logout', [AuthController::class, 'logout']);
$router->post('/logout', [AuthController::class, 'logout']);

// Appointment Booking & Public APIs
$router->get('/api/availability', [DoctorController::class, 'getAvailability']);
$router->post('/appointment/book', [AppointmentController::class, 'store']);
$router->get('/appointment/confirmation', [AppointmentController::class, 'confirmation']);
$router->get('/api/queue-status', [AppointmentController::class, 'getQueueStatus']);

// Patient Dashboard (Protected)
$router->get('/patient/dashboard', [PatientController::class, 'dashboard'], [AuthMiddleware::class]);
$router->get('/patient/profile', [PatientController::class, 'profile'], [AuthMiddleware::class]);
$router->post('/patient/profile', [PatientController::class, 'updateProfile'], [AuthMiddleware::class]);
$router->post('/patient/appointment/{id}/cancel', [PatientController::class, 'cancelAppointment'], [AuthMiddleware::class]);
$router->post('/patient/review', [PatientController::class, 'submitReview'], [AuthMiddleware::class]);

// Doctor Portal (Protected)
$router->get('/doctor/dashboard', [DoctorPortalController::class, 'dashboard'], [DoctorMiddleware::class]);
$router->post('/doctor/call-next', [DoctorPortalController::class, 'callNext'], [DoctorMiddleware::class]);
$router->get('/doctor/patients', [DoctorPortalController::class, 'patients'], [DoctorMiddleware::class]);
$router->get('/doctor/profile', [DoctorPortalController::class, 'profile'], [DoctorMiddleware::class]);
$router->post('/doctor/profile', [DoctorPortalController::class, 'updateProfile'], [DoctorMiddleware::class]);
$router->post('/doctor/appointment/{id}/status', [DoctorPortalController::class, 'updateAppointmentStatus'], [DoctorMiddleware::class]);
$router->post('/doctor/chamber/create', [DoctorPortalController::class, 'createChamber'], [DoctorMiddleware::class]);
$router->post('/doctor/chamber/{id}/delete', [DoctorPortalController::class, 'deleteChamber'], [DoctorMiddleware::class]);
$router->post('/doctor/schedule/create', [DoctorPortalController::class, 'createSchedule'], [DoctorMiddleware::class]);
$router->post('/doctor/schedule/{id}/delete', [DoctorPortalController::class, 'deleteSchedule'], [DoctorMiddleware::class]);

// Admin Panel (Protected)
$router->get('/admin/dashboard', [AdminController::class, 'dashboard'], [AdminMiddleware::class]);
$router->post('/admin/doctor/{id}/approve', [AdminController::class, 'approveDoctor'], [AdminMiddleware::class]);
$router->post('/admin/doctor/{id}/reject', [AdminController::class, 'rejectDoctor'], [AdminMiddleware::class]);
$router->post('/admin/doctor/{id}/toggle-status', [AdminController::class, 'toggleDoctorStatus'], [AdminMiddleware::class]);
$router->post('/admin/patient/{id}/toggle-status', [AdminController::class, 'togglePatientStatus'], [AdminMiddleware::class]);
$router->post('/admin/specialty/create', [AdminController::class, 'createSpecialty'], [AdminMiddleware::class]);
$router->post('/admin/hospital/create', [AdminController::class, 'createHospital'], [AdminMiddleware::class]);
$router->post('/admin/hospital/{id}/delete', [AdminController::class, 'deleteHospital'], [AdminMiddleware::class]);
$router->post('/admin/review/{id}/toggle', [AdminController::class, 'toggleReview'], [AdminMiddleware::class]);
$router->post('/admin/review/{id}/delete', [AdminController::class, 'deleteReview'], [AdminMiddleware::class]);
$router->post('/admin/settings', [AdminController::class, 'updateSettings'], [AdminMiddleware::class]);
