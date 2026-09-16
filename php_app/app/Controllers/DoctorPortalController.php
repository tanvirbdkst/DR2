<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Core\Session;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\User;
use App\Models\Hospital;

class DoctorPortalController extends Controller
{
    public function dashboard(): void
    {
        $user = currentUser();
        $doctor = Doctor::findByUserId((int)$user['id']);

        if (!$doctor) {
            die("Doctor record not linked to this user.");
        }

        $doctorId = (int)$doctor['id'];
        $chambers = Doctor::getChambers($doctorId);
        $schedules = Doctor::getSchedules($doctorId);

        $dateFilter = $_GET['date'] ?? 'today';
        $statusFilter = $_GET['status'] ?? 'all';
        $selectedChamber = !empty($_GET['chamber_id']) ? (int)$_GET['chamber_id'] : null;

        $appointments = Appointment::getDoctorAppointments($doctorId, $dateFilter, $statusFilter, $selectedChamber);

        // Calculate today stats
        $db = Database::getConnection();
        $statsStmt = $db->prepare("
            SELECT
                COUNT(*) as total_today,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
                SUM(CASE WHEN status = 'called' THEN 1 ELSE 0 END) as called,
                SUM(CASE WHEN status = 'in_consultation' THEN 1 ELSE 0 END) as in_consultation,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
            FROM appointments
            WHERE doctor_id = ? AND schedule_date = CURDATE()
        ");
        $statsStmt->execute([$doctorId]);
        $stats = $statsStmt->fetch() ?: [
            'total_today' => 0, 'confirmed' => 0, 'waiting' => 0, 'called' => 0,
            'in_consultation' => 0, 'completed' => 0, 'cancelled' => 0, 'no_show' => 0
        ];

        // Fetch hospitals list for chamber assignment
        $hospitals = Hospital::getAll();

        $this->view('doctor/dashboard', [
            'doctor' => $doctor,
            'chambers' => $chambers,
            'schedules' => $schedules,
            'hospitals' => $hospitals,
            'appointments' => $appointments,
            'stats' => $stats,
            'dateFilter' => $dateFilter,
            'statusFilter' => $statusFilter,
            'selectedChamber' => $selectedChamber,
        ]);
    }

    /**
     * One-Click "Call Next Patient" queue progression
     */
    public function callNext(): void
    {
        $this->validateCsrf();
        $user = currentUser();
        $doctor = Doctor::findByUserId((int)$user['id']);

        $chamberId = (int)($_POST['chamber_id'] ?? 0);
        $date = $_POST['date'] ?? date('Y-m-d');

        if (!$chamberId) {
            $chambers = Doctor::getChambers((int)$doctor['id']);
            $chamberId = !empty($chambers) ? (int)$chambers[0]['id'] : 0;
        }

        $calledPatient = Appointment::callNextPatient((int)$doctor['id'], $chamberId, $date);

        if ($calledPatient) {
            Session::flash('success', "Now Calling Serial #{$calledPatient['serial_number']}: {$calledPatient['patient_name']}");
            if ($this->isJsonRequest()) {
                $this->json(['success' => true, 'called' => $calledPatient]);
            }
        } else {
            Session::flash('info', "No more waiting patients in queue for this chamber today.");
            if ($this->isJsonRequest()) {
                $this->json(['success' => false, 'message' => 'Queue is clear.']);
            }
        }

        redirect('/doctor/dashboard');
    }

    public function updateAppointmentStatus(array $params): void
    {
        $user = currentUser();
        $doctor = Doctor::findByUserId((int)$user['id']);
        $apptId = (int)$params['id'];

        $status = $_POST['status'] ?? '';
        $notes = isset($_POST['doctor_notes']) ? trim($_POST['doctor_notes']) : null;

        $valid = ['confirmed', 'waiting', 'called', 'in_consultation', 'completed', 'cancelled', 'no_show'];
        if (!in_array($status, $valid, true)) {
            $this->json(['error' => 'Invalid status.'], 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM appointments WHERE id = ? AND doctor_id = ?");
        $stmt->execute([$apptId, $doctor['id']]);
        $appt = $stmt->fetch();

        if (!$appt) {
            $this->json(['error' => 'Appointment not found.'], 404);
        }

        $ok = Appointment::updateStatus($apptId, $status, $notes);

        if ($ok) {
            User::logActivity((int)$user['id'], 'UPDATE_APPOINTMENT_STATUS', "Changed status to {$status} for serial #{$appt['serial_number']}");

            if ($this->isJsonRequest()) {
                $this->json(['success' => true, 'message' => "Status updated to {$status}"]);
            }
            Session::flash('success', "Patient status updated to {$status}");
        } else {
            if ($this->isJsonRequest()) {
                $this->json(['error' => 'Failed to update status'], 500);
            }
            Session::flash('error', 'Failed to update status');
        }

        redirect($_SERVER['HTTP_REFERER'] ?? '/doctor/dashboard');
    }

    public function patients(): void
    {
        $user = currentUser();
        $doctor = Doctor::findByUserId((int)$user['id']);
        $search = $_GET['search'] ?? null;

        $patients = Doctor::getDoctorPatients((int)$doctor['id'], $search);

        $this->view('doctor/patients', [
            'doctor' => $doctor,
            'patients' => $patients,
            'search' => $search,
        ]);
    }

    public function profile(): void
    {
        $user = currentUser();
        $doctor = Doctor::findByUserId((int)$user['id']);
        $db = Database::getConnection();
        $specialties = $db->query("SELECT * FROM specialties WHERE status = 'active' ORDER BY name ASC")->fetchAll();

        $this->view('doctor/profile', [
            'doctor' => $doctor,
            'specialties' => $specialties,
            'user' => $user,
        ]);
    }

    public function updateProfile(): void
    {
        $this->validateCsrf();
        $user = currentUser();
        $doctor = Doctor::findByUserId((int)$user['id']);

        $name = trim($_POST['name'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $title = trim($_POST['title'] ?? 'Dr.');
        $specialtyId = (int)($_POST['specialty_id'] ?? 0);
        $qualification = trim($_POST['qualification'] ?? '');
        $experienceYears = (int)($_POST['experience_years'] ?? 0);
        $consultationFee = (float)($_POST['consultation_fee'] ?? 500);
        $bio = trim($_POST['bio'] ?? '');

        if (empty($name) || empty($qualification)) {
            Session::flash('error', 'Doctor name and qualifications are required.');
            redirect('/doctor/profile');
        }

        $ok = Doctor::updateProfile((int)$doctor['id'], [
            'user_id' => (int)$user['id'],
            'name' => $name,
            'phone' => $phone,
            'title' => $title,
            'specialty_id' => $specialtyId,
            'qualification' => $qualification,
            'experience_years' => $experienceYears,
            'consultation_fee' => $consultationFee,
            'bio' => $bio,
        ]);

        if ($ok) {
            $_SESSION['user']['name'] = $name;
            $_SESSION['user']['phone'] = $phone;
            Session::flash('success', 'Profile updated successfully.');
        } else {
            Session::flash('error', 'Failed to update profile.');
        }

        redirect('/doctor/profile');
    }

    public function createChamber(): void
    {
        $this->validateCsrf();
        $user = currentUser();
        $doctor = Doctor::findByUserId((int)$user['id']);

        $name = trim($_POST['name'] ?? '');
        $address = trim($_POST['address'] ?? '');
        $city = trim($_POST['city'] ?? 'Dhaka');
        $area = trim($_POST['area'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $fee = (float)($_POST['consultation_fee'] ?? 500);
        $hospitalId = !empty($_POST['hospital_id']) ? (int)$_POST['hospital_id'] : null;

        if (empty($name) || empty($address) || empty($area)) {
            Session::flash('error', 'Chamber name, address, and area are required.');
            redirect('/doctor/dashboard?tab=chambers');
        }

        $chamId = Doctor::createChamber([
            'doctor_id' => (int)$doctor['id'],
            'hospital_id' => $hospitalId,
            'name' => $name,
            'address' => $address,
            'city' => $city,
            'area' => $area,
            'phone' => $phone,
            'consultation_fee' => $fee,
        ]);

        if ($chamId) {
            User::logActivity((int)$user['id'], 'CREATE_CHAMBER', "Created chamber: {$name}");
            Session::flash('success', 'Chamber added successfully.');
        } else {
            Session::flash('error', 'Failed to add chamber.');
        }

        redirect('/doctor/dashboard?tab=chambers');
    }

    public function deleteChamber(array $params): void
    {
        $this->validateCsrf();
        $user = currentUser();
        $doctor = Doctor::findByUserId((int)$user['id']);
        $chamId = (int)$params['id'];

        $ok = Doctor::deleteChamber($chamId, (int)$doctor['id']);
        if ($ok) {
            Session::flash('success', 'Chamber deleted successfully.');
        } else {
            Session::flash('error', 'Failed to delete chamber.');
        }
        redirect('/doctor/dashboard?tab=chambers');
    }

    public function createSchedule(): void
    {
        $this->validateCsrf();
        $user = currentUser();
        $doctor = Doctor::findByUserId((int)$user['id']);

        $chamberId = (int)($_POST['chamber_id'] ?? 0);
        $dayOfWeek = $_POST['day_of_week'] ?? '';
        $startTime = $_POST['start_time'] ?? '';
        $endTime = $_POST['end_time'] ?? '';
        $maxSerials = (int)($_POST['max_serials'] ?? 20);
        $duration = (int)($_POST['slot_duration_minutes'] ?? 10);

        if (!$chamberId || empty($dayOfWeek) || empty($startTime) || empty($endTime)) {
            Session::flash('error', 'Chamber, day of week, start time, and end time are required.');
            redirect('/doctor/dashboard?tab=schedules');
        }

        $schedId = Doctor::createSchedule([
            'doctor_id' => (int)$doctor['id'],
            'chamber_id' => $chamberId,
            'day_of_week' => $dayOfWeek,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'max_serials' => $maxSerials,
            'slot_duration_minutes' => $duration,
        ]);

        if ($schedId) {
            User::logActivity((int)$user['id'], 'CREATE_SCHEDULE', "Added schedule for {$dayOfWeek} ({$startTime}-{$endTime})");
            Session::flash('success', "Schedule added for {$dayOfWeek} ({$maxSerials} serials).");
        } else {
            Session::flash('error', 'Failed to add schedule.');
        }

        redirect('/doctor/dashboard?tab=schedules');
    }

    public function deleteSchedule(array $params): void
    {
        $this->validateCsrf();
        $user = currentUser();
        $doctor = Doctor::findByUserId((int)$user['id']);
        $schedId = (int)$params['id'];

        $ok = Doctor::deleteSchedule($schedId, (int)$doctor['id']);
        if ($ok) {
            Session::flash('success', 'Schedule deleted successfully.');
        } else {
            Session::flash('error', 'Failed to delete schedule.');
        }
        redirect('/doctor/dashboard?tab=schedules');
    }
}
