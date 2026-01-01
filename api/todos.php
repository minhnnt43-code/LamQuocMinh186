<?php
/**
 * ============================================================
 * FILE: api/todos.php
 * API quản lý To-do Groups và To-do Items
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
        getAllTodoGroups($userId);
        break;
    case 'POST':
        if ($action === 'add-item') {
            addTodoItem($userId);
        } else {
            createTodoGroup($userId);
        }
        break;
    case 'PUT':
        if ($action === 'toggle-item') {
            toggleTodoItem($userId);
        } else {
            updateTodoGroup($userId);
        }
        break;
    case 'DELETE':
        if ($action === 'delete-item') {
            deleteTodoItem($userId);
        } else {
            deleteTodoGroup($userId);
        }
        break;
    default:
        jsonResponse(['success' => false, 'error' => 'Method không hợp lệ'], 405);
}

function getAllTodoGroups($userId) {
    $db = getDB();
    
    $stmt = $db->prepare("SELECT * FROM todo_groups WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$userId]);
    $groups = $stmt->fetchAll();
    
    $formatted = array_map(function($g) {
        return [
            'id' => $g['id'],
            'name' => $g['name'],
            'color' => $g['color'],
            'deadline' => $g['deadline'],
            'items' => json_decode($g['items'], true) ?: [],
            'createdDate' => $g['created_at']
        ];
    }, $groups);
    
    jsonResponse(['success' => true, 'todoGroups' => $formatted]);
}

function createTodoGroup($userId) {
    $data = getRequestData();
    
    $id = $data['id'] ?? generateId('tg');
    $name = trim($data['name'] ?? '');
    
    if (empty($name)) {
        jsonResponse(['success' => false, 'error' => 'Vui lòng nhập tên nhóm'], 400);
    }
    
    $db = getDB();
    
    $items = $data['items'] ?? [];
    
    $stmt = $db->prepare("
        INSERT INTO todo_groups (id, user_id, name, color, deadline, items, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $id,
        $userId,
        $name,
        $data['color'] ?? '#667eea',
        $data['deadline'] ?? null,
        json_encode($items)
    ]);
    
    jsonResponse(['success' => true, 'message' => 'Đã tạo nhóm!', 'group' => ['id' => $id]]);
}

function updateTodoGroup($userId) {
    $data = getRequestData();
    $groupId = $data['id'] ?? $_GET['id'] ?? '';
    
    if (empty($groupId)) {
        jsonResponse(['success' => false, 'error' => 'Thiếu ID nhóm'], 400);
    }
    
    $db = getDB();
    
    $updates = [];
    $params = [];
    
    if (isset($data['name'])) {
        $updates[] = "name = ?";
        $params[] = $data['name'];
    }
    if (isset($data['color'])) {
        $updates[] = "color = ?";
        $params[] = $data['color'];
    }
    if (isset($data['deadline'])) {
        $updates[] = "deadline = ?";
        $params[] = $data['deadline'];
    }
    if (isset($data['items'])) {
        $updates[] = "items = ?";
        $params[] = json_encode($data['items']);
    }
    
    if (empty($updates)) {
        jsonResponse(['success' => false, 'error' => 'Không có dữ liệu để cập nhật'], 400);
    }
    
    $params[] = $groupId;
    $params[] = $userId;
    
    $sql = "UPDATE todo_groups SET " . implode(", ", $updates) . " WHERE id = ? AND user_id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    jsonResponse(['success' => true, 'message' => 'Đã cập nhật nhóm!']);
}

function deleteTodoGroup($userId) {
    $data = getRequestData();
    $groupId = $data['id'] ?? $_GET['id'] ?? '';
    
    if (empty($groupId)) {
        jsonResponse(['success' => false, 'error' => 'Thiếu ID nhóm'], 400);
    }
    
    $db = getDB();
    
    $stmt = $db->prepare("DELETE FROM todo_groups WHERE id = ? AND user_id = ?");
    $stmt->execute([$groupId, $userId]);
    
    jsonResponse(['success' => true, 'message' => 'Đã xóa nhóm!']);
}

function addTodoItem($userId) {
    $data = getRequestData();
    $groupId = $data['groupId'] ?? '';
    $itemText = trim($data['text'] ?? '');
    
    if (empty($groupId) || empty($itemText)) {
        jsonResponse(['success' => false, 'error' => 'Thiếu thông tin'], 400);
    }
    
    $db = getDB();
    
    // Lấy group hiện tại
    $stmt = $db->prepare("SELECT items FROM todo_groups WHERE id = ? AND user_id = ?");
    $stmt->execute([$groupId, $userId]);
    $group = $stmt->fetch();
    
    if (!$group) {
        jsonResponse(['success' => false, 'error' => 'Nhóm không tồn tại'], 404);
    }
    
    $items = json_decode($group['items'], true) ?: [];
    $items[] = [
        'id' => generateId('item'),
        'text' => $itemText,
        'completed' => false
    ];
    
    // Cập nhật
    $stmt = $db->prepare("UPDATE todo_groups SET items = ? WHERE id = ?");
    $stmt->execute([json_encode($items), $groupId]);
    
    jsonResponse(['success' => true, 'message' => 'Đã thêm item!']);
}

function toggleTodoItem($userId) {
    $data = getRequestData();
    $groupId = $data['groupId'] ?? '';
    $itemId = $data['itemId'] ?? '';
    
    if (empty($groupId) || empty($itemId)) {
        jsonResponse(['success' => false, 'error' => 'Thiếu thông tin'], 400);
    }
    
    $db = getDB();
    
    $stmt = $db->prepare("SELECT items FROM todo_groups WHERE id = ? AND user_id = ?");
    $stmt->execute([$groupId, $userId]);
    $group = $stmt->fetch();
    
    if (!$group) {
        jsonResponse(['success' => false, 'error' => 'Nhóm không tồn tại'], 404);
    }
    
    $items = json_decode($group['items'], true) ?: [];
    foreach ($items as &$item) {
        if ($item['id'] === $itemId) {
            $item['completed'] = !$item['completed'];
            break;
        }
    }
    
    $stmt = $db->prepare("UPDATE todo_groups SET items = ? WHERE id = ?");
    $stmt->execute([json_encode($items), $groupId]);
    
    jsonResponse(['success' => true, 'message' => 'Đã cập nhật!']);
}

function deleteTodoItem($userId) {
    $data = getRequestData();
    $groupId = $data['groupId'] ?? '';
    $itemId = $data['itemId'] ?? '';
    
    if (empty($groupId) || empty($itemId)) {
        jsonResponse(['success' => false, 'error' => 'Thiếu thông tin'], 400);
    }
    
    $db = getDB();
    
    $stmt = $db->prepare("SELECT items FROM todo_groups WHERE id = ? AND user_id = ?");
    $stmt->execute([$groupId, $userId]);
    $group = $stmt->fetch();
    
    if (!$group) {
        jsonResponse(['success' => false, 'error' => 'Nhóm không tồn tại'], 404);
    }
    
    $items = json_decode($group['items'], true) ?: [];
    $items = array_filter($items, fn($item) => $item['id'] !== $itemId);
    $items = array_values($items); // Re-index
    
    $stmt = $db->prepare("UPDATE todo_groups SET items = ? WHERE id = ?");
    $stmt->execute([json_encode($items), $groupId]);
    
    jsonResponse(['success' => true, 'message' => 'Đã xóa item!']);
}
?>
