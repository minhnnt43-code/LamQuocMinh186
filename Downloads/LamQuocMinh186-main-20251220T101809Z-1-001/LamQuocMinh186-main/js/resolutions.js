// ============================================================
// FILE: js/resolutions.js
// Mục đích: Quản lý cơ sở dữ liệu Nghị quyết Đảng
// ============================================================

import { generateContent, QuotaExceededError } from './ai/gemini.js';
import { showNotification, toggleLoading } from './common.js';
import { saveUserData, auth } from './firebase.js';

/**
 * Danh sách Nghị quyết mẫu (có thể mở rộng)
 */
export const SAMPLE_RESOLUTIONS = [
    {
        id: 'nq-dai-hoi-13',
        name: 'Nghị quyết Đại hội XIII',
        shortName: 'NQ ĐH XIII',
        year: 2021,
        issuer: 'Ban Chấp hành Trung ương Đảng',
        category: 'Đại hội',
        summary: 'Chiến lược phát triển kinh tế - xã hội 2021-2030',
        keyPoints: [
            'Đổi mới mạnh mẽ mô hình tăng trưởng',
            'Đẩy mạnh chuyển đổi số quốc gia',
            'Phát triển nguồn nhân lực chất lượng cao'
        ]
    },
    {
        id: 'nq-35',
        name: 'Nghị quyết số 35-NQ/TW',
        shortName: 'NQ 35',
        year: 2023,
        issuer: 'Bộ Chính trị',
        category: 'Bộ Chính trị',
        summary: 'Về tăng cường bảo vệ nền tảng tư tưởng của Đảng',
        keyPoints: [
            'Đấu tranh phản bác các quan điểm sai trái',
            'Bảo vệ Chủ nghĩa Mác - Lênin, tư tưởng Hồ Chí Minh',
            'Xây dựng môi trường thông tin lành mạnh'
        ]
    },
    {
        id: 'nq-52',
        name: 'Nghị quyết số 52-NQ/TW',
        shortName: 'NQ 52',
        year: 2019,
        issuer: 'Bộ Chính trị',
        category: 'Chủ động tham gia CMCN 4.0',
        summary: 'Về một số chủ trương, chính sách chủ động tham gia CMCN 4.0',
        keyPoints: [
            'Hoàn thiện thể chế số',
            'Phát triển hạ tầng công nghệ số',
            'Đào tạo nguồn nhân lực số'
        ]
    }
];

/**
 * Class quản lý Nghị quyết
 */
export class ResolutionManager {
    constructor() {
        this.resolutions = [...SAMPLE_RESOLUTIONS];
        this.userResolutions = [];
    }

    /**
     * Load resolutions từ Firebase
     */
    async loadFromFirebase() {
        try {
            const user = auth.currentUser;
            if (!user) return;

            // Load user's custom resolutions
            // This would integrate with your Firebase structure
            console.log('Loading resolutions from Firebase...');
        } catch (error) {
            console.error('Error loading resolutions:', error);
        }
    }

    /**
     * Thêm Nghị quyết mới
     */
    async addResolution(resolution) {
        const newRes = {
            id: 'nq-' + Date.now(),
            ...resolution,
            addedAt: new Date().toISOString()
        };

        this.userResolutions.push(newRes);
        await this.saveToFirebase();

        showNotification('✅ Đã thêm Nghị quyết');
        return newRes;
    }

    /**
     * Lấy tất cả Nghị quyết
     */
    getAll() {
        return [...this.resolutions, ...this.userResolutions];
    }

    /**
     * Tìm kiếm theo keyword
     */
    search(keyword) {
        const lowerKey = keyword.toLowerCase();
        return this.getAll().filter(res =>
            res.name.toLowerCase().includes(lowerKey) ||
            res.summary.toLowerCase().includes(lowerKey) ||
            res.keyPoints.some(kp => kp.toLowerCase().includes(lowerKey))
        );
    }

    /**
     * Lọc theo năm
     */
    filterByYear(year) {
        return this.getAll().filter(res => res.year === year);
    }

    /**
     * Lọc theo category
     */
    filterByCategory(category) {
        return this.getAll().filter(res => res.category === category);
    }

    /**
     * Lưu vào Firebase
     */
    async saveToFirebase() {
        try {
            const user = auth.currentUser;
            if (!user) return;

            await saveUserData(user.uid, {
                resolutions: this.userResolutions
            });
        } catch (error) {
            console.error('Error saving resolutions:', error);
        }
    }
}

/**
 * So sánh 2 Nghị quyết bằng AI
 */
export async function compareResolutions(res1, res2) {
    const prompt = `
Bạn là chuyên gia phân tích Nghị quyết Đảng. Hãy so sánh 2 Nghị quyết sau:

📜 NGHỊ QUYẾT 1:
- Tên: ${res1.name}
- Năm: ${res1.year}
- Tóm tắt: ${res1.summary}
- Điểm chính: ${res1.keyPoints?.join('; ') || 'Không có'}

📜 NGHỊ QUYẾT 2:
- Tên: ${res2.name}
- Năm: ${res2.year}
- Tóm tắt: ${res2.summary}
- Điểm chính: ${res2.keyPoints?.join('; ') || 'Không có'}

YÊU CẦU:
1. Điểm giống nhau
2. Điểm khác nhau
3. Mối liên hệ kế thừa (nếu có)
4. Điểm mới của Nghị quyết sau

Trả về định dạng rõ ràng, có tiêu đề cho từng phần.
    `.trim();

    try {
        toggleLoading(true);
        const result = await generateContent(prompt, { temperature: 0.4 });
        return {
            success: true,
            comparison: result
        };
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            return {
                success: false,
                error: 'Vượt quota AI. Vui lòng đợi 1 phút.'
            };
        }
        return {
            success: false,
            error: error.message
        };
    } finally {
        toggleLoading(false);
    }
}

/**
 * Tóm tắt Nghị quyết (đã có trong prompts.js, tái sử dụng)
 */
export async function summarizeResolution(fullText) {
    const prompt = `
Bạn là chuyên gia phân tích văn bản Đảng. Hãy tóm tắt Nghị quyết sau:

📜 NỘI DUNG NGHỊ QUYẾT:
${fullText.substring(0, 8000)} ${fullText.length > 8000 ? '...(đã cắt bớt)' : ''}

YÊU CẦU TÓM TẮT:
1. **Bối cảnh ban hành** (2-3 câu)
2. **Mục tiêu tổng quát**
3. **Nhiệm vụ và giải pháp chính** (bullet points)
4. **Điểm mới, đột phá** (nếu có)
5. **Tổ chức thực hiện**

Format: Rõ ràng, dễ đọc, có tiêu đề cho từng phần.
    `.trim();

    try {
        toggleLoading(true);
        const result = await generateContent(prompt, { temperature: 0.3 });
        return {
            success: true,
            summary: result
        };
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            return {
                success: false,
                error: 'Vượt quota AI. Vui lòng đợi.'
            };
        }
        return {
            success: false,
            error: error.message
        };
    } finally {
        toggleLoading(false);
    }
}

/**
 * Trích xuất điểm chính từ văn bản
 */
export async function extractKeyPoints(text) {
    const prompt = `
Trích xuất 5-7 điểm quan trọng nhất từ văn bản sau:

${text.substring(0, 4000)}

Trả về dạng JSON array:
["Điểm 1", "Điểm 2", ...]

Chỉ trả về JSON, không thêm text khác.
    `.trim();

    try {
        const result = await generateContent(prompt, { temperature: 0.2 });
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    } catch (error) {
        console.error('Extract key points error:', error);
        return [];
    }
}

/**
 * Render UI cho Resolution Library
 */
export function renderResolutionLibrary(containerId, resolutions, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (resolutions.length === 0) {
        container.innerHTML = '<p class="no-data">Chưa có Nghị quyết nào</p>';
        return;
    }

    const html = `
        <div class="resolution-grid">
            ${resolutions.map(res => `
                <div class="resolution-card" data-id="${res.id}">
                    <div class="res-header">
                        <span class="res-year">${res.year}</span>
                        <span class="res-category">${res.category}</span>
                    </div>
                    <h3 class="res-name">${res.shortName || res.name}</h3>
                    <p class="res-summary">${res.summary}</p>
                    <div class="res-keypoints">
                        ${res.keyPoints?.slice(0, 2).map(kp => `
                            <span class="res-keypoint">• ${kp}</span>
                        `).join('') || ''}
                    </div>
                    <button class="btn-view-res" data-id="${res.id}">Xem chi tiết</button>
                </div>
            `).join('')}
        </div>
    `;

    container.innerHTML = html;

    // Attach events
    container.querySelectorAll('.btn-view-res').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const res = resolutions.find(r => r.id === id);
            if (res && onSelect) onSelect(res);
        });
    });
}

/**
 * Render comparison result
 */
export function renderComparisonResult(containerId, result) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!result.success) {
        container.innerHTML = `<p class="error">${result.error}</p>`;
        return;
    }

    container.innerHTML = `
        <div class="comparison-result">
            <h3>📊 Kết quả so sánh</h3>
            <div class="comparison-content">${formatContent(result.comparison)}</div>
        </div>
    `;
}

function formatContent(text) {
    // Convert markdown-like formatting
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(/^- /gm, '• ');
}

// Export singleton instance
export const resolutionManager = new ResolutionManager();
