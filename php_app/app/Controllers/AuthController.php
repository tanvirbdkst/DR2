<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Core\Session;
use App\Models\User;
use App\Models\Doctor;

class AuthController extends Controller
{
    public function showLogin(): void
    {
        if (Session::has('user')) {
            $this->redirectByRole(Session::get('user')['role']);
        }
        $this->view('auth/login');
    }

    public function login(): void
    {
        $this->validateCsrf();

        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';

        if (empty($email) || empty($password)) {
            Session::flash('error', 'Email and password are required.');
            redirect('/login');
        }

        $user = User::findByEmail($email);
        if (!$user || !password_verify($password, $user['password_hash'])) {
            Session::flash('error', 'Invalid email or password.');
            redirect('/login');
        }

        // Get additional role metadata
        $role = $user['role'];
        $doctorId = null;
        $effectiveStatus = $user['status'];

        if ($role === 'doctor') {
            $doc = Doctor::findByUserId((int)$user['id']);
            if ($doc) {
                $doctorId = (int)$doc['id'];
                $effectiveStatus = $doc['approval_status'];
            }
        }

        // Set session
        session_regenerate_id(true);
        Session::set('user', [
            'id' => (int)$user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'phone' => $user['phone'],
            'role' => $role,
            'status' => $effectiveStatus,
            'avatar_url' => $user['avatar_url'],
            'doctor_id' => $doctorId,
        ]);

        User::logActivity((int)$user['id'], 'USER_LOGIN', "User logged in with role: {$role}");

        Session::flash('success', "Welcome back, {$user['name']}!");
        $this->redirectByRole($role);
    }

    public function showRegisterPatient(): void
    {
        if (Session::has('user')) {
            $this->redirectByRole(Session::get('user')['role']);
        }
        $this->view('auth/register_patient');
    }

    public function registerPatient(): void
    {
        $this->validateCsrf();

        $name = trim($_POST['name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $password = $_POST['password'] ?? '';
        $gender = $_POST['gender'] ?? 'male';
        $bloodGroup = $_POST['blood_group'] ?? null;
        $address = trim($_POST['address'] ?? '');

        if (empty($name) || empty($email) || empty($phone) || empty($password)) {
            Session::flash('error', 'Name, email, phone, and password are required.');
            redirect('/register/patient');
        }

        if (User::findByEmail($email)) {
            Session::flash('error', 'An account with this email already exists.');
            redirect('/register/patient');
        }

        $db = Database::getConnection();
        $db->beginTransaction();
        try {
            $userId = User::create([
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'password' => $password,
                'role' => 'patient',
                'status' => 'active',
            ]);

            $stmt = $db->prepare("
                INSERT INTO patients (user_id, blood_group, gender, address)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([$userId, $bloodGroup ?: null, $gender ?: null, $address ?: null]);

            $db->commit();

            // Set session
            session_regenerate_id(true);
            Session::set('user', [
                'id' => $userId,
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'role' => 'patient',
                'status' => 'active',
            ]);

            User::logActivity($userId, 'PATIENT_REGISTER', "New patient registered: {$email}");
            Session::flash('success', 'Registration successful! Welcome to Daktar Serial.');
            redirect('/patient/dashboard');
        } catch (\Throwable $e) {
            $db->rollBack();
            Session::flash('error', 'Registration failed: ' . $e->getMessage());
            redirect('/register/patient');
        }
    }

    public function showRegisterDoctor(): void
    {
        if (Session::has('user')) {
            $this->redirectByRole(Session::get('user')['role']);
        }
        $db = Database::getConnection();
        $specialties = $db->query("SELECT * FROM specialties WHERE status = 'active' ORDER BY name ASC")->fetchAll();
        $this->view('auth/register_doctor', ['specialties' => $specialties]);
    }

    public function registerDoctor(): void
    {
        $this->validateCsrf();

        $name = trim($_POST['name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $password = $_POST['password'] ?? '';
        $bmdcNumber = trim($_POST['bmdc_number'] ?? '');
        $qualification = trim($_POST['qualification'] ?? '');
        $specialtyId = !empty($_POST['specialty_id']) ? (int)$_POST['specialty_id'] : null;
        $experience = (int)($_POST['experience_years'] ?? 0);
        $consultationFee = (float)($_POST['consultation_fee'] ?? 500);
        $bio = trim($_POST['bio'] ?? '');
        $chamberName = trim($_POST['chamber_name'] ?? '');
        $chamberAddress = trim($_POST['chamber_address'] ?? '');
        $city = trim($_POST['city'] ?? 'Dhaka');
        $area = trim($_POST['area'] ?? $city);

        if (empty($name) || empty($email) || empty($phone) || empty($password) || empty($bmdcNumber) || empty($qualification)) {
            Session::flash('error', 'All essential doctor registration fields are required.');
            redirect('/register/doctor');
        }

        if (User::findByEmail($email)) {
            Session::flash('error', 'An account with this email already exists.');
            redirect('/register/doctor');
        }

        $db = Database::getConnection();
        $checkBmdc = $db->prepare("SELECT id FROM doctors WHERE bmdc_number = ?");
        $checkBmdc->execute([$bmdcNumber]);
        if ($checkBmdc->fetch()) {
            Session::flash('error', 'This BMDC registration number is already registered.');
            redirect('/register/doctor');
        }

        $db->beginTransaction();
        try {
            $userId = User::create([
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'password' => $password,
                'role' => 'doctor',
                'status' => 'pending',
            ]);

            $stmt = $db->prepare("
                INSERT INTO doctors (user_id, specialty_id, title, bmdc_number, qualification, experience_years, bio, consultation_fee, approval_status)
                VALUES (?, ?, 'Dr.', ?, ?, ?, ?, ?, 'pending')
            ");
            $stmt->execute([
                $userId,
                $specialtyId,
                $bmdcNumber,
                $qualification,
                $experience,
                $bio,
                $consultationFee,
            ]);
            $doctorId = (int)$db->lastInsertId();

            if (!empty($chamberName) && !empty($chamberAddress)) {
                $chamStmt = $db->prepare("
                    INSERT INTO chambers (doctor_id, name, address, city, area, phone)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $chamStmt->execute([$doctorId, $chamberName, $chamberAddress, $city, $area, $phone]);
                $chamberId = (int)$db->lastInsertId();

                $dcStmt = $db->prepare("
                    INSERT INTO doctor_chambers (doctor_id, chamber_id, consultation_fee, follow_up_fee)
                    VALUES (?, ?, ?, ?)
                ");
                $dcStmt->execute([$doctorId, $chamberId, $consultationFee, $consultationFee * 0.6]);
            }

            $db->commit();

            session_regenerate_id(true);
            Session::set('user', [
                'id' => $userId,
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'role' => 'doctor',
                'status' => 'pending',
                'doctor_id' => $doctorId,
            ]);

            User::logActivity($userId, 'DOCTOR_REGISTER', "Doctor registered pending approval: {$email} (BMDC: {$bmdcNumber})");
            Session::flash('success', 'Your doctor registration has been submitted and is currently pending verification.');
            redirect('/doctor/dashboard');
        } catch (\Throwable $e) {
            $db->rollBack();
            Session::flash('error', 'Registration failed: ' . $e->getMessage());
            redirect('/register/doctor');
        }
    }

    public function logout(): void
    {
        $user = currentUser();
        if ($user) {
            User::logActivity((int)$user['id'], 'USER_LOGOUT', 'User logged out');
        }
        Session::destroy();
        redirect('/');
    }

    public function switchLang(array $params): void
    {
        $lang = $params['lang'] ?? 'bn';
        if (in_array($lang, ['bn', 'en'], true)) {
            Session::set('lang', $lang);
        }
        redirect($_SERVER['HTTP_REFERER'] ?? '/');
    }

    private function redirectByRole(string $role): void
    {
        if ($role === 'admin') {
            redirect('/admin/dashboard');
        } elseif ($role === 'doctor') {
            redirect('/doctor/dashboard');
        } else {
            redirect('/patient/dashboard');
        }
    }
}
