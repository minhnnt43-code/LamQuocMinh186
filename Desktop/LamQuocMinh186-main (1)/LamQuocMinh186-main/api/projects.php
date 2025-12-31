<?php
/**
 * ============================================================
 * FILE: api/projects.php
 * API quản lý Projects (Dự án)
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

switch ($method) {
    case 'GET':
        getAllProjects($userId);
        break;
    case 'POST':
        createProject($userId);
        break;
    case 'PUT':
        updateProject($userId);
        break;
    case 'DELETE':
        deleteProject($userId);
        break;
    default:
        jsonResponse(['success' => false, 'error' => 'Method không hợp lệ'], 405);
}

function getAllProjects($userId) {
    $db = getDB();
    
    $stmt = $db->prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$userId]);
    $projects = $stmt->fetchAll();
    
    $formatted = array_map(function($p) {
        return [
            'id' => $p['id'],
            'name' => $p['name'],
            'description' => $p['description'],
            'startDate' => $p['start_date'],
            'endDate' => $p['end_date'],
            'status' => $p['status'],
            'color' => $p['color']
        ];
    }, $projects);
    
    jsonResponse(['success' => true, 'projects' => $formatted]);
}

function createProject($userId) {
    $data = getRequestData();
    
    $id = $data['id'] ?? generateId('proj');
    $name = trim($data['name'] ?? '');
    
    if (empty($name)) {
        jsonResponse(['success' => false, 'error' => 'Vui lòng nhập tên dự án'], 400);
    }
    
    $db = getDB();
    
    $stmt = $db->prepare("
        INSERT INTO projects (id, user_id, name, description, start_date, end_date, status, color, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $id,
        $userId,
        $name,
        $data['description'] ?? '',
        $data['startDate'] ?? date('Y-m-d'),
        $data['endDate'] ?? null,
        $data['status'] ?? 'Đang thực hiện',
        $data['color'] ?? '#667eea'
    ]);
    
    jsonResponse(['success' => true, 'message' => 'Đã tạo dự án!', 'project' => ['id' => $id]]);
}

function updateProject($userId) {
    $data = getRequestData();
    $projectId = $data['id'] ?? $_GET['id'] ?? '';
    
    if (empty($projectId)) {
        jsonResponse(['success' => false, 'error' => 'Thiếu ID dự án'], 400);
    }
    
    $db = getDB();
    
    $stmt = $db->prepare("
        UPDATE projects SET 
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            start_date = COALESCE(?, start_date),
            end_date = COALESCE(?, end_date),
            status = COALESCE(?, status),
            color = COALESCE(?, color)
        WHERE id = ? AND user_id = ?
    ");
    
    $stmt->execute([
        $data['name'] ?? null,
        $data['description'] ?? null,
        $data['startDate'] ?? null,
        $data['endDate'] ?? null,
        $data['status'] ?? null,
        $data['color'] ?? null,
        $projectId,
        $userId
    ]);
    
    jsonResponse(['success' => true, 'message' => 'Đã cập nhật dự án!']);
}

function deleteProject($userId) {
    $data = getRequestData();
    $projectId = $data['id'] ?? $_GET['id'] ?? '';
    
    if (empty($projectId)) {
        jsonResponse(['success' => false, 'error' => 'Thiếu ID dự án'], 400);
    }
    
    $db = getDB();
    
    $stmt = $db->prepare("DELETE FROM projects WHERE id = ? AND user_id = ?");
    $stmt->execute([$projectId, $userId]);
    
    jsonResponse(['success' => true, 'message' => 'Đã xóa dự án!']);
}
?>
