/* ═══════════════════════════════════════════════════════════════
   LÁ SỐ LÂM QUỐC MINH - MEGA VERSION
   Phase 1: Core + Security Foundation
   ═══════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════
// SECURITY MODULE - AES-256 Encryption
// ═══════════════════════════════════════════════════════════════

const Security = {
    // Generate a secure key from PIN
    async deriveKey(pin) {
        const encoder = new TextEncoder();
        const pinData = encoder.encode(pin);

        // Use PBKDF2 to derive a strong key
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            pinData,
            'PBKDF2',
            false,
            ['deriveKey']
        );

        const salt = encoder.encode('LasoLamQuocMinh2024');

        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    // Encrypt data
    async encrypt(data, pin) {
        try {
            const key = await this.deriveKey(pin);
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));

            const iv = crypto.getRandomValues(new Uint8Array(12));

            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                dataBuffer
            );

            // Combine IV + encrypted data
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);

            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    },

    // Decrypt data
    async decrypt(encryptedString, pin) {
        try {
            const key = await this.deriveKey(pin);
            const combined = Uint8Array.from(atob(encryptedString), c => c.charCodeAt(0));

            const iv = combined.slice(0, 12);
            const data = combined.slice(12);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                data
            );

            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    },

    // Hash PIN for verification
    async hashPin(pin) {
        const encoder = new TextEncoder();
        const data = encoder.encode(pin + 'LasoSalt2024');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
};

// ═══════════════════════════════════════════════════════════════
// STORAGE MODULE - Encrypted Local Storage
// ═══════════════════════════════════════════════════════════════

const Storage = {
    PREFIX: 'laso_',

    // Save encrypted data
    async saveSecure(key, data, pin) {
        const encrypted = await Security.encrypt(data, pin);
        if (encrypted) {
            localStorage.setItem(this.PREFIX + key, encrypted);
            return true;
        }
        return false;
    },

    // Load and decrypt data
    async loadSecure(key, pin) {
        const encrypted = localStorage.getItem(this.PREFIX + key);
        if (!encrypted) return null;
        return await Security.decrypt(encrypted, pin);
    },

    // Save plain data (for non-sensitive info)
    save(key, data) {
        localStorage.setItem(this.PREFIX + key, JSON.stringify(data));
    },

    // Load plain data
    load(key) {
        const data = localStorage.getItem(this.PREFIX + key);
        return data ? JSON.parse(data) : null;
    },

    // Check if key exists
    has(key) {
        return localStorage.getItem(this.PREFIX + key) !== null;
    },

    // Remove data
    remove(key) {
        localStorage.removeItem(this.PREFIX + key);
    },

    // Clear all app data
    clearAll() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(this.PREFIX));
        keys.forEach(k => localStorage.removeItem(k));
    }
};

// ═══════════════════════════════════════════════════════════════
// APP STATE
// ═══════════════════════════════════════════════════════════════

const App = {
    isUnlocked: false,
    currentPin: null,
    autoLockTimer: null,
    AUTO_LOCK_DELAY: 60000, // 60 seconds

    // User profile data
    profiles: [],
    activeProfile: null,

    // Gemini API
    geminiApiKey: '',

    // Current page
    currentPage: 'dashboard'
};

// ═══════════════════════════════════════════════════════════════
// LOCK SCREEN MODULE
// ═══════════════════════════════════════════════════════════════

const LockScreen = {
    pin: '',
    isSetupMode: false,
    setupStep: 1, // 1 = enter new PIN, 2 = confirm PIN
    tempPin: '',

    init() {
        this.bindEvents();
        this.checkFirstTime();
    },

    bindEvents() {
        // Keypad buttons
        document.querySelectorAll('.pin-key').forEach(btn => {
            btn.addEventListener('click', () => {
                const value = btn.dataset.value;
                if (value === 'clear') {
                    this.clearPin();
                } else if (value === 'delete') {
                    this.deleteLastDigit();
                } else {
                    this.addDigit(value);
                }
            });
        });

        // Keyboard input
        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('lock-screen').classList.contains('hidden')) {
                if (e.key >= '0' && e.key <= '9') {
                    this.addDigit(e.key);
                } else if (e.key === 'Backspace') {
                    this.deleteLastDigit();
                } else if (e.key === 'Escape') {
                    this.clearPin();
                }
            }
        });
    },

    checkFirstTime() {
        if (!Storage.has('pin_hash')) {
            this.startSetupMode();
        }
    },

    startSetupMode() {
        this.isSetupMode = true;
        this.setupStep = 1;
        this.updateSetupUI();
    },

    updateSetupUI() {
        const message = document.getElementById('pin-message');
        const stepIndicator = document.getElementById('setup-step');

        if (this.setupStep === 1) {
            message.textContent = 'Tạo mã PIN 4-6 số để bảo vệ lá số của bạn';
            if (stepIndicator) stepIndicator.textContent = 'Bước 1/2: Nhập mã PIN mới';
        } else {
            message.textContent = 'Nhập lại mã PIN để xác nhận';
            if (stepIndicator) stepIndicator.textContent = 'Bước 2/2: Xác nhận mã PIN';
        }
    },

    addDigit(digit) {
        if (this.pin.length >= 6) return;

        this.pin += digit;
        this.updateDots();

        if (this.pin.length >= 4) {
            setTimeout(() => this.validatePin(), 200);
        }
    },

    deleteLastDigit() {
        this.pin = this.pin.slice(0, -1);
        this.updateDots();
    },

    clearPin() {
        this.pin = '';
        this.updateDots();
    },

    updateDots() {
        const dots = document.querySelectorAll('.pin-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('filled', index < this.pin.length);
            dot.classList.remove('error');
        });
    },

    async validatePin() {
        if (this.isSetupMode) {
            await this.handleSetup();
        } else {
            await this.handleUnlock();
        }
    },

    async handleSetup() {
        if (this.setupStep === 1) {
            // Save temp PIN and go to confirmation
            this.tempPin = this.pin;
            this.setupStep = 2;
            this.clearPin();
            this.updateSetupUI();
        } else {
            // Verify confirmation matches
            if (this.pin === this.tempPin) {
                await this.saveNewPin(this.pin);
                this.isSetupMode = false;
                this.showSuccess('Đã tạo mã PIN thành công!');
                await this.unlock(this.pin);
            } else {
                this.showError('Mã PIN không khớp. Thử lại.');
                this.setupStep = 1;
                this.tempPin = '';
                this.clearPin();
                this.updateSetupUI();
            }
        }
    },

    async handleUnlock() {
        const storedHash = Storage.load('pin_hash');
        const inputHash = await Security.hashPin(this.pin);

        if (inputHash === storedHash) {
            await this.unlock(this.pin);
        } else {
            this.showError('Mã PIN không đúng');
            this.clearPin();
        }
    },

    async saveNewPin(pin) {
        const hash = await Security.hashPin(pin);
        Storage.save('pin_hash', hash);
    },

    async unlock(pin) {
        App.isUnlocked = true;
        App.currentPin = pin;

        // Load user data
        await this.loadUserData(pin);

        // Hide lock screen, show app
        document.getElementById('lock-screen').classList.add('hidden');
        document.getElementById('app-container').classList.add('unlocked');

        // Load Gemini API key
        App.geminiApiKey = Storage.load('gemini_api_key') || '';

        // Start auto-lock timer
        this.startAutoLockTimer();

        // Initialize app
        AppController.init();
    },

    async loadUserData(pin) {
        // Load profiles
        const profiles = await Storage.loadSecure('profiles', pin);
        App.profiles = profiles || [];

        // Load active profile
        const activeId = Storage.load('active_profile_id');
        if (activeId && App.profiles.length > 0) {
            App.activeProfile = App.profiles.find(p => p.id === activeId) || App.profiles[0];
        }
    },

    lock() {
        App.isUnlocked = false;
        App.currentPin = null;
        this.clearAutoLockTimer();

        document.getElementById('app-container').classList.remove('unlocked');
        document.getElementById('lock-screen').classList.remove('hidden');
        this.clearPin();

        const message = document.getElementById('pin-message');
        message.textContent = 'Nhập mã PIN để mở khóa';
        message.classList.remove('error');
    },

    startAutoLockTimer() {
        this.clearAutoLockTimer();

        // Reset timer on any activity
        const resetTimer = () => {
            this.clearAutoLockTimer();
            App.autoLockTimer = setTimeout(() => {
                if (App.isUnlocked) {
                    this.lock();
                }
            }, App.AUTO_LOCK_DELAY);
        };

        // Listen for activity
        ['click', 'keydown', 'touchstart', 'scroll'].forEach(event => {
            document.addEventListener(event, resetTimer, { passive: true });
        });

        resetTimer();
    },

    clearAutoLockTimer() {
        if (App.autoLockTimer) {
            clearTimeout(App.autoLockTimer);
            App.autoLockTimer = null;
        }
    },

    showError(message) {
        const el = document.getElementById('pin-message');
        el.textContent = message;
        el.classList.add('error');

        document.querySelectorAll('.pin-dot').forEach(dot => {
            dot.classList.add('error');
        });

        setTimeout(() => {
            el.classList.remove('error');
        }, 2000);
    },

    showSuccess(message) {
        const el = document.getElementById('pin-message');
        el.textContent = message;
        el.style.color = 'var(--accent-green)';

        setTimeout(() => {
            el.style.color = '';
        }, 2000);
    }
};

// ═══════════════════════════════════════════════════════════════
// APP CONTROLLER
// ═══════════════════════════════════════════════════════════════

const AppController = {
    init() {
        this.bindNavigation();
        this.bindHeaderActions();
        this.updateUI();
        this.showPage('dashboard');
    },

    bindNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                this.showPage(page);
            });
        });
    },

    bindHeaderActions() {
        // Lock button
        document.getElementById('btn-lock')?.addEventListener('click', () => {
            LockScreen.lock();
        });

        // Settings button
        document.getElementById('btn-settings')?.addEventListener('click', () => {
            this.openSettings();
        });
    },

    showPage(pageName) {
        App.currentPage = pageName;

        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageName);
        });

        // Update pages
        document.querySelectorAll('.page-section').forEach(page => {
            page.classList.toggle('active', page.id === `page-${pageName}`);
        });
    },

    updateUI() {
        // Update user badge
        const badge = document.getElementById('user-badge');
        if (badge && App.activeProfile) {
            badge.innerHTML = `
                <span>👤</span>
                <span>${App.activeProfile.name}</span>
            `;
            badge.classList.remove('hidden');
        }
    },

    openSettings() {
        document.getElementById('settings-modal').classList.remove('hidden');

        // Load current API key
        const input = document.getElementById('api-key-input');
        if (input) input.value = App.geminiApiKey || '';
    },

    closeSettings() {
        document.getElementById('settings-modal').classList.add('hidden');
    },

    saveSettings() {
        const apiKey = document.getElementById('api-key-input').value.trim();
        App.geminiApiKey = apiKey;
        Storage.save('gemini_api_key', apiKey);

        this.closeSettings();
        showToast('Đã lưu cài đặt!');
    }
};

// ═══════════════════════════════════════════════════════════════
// PROFILE MANAGER
// ═══════════════════════════════════════════════════════════════

const ProfileManager = {
    openCreateModal() {
        document.getElementById('profile-modal').classList.remove('hidden');
        document.getElementById('profile-form').reset();
    },

    closeModal() {
        document.getElementById('profile-modal').classList.add('hidden');
    },

    async createProfile(formData) {
        const profile = {
            id: Date.now().toString(),
            name: formData.name,
            birthDate: formData.birthDate,
            birthHour: formData.birthHour || null,
            birthMinute: formData.birthMinute || null,
            gender: formData.gender || 'unknown',
            createdAt: new Date().toISOString(),

            // Calculated data (will be filled later)
            battu: null,
            numerology: null,
            zodiac: null,
            chineseZodiac: null
        };

        App.profiles.push(profile);
        App.activeProfile = profile;

        // Save encrypted
        await Storage.saveSecure('profiles', App.profiles, App.currentPin);
        Storage.save('active_profile_id', profile.id);

        this.closeModal();
        AppController.updateUI();
        showToast('Đã tạo hồ sơ mới!');

        return profile;
    },

    async deleteProfile(profileId) {
        if (!confirm('Bạn có chắc muốn xóa hồ sơ này?')) return;

        App.profiles = App.profiles.filter(p => p.id !== profileId);

        if (App.activeProfile?.id === profileId) {
            App.activeProfile = App.profiles[0] || null;
            Storage.save('active_profile_id', App.activeProfile?.id || null);
        }

        await Storage.saveSecure('profiles', App.profiles, App.currentPin);
        AppController.updateUI();
        showToast('Đã xóa hồ sơ');
    },

    switchProfile(profileId) {
        const profile = App.profiles.find(p => p.id === profileId);
        if (profile) {
            App.activeProfile = profile;
            Storage.save('active_profile_id', profile.id);
            AppController.updateUI();
            showToast(`Đã chuyển sang: ${profile.name}`);
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// GEMINI AI SERVICE
// ═══════════════════════════════════════════════════════════════

const GeminiAI = {
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',

    async query(prompt) {
        if (!App.geminiApiKey) {
            showToast('Vui lòng cài đặt API Key trong Settings');
            AppController.openSettings();
            return null;
        }

        try {
            const response = await fetch(`${this.API_URL}?key=${App.geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 2048
                    }
                })
            });

            if (!response.ok) {
                if (response.status === 400 || response.status === 401) {
                    showToast('API Key không hợp lệ!');
                    AppController.openSettings();
                    return null;
                }
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } catch (error) {
            console.error('Gemini API Error:', error);
            showToast('Lỗi kết nối AI. Thử lại sau.');
            return null;
        }
    },

    formatResponse(text) {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }
};

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function showToast(message, duration = 3000) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-card);
        color: var(--text-primary);
        padding: 12px 24px;
        border-radius: var(--radius-lg);
        border: 1px solid var(--accent-gold);
        z-index: 9999;
        animation: fadeInUp 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function showLoading(message = 'Đang xử lý...') {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">${message}</div>
    `;
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS - Astrology Data
// ═══════════════════════════════════════════════════════════════

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const CHI_EMOJI = ['🐀', '🐂', '🐅', '🐇', '🐉', '🐍', '🐎', '🐐', '🐵', '🐔', '🐕', '🐷'];

const NGU_HANH = {
    'Giáp': 'Mộc', 'Ất': 'Mộc',
    'Bính': 'Hỏa', 'Đinh': 'Hỏa',
    'Mậu': 'Thổ', 'Kỷ': 'Thổ',
    'Canh': 'Kim', 'Tân': 'Kim',
    'Nhâm': 'Thủy', 'Quý': 'Thủy'
};

const CHI_NGU_HANH = {
    'Tý': 'Thủy', 'Sửu': 'Thổ', 'Dần': 'Mộc', 'Mão': 'Mộc',
    'Thìn': 'Thổ', 'Tỵ': 'Hỏa', 'Ngọ': 'Hỏa', 'Mùi': 'Thổ',
    'Thân': 'Kim', 'Dậu': 'Kim', 'Tuất': 'Thổ', 'Hợi': 'Thủy'
};

const ELEMENT_COLORS = {
    'Kim': { color: '#ffd700', bg: 'rgba(255, 215, 0, 0.1)' },
    'Mộc': { color: '#228b22', bg: 'rgba(34, 139, 34, 0.1)' },
    'Thủy': { color: '#1e90ff', bg: 'rgba(30, 144, 255, 0.1)' },
    'Hỏa': { color: '#ff4500', bg: 'rgba(255, 69, 0, 0.1)' },
    'Thổ': { color: '#daa520', bg: 'rgba(218, 165, 32, 0.1)' }
};

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    LockScreen.init();
});

// Add CSS for toast animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);
