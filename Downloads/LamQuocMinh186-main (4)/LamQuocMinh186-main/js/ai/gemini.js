// ============================================================
// FILE: js/ai/gemini.js
// Mục đích: Kết nối và giao tiếp với Google Gemini API
// ============================================================

// URL API của Gemini (sử dụng model gemini-2.0-flash-exp - nhanh và hiệu quả)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// Lưu trữ API Key (lấy từ localStorage để bảo mật)
let GEMINI_API_KEY = localStorage.getItem('GEMINI_API_KEY') || '';

// Quota tracking
let requestCount = parseInt(localStorage.getItem('GEMINI_REQUEST_COUNT') || '0');
let lastResetTime = parseInt(localStorage.getItem('GEMINI_LAST_RESET') || Date.now());
const QUOTA_LIMIT_PER_MINUTE = 60; // Free tier limit

/**
 * Reset quota counter sau 1 phút
 */
function checkAndResetQuota() {
    const now = Date.now();
    const timeDiff = now - lastResetTime;

    // Reset sau 60 giây
    if (timeDiff >= 60000) {
        requestCount = 0;
        lastResetTime = now;
        localStorage.setItem('GEMINI_REQUEST_COUNT', '0');
        localStorage.setItem('GEMINI_LAST_RESET', now.toString());
        console.log("🔄 Quota đã được reset");
    }
}

/**
 * Lấy thông tin quota hiện tại
 */
export function getQuotaInfo() {
    checkAndResetQuota();
    const remaining = QUOTA_LIMIT_PER_MINUTE - requestCount;
    const timeToReset = 60 - Math.floor((Date.now() - lastResetTime) / 1000);

    return {
        used: requestCount,
        limit: QUOTA_LIMIT_PER_MINUTE,
        remaining: remaining > 0 ? remaining : 0,
        timeToReset: timeToReset > 0 ? timeToReset : 0,
        isExceeded: requestCount >= QUOTA_LIMIT_PER_MINUTE
    };
}

/**
 * Tăng request counter
 */
function incrementQuota() {
    requestCount++;
    localStorage.setItem('GEMINI_REQUEST_COUNT', requestCount.toString());
}

/**
 * Lưu API Key vào LocalStorage
 * @param {string} key - API Key từ Google AI Studio
 */
export function setApiKey(key) {
    GEMINI_API_KEY = key.trim();
    localStorage.setItem('GEMINI_API_KEY', GEMINI_API_KEY);
    console.log("✅ Đã lưu Gemini API Key");
}

/**
 * Lấy API Key hiện tại
 * @returns {string}
 */
export function getApiKey() {
    return GEMINI_API_KEY;
}

/**
 * Kiểm tra xem đã có API Key chưa
 * @returns {boolean}
 */
export function hasApiKey() {
    return !!GEMINI_API_KEY && GEMINI_API_KEY.length > 0;
}

/**
 * Xóa API Key (khi user muốn reset)
 */
export function clearApiKey() {
    GEMINI_API_KEY = '';
    localStorage.removeItem('GEMINI_API_KEY');
    // Reset quota khi xóa key
    requestCount = 0;
    localStorage.setItem('GEMINI_REQUEST_COUNT', '0');
    console.log("🗑️ Đã xóa Gemini API Key");
}

/**
 * Gửi yêu cầu đến Gemini API
 * @param {string} prompt - Nội dung yêu cầu
 * @param {object} options - Tùy chọn: temperature, maxTokens, etc.
 * @returns {Promise<string>} - Kết quả trả về từ AI
 */
export async function generateContent(prompt, options = {}) {
    // Kiểm tra API Key
    if (!hasApiKey()) {
        throw new Error("❌ Chưa có API Key. Vui lòng nhập Gemini API Key trong Cài đặt.");
    }

    // Kiểm tra quota
    checkAndResetQuota();
    const quotaInfo = getQuotaInfo();

    if (quotaInfo.isExceeded) {
        throw new QuotaExceededError(
            `Đã vượt quá giới hạn ${QUOTA_LIMIT_PER_MINUTE} requests/phút. ` +
            `Vui lòng đợi ${quotaInfo.timeToReset} giây.`,
            quotaInfo.timeToReset
        );
    }

    // Cấu hình request payload
    const payload = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: options.temperature || 0.7,
            topK: options.topK || 40,
            topP: options.topP || 0.95,
            maxOutputTokens: options.maxOutputTokens || 2048,
        }
    };

    try {
        console.log("🚀 Đang gọi Gemini API...");
        console.log(`📊 Quota: ${quotaInfo.used}/${quotaInfo.limit}`);

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // Xử lý lỗi HTTP
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error?.message || `HTTP Error ${response.status}`;

            // Phân loại lỗi
            if (response.status === 429) {
                throw new QuotaExceededError(
                    "Đã vượt quá giới hạn API của Google. Vui lòng đợi 1 phút hoặc nâng cấp tài khoản.",
                    60
                );
            } else if (response.status === 400 && errorMsg.includes('API_KEY_INVALID')) {
                throw new Error("API Key không hợp lệ. Vui lòng kiểm tra lại hoặc tạo key mới.");
            }

            throw new Error(`Lỗi API: ${errorMsg}`);
        }

        const data = await response.json();

        // Trích xuất text từ response
        if (data.candidates && data.candidates.length > 0) {
            const text = data.candidates[0].content.parts[0].text;
            console.log("✅ Nhận được kết quả từ Gemini");

            // Tăng quota counter
            incrementQuota();

            return text;
        } else {
            throw new Error("Không có phản hồi từ AI. Vui lòng thử lại.");
        }

    } catch (error) {
        console.error("❌ Lỗi Gemini API:", error);

        // Xử lý các lỗi thường gặp
        if (error instanceof QuotaExceededError) {
            throw error;
        } else if (error.message.includes('Failed to fetch')) {
            throw new Error("Không thể kết nối đến Gemini. Kiểm tra kết nối internet.");
        }

        throw error;
    }
}

/**
 * Custom Error cho Quota Exceeded
 */
export class QuotaExceededError extends Error {
    constructor(message, waitTime) {
        super(message);
        this.name = 'QuotaExceededError';
        this.waitTime = waitTime;
    }
}

/**
 * Test kết nối API (dùng để kiểm tra key có hoạt động không)
 * @returns {Promise<boolean>}
 */
export async function testConnection() {
    try {
        const result = await generateContent("Xin chào");
        return result.length > 0;
    } catch (error) {
        console.error("Test connection failed:", error);
        return false;
    }
}
