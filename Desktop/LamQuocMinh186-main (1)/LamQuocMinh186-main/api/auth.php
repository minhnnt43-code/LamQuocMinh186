<?php
/**
 * ============================================================
 * FILE: api/auth.php
 * Xử lý Đăng nhập / Đăng ký / Đăng xuất
 * ============================================================
 */

require_once 'config.php';

// Xử lý CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    exit(0);
}

// Lấy action từ URL: api/auth.php?action=login
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'register':
        handleRegister();
        break;
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'check':
        checkAuthStatus();
        break;
    case 'update-profile':
        updateProfile();
        break;
    default:
        jsonResponse(['success' => false, 'error' => 'Action không hợp lệ'], 400);
}

/**
 * Đăng ký tài khoản mới
 */
function handleRegister() {
    $data = getRequestData();
    
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    $displayName = trim($data['displayName'] ?? '');
    
    // Validate
    if (empty($email) || empty($password)) {
        jsonResponse(['success' => false, 'error' => 'Vui lòng nhập email và mật khẩu'], 400);
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['success' => false, 'error' => 'Email không hợp lệ'], 400);
    }
    
    if (strlen($password) < 6) {
        jsonResponse(['success' => false, 'error' => 'Mật khẩu phải có ít nhất 6 ký tự'], 400);
    }
    
    $db = getDB();
    
    // Kiểm tra email đã tồn tại chưa
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonResponse(['success' => false, 'error' => 'Email đã được sử dụng'], 400);
    }
    
    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Tạo user mới
    $stmt = $db->prepare("
        INSERT INTO users (email, password, display_name, created_at) 
        VALUES (?, ?, ?, NOW())
    ");
    $stmt->execute([$email, $hashedPassword, $displayName ?: 'User']);
    
    $userId = $db->lastInsertId();
    
    // Tự động đăng nhập sau khi đăng ký
    session_start();
    $_SESSION['user_id'] = $userId;
    $_SESSION['user_email'] = $email;
    $_SESSION['user_name'] = $displayName ?: 'User';
    
    jsonResponse([
        'success' => true,
        'message' => 'Đăng ký thành công!',
        'user' => [
            'uid' => $userId,
            'email' => $email,
            'displayName' => $displayName ?: 'User'
        ]
    ]);
}

/**
 * Đăng nhập
 */
function handleLogin() {
    $data = getRequestData();
    
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        jsonResponse(['success' => false, 'error' => 'Vui lòng nhập email và mật khẩu'], 400);
    }
    
    $db = getDB();
    
    // Tìm user theo email
    $stmt = $db->prepare("SELECT id, email, password, display_name, avatar_url, settings FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        jsonResponse(['success' => false, 'error' => 'Email không tồn tại'], 401);
    }
    
    // Kiểm tra password
    if (!password_verify($password, $user['password'])) {
        jsonResponse(['success' => false, 'error' => 'Mật khẩu không đúng'], 401);
    }
    
    // Tạo session
    session_start();
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_name'] = $user['display_name'];
    
    // Parse settings JSON
    $settings = $user['settings'] ? json_decode($user['settings'], true) : [];
    
    jsonResponse([
        'success' => true,
        'message' => 'Đăng nhập thành công!',
        'user' => [
            'uid' => $user['id'],
            'email' => $user['email'],
            'displayName' => $user['display_name'],
            'photoURL' => $user['avatar_url'] ?: 'https://placehold.co/80'
        ],
        'settings' => $settings
    ]);
}

/**
 * Đăng xuất
 */
function handleLogout() {
    session_start();
    session_destroy();
    
    jsonResponse([
        'success' => true,
        'message' => 'Đã đăng xuất'
    ]);
}

/**
 * Kiểm tra trạng thái đăng nhập
 */
function checkAuthStatus() {
    session_start();
    
    if (!isset($_SESSION['user_id'])) {
        jsonResponse([
            'success' => true,
            'authenticated' => false,
            'user' => null
        ]);
    }
    
    $db = getDB();
    $stmt = $db->prepare("SELECT id, email, display_name, avatar_url, settings FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user) {
        session_destroy();
        jsonResponse([
            'success' => true,
            'authenticated' => false,
            'user' => null
        ]);
    }
    
    $settings = $user['settings'] ? json_decode($user['settings'], true) : [];
    
    jsonResponse([
        'success' => true,
        'authenticated' => true,
        'user' => [
            'uid' => $user['id'],
            'email' => $user['email'],
            'displayName' => $user['display_name'],
            'photoURL' => $user['avatar_url'] ?: 'https://placehold.co/80'
        ],
        'settings' => $settings
    ]);
}

/**
 * Cập nhật thông tin profile
 */
function updateProfile() {
    $userId = requireAuth();
    $data = getRequestData();
    
    $displayName = trim($data['displayName'] ?? '');
    $avatarUrl = trim($data['avatarUrl'] ?? '');
    $settings = $data['settings'] ?? null;
    
    $db = getDB();
    
    $updates = [];
    $params = [];
    
    if (!empty($displayName)) {
        $updates[] = "display_name = ?";
        $params[] = $displayName;
        $_SESSION['user_name'] = $displayName;
    }
    
    if (!empty($avatarUrl)) {
        $updates[] = "avatar_url = ?";
        $params[] = $avatarUrl;
    }
    
    if ($settings !== null) {
        $updates[] = "settings = ?";
        $params[] = json_encode($settings);
    }
    
    if (empty($updates)) {
        jsonResponse(['success' => false, 'error' => 'Không có dữ liệu để cập nhật'], 400);
    }
    
    $params[] = $userId;
    $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    jsonResponse([
        'success' => true,
        'message' => 'Cập nhật thành công!'
    ]);
}
?>
