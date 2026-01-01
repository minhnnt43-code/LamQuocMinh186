<?php
/**
 * ============================================================
 * FILE: api/tasks.php
 * API quản lý Tasks (Công việc)
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

switch ($method) {
    case 'GET':
        if ($action === 'single' && isset($_GET['id'])) {
            getTask($userId, $_GET['id']);
        } else {
            getAllTasks($userId);
        }
        break;
    case 'POST':
        createTask($userId);
        break;
    case 'PUT':
        updateTask($userId);
        break;
    case 'DELETE':
        deleteTask($userId);
        break;
    default:
        jsonResponse(['success' => false, 'error' => 'Method không hợp lệ'], 405);
}

/**
 * Lấy tất cả tasks của user
 */
function getAllTasks($userId) {
    $db = getDB();
    
    $stmt = $db->prepare("
        SELECT id, name, priority, category, due_date, status, project, 
               recurrence, link, tags, notes, created_at 
        FROM tasks 
        WHERE user_id = ? 
        ORDER BY due_date ASC, created_at DESC
    ");
    $stmt->execute([$userId]);
    $tasks = $stmt->fetchAll();
    
    // Format lại dữ liệu cho frontend
    $formattedTasks = array_map(function($task) {
        return [
            'id' => $task['id'],
            'name' => $task['name'],
            'priority' => $task['priority'],
            'category' => $task['category'],
            'dueDate' => $task['due_date'],
            'status' => $task['status'],
            'project' => $task['project'],
            'recurrence' => $task['recurrence'],
            'link' => $task['link'],
            'tags' => $task['tags'],
            'notes' => $task['notes']
        ];
    }, $tasks);
    
    jsonResponse([
        'success' => true,
        'tasks' => $formattedTasks
    ]);
}

/**
 * Lấy một task theo ID
 */
function getTask($userId, $taskId) {
    $db = getDB();
    
    $stmt = $db->prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?");
    $stmt->execute([$taskId, $userId]);
    $task = $stmt->fetch();
    
    if (!$task) {
        jsonResponse(['success' => false, 'error' => 'Task không tồn tại'], 404);
    }
    
    jsonResponse([
        'success' => true,
        'task' => [
            'id' => $task['id'],
            'name' => $task['name'],
            'priority' => $task['priority'],
            'category' => $task['category'],
            'dueDate' => $task['due_date'],
            'status' => $task['status'],
            'project' => $task['project'],
            'recurrence' => $task['recurrence'],
            'link' => $task['link'],
            'tags' => $task['tags'],
            'notes' => $task['notes']
        ]
    ]);
}

/**
 * Tạo task mới
 */
function createTask($userId) {
    $data = getRequestData();
    
    $id = $data['id'] ?? generateId('task');
    $name = trim($data['name'] ?? '');
    
    if (empty($name)) {
        jsonResponse(['success' => false, 'error' => 'Vui lòng nhập tên công việc'], 400);
    }
    
    $db = getDB();
    
    $stmt = $db->prepare("
        INSERT INTO tasks (id, user_id, name, priority, category, due_date, status, project, recurrence, link, tags, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $id,
        $userId,
        $name,
        $data['priority'] ?? 'medium',
        $data['category'] ?? 'Chung',
        $data['dueDate'] ?? date('Y-m-d'),
        $data['status'] ?? 'Chưa thực hiện',
        $data['project'] ?? '',
        $data['recurrence'] ?? 'none',
        $data['link'] ?? '',
        $data['tags'] ?? '',
        $data['notes'] ?? ''
    ]);
    
    jsonResponse([
        'success' => true,
        'message' => 'Đã tạo task mới!',
        'task' => [
            'id' => $id,
            'name' => $name
        ]
    ]);
}

/**
 * Cập nhật task
 */
function updateTask($userId) {
    $data = getRequestData();
    $taskId = $data['id'] ?? $_GET['id'] ?? '';
    
    if (empty($taskId)) {
        jsonResponse(['success' => false, 'error' => 'Thiếu ID task'], 400);
    }
    
    $db = getDB();
    
    // Kiểm tra task tồn tại và thuộc về user
    $stmt = $db->prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?");
    $stmt->execute([$taskId, $userId]);
    if (!$stmt->fetch()) {
        jsonResponse(['success' => false, 'error' => 'Task không tồn tại'], 404);
    }
    
    // Update
    $stmt = $db->prepare("
        UPDATE tasks SET 
            name = COALESCE(?, name),
            priority = COALESCE(?, priority),
            category = COALESCE(?, category),
            due_date = COALESCE(?, due_date),
            status = COALESCE(?, status),
            project = COALESCE(?, project),
            recurrence = COALESCE(?, recurrence),
            link = COALESCE(?, link),
            tags = COALESCE(?, tags),
            notes = COALESCE(?, notes)
        WHERE id = ? AND user_id = ?
    ");
    
    $stmt->execute([
        $data['name'] ?? null,
        $data['priority'] ?? null,
        $data['category'] ?? null,
        $data['dueDate'] ?? null,
        $data['status'] ?? null,
        $data['project'] ?? null,
        $data['recurrence'] ?? null,
        $data['link'] ?? null,
        $data['tags'] ?? null,
        $data['notes'] ?? null,
        $taskId,
        $userId
    ]);
    
    jsonResponse([
        'success' => true,
        'message' => 'Đã cập nhật task!'
    ]);
}

/**
 * Xóa task
 */
function deleteTask($userId) {
    $data = getRequestData();
    $taskId = $data['id'] ?? $_GET['id'] ?? '';
    
    if (empty($taskId)) {
        jsonResponse(['success' => false, 'error' => 'Thiếu ID task'], 400);
    }
    
    $db = getDB();
    
    $stmt = $db->prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?");
    $stmt->execute([$taskId, $userId]);
    
    if ($stmt->rowCount() === 0) {
        jsonResponse(['success' => false, 'error' => 'Task không tồn tại'], 404);
    }
    
    jsonResponse([
        'success' => true,
        'message' => 'Đã xóa task!'
    ]);
}
?>
