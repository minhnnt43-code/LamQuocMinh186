// ============================================================
// FILE: js/ai-core-engine.js
// Mục đích: Core AI Engine - Phase 1 (10 tính năng lõi Trợ lý)
// ============================================================

import { showNotification } from './common.js';
import { aiPowerHub } from './ai-power-hub.js';

// ============================================================
// #2 - BỘ NHỚ NGỮ CẢNH THÔNG MINH (Context Memory)
// Lưu trữ patterns làm việc và preferences của người dùng
// ============================================================
class ContextMemory {
    constructor() {
        this.storageKey = 'ai_context_memory';
        this.memory = this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : {
                taskPatterns: [],      // Các pattern công việc thường làm
                preferredTimes: {},    // Thời gian ưu tiên cho từng loại task
                categories: {},        // Tần suất sử dụng categories
                completionRates: {},   // Tỷ lệ hoàn thành theo loại
                lastTasks: [],         // 50 task gần nhất
                userPreferences: {}    // Sở thích người dùng
            };
        } catch (e) {
            console.error('Lỗi load context memory:', e);
            return { taskPatterns: [], preferredTimes: {}, categories: {}, completionRates: {}, lastTasks: [], userPreferences: {} };
        }
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.memory));
        } catch (e) {
            console.error('Lỗi save context memory:', e);
        }
    }

    // Ghi nhớ một task mới
    rememberTask(task) {
        // Thêm vào lastTasks (giữ 50 task gần nhất)
        this.memory.lastTasks.unshift({
            title: task.title,
            category: task.category,
            priority: task.priority,
            deadline: task.deadline,
            createdAt: new Date().toISOString()
        });
        if (this.memory.lastTasks.length > 50) {
            this.memory.lastTasks.pop();
        }

        // Cập nhật category frequency
        if (task.category) {
            this.memory.categories[task.category] = (this.memory.categories[task.category] || 0) + 1;
        }

        this.save();
    }

    // Lấy category phổ biến nhất
    getMostUsedCategory() {
        const cats = this.memory.categories;
        let maxCat = 'Công việc';
        let maxCount = 0;
        for (const [cat, count] of Object.entries(cats)) {
            if (count > maxCount) {
                maxCount = count;
                maxCat = cat;
            }
        }
        return maxCat;
    }

    // Lấy context cho AI prompt
    getContextForAI() {
        const recentTasks = this.memory.lastTasks.slice(0, 10);
        const topCategories = Object.entries(this.memory.categories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([cat]) => cat);

        return {
            recentTasks,
            topCategories,
            taskCount: this.memory.lastTasks.length
        };
    }
}

// ============================================================
// #6 - PHÁT HIỆN TRÙNG LẶP (Duplicate Detection)
// Phát hiện task trùng lặp hoặc overlap
// ============================================================
function detectDuplicates(newTask, existingTasks) {
    const duplicates = [];

    // Null check để tránh TypeError
    if (!newTask || !newTask.title || !Array.isArray(existingTasks)) {
        return duplicates;
    }

    const newTitle = (newTask.title || '').toLowerCase().trim();
    if (!newTitle) return duplicates;

    const newWords = newTitle.split(/\s+/).filter(w => w.length > 2);

    for (const task of existingTasks) {
        // Skip tasks không có title
        if (!task || !task.title) continue;

        const existingTitle = task.title.toLowerCase().trim();

        // 1. Exact match
        if (newTitle === existingTitle) {
            duplicates.push({
                task,
                type: 'exact',
                similarity: 100,
                message: `Trùng hoàn toàn với: "${task.title}"`
            });
            continue;
        }

        // 2. Similarity check (Jaccard)
        const existingWords = existingTitle.split(/\s+/).filter(w => w.length > 2);
        const intersection = newWords.filter(w => existingWords.includes(w));
        const union = [...new Set([...newWords, ...existingWords])];
        const similarity = union.length > 0 ? Math.round((intersection.length / union.length) * 100) : 0;

        if (similarity > 60) {
            duplicates.push({
                task,
                type: 'similar',
                similarity,
                message: `Tương tự ${similarity}% với: "${task.title}"`
            });
        }

        // 3. Time overlap check
        if (newTask.deadline && task.deadline) {
            const newDate = new Date(newTask.deadline).toDateString();
            const existingDate = new Date(task.deadline).toDateString();
            if (newDate === existingDate && similarity > 30) {
                duplicates.push({
                    task,
                    type: 'time_overlap',
                    similarity,
                    message: `Cùng ngày deadline với: "${task.title}"`
                });
            }
        }
    }

    return duplicates;
}

// ============================================================
// #7 - PHÂN LOẠI MỤC ĐÍCH (Intent Classification)
// Phân loại chính xác mục đích task
// ============================================================
function classifyIntent(text) {
    const lowerText = text.toLowerCase();

    const intents = {
        'Họp': ['họp', 'meeting', 'gặp mặt', 'thảo luận', 'trao đổi', 'phỏng vấn', 'seminar'],
        'Học tập': ['học', 'ôn', 'thi', 'bài tập', 'assignment', 'exam', 'nghiên cứu', 'đọc sách', 'khóa học', 'course'],
        'Công việc': ['làm', 'hoàn thành', 'nộp', 'submit', 'báo cáo', 'report', 'dự án', 'project', 'deadline'],
        'Cá nhân': ['mua', 'đi', 'chơi', 'ăn', 'gym', 'tập', 'khám', 'bác sĩ', 'sinh nhật', 'du lịch'],
        'Gấp': ['gấp', 'urgent', 'khẩn', 'ngay', 'hôm nay', 'mai', 'asap', 'quan trọng'],
        'Định kỳ': ['hàng ngày', 'mỗi ngày', 'weekly', 'hàng tuần', 'monthly', 'hàng tháng', 'thứ 2', 'thứ 3', 'thứ 4', 'thứ 5', 'thứ 6', 'thứ 7', 'chủ nhật']
    };

    const results = [];
    for (const [intent, keywords] of Object.entries(intents)) {
        for (const keyword of keywords) {
            if (lowerText.includes(keyword)) {
                results.push(intent);
                break;
            }
        }
    }

    return results.length > 0 ? results : ['Khác'];
}

// ============================================================
// #8 - TRÍCH XUẤT THỰC THỂ (Entity Extraction)
// Trích xuất người, địa điểm, thời gian, số tiền từ văn bản
// ============================================================
function extractEntities(text) {
    const entities = {
        people: [],
        locations: [],
        times: [],
        dates: [],
        amounts: []
    };

    // 1. Trích xuất thời gian (HH:mm, Xh, X giờ)
    const timePatterns = [
        /(\d{1,2}[h:]\d{0,2})/gi,
        /(\d{1,2}\s*giờ\s*\d{0,2}\s*phút?)/gi,
        /(\d{1,2}\s*(sáng|chiều|tối|trưa))/gi,
        /(buổi\s+(sáng|chiều|tối))/gi
    ];
    for (const pattern of timePatterns) {
        const matches = text.match(pattern);
        if (matches) entities.times.push(...matches);
    }

    // 2. Trích xuất ngày tháng
    const datePatterns = [
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]?\d{0,4})/gi,
        /(ngày\s+\d{1,2})/gi,
        /(thứ\s+\d|thứ\s+(hai|ba|tư|năm|sáu|bảy)|chủ\s*nhật)/gi,
        /(hôm nay|ngày mai|hôm qua|tuần sau|tuần tới|tháng sau)/gi
    ];
    for (const pattern of datePatterns) {
        const matches = text.match(pattern);
        if (matches) entities.dates.push(...matches);
    }

    // 3. Trích xuất số tiền
    const amountPatterns = [
        /(\d+[\.,]?\d*\s*(k|K|triệu|tr|đ|đồng|vnđ|vnd))/gi,
        /(\d+[\.,]\d{3})/gi
    ];
    for (const pattern of amountPatterns) {
        const matches = text.match(pattern);
        if (matches) entities.amounts.push(...matches);
    }

    // 4. Trích xuất người (patterns phổ biến)
    const peoplePatterns = [
        /(với\s+)([\wÀ-ỹ]+(\s+[\wÀ-ỹ]+)?)/gi,
        /(thầy|cô|anh|chị|em|bạn|sếp|giám đốc|manager)\s+([\wÀ-ỹ]+)?/gi,
        /(gặp|liên hệ|gọi|nhắn|email)\s+([\wÀ-ỹ]+(\s+[\wÀ-ỹ]+)?)/gi
    ];
    for (const pattern of peoplePatterns) {
        const matches = text.match(pattern);
        if (matches) entities.people.push(...matches.map(m => m.trim()));
    }

    // 5. Trích xuất địa điểm
    const locationPatterns = [
        /(tại\s+)([\wÀ-ỹ\s]+)/gi,
        /(ở\s+)([\wÀ-ỹ\s]+)/gi,
        /(phòng\s+[\wÀ-ỹ0-9]+)/gi,
        /(quán|nhà hàng|cafe|coffee)\s+([\wÀ-ỹ\s]+)?/gi
    ];
    for (const pattern of locationPatterns) {
        const matches = text.match(pattern);
        if (matches) entities.locations.push(...matches.map(m => m.trim()));
    }

    // Deduplicate
    for (const key of Object.keys(entities)) {
        entities[key] = [...new Set(entities[key])];
    }

    return entities;
}

// ============================================================
// #10 - ĐIỂM TIN CẬY (Confidence Scoring)
// Tính toán độ tin cậy của các gợi ý AI
// ============================================================
function calculateConfidence(aiResponse, originalInput) {
    let confidence = 70; // Base confidence

    // 1. Kiểm tra có trả về JSON hợp lệ không
    try {
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            JSON.parse(jsonMatch[0]);
            confidence += 10;
        }
    } catch (e) {
        confidence -= 20;
    }

    // 2. Kiểm tra độ dài input
    if (originalInput.length > 50) confidence += 5;
    if (originalInput.length > 200) confidence += 5;

    // 3. Kiểm tra có entities rõ ràng không
    const entities = extractEntities(originalInput);
    if (entities.dates.length > 0) confidence += 5;
    if (entities.times.length > 0) confidence += 3;
    if (entities.people.length > 0) confidence += 2;

    // Cap at 95%
    return Math.min(95, Math.max(20, confidence));
}

// ============================================================
// #5 - ƯU TIÊN TỰ TIẾN HÓA (Priority Evolution)
// Tự động điều chỉnh priority dựa trên deadline và patterns
// ============================================================
function evolvePriority(task, contextMemory) {
    // Null check
    if (!task) return 'medium';

    let priority = task.priority || 'medium';

    // 1. Deadline approaching
    if (task.deadline) {
        const now = new Date();
        const deadline = new Date(task.deadline);
        const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

        if (daysUntil <= 1) priority = 'high';
        else if (daysUntil <= 3 && priority === 'low') priority = 'medium';
    }

    // 2. Keywords indicating urgency
    const urgentKeywords = ['gấp', 'urgent', 'khẩn', 'asap', 'ngay', 'quan trọng', 'important'];
    const lowerTitle = (task.title || '').toLowerCase();
    if (urgentKeywords.some(k => lowerTitle.includes(k))) {
        priority = 'high';
    }

    return priority;
}

// ============================================================
// #4 - NHÓM CÔNG VIỆC NGỮ NGHĨA (Semantic Clustering)
// Tự động nhóm các task liên quan
// ============================================================
function clusterTasks(tasks) {
    const clusters = {};

    for (const task of tasks) {
        const intents = classifyIntent(task.title);
        const mainIntent = intents[0] || 'Khác';

        if (!clusters[mainIntent]) {
            clusters[mainIntent] = [];
        }
        clusters[mainIntent].push(task);
    }

    return clusters;
}

// ============================================================
// #9 - ĐỒ THỊ PHỤ THUỘC (Dependency Graph)
// Phát hiện dependencies giữa các tasks
// ============================================================
function detectDependencies(tasks) {
    const dependencies = [];

    const dependencyKeywords = [
        { pattern: /sau khi/i, type: 'after' },
        { pattern: /trước khi/i, type: 'before' },
        { pattern: /để\s+/i, type: 'enables' },
        { pattern: /cần\s+.+\s+trước/i, type: 'requires' },
        { pattern: /phụ thuộc/i, type: 'depends' }
    ];

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const lowerTitle = task.title.toLowerCase();

        for (const keyword of dependencyKeywords) {
            if (keyword.pattern.test(lowerTitle)) {
                // Try to find related task
                for (let j = 0; j < tasks.length; j++) {
                    if (i !== j) {
                        const otherTask = tasks[j];
                        const otherWords = otherTask.title.toLowerCase().split(/\s+/);
                        const taskWords = lowerTitle.split(/\s+/);

                        const commonWords = taskWords.filter(w => otherWords.includes(w) && w.length > 3);
                        if (commonWords.length > 0) {
                            dependencies.push({
                                from: task.id || i,
                                to: otherTask.id || j,
                                type: keyword.type,
                                confidence: Math.min(90, 50 + commonWords.length * 10)
                            });
                        }
                    }
                }
            }
        }
    }

    return dependencies;
}

// ============================================================
// #1 - PHÂN TÍCH NGÔN NGỮ NÂNG CAO (Advanced NLP)
// Gọi AI với context enrichment - SỬ DỤNG AI POWER HUB
// ============================================================
async function analyzeWithAI(text, options = {}) {
    const contextMemory = new ContextMemory();
    const context = contextMemory.getContextForAI();
    const entities = extractEntities(text);
    const intents = classifyIntent(text);

    // [MỚI] Lấy thời gian hiện tại để AI có context
    const now = new Date();
    const currentTime = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const currentDate = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const todayISO = now.toISOString().split('T')[0];

    // [MỚI] Detect if user wants smart scheduling
    const wantsSmartSchedule = /phân bố|sắp xếp|hợp lý|tối ưu|lịch|schedule/i.test(text);

    const systemPrompt = `Bạn là trợ lý phân tích công việc chuyên nghiệp cho người Việt Nam.

THỜI GIAN HIỆN TẠI: ${currentTime} ngày ${currentDate}
TODAY (ISO): ${todayISO}

CONTEXT:
- Người dùng đã tạo ${context.taskCount} task trước đó
- Categories thường dùng: ${context.topCategories.join(', ') || 'Chưa có'}
- Tasks gần đây: ${context.recentTasks.slice(0, 3).map(t => t.title).join('; ') || 'Chưa có'}

ENTITIES DETECTED:
- Thời gian: ${entities.times.join(', ') || 'Không rõ'}
- Ngày: ${entities.dates.join(', ') || 'Không rõ'}  
- Người: ${entities.people.join(', ') || 'Không rõ'}
- Địa điểm: ${entities.locations.join(', ') || 'Không rõ'}

INTENTS: ${intents.join(', ')}

QUY TẮC QUAN TRỌNG:
1. Trả về ĐÚNG format JSON array
2. Mỗi task có: title, deadline (YYYY-MM-DD), priority (high/medium/low), category, description, startTime (HH:MM hoặc null), endTime (HH:MM hoặc null), isImmediate (boolean)
3. Sử dụng thông tin entities đã phát hiện để điền chính xác
4. PHẢI trích xuất giờ cụ thể từ các format tiếng Việt
5. "bây giờ", "ngay", "liền" → isImmediate: true, priority: "high"
6. "tối nay/hôm nay" + giờ cụ thể → deadline là TODAY (${todayISO})
${wantsSmartSchedule ? '7. User muốn PHÂN BỐ THỜI GIAN HỢP LÝ - hãy sắp xếp tasks theo thứ tự hợp lý với buffer 15 phút giữa các task' : ''}

HƯỚNG DẪN PARSE GIỜ TIẾNG VIỆT:
- "18g30", "18h30", "18:30" → "18:30"
- "6 giờ rưỡi chiều", "6g30 chiều" → "18:30"
- "7 giờ tối", "7h tối", "19g" → "19:00"
- "20 giờ tối nay", "20h tối" → "20:00"
- "2h chiều", "2 giờ chiều" → "14:00"
- "9h sáng", "9 giờ sáng" → "09:00"
- Ước tính endTime = startTime + 1 giờ (mặc định)
- Email/soạn thư: 30-45 phút
- Họp/meeting: 1-1.5 giờ
- Review/rà soát: 45 phút - 1 giờ
- Thiết kế/design: 1.5-2 giờ`;

    const userPrompt = options.prompt || `Phân tích và trích xuất công việc từ văn bản sau:

"""
${text}
"""

QUAN TRỌNG - CHỈ TRẢ VỀ JSON ARRAY, KHÔNG GIẢI THÍCH GÌ THÊM:
[{"title": "tên task", "deadline": "${todayISO}", "priority": "high/medium/low", "category": "Công việc/Học tập/Cá nhân/Họp/Khác", "description": "mô tả ngắn", "startTime": "HH:MM", "endTime": "HH:MM", "isImmediate": false}]

VÍ DỤ INPUT-OUTPUT:
- "Đăng bài lên fanpage lúc 18g30 tối nay" → startTime: "18:30", endTime: "18:45", deadline: "${todayISO}"
- "soạn mail gửi hội thảo bây giờ" → isImmediate: true, priority: "high", deadline: "${todayISO}"
- "rà soát lại tiến độ timeline XTN 19g00" → startTime: "19:00", endTime: "19:45", deadline: "${todayISO}"
- "thực hiện bộ nhận diện YEP 20 giờ tối nay" → startTime: "20:00", endTime: "21:30", deadline: "${todayISO}"

CHỈ TRẢ VỀ JSON. KHÔNG CÓ TEXT, KHÔNG CÓ MARKDOWN, KHÔNG CÓ GIẢI THÍCH.`;

    try {
        // SỬ DỤNG AI POWER HUB THAY VÌ API TRỰC TIẾP
        const result = await aiPowerHub.call(userPrompt, {
            systemPrompt,
            temperature: 0.3,
            maxTokens: 2000
        });

        const aiResponse = result.content;
        const confidence = calculateConfidence(aiResponse, text);

        console.log(`[AI Core Engine] Sử dụng ${result.provider} (${result.duration}ms)`);

        return {
            response: aiResponse,
            confidence,
            entities,
            intents,
            context,
            provider: result.provider,
            usage: result.usage,
            currentTime, // [MỚI] Trả về thời gian hiện tại
            wantsSmartSchedule // [MỚI] Flag cho smart schedule
        };
    } catch (error) {
        console.error('Lỗi gọi AI Power Hub:', error);
        throw error;
    }
}

// ============================================================
// #3 - XỬ LÝ ĐA NGÔN NGỮ (Multi-Language)
// Detect và xử lý tiếng Việt/Anh
// ============================================================
function detectLanguage(text) {
    // Vietnamese specific characters
    const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

    if (vietnameseChars.test(text)) {
        return 'vi';
    }

    // Simple English detection
    const englishWords = ['the', 'is', 'are', 'was', 'were', 'have', 'has', 'do', 'does', 'will', 'would', 'could', 'should'];
    const words = text.toLowerCase().split(/\s+/);
    const englishCount = words.filter(w => englishWords.includes(w)).length;

    if (englishCount > 2) {
        return 'en';
    }

    return 'vi'; // Default to Vietnamese
}

// ============================================================
// EXPORTS
// ============================================================
export const contextMemory = new ContextMemory();

export {
    analyzeWithAI,
    detectDuplicates,
    classifyIntent,
    extractEntities,
    calculateConfidence,
    evolvePriority,
    clusterTasks,
    detectDependencies,
    detectLanguage
};
