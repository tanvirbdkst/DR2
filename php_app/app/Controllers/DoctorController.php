<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Models\Doctor;

class DoctorController extends Controller
{
    public function index(): void
    {
        $search = $_GET['search'] ?? '';
        $specialty = $_GET['specialty'] ?? '';
        $location = $_GET['location'] ?? '';

        $doctors = Doctor::getApprovedDoctors([
            'search' => $search,
            'specialty' => $specialty,
            'location' => $location,
        ]);

        $db = Database::getConnection();
        $specialties = $db->query("SELECT * FROM specialties WHERE status = 'active' ORDER BY name ASC")->fetchAll();

        $this->view('doctors/index', [
            'doctors' => $doctors,
            'specialties' => $specialties,
            'search' => $search,
            'selectedSpecialty' => $specialty,
            'location' => $location,
        ]);
    }

    public function show(array $params): void
    {
        $id = (int)$params['id'];
        $doctor = Doctor::findById($id);

        if (!$doctor || $doctor['approval_status'] !== 'approved' || $doctor['user_status'] !== 'active') {
            $this->view('errors/404');
            return;
        }

        $chambers = Doctor::getChambers($id);
        $schedules = Doctor::getSchedules($id);

        // Fetch doctor reviews
        $db = Database::getConnection();
        $revStmt = $db->prepare("
            SELECT r.*, u.name as patient_name
            FROM reviews r
            JOIN users u ON r.patient_id = u.id
            WHERE r.doctor_id = ? AND r.is_approved = 1
            ORDER BY r.created_at DESC
        ");
        $revStmt->execute([$id]);
        $reviews = $revStmt->fetchAll();

        // Calculate average rating
        $avgRating = 5.0;
        if (!empty($reviews)) {
            $total = array_sum(array_column($reviews, 'rating'));
            $avgRating = round($total / count($reviews), 1);
        }

        $this->view('doctors/profile', [
            'doctor' => $doctor,
            'chambers' => $chambers,
            'schedules' => $schedules,
            'reviews' => $reviews,
            'avgRating' => $avgRating,
        ]);
    }

    /**
     * AJAX endpoint to fetch real-time available serial slots for a given Chamber & Date
     */
    public function getAvailability(): void
    {
        $doctorId = (int)($_GET['doctorId'] ?? 0);
        $chamberId = (int)($_GET['chamberId'] ?? 0);
        $date = $_GET['date'] ?? '';

        if (!$doctorId || !$chamberId || empty($date)) {
            $this->json(['error' => 'Doctor ID, chamber ID, and date are required.'], 400);
        }

        $timestamp = strtotime($date);
        if (!$timestamp) {
            $this->json(['error' => 'Invalid date format.'], 400);
        }

        $dayOfWeek = date('l', $timestamp);
        $db = Database::getConnection();

        // Find schedule for doctor on this day
        $schedStmt = $db->prepare("
            SELECT s.*, c.name as chamber_name, c.address as chamber_address,
                   COALESCE(dc.consultation_fee, d.consultation_fee) as fee
            FROM doctor_schedules s
            JOIN chambers c ON s.chamber_id = c.id
            JOIN doctors d ON s.doctor_id = d.id
            LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
            WHERE s.doctor_id = ? AND s.chamber_id = ? AND s.day_of_week = ? AND s.is_active = 1
        ");
        $schedStmt->execute([$doctorId, $chamberId, $dayOfWeek]);
        $schedule = $schedStmt->fetch();

        if (!$schedule) {
            $this->json([
                'available' => false,
                'message' => "Doctor has no scheduled consultation on {$dayOfWeek} at this chamber.",
                'serials' => [],
            ]);
        }

        // Get existing booked appointments
        $apptStmt = $db->prepare("
            SELECT serial_number
            FROM appointments
            WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND status != 'cancelled'
        ");
        $apptStmt->execute([$doctorId, $chamberId, $date]);
        $bookedSerials = array_column($apptStmt->fetchAll(), 'serial_number');

        // Build list of slots
        $maxSerials = (int)$schedule['max_serials'];
        $slotDuration = (int)($schedule['slot_duration_minutes'] ?: 10);
        [$startH, $startM] = explode(':', $schedule['start_time']);

        $serials = [];
        for ($i = 1; $i <= $maxSerials; $i++) {
            $totM = ((int)$startH * 60 + (int)$startM) + ($i - 1) * $slotDuration;
            $slotH = (int)floor($totM / 60) % 24;
            $slotMin = $totM % 60;
            $ampm = $slotH >= 12 ? 'PM' : 'AM';
            $slotH12 = $slotH % 12 ?: 12;
            $timeStr = sprintf('%02d:%02d %s', $slotH12, $slotMin, $ampm);

            $isBooked = in_array($i, $bookedSerials, true);

            $serials[] = [
                'serial_number' => $i,
                'time' => $timeStr,
                'status' => $isBooked ? 'booked' : 'available',
            ];
        }

        $this->json([
            'available' => true,
            'schedule' => $schedule,
            'serials' => $serials,
        ]);
    }
}
