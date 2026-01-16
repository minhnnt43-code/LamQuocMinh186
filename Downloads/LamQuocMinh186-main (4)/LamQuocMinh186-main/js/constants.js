// --- FILE: js/constants.js ---
// Định nghĩa các hằng số để tránh magic strings

// ============================================================
// TASK STATUS - Trạng thái công việc
// ============================================================
export const TASK_STATUS = {
    PENDING: 'Chưa thực hiện',
    IN_PROGRESS: 'Đang làm',
    COMPLETED: 'Hoàn thành',
    CANCELLED: 'Đã hủy'
};

// ============================================================
// TASK PRIORITY - Mức độ ưu tiên
// ============================================================
export const TASK_PRIORITY = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
};

export const TASK_PRIORITY_LABELS = {
    high: 'Cao',
    medium: 'Trung bình',
    low: 'Thấp'
};

// ============================================================
// TASK CATEGORIES - Phân loại công việc
// ============================================================
export const TASK_CATEGORIES = [
    'Học tập',
    'Công việc',
    'Cá nhân',
    'Gia đình',
    'Khác'
];

// ============================================================
// TASK RECURRENCE - Lặp lại
// ============================================================
export const TASK_RECURRENCE = {
    NONE: 'none',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly'
};

// ============================================================
// FILTER TYPES - Bộ lọc
// ============================================================
export const FILTER_TYPES = {
    ALL: 'all',
    TODAY: 'today',
    IMPORTANT: 'important',
    INCOMPLETE: 'incomplete'
};

// ============================================================
// CALENDAR VIEW MODES - Chế độ xem lịch
// ============================================================
export const CALENDAR_VIEWS = {
    WEEK: 'week',
    MONTH: 'month',
    YEAR: 'year',
    LIST: 'list',
    KANBAN: 'kanban',
    TIMELINE: 'timeline'
};

// ============================================================
// NOTIFICATION TYPES - Loại thông báo
// ============================================================
export const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

// ============================================================
// GRADE SCALE - Thang điểm (GPA)
// ============================================================
export const GRADE_SCALE = {
    A_PLUS: { min: 9.0, char: 'A+', scale4: 4.0, rank: 'Xuất sắc' },
    A: { min: 8.0, char: 'A', scale4: 3.5, rank: 'Giỏi' },
    B_PLUS: { min: 7.0, char: 'B+', scale4: 3.0, rank: 'Khá' },
    B: { min: 6.0, char: 'B', scale4: 2.5, rank: 'Trung bình khá' },
    C: { min: 5.0, char: 'C', scale4: 2.0, rank: 'Trung bình' },
    D_PLUS: { min: 4.0, char: 'D+', scale4: 1.5, rank: 'Yếu' },
    D: { min: 3.0, char: 'D', scale4: 1.0, rank: 'Kém' },
    F: { min: 0, char: 'F', scale4: 0.0, rank: 'Kém' }
};

// ============================================================
// LOCAL STORAGE KEYS - Khóa localStorage
// ============================================================
export const STORAGE_KEYS = {
    GOOGLE_TOKEN: 'google_access_token',
    GEMINI_API_KEY: 'gemini_api_key',
    USER_SETTINGS: 'user_settings',
    DARK_MODE: 'darkMode'
};

// ============================================================
// EVENT TYPES - Loại sự kiện lịch
// ============================================================
export const EVENT_TYPES = {
    MANUAL: 'manual',
    GOOGLE: 'google',
    RECURRING: 'recurring'
};

// ============================================================
// HELPER FUNCTIONS - Hàm tiện ích
// ============================================================

/**
 * Kiểm tra task đã hoàn thành chưa
 * @param {string} status - Trạng thái task
 * @returns {boolean}
 */
export const isTaskCompleted = (status) => status === TASK_STATUS.COMPLETED;

/**
 * Kiểm tra task có mức ưu tiên cao không
 * @param {string} priority - Mức ưu tiên
 * @returns {boolean}
 */
export const isHighPriority = (priority) => priority === TASK_PRIORITY.HIGH || priority === 'Cao';

/**
 * Lấy label tiếng Việt của priority
 * @param {string} priority - Priority key
 * @returns {string}
 */
export const getPriorityLabel = (priority) => {
    return TASK_PRIORITY_LABELS[priority] || priority;
};
