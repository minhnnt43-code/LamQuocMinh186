// ============================================================
// FILE: js/ai/task_ai.js
// Mục đích: AI hỗ trợ quản lý task - đánh giá ưu tiên & gợi ý deadline
// ============================================================

import { generateContent, QuotaExceededError } from './gemini.js';
import { showNotification } from '../common.js';

/**
 * Đánh giá mức độ ưu tiên của task dựa trên AI
 * @param {Object} task - {title, description, deadline}
 * @returns {Promise<Object>} - {priority: "Cao|Trung bình|Thấp", reason: "..."}
 */
export async function assessPriority(task) {
    const prompt = `
Bạn là trợ lý quản lý công việc thông minh. Hãy phân tích task sau và đánh giá mức độ ưu tiên:

📋 THÔNG TIN TASK:
- Tiêu đề: ${task.title || 'Chưa có'}
- Mô tả: ${task.description || 'Chưa có'}
- Deadline: ${task.deadline || 'Chưa có'}

YÊU CẦU:
Đánh giá độ ưu tiên dựa trên:
1. Tính cấp bách (deadline gần, từ khóa "gấp", "urgent"...)
2. Tầm quan trọng (học tập, công việc quan trọng...)
3. Độ phức tạp (task lớn cần ưu tiên trước)

Trả về CHÍNH XÁC định dạng JSON (không thêm text khác):
{
  "priority": "Cao" hoặc "Trung bình" hoặc "Thấp",
  "reason": "Giải thích ngắn gọn trong 1-2 câu"
}
    `.trim();

    try {
        const result = await generateContent(prompt, { temperature: 0.3 });

        // Parse JSON từ response
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI không trả về JSON hợp lệ');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate
        if (!['Cao', 'Trung bình', 'Thấp'].includes(parsed.priority)) {
            parsed.priority = 'Trung bình'; // Default
        }

        return {
            priority: parsed.priority,
            reason: parsed.reason || 'AI chưa cung cấp lý do'
        };

    } catch (error) {
        console.error('Lỗi assess priority:', error);

        if (error instanceof QuotaExceededError) {
            throw error;
        }

        // Fallback: Simple heuristic
        return simplePriorityHeuristic(task);
    }
}

/**
 * Gợi ý 3 deadline phù hợp cho task
 * @param {Object} task - Task info
 * @param {Array} existingTasks - Danh sách task hiện có
 * @returns {Promise<Array>} - [{date: "DD/MM/YYYY", reason: "..."}]
 */
export async function suggestDeadline(task, existingTasks = []) {
    // Lấy danh sách deadline hiện có
    const existingDeadlines = existingTasks
        .filter(t => t.deadline)
        .map(t => t.deadline)
        .slice(0, 10); // Chỉ lấy 10 gần nhất để tránh prompt quá dài

    const prompt = `
Bạn là trợ lý quản lý thời gian. Hãy gợi ý 3 mốc deadline phù hợp cho task:

📋 TASK:
- Tiêu đề: ${task.title}
- Mô tả: ${task.description || 'Không có'}

⚠️ TRÁNH TRÙNG VỚI:
${existingDeadlines.length > 0 ? existingDeadlines.join(', ') : 'Không có deadline hiện tại'}

YÊU CẦU:
1. Gợi ý 3 mốc thời gian khác nhau (gần, trung bình, xa)
2. Tránh trùng với deadline đã có
3. Xét đến ngày hiện tại: ${new Date().toLocaleDateString('vi-VN')}
4. Lý do hợp lý cho mỗi deadline

Trả về CHÍNH XÁC định dạng JSON array (không thêm text khác):
[
  {"date": "DD/MM/YYYY", "reason": "Deadline gần - hoàn thành nhanh"},
  {"date": "DD/MM/YYYY", "reason": "Deadline trung bình - cân đối"},
  {"date": "DD/MM/YYYY", "reason": "Deadline xa - thời gian dư dả"}
]
    `.trim();

    try {
        const result = await generateContent(prompt, { temperature: 0.5 });

        // Parse JSON
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('AI không trả về JSON array');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate và sắp xếp
        const validated = parsed
            .filter(d => d.date && d.reason)
            .slice(0, 3);

        if (validated.length === 0) {
            throw new Error('Không có deadline hợp lệ');
        }

        return validated;

    } catch (error) {
        console.error('Lỗi suggest deadline:', error);

        if (error instanceof QuotaExceededError) {
            throw error;
        }

        // Fallback: Simple suggestions
        return simpleDeadlineSuggestions();
    }
}

/**
 * Heuristic đơn giản khi AI fail
 */
function simplePriorityHeuristic(task) {
    const title = (task.title || '').toLowerCase();
    const desc = (task.description || '').toLowerCase();
    const text = title + ' ' + desc;

    // Keywords cho mức ưu tiên
    const highKeywords = ['gấp', 'urgent', 'quan trọng', 'deadline', 'khẩn', 'ngay'];
    const lowKeywords = ['có thể', 'nếu rảnh', 'không gấp', 'tùy chọn'];

    // Check high priority
    if (highKeywords.some(kw => text.includes(kw))) {
        return {
            priority: 'Cao',
            reason: 'Phát hiện từ khóa cấp bách trong task'
        };
    }

    // Check low priority
    if (lowKeywords.some(kw => text.includes(kw))) {
        return {
            priority: 'Thấp',
            reason: 'Task có vẻ không gấp dựa trên mô tả'
        };
    }

    // Check deadline
    if (task.deadline) {
        const deadlineDate = parseVietnameseDate(task.deadline);
        const today = new Date();
        const daysUntil = Math.floor((deadlineDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntil <= 3) {
            return {
                priority: 'Cao',
                reason: `Deadline còn ${daysUntil} ngày`
            };
        } else if (daysUntil <= 7) {
            return {
                priority: 'Trung bình',
                reason: `Deadline còn ${daysUntil} ngày`
            };
        }
    }

    // Default
    return {
        priority: 'Trung bình',
        reason: 'Ưu tiên mặc định cho task thông thường'
    };
}

/**
 * Gợi ý deadline đơn giản khi AI fail
 */
function simpleDeadlineSuggestions() {
    const today = new Date();

    const suggestions = [
        {
            date: formatDate(addDays(today, 3)),
            reason: 'Deadline gần - hoàn thành trong 3 ngày'
        },
        {
            date: formatDate(addDays(today, 7)),
            reason: 'Deadline trung bình - hoàn thành trong 1 tuần'
        },
        {
            date: formatDate(addDays(today, 14)),
            reason: 'Deadline xa - có 2 tuần để chuẩn bị'
        }
    ];

    return suggestions;
}

/**
 * Helper: Thêm ngày
 */
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Helper: Format date DD/MM/YYYY
 */
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Helper: Parse Vietnamese date DD/MM/YYYY
 */
function parseVietnameseDate(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date(dateStr);
}

/**
 * UI Helper: Hiển thị kết quả AI Priority
 */
export function showPriorityResult(result, targetElement) {
    const priorityColors = {
        'Cao': '#e74c3c',
        'Trung bình': '#f39c12',
        'Thấp': '#3498db'
    };

    const html = `
        <div class="ai-result-box" style="
            background: ${priorityColors[result.priority]}15;
            border-left: 4px solid ${priorityColors[result.priority]};
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
        ">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <span style="font-size: 1.2rem;">🎯</span>
                <strong style="color: ${priorityColors[result.priority]};">
                    Độ ưu tiên: ${result.priority}
                </strong>
            </div>
            <div style="color: var(--text-secondary); font-size: 0.9rem;">
                ${result.reason}
            </div>
        </div>
    `;

    if (targetElement) {
        targetElement.innerHTML = html;
    }

    return html;
}

/**
 * UI Helper: Hiển thị deadline suggestions
 */
export function showDeadlineSuggestions(suggestions, onSelect) {
    const html = `
        <div class="deadline-suggestions">
            <h4 style="margin-bottom: 15px;">📅 Gợi ý Deadline:</h4>
            ${suggestions.map((sug, index) => `
                <div class="deadline-option" data-date="${sug.date}" style="
                    background: var(--bg-card);
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    border: 2px solid transparent;
                    transition: all 0.2s;
                ">
                    <div style="font-weight: 600; color: var(--primary-color);">
                        ${sug.date}
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                        ${sug.reason}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    return html;
}
