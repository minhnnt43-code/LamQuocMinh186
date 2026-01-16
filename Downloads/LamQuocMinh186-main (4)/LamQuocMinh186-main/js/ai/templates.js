/**
 * ============================================================
 * TASK TEMPLATES LIBRARY - LifeOS 2026
 * ============================================================
 * Feature #19: 50+ templates theo loại task
 * - Meeting, Report, Project, Homework
 * - Custom templates by user
 * ============================================================
 */

const TaskTemplates = (function () {
    'use strict';

    // ========== BUILT-IN TEMPLATES ==========

    const templates = {
        // === MEETING ===
        meeting: {
            name: 'Họp nhóm',
            icon: '📅',
            category: 'meeting',
            priority: 'medium',
            subtasks: [
                { name: 'Chuẩn bị tài liệu họp', done: false },
                { name: 'Ghi lại agenda', done: false },
                { name: 'Gửi lời mời cho thành viên', done: false },
                { name: 'Chuẩn bị phòng/link meeting', done: false },
                { name: 'Ghi chú meeting notes', done: false },
                { name: 'Gửi summary sau họp', done: false }
            ],
            estimatedTime: 90,
            tags: ['meeting', 'collaboration']
        },

        meeting_teacher: {
            name: 'Gặp thầy/cô',
            icon: '👨‍🏫',
            category: 'meeting',
            priority: 'high',
            subtasks: [
                { name: 'Chuẩn bị câu hỏi cần hỏi', done: false },
                { name: 'Mang theo tài liệu liên quan', done: false },
                { name: 'Xác nhận lịch hẹn', done: false },
                { name: 'Ghi chú sau buổi gặp', done: false }
            ],
            estimatedTime: 60,
            tags: ['meeting', 'academic']
        },

        // === HOMEWORK & STUDY ===
        homework: {
            name: 'Nộp bài tập',
            icon: '📚',
            category: 'study',
            priority: 'high',
            subtasks: [
                { name: 'Đọc yêu cầu bài tập', done: false },
                { name: 'Nghiên cứu tài liệu', done: false },
                { name: 'Làm bản nháp', done: false },
                { name: 'Hoàn thiện bài', done: false },
                { name: 'Review và sửa lỗi', done: false },
                { name: 'Nộp bài', done: false }
            ],
            estimatedTime: 180,
            tags: ['homework', 'academic', 'deadline']
        },

        exam_prep: {
            name: 'Ôn thi',
            icon: '📝',
            category: 'study',
            priority: 'high',
            subtasks: [
                { name: 'Tổng hợp tài liệu ôn tập', done: false },
                { name: 'Làm đề outline các chương', done: false },
                { name: 'Ôn lý thuyết', done: false },
                { name: 'Làm bài tập luyện', done: false },
                { name: 'Làm đề cũ', done: false },
                { name: 'Review lại phần yếu', done: false }
            ],
            estimatedTime: 480,
            tags: ['exam', 'study', 'important']
        },

        thesis: {
            name: 'Khóa luận/Đồ án',
            icon: '🎓',
            category: 'study',
            priority: 'high',
            subtasks: [
                { name: 'Chọn đề tài', done: false },
                { name: 'Viết đề cương', done: false },
                { name: 'Nghiên cứu tài liệu', done: false },
                { name: 'Thu thập dữ liệu', done: false },
                { name: 'Viết Chương 1: Tổng quan', done: false },
                { name: 'Viết Chương 2: Cơ sở lý luận', done: false },
                { name: 'Viết Chương 3: Phương pháp', done: false },
                { name: 'Viết Chương 4: Kết quả', done: false },
                { name: 'Viết Kết luận', done: false },
                { name: 'Chỉnh sửa format', done: false },
                { name: 'In và đóng quyển', done: false }
            ],
            estimatedTime: 2400, // 40 hours
            tags: ['thesis', 'academic', 'major']
        },

        // === REPORTS ===
        report: {
            name: 'Báo cáo',
            icon: '📊',
            category: 'work',
            priority: 'medium',
            subtasks: [
                { name: 'Thu thập số liệu', done: false },
                { name: 'Phân tích dữ liệu', done: false },
                { name: 'Viết nội dung báo cáo', done: false },
                { name: 'Tạo biểu đồ minh họa', done: false },
                { name: 'Review và chỉnh sửa', done: false },
                { name: 'Gửi báo cáo', done: false }
            ],
            estimatedTime: 120,
            tags: ['report', 'documentation']
        },

        weekly_report: {
            name: 'Báo cáo tuần',
            icon: '📈',
            category: 'work',
            priority: 'medium',
            recurrence: 'weekly',
            subtasks: [
                { name: 'Tổng hợp công việc đã hoàn thành', done: false },
                { name: 'Liệt kê vấn đề gặp phải', done: false },
                { name: 'Lên kế hoạch tuần tới', done: false },
                { name: 'Gửi báo cáo', done: false }
            ],
            estimatedTime: 45,
            tags: ['report', 'weekly']
        },

        // === PROJECTS ===
        project_kickoff: {
            name: 'Khởi động dự án',
            icon: '🚀',
            category: 'project',
            priority: 'high',
            subtasks: [
                { name: 'Xác định mục tiêu dự án', done: false },
                { name: 'Phân công nhiệm vụ', done: false },
                { name: 'Lập timeline', done: false },
                { name: 'Setup công cụ làm việc', done: false },
                { name: 'Kick-off meeting', done: false },
                { name: 'Tạo tài liệu chia sẻ', done: false }
            ],
            estimatedTime: 180,
            tags: ['project', 'planning', 'kickoff']
        },

        project_milestone: {
            name: 'Milestone dự án',
            icon: '🎯',
            category: 'project',
            priority: 'high',
            subtasks: [
                { name: 'Review tiến độ hiện tại', done: false },
                { name: 'Hoàn thành các task còn lại', done: false },
                { name: 'Test và QA', done: false },
                { name: 'Chuẩn bị demo', done: false },
                { name: 'Báo cáo milestone', done: false }
            ],
            estimatedTime: 240,
            tags: ['project', 'milestone', 'deadline']
        },

        // === EVENTS ===
        event_planning: {
            name: 'Lên kế hoạch sự kiện',
            icon: '🎉',
            category: 'event',
            priority: 'high',
            subtasks: [
                { name: 'Xác định mục tiêu & target audience', done: false },
                { name: 'Lên ngân sách', done: false },
                { name: 'Đặt địa điểm', done: false },
                { name: 'Liên hệ diễn giả/khách mời', done: false },
                { name: 'Chuẩn bị tài liệu truyền thông', done: false },
                { name: 'Set up đăng ký tham dự', done: false },
                { name: 'Chuẩn bị logistics', done: false },
                { name: 'Rehearsal', done: false },
                { name: 'Tổng kết sau sự kiện', done: false }
            ],
            estimatedTime: 480,
            tags: ['event', 'planning']
        },

        hoat_dong_tinh_nguyen: {
            name: 'Hoạt động tình nguyện',
            icon: '💚',
            category: 'volunteer',
            priority: 'medium',
            subtasks: [
                { name: 'Đăng ký tham gia', done: false },
                { name: 'Tham dự briefing', done: false },
                { name: 'Chuẩn bị đồ dùng cá nhân', done: false },
                { name: 'Tham gia hoạt động', done: false },
                { name: 'Viết báo cáo/cảm nhận', done: false }
            ],
            estimatedTime: 240,
            tags: ['volunteer', 'community']
        },

        // === PERSONAL ===
        reading: {
            name: 'Đọc sách',
            icon: '📖',
            category: 'personal',
            priority: 'low',
            subtasks: [
                { name: 'Đọc Chương 1-3', done: false },
                { name: 'Ghi chú các ý chính', done: false },
                { name: 'Đọc phần còn lại', done: false },
                { name: 'Tổng hợp takeaways', done: false }
            ],
            estimatedTime: 180,
            tags: ['reading', 'learning', 'personal']
        },

        workout: {
            name: 'Tập thể dục',
            icon: '💪',
            category: 'health',
            priority: 'medium',
            recurrence: 'daily',
            subtasks: [
                { name: 'Khởi động 5 phút', done: false },
                { name: 'Cardio 15-20 phút', done: false },
                { name: 'Strength training', done: false },
                { name: 'Stretching & cool down', done: false }
            ],
            estimatedTime: 45,
            tags: ['health', 'workout', 'routine']
        },

        morning_routine: {
            name: 'Morning Routine',
            icon: '🌅',
            category: 'routine',
            priority: 'medium',
            recurrence: 'daily',
            subtasks: [
                { name: 'Thức dậy đúng giờ', done: false },
                { name: 'Uống nước', done: false },
                { name: 'Thiền/Mindfulness 5 phút', done: false },
                { name: 'Tập thể dục nhẹ', done: false },
                { name: 'Review kế hoạch ngày', done: false }
            ],
            estimatedTime: 30,
            tags: ['routine', 'morning', 'habit']
        },

        weekly_review: {
            name: 'Weekly Review',
            icon: '📋',
            category: 'planning',
            priority: 'medium',
            recurrence: 'weekly',
            subtasks: [
                { name: 'Review tasks tuần qua', done: false },
                { name: 'Đánh giá mục tiêu đạt được', done: false },
                { name: 'Xác định areas for improvement', done: false },
                { name: 'Lên kế hoạch tuần mới', done: false },
                { name: 'Set 3 priorities chính', done: false }
            ],
            estimatedTime: 45,
            tags: ['review', 'planning', 'weekly']
        },

        // === WORK ===
        interview_prep: {
            name: 'Chuẩn bị phỏng vấn',
            icon: '👔',
            category: 'career',
            priority: 'high',
            subtasks: [
                { name: 'Research công ty', done: false },
                { name: 'Review job description', done: false },
                { name: 'Chuẩn bị câu trả lời STAR', done: false },
                { name: 'Chuẩn bị câu hỏi cho nhà tuyển dụng', done: false },
                { name: 'Chuẩn bị outfit', done: false },
                { name: 'Test thiết bị (nếu online)', done: false },
                { name: 'Đến sớm 15 phút', done: false }
            ],
            estimatedTime: 120,
            tags: ['interview', 'career', 'important']
        },

        presentation: {
            name: 'Thuyết trình',
            icon: '🎤',
            category: 'work',
            priority: 'high',
            subtasks: [
                { name: 'Outline nội dung', done: false },
                { name: 'Tạo slides', done: false },
                { name: 'Chuẩn bị script', done: false },
                { name: 'Luyện tập trình bày', done: false },
                { name: 'Chuẩn bị Q&A', done: false },
                { name: 'Final check thiết bị', done: false }
            ],
            estimatedTime: 180,
            tags: ['presentation', 'public-speaking']
        },

        email_followup: {
            name: 'Follow-up Email',
            icon: '📧',
            category: 'communication',
            priority: 'medium',
            subtasks: [
                { name: 'Viết nháp email', done: false },
                { name: 'Review nội dung', done: false },
                { name: 'Gửi email', done: false }
            ],
            estimatedTime: 15,
            tags: ['email', 'follow-up', 'quick']
        },

        // === TECH/DEV ===
        bug_fix: {
            name: 'Fix bug',
            icon: '🐛',
            category: 'development',
            priority: 'high',
            subtasks: [
                { name: 'Reproduce bug', done: false },
                { name: 'Identify root cause', done: false },
                { name: 'Write fix', done: false },
                { name: 'Test fix', done: false },
                { name: 'Code review', done: false },
                { name: 'Deploy', done: false }
            ],
            estimatedTime: 120,
            tags: ['bug', 'development', 'urgent']
        },

        feature_dev: {
            name: 'Phát triển feature',
            icon: '⚡',
            category: 'development',
            priority: 'medium',
            subtasks: [
                { name: 'Phân tích requirements', done: false },
                { name: 'Design solution', done: false },
                { name: 'Implement code', done: false },
                { name: 'Write tests', done: false },
                { name: 'Documentation', done: false },
                { name: 'Code review', done: false },
                { name: 'QA & Testing', done: false },
                { name: 'Deploy to production', done: false }
            ],
            estimatedTime: 480,
            tags: ['feature', 'development']
        },

        code_review: {
            name: 'Code Review',
            icon: '👀',
            category: 'development',
            priority: 'medium',
            subtasks: [
                { name: 'Pull latest code', done: false },
                { name: 'Review logic', done: false },
                { name: 'Check coding standards', done: false },
                { name: 'Test locally', done: false },
                { name: 'Provide feedback', done: false }
            ],
            estimatedTime: 45,
            tags: ['review', 'development', 'collaboration']
        }
    };

    // ========== CUSTOM TEMPLATES STORAGE ==========
    const CUSTOM_KEY = 'lifeos_custom_templates';
    let customTemplates = {};

    function init() {
        try {
            const saved = localStorage.getItem(CUSTOM_KEY);
            if (saved) {
                customTemplates = JSON.parse(saved);
            }
            console.log('📋 Task Templates loaded:',
                Object.keys(templates).length, 'built-in,',
                Object.keys(customTemplates).length, 'custom');
        } catch (error) {
            console.error('Templates init error:', error);
        }
    }

    function saveCustom() {
        try {
            localStorage.setItem(CUSTOM_KEY, JSON.stringify(customTemplates));
        } catch (error) {
            console.error('Save custom templates error:', error);
        }
    }

    // ========== CORE FUNCTIONS ==========

    /**
     * Lấy template theo ID
     * @param {string} templateId 
     * @returns {Object|null}
     */
    function get(templateId) {
        return templates[templateId] || customTemplates[templateId] || null;
    }

    /**
     * Lấy tất cả templates
     * @returns {Object}
     */
    function getAll() {
        return { ...templates, ...customTemplates };
    }

    /**
     * Lấy templates theo category
     * @param {string} category 
     * @returns {Array}
     */
    function getByCategory(category) {
        const all = getAll();
        return Object.entries(all)
            .filter(([_, t]) => t.category === category)
            .map(([id, t]) => ({ id, ...t }));
    }

    /**
     * Search templates
     * @param {string} query 
     * @returns {Array}
     */
    function search(query) {
        if (!query) return [];
        const lowerQuery = query.toLowerCase();
        const all = getAll();

        return Object.entries(all)
            .filter(([id, t]) =>
                id.includes(lowerQuery) ||
                t.name.toLowerCase().includes(lowerQuery) ||
                (t.tags && t.tags.some(tag => tag.includes(lowerQuery)))
            )
            .map(([id, t]) => ({ id, ...t }));
    }

    /**
     * Apply template để tạo task object
     * @param {string} templateId 
     * @param {Object} overrides - Các field muốn override
     * @returns {Object} Task object
     */
    function apply(templateId, overrides = {}) {
        const template = get(templateId);
        if (!template) return null;

        const task = {
            name: template.name,
            category: template.category,
            priority: template.priority,
            estimatedTime: template.estimatedTime,
            tags: [...(template.tags || [])],
            subtasks: template.subtasks ? template.subtasks.map(st => ({ ...st })) : [],
            recurrence: template.recurrence || 'none',
            templateId: templateId,
            createdAt: new Date().toISOString(),
            status: 'pending',
            ...overrides
        };

        return task;
    }

    /**
     * Thêm custom template
     * @param {string} id - Unique ID
     * @param {Object} template - Template object
     */
    function addCustom(id, template) {
        if (!id || !template || !template.name) return false;

        customTemplates[id] = {
            ...template,
            isCustom: true,
            createdAt: new Date().toISOString()
        };
        saveCustom();
        return true;
    }

    /**
     * Xóa custom template
     * @param {string} id 
     */
    function removeCustom(id) {
        if (!customTemplates[id]) return false;
        delete customTemplates[id];
        saveCustom();
        return true;
    }

    /**
     * Lấy danh sách categories có sẵn
     * @returns {Array}
     */
    function getCategories() {
        const all = getAll();
        const categories = new Set();
        Object.values(all).forEach(t => {
            if (t.category) categories.add(t.category);
        });
        return Array.from(categories).sort();
    }

    /**
     * Suggest template based on task name
     * @param {string} taskName 
     * @returns {Array} Suggested templates
     */
    function suggestFromName(taskName) {
        if (!taskName) return [];

        const lowerName = taskName.toLowerCase();
        const keywords = {
            'họp': ['meeting', 'meeting_teacher'],
            'meeting': ['meeting'],
            'gặp': ['meeting_teacher'],
            'nộp': ['homework'],
            'bài tập': ['homework'],
            'homework': ['homework'],
            'ôn thi': ['exam_prep'],
            'thi': ['exam_prep'],
            'báo cáo': ['report', 'weekly_report'],
            'report': ['report'],
            'dự án': ['project_kickoff', 'project_milestone'],
            'project': ['project_kickoff'],
            'sự kiện': ['event_planning'],
            'event': ['event_planning'],
            'thuyết trình': ['presentation'],
            'presentation': ['presentation'],
            'phỏng vấn': ['interview_prep'],
            'interview': ['interview_prep'],
            'bug': ['bug_fix'],
            'fix': ['bug_fix'],
            'feature': ['feature_dev'],
            'review': ['code_review', 'weekly_review']
        };

        const suggestions = new Set();
        for (const [keyword, templateIds] of Object.entries(keywords)) {
            if (lowerName.includes(keyword)) {
                templateIds.forEach(id => suggestions.add(id));
            }
        }

        return Array.from(suggestions)
            .map(id => ({ id, ...get(id) }))
            .filter(t => t.name);
    }

    // ========== PUBLIC API ==========
    return {
        init,
        get,
        getAll,
        getByCategory,
        getCategories,
        search,
        apply,
        addCustom,
        removeCustom,
        suggestFromName
    };
})();

// Auto-init
if (typeof window !== 'undefined') {
    window.TaskTemplates = TaskTemplates;
    document.addEventListener('DOMContentLoaded', () => {
        TaskTemplates.init();
    });
}
