<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Core\Session;
use App\Models\Appointment;
use App\Models\User;
use App\Models\Notification;

class AppointmentController extends Controller
{
    /**
     * Store appointment with double-booking transaction safeguard
     */
    public function store(): void
    {
        $this->validateCsrf();

        $user = currentUser();
        $doctorId = (int)($_POST['doctor_id'] ?? 0);
        $chamberId = (int)($_POST['chamber_id'] ?? 0);
        $scheduleDate = $_POST['schedule_date'] ?? '';
        $serialNumber = (int)($_POST['serial_number'] ?? 0);
        $patientName = trim($_POST['patient_name'] ?? '');
        $patientPhone = trim($_POST['patient_phone'] ?? '');
        $patientAge = (int)($_POST['patient_age'] ?? 25);
        $patientGender = $_POST['patient_gender'] ?? 'male';
        $problem = trim($_POST['problem_description'] ?? '');

        if (!$doctorId || !$chamberId || empty($scheduleDate) || !$serialNumber || empty($patientName) || empty($patientPhone)) {
            if ($this->isJsonRequest()) {
                $this->json(['error' => 'All booking fields are required.'], 400);
            }
            Session::flash('error', 'All booking fields are required.');
            redirect($_SERVER['HTTP_REFERER'] ?? '/');
        }

        try {
            $booking = Appointment::book([
                'doctor_id' => $doctorId,
                'chamber_id' => $chamberId,
                'schedule_date' => $scheduleDate,
                'serial_number' => $serialNumber,
                'patient_name' => $patientName,
                'patient_phone' => $patientPhone,
                'patient_age' => $patientAge,
                'patient_gender' => $patientGender,
                'problem_description' => $problem,
                'patient_user_id' => $user['id'] ?? null,
            ]);

            User::logActivity($user['id'] ?? null, 'APPOINTMENT_BOOKED', "Booked serial {$serialNumber} for doctor ID {$doctorId} (Appt ID: {$booking['appointment_id']})");

            // If user is logged in, create notification
            if (!empty($user['id'])) {
                Notification::create(
                    $user['id'],
                    "সিরিয়াল বুকিং নিশ্চিত হয়েছে",
                    "আপনার সিরিয়াল নম্বর #{$serialNumber} ({$booking['doctor_name']}, তারিখ: {$scheduleDate}) সফলভাবে নিশ্চিত করা হয়েছে।"
                );
            }

            if ($this->isJsonRequest()) {
                $this->json(['success' => true, 'booking' => $booking]);
            }

            Session::set('last_booking', $booking);
            redirect('/appointment/confirmation');
        } catch (\Throwable $e) {
            if ($this->isJsonRequest()) {
                $this->json(['error' => $e->getMessage()], 400);
            }
            Session::flash('error', $e->getMessage());
            redirect($_SERVER['HTTP_REFERER'] ?? '/');
        }
    }

    public function confirmation(): void
    {
        $booking = Session::get('last_booking');
        if (!$booking) {
            redirect('/doctors');
        }

        $this->view('appointments/confirmation', ['booking' => $booking]);
    }

    /**
     * Dedicated appointment details / printable receipt page
     */
    public function show(array $params): void
    {
        $idOrCode = $params['id'] ?? '';
        $appt = is_numeric($idOrCode)
            ? Appointment::findById((int)$idOrCode)
            : Appointment::findByAppointmentId((string)$idOrCode);

        if (!$appt) {
            $this->view('errors/404');
            return;
        }

        // Check view access: admin, doctor of appt, patient of appt, or phone match
        $user = currentUser();
        if ($user) {
            if ($user['role'] === 'patient' && $appt['patient_id'] && (int)$appt['patient_id'] !== (int)$user['id']) {
                $this->view('errors/403');
                return;
            }
        }

        $this->view('appointments/show', ['appointment' => $appt]);
    }

    /**
     * AJAX Live Queue polling endpoint for patient or doctor
     */
    public function getQueueStatus(): void
    {
        $doctorId = (int)($_GET['doctor_id'] ?? 0);
        $chamberId = (int)($_GET['chamber_id'] ?? 0);
        $date = $_GET['date'] ?? date('Y-m-d');
        $mySerial = (int)($_GET['my_serial'] ?? 0);

        if (!$doctorId) {
            $this->json(['error' => 'Doctor ID is required.'], 400);
        }

        $queueData = Appointment::getQueueStatus($doctorId, $chamberId, $date, $mySerial);

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT id, appointment_id, serial_number, patient_name, status, appointment_time
            FROM appointments
            WHERE doctor_id = ? AND (? = 0 OR chamber_id = ?) AND schedule_date = ? AND status != 'cancelled'
            ORDER BY serial_number ASC
        ");
        $stmt->execute([$doctorId, $chamberId, $chamberId, $date]);
        $appointments = $stmt->fetchAll();

        $queueData['appointments'] = $appointments;
        $this->json($queueData);
    }
}
