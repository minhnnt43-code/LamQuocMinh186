// ============================================================
// FILE: js/rules-engine.js
// Mục đích: Tự động phân loại & gắn màu sắc theo quy tắc
// Không dùng AI - Chỉ dùng logic từ khóa (keyword matching)
// ============================================================

/**
 * Bảng quy tắc: Mỗi nhóm chứa danh sách từ khóa,
 * màu sắc, icon đại diện, và có tự động đẩy priority không.
 */
export const CATEGORY_RULES = [
    {
        name: 'Khẩn cấp',
        color: '#ef4444',
        icon: '🔥',
        priorityBoost: 'Cao',   // Tự động đẩy mức ưu tiên lên Cao
        keywords: [
            'gấp', 'urgent', 'deadline', 'khẩn', 'cuối cùng',
            'ngay lập tức', 'asap', 'hạn chót', 'trễ hạn'
        ]
    },
    {
        name: 'Học tập',
        color: '#3b82f6',
        icon: '📘',
        priorityBoost: null,    // Không tự đẩy priority
        keywords: [
            'học', 'ôn', 'bài tập', 'thi', 'luận văn', 'tiểu luận',
            'nộp', 'assign', 'bài', 'kiểm tra', 'seminar', 'thuyết trình',
            'nghiên cứu', 'đọc sách', 'slide', 'giáo trình', 'đề cương',
            'ôn tập', 'lớp', 'môn', 'điểm', 'transcript', 'tín chỉ',
            'phản biện', 'tham luận', 'CLE', 'đồ án'
        ]
    },
    {
        name: 'Công việc',
        color: '#f59e0b',
        icon: '💼',
        priorityBoost: null,
        keywords: [
            'họp', 'meeting', 'báo cáo', 'project', 'dự án',
            'khách hàng', 'timeline', 'sprint', 'review', 'standup',
            'email', 'trình bày', 'plan', 'kế hoạch', 'chiến dịch',
            'content', 'truyền thông', 'XTN', 'đoàn', 'hội',
            'hoạt động', 'sự kiện', 'tổ chức', 'phân công'
        ]
    },
    {
        name: 'Cá nhân',
        color: '#10b981',
        icon: '🏃',
        priorityBoost: null,
        keywords: [
            'gym', 'chạy bộ', 'ăn', 'ngủ', 'khám bệnh', 'shopping',
            'du lịch', 'sinh nhật', 'party', 'giải trí', 'xem phim',
            'đọc truyện', 'dọn dẹp', 'nấu ăn', 'thể dục', 'yoga',
            'thiền', 'nghỉ ngơi'
        ]
    }
];

/** Màu mặc định khi không khớp từ khóa nào */
const DEFAULT_RESULT = {
    category: 'Khác',
    color: '#667eea',
    icon: '📋',
    priorityBoost: null
};

/**
 * Hàm chính: Nhận vào tên công việc/sự kiện,
 * trả về { category, color, icon, priorityBoost }
 * 
 * Ví dụ:
 *   applySmartRules("Ôn bài thi Luật")  →  { category: 'Học tập', color: '#3b82f6', icon: '📘' }
 *   applySmartRules("Họp nhóm sáng")    →  { category: 'Công việc', color: '#f59e0b', icon: '💼' }
 *   applySmartRules("Gấp nộp báo cáo")  →  { category: 'Khẩn cấp', color: '#ef4444', icon: '🔥', priorityBoost: 'Cao' }
 */
export function applySmartRules(title) {
    if (!title || typeof title !== 'string') return { ...DEFAULT_RESULT };

    const lowerTitle = title.toLowerCase().trim();

    // Duyệt qua từng nhóm quy tắc theo thứ tự ưu tiên
    // (Khẩn cấp được check trước → nếu vừa "gấp" vừa "học" → ưu tiên Khẩn cấp)
    for (const rule of CATEGORY_RULES) {
        for (const keyword of rule.keywords) {
            if (lowerTitle.includes(keyword)) {
                return {
                    category: rule.name,
                    color: rule.color,
                    icon: rule.icon,
                    priorityBoost: rule.priorityBoost
                };
            }
        }
    }

    // Không khớp gì → trả về mặc định
    return { ...DEFAULT_RESULT };
}

/**
 * Hàm phụ: Lấy màu dạng nhạt hơn (dùng cho background)
 * Ví dụ: '#ef4444' → 'rgba(239, 68, 68, 0.15)'
 */
export function getLightColor(hexColor) {
    if (!hexColor) return 'rgba(102, 126, 234, 0.15)';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
}
