// --- FILE: js/ai-config.js ---
// Cấu hình cho các dịch vụ AI

export const AI_CONFIG = {
    // API Provider: 'google' (Google AI Studio - Gemini) hoặc 'openai'
    provider: 'google',

    // API Keys (Sẽ được nhập từ Settings)
    googleApiKey: '',
    openaiApiKey: '',

    // Model settings
    googleModel: 'gemini-2.0-flash',
    openaiModel: 'gpt-3.5-turbo',

    // Request settings
    maxTokens: 2048,
    temperature: 0.7,

    // Rate limiting
    maxRequestsPerMinute: 10,
    requestCooldownMs: 1000,

    // UI settings
    showLoadingIndicator: true,
    enableVoiceInput: true,

    // Feature toggles
    features: {
        taskAssistant: true,
        studyHelper: true,
        writingAssistant: true,
        calendarOptimizer: true,
        smartSearch: true,
        chatbot: true
    }
};

// Hàm lấy API key từ localStorage
export const getApiKey = (provider = AI_CONFIG.provider) => {
    const key = localStorage.getItem(`ai_api_key_${provider}`);
    return key || '';
};

// Hàm lưu API key vào localStorage
export const setApiKey = (provider, key) => {
    localStorage.setItem(`ai_api_key_${provider}`, key);
    if (provider === 'google') {
        AI_CONFIG.googleApiKey = key;
    } else if (provider === 'openai') {
        AI_CONFIG.openaiApiKey = key;
    }
};

// Hàm lấy provider hiện tại
export const getProvider = () => {
    return localStorage.getItem('ai_provider') || AI_CONFIG.provider;
};

// Hàm đổi provider
export const setProvider = (provider) => {
    localStorage.setItem('ai_provider', provider);
    AI_CONFIG.provider = provider;
};

// Hàm kiểm tra API key đã được cấu hình chưa
export const isApiConfigured = () => {
    const provider = getProvider();
    const key = getApiKey(provider);
    return key && key.length > 10;
};

// Hàm tải cấu hình từ localStorage
export const loadAIConfig = () => {
    AI_CONFIG.provider = getProvider();
    AI_CONFIG.googleApiKey = getApiKey('google');
    AI_CONFIG.openaiApiKey = getApiKey('openai');

    // Load feature toggles
    const savedFeatures = localStorage.getItem('ai_features');
    if (savedFeatures) {
        try {
            AI_CONFIG.features = { ...AI_CONFIG.features, ...JSON.parse(savedFeatures) };
        } catch (e) {
            console.warn('Lỗi parse AI features config');
        }
    }
};

// Load config khi module được import
loadAIConfig();
