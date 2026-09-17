<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Models\Doctor;
use App\Models\Hospital;
use App\Models\Review;
use App\Models\Setting;

class HomeController extends Controller
{
    public function index(): void
    {
        $db = Database::getConnection();

        // Fetch active specialties with doctor count
        $specialties = $db->query("
            SELECT s.*, (
                SELECT COUNT(*) FROM doctors d
                JOIN users u ON d.user_id = u.id
                WHERE d.specialty_id = s.id AND d.approval_status = 'approved' AND u.status = 'active'
            ) as active_doctors
            FROM specialties s
            WHERE s.status = 'active'
            ORDER BY active_doctors DESC, s.name ASC
            LIMIT 12
        ")->fetchAll();

        // Fetch featured approved doctors
        $allApproved = Doctor::getApprovedDoctors();
        $featuredDoctors = array_slice($allApproved, 0, 6);

        // Fetch popular hospitals
        $hospitals = Hospital::getAll();
        if (empty($hospitals)) {
            // Fallback to distinct chambers if hospitals table empty
            $hospitals = $db->query("
                SELECT id, name, address, city, area, phone, '' as description
                FROM chambers
                GROUP BY name, address, city, area, phone
                ORDER BY id DESC LIMIT 6
            ")->fetchAll();
        } else {
            $hospitals = array_slice($hospitals, 0, 6);
        }

        // Fetch real approved patient reviews
        $patientReviews = Review::getRecentApproved(6);

        // Fetch platform counts
        $totalApprovedDocs = (int)$db->query("SELECT COUNT(*) FROM doctors WHERE approval_status = 'approved'")->fetchColumn();
        $totalBookings = (int)$db->query("SELECT COUNT(*) FROM appointments")->fetchColumn();
        $totalChambers = (int)$db->query("SELECT COUNT(*) FROM chambers")->fetchColumn();

        $this->view('home/index', [
            'specialties' => $specialties,
            'featuredDoctors' => $featuredDoctors,
            'hospitals' => $hospitals,
            'patientReviews' => $patientReviews,
            'stats' => [
                'doctors' => max(12, $totalApprovedDocs),
                'bookings' => max(150, $totalBookings),
                'chambers' => max(25, $totalChambers),
            ],
            'emergencyNotice' => Setting::get('emergency_notice', 'জরুরি ও সংকটজনক পরিস্থিতিতে অবিলম্বে নিকটস্থ জরুরি বিভাগে যোগাযোগ করুন।'),
            'hotline' => Setting::get('hotline_phone', '+880 1700-000000'),
        ]);
    }

    public function howItWorks(): void
    {
        redirect(url('/#how-it-works'));
    }

    public function about(): void
    {
        $this->index();
    }

    public function contact(): void
    {
        $this->index();
    }

    public function terms(): void
    {
        $this->index();
    }

    public function privacy(): void
    {
        $this->index();
    }

    public function page(array $params = []): void
    {
        $this->index();
    }

    public function notFound(string $uri = ''): void
    {
        http_response_code(404);
        $this->view('errors/404', [
            'requestedUri' => $uri ?: ($_SERVER['REQUEST_URI'] ?? ''),
        ], 'main');
    }
}
