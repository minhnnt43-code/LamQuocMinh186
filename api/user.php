<?php
/**
 * ============================================================
 * FILE: api/user.php
 * API quản lý dữ liệu User (userData, settings, achievements...)
 * ============================================================
 */

require_once 'config.php';

// CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    exit(0);
}

$userId = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get-all':
        getAllUserData($userId);
        break;
    case 'save':
        saveUserData($userId);
        break;
    case 'achievements':
        handleAchievements($userId, $method);
        break;
    case 'personal-info':
        handlePersonalInfo($userId, $method);
        break;
    case 'settings':
        handleSettings($userId, $method);
        break;
    default:
        if ($method === 'GET') {
            getAllUserData($userId);
        } else {
            jsonResponse(['success' => false, 'error' => 'Action không hợp lệ'], 400);
        }
}

/**
 * Lấy tất cả dữ liệu của user (để load lúc đăng nhập)
 */
function getAllUserData($userId) {
    $db = getDB();
    
    // Lấy thông tin user
    $stmt = $db->prepare("SELECT id, email, display_name, avatar_url, settings, personal_info, achievements FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        jsonResponse(['success' => false, 'error' => 'User không tồn tại'], 404);
    }
    
    // Lấy tasks
    $stmt = $db->prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC");
    $stmt->execute([$userId]);
    $tasks = $stmt->fetchAll();
    
    // Lấy calendar events
    $stmt = $db->prepare("SELECT * FROM calendar_events WHERE user_id = ? ORDER BY date ASC");
    $stmt->execute([$userId]);
    $calendarEvents = $stmt->fetchAll();
    
    // Lấy projects
    $stmt = $db->prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$userId]);
    $projects = $stmt->fetchAll();
    
    // Lấy todo groups
    $stmt = $db->prepare("SELECT * FROM todo_groups WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$userId]);
    $todoGroups = $stmt->fetchAll();
    
    // Format dữ liệu
    $userData = [
        'email' => $user['email'],
        'personalInfo' => json_decode($user['personal_info'], true) ?: [],
        'settings' => json_decode($user['settings'], true) ?: [],
        'achievements' => json_decode($user['achievements'], true) ?: [],
        'tasks' => array_map(function($t) {
            return [
                'id' => $t['id'],
                'name' => $t['name'],
                'priority' => $t['priority'],
                'category' => $t['category'],
                'dueDate' => $t['due_date'],
                'status' => $t['status'],
                'project' => $t['project'],
                'recurrence' => $t['recurrence'],
                'link' => $t['link'],
                'tags' => $t['tags'],
                'notes' => $t['notes']
            ];
        }, $tasks),
        'calendarEvents' => array_map(function($e) {
            return [
                'id' => $e['id'],
                'title' => $e['title'],
                'date' => $e['date'],
                'startTime' => $e['start_time'],
                'endTime' => $e['end_time'],
                'color' => $e['color'],
                'description' => $e['description'],
                'linkedTaskId' => $e['linked_task_id'],
                'type' => $e['type']
            ];
        }, $calendarEvents),
        'projects' => array_map(function($p) {
            return [
                'id' => $p['id'],
                'name' => $p['name'],
                'description' => $p['description'],
                'startDate' => $p['start_date'],
                'endDate' => $p['end_date'],
                'status' => $p['status'],
                'color' => $p['color']
            ];
        }, $projects),
        'todoGroups' => array_map(function($g) {
            return [
                'id' => $g['id'],
                'name' => $g['name'],
                'color' => $g['color'],
                'deadline' => $g['deadline'],
                'items' => json_decode($g['items'], true) ?: [],
                'createdDate' => $g['created_at']
            ];
        }, $todoGroups),
        'todos' => [], // Deprecated - dùng todoGroups
        'documents' => [],
        'drafts' => [],
        'outlines' => [],
        'studentJourney' => []
    ];
    
    jsonResponse([
        'success' => true,
        'userData' => $userData
    ]);
}

/**
 * Lưu dữ liệu user (batch save)
 */
function saveUserData($userId) {
    $data = getRequestData();
    $db = getDB();
    
    // Nếu có tasks, sync vào bảng tasks
    if (isset($data['tasks']) && is_array($data['tasks'])) {
        foreach ($data['tasks'] as $task) {
            $stmt = $db->prepare("
                INSERT INTO tasks (id, user_id, name, priority, category, due_date, status, project, recurrence, link, tags, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    priority = VALUES(priority),
                    category = VALUES(category),
                    due_date = VALUES(due_date),
                    status = VALUES(status),
                    project = VALUES(project),
                    recurrence = VALUES(recurrence),
                    link = VALUES(link),
                    tags = VALUES(tags),
                    notes = VALUES(notes)
            ");
            $stmt->execute([
                $task['id'] ?? generateId('task'),
                $userId,
                $task['name'] ?? '',
                $task['priority'] ?? 'medium',
                $task['category'] ?? 'Chung',
                $task['dueDate'] ?? date('Y-m-d'),
                $task['status'] ?? 'Chưa thực hiện',
                $task['project'] ?? '',
                $task['recurrence'] ?? 'none',
                $task['link'] ?? '',
                $task['tags'] ?? '',
                $task['notes'] ?? ''
            ]);
        }
    }
    
    // Nếu có calendarEvents, sync vào bảng calendar_events
    if (isset($data['calendarEvents']) && is_array($data['calendarEvents'])) {
        foreach ($data['calendarEvents'] as $event) {
            $stmt = $db->prepare("
                INSERT INTO calendar_events (id, user_id, title, date, start_time, end_time, color, description, linked_task_id, type, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    date = VALUES(date),
                    start_time = VALUES(start_time),
                    end_time = VALUES(end_time),
                    color = VALUES(color),
                    description = VALUES(description),
                    linked_task_id = VALUES(linked_task_id)
            ");
            $stmt->execute([
                $event['id'] ?? generateId('ev'),
                $userId,
                $event['title'] ?? '',
                $event['date'] ?? date('Y-m-d'),
                $event['startTime'] ?? '08:00',
                $event['endTime'] ?? '09:00',
                $event['color'] ?? '#3788d8',
                $event['description'] ?? '',
                $event['linkedTaskId'] ?? null,
                $event['type'] ?? 'manual'
            ]);
        }
    }
    
    // Update settings/achievements/personalInfo trực tiếp vào bảng users
    $updates = [];
    $params = [];
    
    if (isset($data['settings'])) {
        $updates[] = "settings = ?";
        $params[] = json_encode($data['settings']);
    }
    if (isset($data['achievements'])) {
        $updates[] = "achievements = ?";
        $params[] = json_encode($data['achievements']);
    }
    if (isset($data['personalInfo'])) {
        $updates[] = "personal_info = ?";
        $params[] = json_encode($data['personalInfo']);
    }
    
    if (!empty($updates)) {
        $params[] = $userId;
        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
    }
    
    jsonResponse([
        'success' => true,
        'message' => 'Đã lưu dữ liệu!'
    ]);
}

function handleAchievements($userId, $method) {
    $db = getDB();
    
    if ($method === 'GET') {
        $stmt = $db->prepare("SELECT achievements FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        jsonResponse([
            'success' => true,
            'achievements' => json_decode($user['achievements'], true) ?: []
        ]);
    } else if ($method === 'POST' || $method === 'PUT') {
        $data = getRequestData();
        $achievements = $data['achievements'] ?? [];
        
        $stmt = $db->prepare("UPDATE users SET achievements = ? WHERE id = ?");
        $stmt->execute([json_encode($achievements), $userId]);
        
        jsonResponse(['success' => true, 'message' => 'Đã cập nhật thành tích!']);
    }
}

function handlePersonalInfo($userId, $method) {
    $db = getDB();
    
    if ($method === 'GET') {
        $stmt = $db->prepare("SELECT personal_info FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        jsonResponse([
            'success' => true,
            'personalInfo' => json_decode($user['personal_info'], true) ?: []
        ]);
    } else if ($method === 'POST' || $method === 'PUT') {
        $data = getRequestData();
        
        $stmt = $db->prepare("UPDATE users SET personal_info = ? WHERE id = ?");
        $stmt->execute([json_encode($data), $userId]);
        
        jsonResponse(['success' => true, 'message' => 'Đã cập nhật thông tin!']);
    }
}

function handleSettings($userId, $method) {
    $db = getDB();
    
    if ($method === 'GET') {
        $stmt = $db->prepare("SELECT settings FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        jsonResponse([
            'success' => true,
            'settings' => json_decode($user['settings'], true) ?: []
        ]);
    } else if ($method === 'POST' || $method === 'PUT') {
        $data = getRequestData();
        
        $stmt = $db->prepare("UPDATE users SET settings = ? WHERE id = ?");
        $stmt->execute([json_encode($data), $userId]);
        
        jsonResponse(['success' => true, 'message' => 'Đã cập nhật cài đặt!']);
    }
}
?>
