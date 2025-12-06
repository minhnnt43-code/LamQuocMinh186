// --- FILE: js/ai-settings.js ---
// Xử lý UI Cài đặt AI

import { getApiKey, setApiKey, getProvider, setProvider, isApiConfigured } from './ai-config.js';
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

    // Sự kiện lưu Google API Key
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
            showNotification('Đã lưu Google AI Key! 🔑');
        });
    }

    // Sự kiện lưu OpenAI Key
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
            showNotification('Đã lưu OpenAI Key! 🔑');
        });
    }

    // Sự kiện test Google AI
    const testGoogleBtn = document.getElementById('btn-test-google-ai');
    if (testGoogleBtn) {
        testGoogleBtn.addEventListener('click', () => testAI('google'));
    }

    // Sự kiện test OpenAI
    const testOpenAIBtn = document.getElementById('btn-test-openai');
    if (testOpenAIBtn) {
        testOpenAIBtn.addEventListener('click', () => testAI('openai'));
    }

    // Sự kiện chọn provider
    const providerRadios = document.querySelectorAll('input[name="ai-provider"]');
    providerRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            setProvider(e.target.value);
            showNotification(`Đã chuyển sang ${e.target.value === 'google' ? 'Google AI' : 'OpenAI'}`);
        });
    });
};

/**
 * Cập nhật trạng thái UI
 */
const updateAIStatusUI = () => {
    const googleStatus = document.getElementById('google-ai-status');
    const openaiStatus = document.getElementById('openai-status');

    if (googleStatus) {
        const hasGoogleKey = getApiKey('google');
        if (hasGoogleKey) {
            googleStatus.textContent = '✓ Đã cấu hình';
            googleStatus.style.background = '#d4edda';
            googleStatus.style.color = '#155724';
        } else {
            googleStatus.textContent = 'Chưa cấu hình';
            googleStatus.style.background = '#eee';
            googleStatus.style.color = '#666';
        }
    }

    if (openaiStatus) {
        const hasOpenAIKey = getApiKey('openai');
        if (hasOpenAIKey) {
            openaiStatus.textContent = '✓ Đã cấu hình';
            openaiStatus.style.background = '#d4edda';
            openaiStatus.style.color = '#155724';
        } else {
            openaiStatus.textContent = 'Chưa cấu hình';
            openaiStatus.style.background = '#eee';
            openaiStatus.style.color = '#666';
        }
    }
};

/**
 * Load keys đã lưu vào input (masked)
 */
const loadSavedKeys = () => {
    const googleInput = document.getElementById('google-api-key');
    const openaiInput = document.getElementById('openai-api-key');

    const googleKey = getApiKey('google');
    const openaiKey = getApiKey('openai');

    if (googleInput && googleKey) {
        // Mask key để bảo mật
        googleInput.placeholder = `••••••••${googleKey.slice(-4)}`;
    }

    if (openaiInput && openaiKey) {
        openaiInput.placeholder = `••••••••${openaiKey.slice(-4)}`;
    }
};

/**
 * Load provider đã chọn
 */
const loadSavedProvider = () => {
    const provider = getProvider();
    const googleRadio = document.getElementById('provider-google');
    const openaiRadio = document.getElementById('provider-openai');

    if (provider === 'google' && googleRadio) {
        googleRadio.checked = true;
    } else if (provider === 'openai' && openaiRadio) {
        openaiRadio.checked = true;
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
        showNotification(`Vui lòng nhập và lưu ${provider === 'google' ? 'Google AI' : 'OpenAI'} API Key trước!`, 'error');
        return;
    }

    // Tạm thời set provider để test
    const originalProvider = getProvider();
    setProvider(provider);

    resultDiv.style.display = 'block';
    responseP.textContent = '⏳ Đang kết nối với AI...';

    try {
        const response = await aiService.ask('Xin chào! Bạn là ai? Trả lời trong 1 câu ngắn.');
        responseP.textContent = response;
        showNotification(`${provider === 'google' ? 'Google AI' : 'OpenAI'} hoạt động tốt! 🎉`);
    } catch (error) {
        responseP.textContent = `❌ Lỗi: ${error.message}`;
        showNotification(`Lỗi kết nối: ${error.message}`, 'error');
    }

    // Khôi phục provider gốc
    setProvider(originalProvider);
};
