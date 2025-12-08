// --- FILE: js/ai-config.js ---
// Cấu hình cho các dịch vụ AI - Hỗ trợ nhiều providers với auto-fallback

export const AI_CONFIG = {
    // Provider ưu tiên: 'groq' (miễn phí), 'google', 'openai', 'deepseek'
    provider: 'groq',

    // API Keys (Sẽ được nhập từ Settings)
    googleApiKey: '',
    openaiApiKey: '',
    groqApiKey: '',
    deepseekApiKey: '',

    // Model settings cho từng provider
    googleModel: 'gemini-2.0-flash',
    openaiModel: 'gpt-3.5-turbo',
    groqModel: 'llama-3.3-70b-versatile',
    deepseekModel: 'deepseek-chat',

    // Request settings
    maxTokens: 2048,
    temperature: 0.7,

    // Rate limiting
    maxRequestsPerMinute: 10,
    requestCooldownMs: 1000,

    // UI settings
    showLoadingIndicator: true,
    enableVoiceInput: true,

    // Auto-fallback: Tự động chuyển provider khi gặp lỗi/rate limit
    enableFallback: true,
    // DeepSeek bị CORS khi gọi từ browser, nên không đưa vào fallback chain
    fallbackOrder: ['groq', 'google', 'openai'],

    // Feature toggles
    features: {
        taskAssistant: true,
        studyHelper: true,
        writingAssistant: true,
        calendarOptimizer: true,
        smartSearch: true,
        chatbot: true
    },

    // [MỚI] Global Shared Keys (Load từ Firebase system_config)
    globalKeys: {}
};

// Danh sách tất cả providers được hỗ trợ
export const SUPPORTED_PROVIDERS = {
    groq: {
        name: 'Groq',
        icon: '🚀',
        description: 'Miễn phí 100% - Llama 3.3 70B (Nhanh nhất)',
        keyPrefix: 'gsk_',
        free: true
    },
    deepseek: {
        name: 'DeepSeek',
        icon: '💎',
        description: 'Gần miễn phí - DeepSeek V3 (Rất mạnh)',
        keyPrefix: 'sk-',
        free: true
    },
    google: {
        name: 'Google AI (Gemini)',
        icon: '✨',
        description: 'Gemini 2.0 Flash - Cần API key',
        keyPrefix: 'AI',
        free: false
    },
    openai: {
        name: 'OpenAI (ChatGPT)',
        icon: '🤖',
        description: 'GPT-3.5/4 - Cần API key trả phí',
        keyPrefix: 'sk-',
        free: false
    }
};

// Hàm lấy API key: Ưu tiên LocalStorage > Global Shared Key
export const getApiKey = (provider = AI_CONFIG.provider) => {
    // 1. Check Personal Key
    const localKey = localStorage.getItem(`ai_api_key_${provider}`);
    if (localKey && localKey.length > 5) return localKey;

    // 2. Check Global Key (Shared)
    if (AI_CONFIG.globalKeys && AI_CONFIG.globalKeys[provider]) {
        return AI_CONFIG.globalKeys[provider];
    }

    return '';
};

// [MỚI] Fetch global keys từ Firebase
export const fetchGlobalKeys = async () => {
    try {
        // Dynamic import để tránh cycle dependency nếu không cẩn thận
        const { getSystemConfig } = await import('./firebase.js');
        const config = await getSystemConfig('ai_keys');
        if (config) {
            AI_CONFIG.globalKeys = config;
            console.log('Processed Global AI Keys:', Object.keys(config));
        }
    } catch (e) {
        console.warn('Cannot fetch global AI keys:', e);
    }
};

// Hàm lưu API key vào localStorage (tự động làm sạch ký tự không hợp lệ)
export const setApiKey = (provider, key) => {
    // Loại bỏ ký tự không phải ASCII và khoảng trắng thừa
    const sanitizedKey = key.replace(/[^\x00-\x7F]/g, '').trim();
    localStorage.setItem(`ai_api_key_${provider}`, sanitizedKey);

    // Update config instance ngay lập tức
    if (provider === 'google') AI_CONFIG.googleApiKey = sanitizedKey;
    else if (provider === 'openai') AI_CONFIG.openaiApiKey = sanitizedKey;
    else if (provider === 'groq') AI_CONFIG.groqApiKey = sanitizedKey;
    else if (provider === 'deepseek') AI_CONFIG.deepseekApiKey = sanitizedKey;
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
export const isApiConfigured = (provider = null) => {
    const targetProvider = provider || getProvider();
    const key = getApiKey(targetProvider);
    return key && key.length > 10;
};

// Lấy danh sách providers đã cấu hình
export const getConfiguredProviders = () => {
    return Object.keys(SUPPORTED_PROVIDERS).filter(p => isApiConfigured(p));
};

// Lấy provider tiếp theo trong fallback chain
export const getNextFallbackProvider = (currentProvider) => {
    const configuredProviders = getConfiguredProviders();
    const currentIndex = AI_CONFIG.fallbackOrder.indexOf(currentProvider);

    for (let i = currentIndex + 1; i < AI_CONFIG.fallbackOrder.length; i++) {
        const nextProvider = AI_CONFIG.fallbackOrder[i];
        if (configuredProviders.includes(nextProvider)) {
            return nextProvider;
        }
    }

    // Nếu hết fallback, tìm từ đầu (trừ current)
    for (const provider of AI_CONFIG.fallbackOrder) {
        if (provider !== currentProvider && configuredProviders.includes(provider)) {
            return provider;
        }
    }

    return null;
};

// Hàm tải cấu hình từ localStorage
export const loadAIConfig = () => {
    AI_CONFIG.provider = getProvider();
    AI_CONFIG.googleApiKey = getApiKey('google');
    AI_CONFIG.openaiApiKey = getApiKey('openai');
    AI_CONFIG.groqApiKey = getApiKey('groq');
    AI_CONFIG.deepseekApiKey = getApiKey('deepseek');

    // Load feature toggles
    const savedFeatures = localStorage.getItem('ai_features');
    if (savedFeatures) {
        try {
            AI_CONFIG.features = { ...AI_CONFIG.features, ...JSON.parse(savedFeatures) };
        } catch (e) {
            console.warn('Lỗi parse AI features config');
        }
    }

    // Load fallback setting
    const savedFallback = localStorage.getItem('ai_enable_fallback');
    if (savedFallback !== null) {
        AI_CONFIG.enableFallback = savedFallback === 'true';
    }
};

// Lưu cài đặt fallback
export const setFallbackEnabled = (enabled) => {
    AI_CONFIG.enableFallback = enabled;
    localStorage.setItem('ai_enable_fallback', enabled.toString());
};

// Kiểm tra fallback có bật không
export const isFallbackEnabled = () => {
    return AI_CONFIG.enableFallback;
};

// Load config khi module được import
loadAIConfig();
