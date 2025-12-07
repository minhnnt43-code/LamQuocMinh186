// --- FILE: js/ai-settings.js ---
// Xử lý UI Cài đặt AI - Hỗ trợ nhiều providers

import {
    getApiKey,
    setApiKey,
    getProvider,
    setProvider,
    isApiConfigured,
    getConfiguredProviders,
    isFallbackEnabled,
    setFallbackEnabled,
    SUPPORTED_PROVIDERS
} from './ai-config.js';
import { aiService } from './ai-service.js';
import { showNotification } from './common.js';

/**
 * Khởi tạo UI Settings cho AI
 */
export const setupAISettings = () => {
    // Load trạng thái hiện tại
    updateAIStatusUI();
    loadSavedKeys();
    loadSavedProvider();
    loadFallbackSetting();
    updateTokenStatsUI(); // (#51) Load token stats

    // Reset Token Button (#51)
    const resetTokenBtn = document.getElementById('btn-reset-tokens');
    if (resetTokenBtn) {
        resetTokenBtn.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn reset tất cả thống kê tokens?')) {
                aiService.resetTokenStats();
                updateTokenStatsUI();
                showNotification('Đã reset thống kê tokens! 🔄');
            }
        });
    }

    // ============================================================
    // GROQ (Miễn phí - Khuyến nghị)
    // ============================================================
    const saveGroqBtn = document.getElementById('btn-save-groq-key');
    if (saveGroqBtn) {
        saveGroqBtn.addEventListener('click', () => {
            const key = document.getElementById('groq-api-key').value.trim();
            if (!key) {
                showNotification('Vui lòng nhập Groq API Key!', 'error');
                return;
            }
            setApiKey('groq', key);
            updateAIStatusUI();
            showNotification('Đã lưu Groq API Key! 🚀');
        });
    }

    const testGroqBtn = document.getElementById('btn-test-groq');
    if (testGroqBtn) {
        testGroqBtn.addEventListener('click', () => testAI('groq'));
    }

    // ============================================================
    // DEEPSEEK (Gần miễn phí)
    // ============================================================
    const saveDeepSeekBtn = document.getElementById('btn-save-deepseek-key');
    if (saveDeepSeekBtn) {
        saveDeepSeekBtn.addEventListener('click', () => {
            const key = document.getElementById('deepseek-api-key').value.trim();
            if (!key) {
                showNotification('Vui lòng nhập DeepSeek API Key!', 'error');
                return;
            }
            setApiKey('deepseek', key);
            updateAIStatusUI();
            showNotification('Đã lưu DeepSeek API Key! 💎');
        });
    }

    const testDeepSeekBtn = document.getElementById('btn-test-deepseek');
    if (testDeepSeekBtn) {
        testDeepSeekBtn.addEventListener('click', () => testAI('deepseek'));
    }

    // ============================================================
    // GOOGLE AI (Gemini)
    // ============================================================
    const saveGoogleBtn = document.getElementById('btn-save-google-key');
    if (saveGoogleBtn) {
        saveGoogleBtn.addEventListener('click', () => {
            const key = document.getElementById('google-api-key').value.trim();
            if (!key) {
                showNotification('Vui lòng nhập API Key!', 'error');
                return;
            }
            setApiKey('google', key);
            updateAIStatusUI();
            showNotification('Đã lưu Google AI Key! ✨');
        });
    }

    const testGoogleBtn = document.getElementById('btn-test-google-ai');
    if (testGoogleBtn) {
        testGoogleBtn.addEventListener('click', () => testAI('google'));
    }

    // ============================================================
    // OPENAI (ChatGPT)
    // ============================================================
    const saveOpenAIBtn = document.getElementById('btn-save-openai-key');
    if (saveOpenAIBtn) {
        saveOpenAIBtn.addEventListener('click', () => {
            const key = document.getElementById('openai-api-key').value.trim();
            if (!key) {
                showNotification('Vui lòng nhập API Key!', 'error');
                return;
            }
            setApiKey('openai', key);
            updateAIStatusUI();
            showNotification('Đã lưu OpenAI Key! 🤖');
        });
    }

    const testOpenAIBtn = document.getElementById('btn-test-openai');
    if (testOpenAIBtn) {
        testOpenAIBtn.addEventListener('click', () => testAI('openai'));
    }

    // ============================================================
    // Provider Selection
    // ============================================================
    const providerRadios = document.querySelectorAll('input[name="ai-provider"]');
    providerRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const provider = e.target.value;
            const providerInfo = SUPPORTED_PROVIDERS[provider];
            setProvider(provider);
            showNotification(`Đã chuyển sang ${providerInfo?.name || provider} ${providerInfo?.icon || ''}`);
            updateAIStatusUI();
        });
    });

    // ============================================================
    // Auto-Fallback Toggle
    // ============================================================
    const fallbackToggle = document.getElementById('ai-auto-fallback');
    if (fallbackToggle) {
        fallbackToggle.addEventListener('change', (e) => {
            setFallbackEnabled(e.target.checked);
            showNotification(e.target.checked
                ? 'Đã bật Auto-Fallback! Tự động chuyển provider khi lỗi 🔄'
                : 'Đã tắt Auto-Fallback');
        });
    }
};

/**
 * Cập nhật trạng thái UI cho tất cả providers
 */
const updateAIStatusUI = () => {
    const providers = ['groq', 'deepseek', 'google', 'openai'];
    const statusElementIds = {
        groq: 'groq-status',
        deepseek: 'deepseek-status',
        google: 'google-ai-status',
        openai: 'openai-status'
    };

    providers.forEach(provider => {
        const statusEl = document.getElementById(statusElementIds[provider]);
        if (statusEl) {
            const hasKey = isApiConfigured(provider);
            const providerInfo = SUPPORTED_PROVIDERS[provider];

            if (hasKey) {
                statusEl.textContent = '✓ Đã cấu hình';
                statusEl.style.background = '#d4edda';
                statusEl.style.color = '#155724';
            } else {
                statusEl.textContent = providerInfo?.free ? 'Miễn phí - Chưa cấu hình' : 'Chưa cấu hình';
                statusEl.style.background = providerInfo?.free ? '#fff3cd' : '#eee';
                statusEl.style.color = providerInfo?.free ? '#856404' : '#666';
            }
        }
    });

    // Cập nhật thông tin provider đang active
    const activeProviderEl = document.getElementById('active-provider-info');
    if (activeProviderEl) {
        const currentProvider = getProvider();
        const providerInfo = SUPPORTED_PROVIDERS[currentProvider];
        const configuredCount = getConfiguredProviders().length;

        activeProviderEl.innerHTML = `
            <strong>Provider hiện tại:</strong> ${providerInfo?.icon || ''} ${providerInfo?.name || currentProvider}
            <br><small>Đã cấu hình: ${configuredCount}/4 providers</small>
        `;
    }
};

/**
 * Load keys đã lưu vào input (masked)
 */
const loadSavedKeys = () => {
    const inputs = {
        groq: 'groq-api-key',
        deepseek: 'deepseek-api-key',
        google: 'google-api-key',
        openai: 'openai-api-key'
    };

    Object.entries(inputs).forEach(([provider, inputId]) => {
        const input = document.getElementById(inputId);
        const key = getApiKey(provider);

        if (input && key) {
            // Mask key để bảo mật
            input.placeholder = `••••••••${key.slice(-4)}`;
        }
    });
};

/**
 * Load provider đã chọn
 */
const loadSavedProvider = () => {
    const provider = getProvider();
    const radioId = `provider-${provider}`;
    const radio = document.getElementById(radioId);

    if (radio) {
        radio.checked = true;
    }
};

/**
 * Load fallback setting
 */
const loadFallbackSetting = () => {
    const toggle = document.getElementById('ai-auto-fallback');
    if (toggle) {
        toggle.checked = isFallbackEnabled();
    }
};

/**
 * Test AI với một câu đơn giản
 */
const testAI = async (provider) => {
    const resultDiv = document.getElementById('ai-test-result');
    const responseP = document.getElementById('ai-test-response');

    if (!resultDiv || !responseP) return;

    const key = getApiKey(provider);
    if (!key) {
        const providerInfo = SUPPORTED_PROVIDERS[provider];
        showNotification(`Vui lòng nhập và lưu ${providerInfo?.name || provider} API Key trước!`, 'error');
        return;
    }

    resultDiv.style.display = 'block';
    responseP.innerHTML = `<span style="color: #666;">⏳ Đang kết nối với ${SUPPORTED_PROVIDERS[provider]?.name}...</span>`;

    try {
        // Force dùng provider cụ thể, không fallback
        const response = await aiService.ask('Xin chào! Bạn là AI nào? Trả lời trong 1 câu ngắn.', {
            forceProvider: provider,
            noFallback: true
        });

        responseP.innerHTML = `
            <strong style="color: #28a745;">${SUPPORTED_PROVIDERS[provider]?.icon} ${SUPPORTED_PROVIDERS[provider]?.name}:</strong>
            <br>${response}
        `;
        showNotification(`${SUPPORTED_PROVIDERS[provider]?.name} hoạt động tốt! 🎉`);
    } catch (error) {
        responseP.innerHTML = `<span style="color: #dc3545;">❌ Lỗi: ${error.message}</span>`;
        showNotification(`Lỗi kết nối: ${error.message}`, 'error');
    }
};

/**
 * Get configured providers summary (for display)
 */
export const getProvidersSummary = () => {
    const configured = getConfiguredProviders();
    const current = getProvider();

    return {
        current,
        currentInfo: SUPPORTED_PROVIDERS[current],
        configured,
        total: Object.keys(SUPPORTED_PROVIDERS).length,
        fallbackEnabled: isFallbackEnabled()
    };
};

/**
 * Cập nhật UI hiển thị Token Stats (#51, #52)
 */
const updateTokenStatsUI = () => {
    try {
        const stats = aiService.getTokenStats();

        // Format số
        const formatNum = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString();

        // Cập nhật các thẻ thống kê
        const todayEl = document.getElementById('token-today');
        const weekEl = document.getElementById('token-week');
        const monthEl = document.getElementById('token-month');
        const totalEl = document.getElementById('token-total');

        if (todayEl) todayEl.textContent = formatNum(stats.today);
        if (weekEl) weekEl.textContent = formatNum(stats.week);
        if (monthEl) monthEl.textContent = formatNum(stats.month);
        if (totalEl) totalEl.textContent = formatNum(stats.total);

        // Cập nhật stats từng provider
        const providers = ['groq', 'google', 'openai', 'deepseek'];
        providers.forEach(p => {
            const el = document.getElementById(`token-${p}`);
            if (el && stats.byProvider[p]) {
                const s = stats.byProvider[p];
                el.textContent = `${formatNum(s.tokens)} tokens / ${s.requests} req`;
            }
        });
    } catch (e) {
        console.warn('Lỗi update token stats UI:', e);
    }
};

// Export để có thể gọi từ bên ngoài sau mỗi request
export { updateTokenStatsUI };
