<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Core\Session;
use App\Models\User;
use App\Models\Doctor;
use App\Models\Appointment;
use App\Models\Hospital;
use App\Models\Review;
use App\Models\Setting;

class AdminController extends Controller
{
    public function dashboard(): void
    {
        $db = Database::getConnection();

        $totalDocs = (int)$db->query("SELECT COUNT(*) FROM doctors")->fetchColumn();
        $pendingDocs = (int)$db->query("SELECT COUNT(*) FROM doctors WHERE approval_status = 'pending'")->fetchColumn();
        $approvedDocs = (int)$db->query("SELECT COUNT(*) FROM doctors WHERE approval_status = 'approved'")->fetchColumn();
        $totalPatients = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'patient'")->fetchColumn();
        $totalAppts = (int)$db->query("SELECT COUNT(*) FROM appointments")->fetchColumn();
        $todayAppts = (int)$db->query("SELECT COUNT(*) FROM appointments WHERE schedule_date = CURDATE()")->fetchColumn();

        $recentLogs = $db->query("
            SELECT l.*, u.name as user_name, u.email as user_email
            FROM activity_logs l
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.created_at DESC
            LIMIT 15
        ")->fetchAll();

        // Get doctors with filter
        $statusFilter = $_GET['status'] ?? 'all';
        $doctors = Doctor::getAllDoctorsForAdmin($statusFilter);

        // Get all specialties
        $specialties = $db->query("
            SELECT s.*, (SELECT COUNT(*) FROM doctors d WHERE d.specialty_id = s.id) as doctor_count
            FROM specialties s
            ORDER BY s.name ASC
        ")->fetchAll();

        // Get all hospitals
        $hospitals = Hospital::getAll();

        // Get patient list
        $patients = User::getAllPatients($_GET['patient_search'] ?? null);

        // Get global appointments
        $appointments = Appointment::getAllAppointmentsForAdmin([
            'date' => $_GET['appt_date'] ?? '',
            'status' => $_GET['appt_status'] ?? '',
            'doctor_id' => $_GET['appt_doctor'] ?? '',
            'search' => $_GET['appt_search'] ?? '',
        ]);

        // Get reviews
        $reviews = Review::getAllForAdmin();

        // Settings
        $settings = Setting::getAll();

        $this->view('admin/dashboard', [
            'totalDocs' => $totalDocs,
            'pendingDocs' => $pendingDocs,
            'approvedDocs' => $approvedDocs,
            'totalPatients' => $totalPatients,
            'totalAppts' => $totalAppts,
            'todayAppts' => $todayAppts,
            'recentLogs' => $recentLogs,
            'doctors' => $doctors,
            'specialties' => $specialties,
            'hospitals' => $hospitals,
            'patients' => $patients,
            'appointments' => $appointments,
            'reviews' => $reviews,
            'settings' => $settings,
            'statusFilter' => $statusFilter,
            'activeTab' => $_GET['tab'] ?? 'overview',
        ]);
    }

    public function approveDoctor(array $params): void
    {
        $this->validateCsrf();
        $admin = currentUser();
        $docId = (int)$params['id'];

        $db = Database::getConnection();
        $doc = $db->query("SELECT user_id, bmdc_number FROM doctors WHERE id = {$docId}")->fetch();
        if (!$doc) {
            Session::flash('error', 'Doctor not found.');
            redirect('/admin/dashboard?tab=doctors');
        }

        $ok = Doctor::updateApprovalStatus($docId, 'approved');
        if ($ok) {
            $db->prepare("UPDATE users SET status = 'active' WHERE id = ?")->execute([$doc['user_id']]);
            User::logActivity((int)$admin['id'], 'APPROVE_DOCTOR', "Approved doctor ID {$docId} (BMDC: {$doc['bmdc_number']})");
            Session::flash('success', 'Doctor successfully approved and is now publicly visible for appointments.');
        } else {
            Session::flash('error', 'Approval failed.');
        }

        redirect('/admin/dashboard?tab=doctors');
    }

    public function rejectDoctor(array $params): void
    {
        $this->validateCsrf();
        $admin = currentUser();
        $docId = (int)$params['id'];
        $reason = trim($_POST['rejection_reason'] ?? 'BMDC documentation incomplete or unverified.');

        $ok = Doctor::updateApprovalStatus($docId, 'rejected', $reason);
        if ($ok) {
            User::logActivity((int)$admin['id'], 'REJECT_DOCTOR', "Rejected doctor ID {$docId}. Reason: {$reason}");
            Session::flash('success', 'Doctor application marked as rejected.');
        } else {
            Session::flash('error', 'Action failed.');
        }

        redirect('/admin/dashboard?tab=doctors');
    }

    public function toggleDoctorStatus(array $params): void
    {
        $this->validateCsrf();
        $admin = currentUser();
        $docId = (int)$params['id'];

        $db = Database::getConnection();
        $doc = $db->query("SELECT d.id, d.user_id, u.status FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = {$docId}")->fetch();

        if ($doc) {
            $newStatus = ($doc['status'] === 'active') ? 'suspended' : 'active';
            $db->prepare("UPDATE users SET status = ? WHERE id = ?")->execute([$newStatus, $doc['user_id']]);
            User::logActivity((int)$admin['id'], 'TOGGLE_DOCTOR_STATUS', "Doctor ID {$docId} status set to {$newStatus}");
            Session::flash('success', "Doctor account marked as {$newStatus}.");
        }

        redirect('/admin/dashboard?tab=doctors');
    }

    public function togglePatientStatus(array $params): void
    {
        $this->validateCsrf();
        $admin = currentUser();
        $userId = (int)$params['id'];

        $user = User::findById($userId);
        if ($user && $user['role'] === 'patient') {
            $newStatus = ($user['status'] === 'active') ? 'suspended' : 'active';
            User::updateStatus($userId, $newStatus);
            User::logActivity((int)$admin['id'], 'TOGGLE_PATIENT_STATUS', "Patient ID {$userId} status set to {$newStatus}");
            Session::flash('success', "Patient account marked as {$newStatus}.");
        }

        redirect('/admin/dashboard?tab=patients');
    }

    public function createSpecialty(): void
    {
        $this->validateCsrf();
        $name = trim($_POST['name'] ?? '');
        $nameBn = trim($_POST['name_bn'] ?? '');
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name), '-'));
        $icon = trim($_POST['icon'] ?? 'stethoscope');

        if (empty($name)) {
            Session::flash('error', 'Specialty name is required.');
            redirect('/admin/dashboard?tab=specialties');
        }

        $db = Database::getConnection();
        try {
            $stmt = $db->prepare("
                INSERT INTO specialties (name, name_bn, slug, icon, status)
                VALUES (?, ?, ?, ?, 'active')
            ");
            $stmt->execute([$name, $nameBn ?: $name, $slug, $icon]);
            Session::flash('success', 'Specialty created successfully.');
        } catch (\Throwable $e) {
            Session::flash('error', 'Failed to create specialty: ' . $e->getMessage());
        }

        redirect('/admin/dashboard?tab=specialties');
    }

    public function createHospital(): void
    {
        $this->validateCsrf();
        $name = trim($_POST['name'] ?? '');
        $address = trim($_POST['address'] ?? '');
        $city = trim($_POST['city'] ?? 'Dhaka');
        $area = trim($_POST['area'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $description = trim($_POST['description'] ?? '');

        if (empty($name) || empty($address) || empty($area)) {
            Session::flash('error', 'Hospital name, address, and area are required.');
            redirect('/admin/dashboard?tab=hospitals');
        }

        Hospital::create([
            'name' => $name,
            'address' => $address,
            'city' => $city,
            'area' => $area,
            'phone' => $phone,
            'description' => $description,
        ]);

        Session::flash('success', 'Hospital / Clinic added successfully.');
        redirect('/admin/dashboard?tab=hospitals');
    }

    public function deleteHospital(array $params): void
    {
        $this->validateCsrf();
        $id = (int)$params['id'];
        Hospital::delete($id);
        Session::flash('success', 'Hospital deleted.');
        redirect('/admin/dashboard?tab=hospitals');
    }

    public function toggleReview(array $params): void
    {
        $this->validateCsrf();
        $id = (int)$params['id'];
        $status = (int)($_POST['is_approved'] ?? 1);
        Review::toggleApproval($id, $status);
        Session::flash('success', 'Review moderation updated.');
        redirect('/admin/dashboard?tab=reviews');
    }

    public function deleteReview(array $params): void
    {
        $this->validateCsrf();
        $id = (int)$params['id'];
        Review::delete($id);
        Session::flash('success', 'Review deleted.');
        redirect('/admin/dashboard?tab=reviews');
    }

    public function updateSettings(): void
    {
        $this->validateCsrf();
        $siteTitle = trim($_POST['site_title'] ?? 'Daktar Serial');
        $siteTitleBn = trim($_POST['site_title_bn'] ?? 'ডাক্তার সিরিয়াল');
        $hotline = trim($_POST['hotline_phone'] ?? '');
        $supportEmail = trim($_POST['support_email'] ?? '');
        $emergencyNotice = trim($_POST['emergency_notice'] ?? '');
        $bookingRules = trim($_POST['booking_rules'] ?? '');

        Setting::set('site_title', $siteTitle);
        Setting::set('site_title_bn', $siteTitleBn);
        Setting::set('hotline_phone', $hotline);
        Setting::set('support_email', $supportEmail);
        Setting::set('emergency_notice', $emergencyNotice);
        Setting::set('booking_rules', $bookingRules);

        Session::flash('success', 'System settings saved.');
        redirect('/admin/dashboard?tab=settings');
    }
}
