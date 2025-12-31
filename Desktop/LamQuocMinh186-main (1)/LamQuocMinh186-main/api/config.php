<?php
/**
 * ============================================================
 * FILE: api/config.php
 * Cấu hình kết nối Database MySQL cho LifeOS
 * ============================================================
 */

// ⚠️ QUAN TRỌNG: Thay đổi thông tin này theo hosting của bạn
define('DB_HOST', 'localhost');
define('DB_NAME', 'lamquocm_lamquocminh');
define('DB_USER', 'lamquocm_admin');
define('DB_PASS', '18062005Minh'); // ← Thay bằng password thật của bạn

// Cấu hình chung
define('SITE_URL', 'https://lamquocminh.id.vn');
define('API_VERSION', '1.0');

// Timezone Việt Nam
date_default_timezone_set('Asia/Ho_Chi_Minh');

// Bật hiển thị lỗi (TẮT khi deploy production)
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Session config
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 1); // HTTPS

/**
 * Kết nối Database bằng PDO
 */
function getDB() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode([
                'success' => false,
                'error' => 'Lỗi kết nối database: ' . $e->getMessage()
            ]));
        }
    }
    
    return $pdo;
}

/**
 * Hàm trả về JSON response
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Hàm lấy dữ liệu từ request body (JSON)
 */
function getRequestData() {
    $json = file_get_contents('php://input');
    return json_decode($json, true) ?? [];
}

/**
 * Hàm tạo ID unique
 */
function generateId($prefix = 'id') {
    return $prefix . '_' . uniqid() . '_' . bin2hex(random_bytes(4));
}

/**
 * Hàm kiểm tra user đã đăng nhập chưa
 */
function requireAuth() {
    session_start();
    if (!isset($_SESSION['user_id'])) {
        jsonResponse([
            'success' => false,
            'error' => 'Chưa đăng nhập'
        ], 401);
    }
    return $_SESSION['user_id'];
}

/**
 * Hàm lấy thông tin user hiện tại
 */
function getCurrentUser() {
    session_start();
    if (!isset($_SESSION['user_id'])) {
        return null;
    }
    return [
        'id' => $_SESSION['user_id'],
        'email' => $_SESSION['user_email'] ?? '',
        'displayName' => $_SESSION['user_name'] ?? ''
    ];
}
?>
