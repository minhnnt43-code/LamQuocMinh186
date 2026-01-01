<?php
/**
 * ============================================================
 * FILE: api/calendar.php
 * API quản lý Calendar Events (Sự kiện lịch)
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
        getAllEvents($userId);
        break;
    case 'POST':
        createEvent($userId);
        break;
    case 'PUT':
        updateEvent($userId);
        break;
    case 'DELETE':
        deleteEvent($userId);
        break;
    default:
        jsonResponse(['success' => false, 'error' => 'Method không hợp lệ'], 405);
}

/**
 * Lấy tất cả events của user
 */
function getAllEvents($userId) {
    $db = getDB();
    
    // Optional: filter by date range
    $startDate = $_GET['start'] ?? null;
    $endDate = $_GET['end'] ?? null;
    
    $sql = "SELECT * FROM calendar_events WHERE user_id = ?";
    $params = [$userId];
    
    if ($startDate && $endDate) {
        $sql .= " AND date BETWEEN ? AND ?";
        $params[] = $startDate;
        $params[] = $endDate;
    }
    
    $sql .= " ORDER BY date ASC, start_time ASC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $events = $stmt->fetchAll();
    
    // Format cho frontend
    $formattedEvents = array_map(function($event) {
        return [
            'id' => $event['id'],
            'title' => $event['title'],
            'date' => $event['date'],
            'startTime' => $event['start_time'],
            'endTime' => $event['end_time'],
            'color' => $event['color'],
            'description' => $event['description'],
            'linkedTaskId' => $event['linked_task_id'],
            'type' => $event['type']
        ];
    }, $events);
    
    jsonResponse([
        'success' => true,
        'calendarEvents' => $formattedEvents
    ]);
}

/**
 * Tạo event mới
 */
function createEvent($userId) {
    $data = getRequestData();
    
    $id = $data['id'] ?? generateId('ev');
    $title = trim($data['title'] ?? '');
    
    if (empty($title)) {
        jsonResponse(['success' => false, 'error' => 'Vui lòng nhập tiêu đề sự kiện'], 400);
    }
    
    $db = getDB();
    
    $stmt = $db->prepare("
        INSERT INTO calendar_events (id, user_id, title, date, start_time, end_time, color, description, linked_task_id, type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $id,
        $userId,
        $title,
        $data['date'] ?? date('Y-m-d'),
        $data['startTime'] ?? '08:00',
        $data['endTime'] ?? '09:00',
        $data['color'] ?? '#3788d8',
        $data['description'] ?? '',
        $data['linkedTaskId'] ?? null,
        $data['type'] ?? 'manual'
    ]);
    
    jsonResponse([
        'success' => true,
        'message' => 'Đã tạo sự kiện!',
        'event' => ['id' => $id, 'title' => $title]
    ]);
}

/**
 * Cập nhật event
 */
function updateEvent($userId) {
    $data = getRequestData();
    $eventId = $data['id'] ?? $_GET['id'] ?? '';
    
    if (empty($eventId)) {
        jsonResponse(['success' => false, 'error' => 'Thiếu ID sự kiện'], 400);
    }
    
    $db = getDB();
    
    // Kiểm tra event tồn tại
    $stmt = $db->prepare("SELECT id FROM calendar_events WHERE id = ? AND user_id = ?");
    $stmt->execute([$eventId, $userId]);
    if (!$stmt->fetch()) {
        jsonResponse(['success' => false, 'error' => 'Sự kiện không tồn tại'], 404);
    }
    
    $stmt = $db->prepare("
        UPDATE calendar_events SET 
            title = COALESCE(?, title),
            date = COALESCE(?, date),
            start_time = COALESCE(?, start_time),
            end_time = COALESCE(?, end_time),
            color = COALESCE(?, color),
            description = COALESCE(?, description),
            linked_task_id = COALESCE(?, linked_task_id)
        WHERE id = ? AND user_id = ?
    ");
    
    $stmt->execute([
        $data['title'] ?? null,
        $data['date'] ?? null,
        $data['startTime'] ?? null,
        $data['endTime'] ?? null,
        $data['color'] ?? null,
        $data['description'] ?? null,
        $data['linkedTaskId'] ?? null,
        $eventId,
        $userId
    ]);
    
    jsonResponse([
        'success' => true,
        'message' => 'Đã cập nhật sự kiện!'
    ]);
}

/**
 * Xóa event
 */
function deleteEvent($userId) {
    $data = getRequestData();
    $eventId = $data['id'] ?? $_GET['id'] ?? '';
    
    if (empty($eventId)) {
        jsonResponse(['success' => false, 'error' => 'Thiếu ID sự kiện'], 400);
    }
    
    $db = getDB();
    
    $stmt = $db->prepare("DELETE FROM calendar_events WHERE id = ? AND user_id = ?");
    $stmt->execute([$eventId, $userId]);
    
    if ($stmt->rowCount() === 0) {
        jsonResponse(['success' => false, 'error' => 'Sự kiện không tồn tại'], 404);
    }
    
    jsonResponse([
        'success' => true,
        'message' => 'Đã xóa sự kiện!'
    ]);
}
?>
