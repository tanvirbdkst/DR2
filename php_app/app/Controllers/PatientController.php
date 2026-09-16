<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Core\Session;
use App\Models\Appointment;
use App\Models\User;
use App\Models\Notification;

class PatientController extends Controller
{
    public function dashboard(): void
    {
        $user = currentUser();
        $appointments = Appointment::getPatientAppointments((int)$user['id']);
        $notifications = Notification::getForUser((int)$user['id'], 5);
        $profile = User::getPatientProfile((int)$user['id']);

        $this->view('patient/dashboard', [
            'user' => $user,
            'profile' => $profile,
            'appointments' => $appointments,
            'notifications' => $notifications,
        ]);
    }

    public function profile(): void
    {
        $user = currentUser();
        $profile = User::getPatientProfile((int)$user['id']);

        $this->view('patient/profile', [
            'user' => $user,
            'profile' => $profile,
        ]);
    }

    public function updateProfile(): void
    {
        $this->validateCsrf();
        $user = currentUser();

        $name = trim($_POST['name'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $bloodGroup = $_POST['blood_group'] ?? null;
        $dob = $_POST['date_of_birth'] ?? null;
        $gender = $_POST['gender'] ?? 'male';
        $emergencyContact = trim($_POST['emergency_contact'] ?? '');
        $address = trim($_POST['address'] ?? '');

        if (empty($name) || empty($phone)) {
            Session::flash('error', 'Name and phone number are required.');
            redirect('/patient/profile');
        }

        $ok = User::updatePatientProfile((int)$user['id'], [
            'name' => $name,
            'phone' => $phone,
            'blood_group' => $bloodGroup,
            'date_of_birth' => $dob,
            'gender' => $gender,
            'emergency_contact' => $emergencyContact,
            'address' => $address,
        ]);

        // Handle password change if requested
        $newPass = $_POST['new_password'] ?? '';
        $confirmPass = $_POST['confirm_password'] ?? '';
        if (!empty($newPass)) {
            if (strlen($newPass) < 6) {
                Session::flash('error', 'Password must be at least 6 characters long.');
                redirect('/patient/profile');
            }
            if ($newPass !== $confirmPass) {
                Session::flash('error', 'New passwords do not match.');
                redirect('/patient/profile');
            }
            User::updatePassword((int)$user['id'], $newPass);
        }

        if ($ok) {
            // Update session user name
            $_SESSION['user']['name'] = $name;
            $_SESSION['user']['phone'] = $phone;
            Session::flash('success', 'Profile updated successfully.');
        } else {
            Session::flash('error', 'Failed to update profile.');
        }

        redirect('/patient/profile');
    }

    public function cancelAppointment(array $params): void
    {
        $this->validateCsrf();
        $user = currentUser();
        $apptId = (int)$params['id'];

        $ok = Appointment::cancelByPatient($apptId, (int)$user['id'], $_POST['reason'] ?? null);

        if ($ok) {
            User::logActivity((int)$user['id'], 'APPOINTMENT_CANCELLED', "Cancelled appointment ID {$apptId}");
            Session::flash('success', 'Appointment cancelled successfully. The slot is released.');
        } else {
            Session::flash('error', 'Could not cancel appointment. It may already be completed or cancelled.');
        }

        redirect('/patient/dashboard');
    }

    public function submitReview(): void
    {
        $this->validateCsrf();
        $user = currentUser();

        $apptId = (int)($_POST['appointment_id'] ?? 0);
        $rating = (int)($_POST['rating'] ?? 5);
        $reviewText = trim($_POST['review_text'] ?? '');

        if ($rating < 1 || $rating > 5) {
            Session::flash('error', 'Rating must be between 1 and 5 stars.');
            redirect('/patient/dashboard');
        }

        $db = Database::getConnection();
        $checkStmt = $db->prepare("
            SELECT * FROM appointments
            WHERE id = ? AND patient_id = ? AND status = 'completed'
        ");
        $checkStmt->execute([$apptId, $user['id']]);
        $appt = $checkStmt->fetch();

        if (!$appt) {
            Session::flash('error', 'You can only review doctors for completed appointments.');
            redirect('/patient/dashboard');
        }

        try {
            $stmt = $db->prepare("
                INSERT INTO reviews (appointment_id, doctor_id, patient_id, rating, review_text)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE rating = VALUES(rating), review_text = VALUES(review_text)
            ");
            $stmt->execute([$apptId, $appt['doctor_id'], $user['id'], $rating, $reviewText]);

            Session::flash('success', 'Thank you! Your review has been submitted.');
        } catch (\Throwable $e) {
            Session::flash('error', 'Failed to submit review: ' . $e->getMessage());
        }

        redirect('/patient/dashboard');
    }
}
