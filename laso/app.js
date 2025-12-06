/* ═══════════════════════════════════════════════════════════════
   MAIN APP MODULE - Application Controller
   Lá Số Lâm Quốc Minh
   ═══════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════
// APP STATE
// ═══════════════════════════════════════════════════════════════

const App = {
    isUnlocked: false,
    currentPassword: null,
    autoLockTimer: null,
    AUTO_LOCK_DELAY: 300000, // 5 minutes

    profiles: [],
    activeProfile: null,
    geminiApiKey: '',
    currentPage: 'dashboard',

    // Cached analysis data
    cache: {
        battu: null,
        numerology: null,
        aiAnalysis: {}
    }
};

// ═══════════════════════════════════════════════════════════════
// LOCK SCREEN MODULE - PASSWORD AUTHENTICATION
// ═══════════════════════════════════════════════════════════════

const LockScreen = {
    isSetupMode: false,
    setupStep: 1,
    tempPassword: '',

    init() {
        this.bindEvents();
        this.checkFirstTime();
    },

    bindEvents() {
        const passwordInput = document.getElementById('password-input');
        const submitBtn = document.getElementById('password-submit');
        const toggleBtn = document.getElementById('password-toggle');

        if (passwordInput) {
            passwordInput.addEventListener('keyup', (e) => {
                this.updateStrengthIndicator(passwordInput.value);
                if (e.key === 'Enter') this.handleSubmit();
            });
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.handleSubmit());
        }

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const isPassword = passwordInput.type === 'password';
                passwordInput.type = isPassword ? 'text' : 'password';
                toggleBtn.textContent = isPassword ? '🙈' : '👁️';
            });
        }
    },

    checkFirstTime() {
        if (!Storage.has('password_hash')) {
            this.startSetupMode();
        } else {
            this.showUnlockMode();
        }
    },

    startSetupMode() {
        this.isSetupMode = true;
        this.setupStep = 1;
        this.updateSetupUI();
    },

    showUnlockMode() {
        const message = document.getElementById('password-message');
        const step = document.getElementById('setup-step');
        const submitBtn = document.getElementById('password-submit');

        if (message) message.textContent = 'Nhập mật khẩu để mở khóa';
        if (step) step.textContent = '';
        if (submitBtn) submitBtn.textContent = '🔓 Mở Khóa';

        document.querySelector('.password-strength')?.classList.add('hidden');
    },

    updateSetupUI() {
        const message = document.getElementById('password-message');
        const step = document.getElementById('setup-step');
        const submitBtn = document.getElementById('password-submit');

        document.querySelector('.password-strength')?.classList.remove('hidden');

        if (this.setupStep === 1) {
            if (message) message.textContent = 'Tạo mật khẩu để bảo vệ lá số';
            if (step) step.textContent = 'Bước 1/2: Tạo mật khẩu mới (tối thiểu 6 ký tự)';
            if (submitBtn) submitBtn.textContent = '→ Tiếp tục';
        } else {
            if (message) message.textContent = 'Nhập lại mật khẩu để xác nhận';
            if (step) step.textContent = 'Bước 2/2: Xác nhận mật khẩu';
            if (submitBtn) submitBtn.textContent = '✓ Hoàn tất';
        }
    },

    updateStrengthIndicator(password) {
        const bar = document.querySelector('.password-strength-bar');
        if (!bar || !this.isSetupMode) return;

        bar.className = 'password-strength-bar';
        if (password.length === 0) return;

        const strength = Security.getPasswordStrength(password);
        bar.classList.add(strength.class);
    },

    async handleSubmit() {
        const input = document.getElementById('password-input');
        const password = input?.value || '';

        if (password.length < 6) {
            this.showError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        if (this.isSetupMode) {
            await this.handleSetup(password);
        } else {
            await this.handleUnlock(password);
        }
    },

    async handleSetup(password) {
        if (this.setupStep === 1) {
            this.tempPassword = password;
            this.setupStep = 2;
            document.getElementById('password-input').value = '';
            this.updateSetupUI();
        } else {
            if (password === this.tempPassword) {
                await this.saveNewPassword(password);
                this.isSetupMode = false;
                this.showSuccess('Đã tạo mật khẩu thành công!');
                setTimeout(() => this.unlock(password), 500);
            } else {
                this.showError('Mật khẩu không khớp');
                this.setupStep = 1;
                this.tempPassword = '';
                document.getElementById('password-input').value = '';
                this.updateSetupUI();
            }
        }
    },

    async handleUnlock(password) {
        const storedHash = Storage.load('password_hash');
        const inputHash = await Security.secureHash(password);

        if (inputHash === storedHash) {
            await this.unlock(password);
        } else {
            this.showError('Mật khẩu không đúng');
            document.getElementById('password-input').value = '';
        }
    },

    async saveNewPassword(password) {
        const hash = await Security.secureHash(password);
        Storage.save('password_hash', hash);
    },

    async unlock(password) {
        App.isUnlocked = true;
        App.currentPassword = password;

        await this.loadUserData(password);

        document.getElementById('lock-screen').classList.add('hidden');
        document.getElementById('app-container').classList.add('unlocked');

        App.geminiApiKey = Storage.load('gemini_api_key') || '';
        this.startAutoLockTimer();

        AppController.init();
    },

    async loadUserData(password) {
        const profiles = await Storage.loadSecure('profiles', password);
        App.profiles = profiles || [];

        const activeId = Storage.load('active_profile_id');
        if (activeId && App.profiles.length > 0) {
            App.activeProfile = App.profiles.find(p => p.id === activeId) || App.profiles[0];
        }
    },

    lock() {
        App.isUnlocked = false;
        App.currentPassword = null;
        App.cache = { battu: null, numerology: null, aiAnalysis: {} };
        this.clearAutoLockTimer();

        document.getElementById('app-container').classList.remove('unlocked');
        document.getElementById('lock-screen').classList.remove('hidden');
        document.getElementById('password-input').value = '';

        this.showUnlockMode();
    },

    startAutoLockTimer() {
        this.clearAutoLockTimer();
        const resetTimer = () => {
            this.clearAutoLockTimer();
            App.autoLockTimer = setTimeout(() => {
                if (App.isUnlocked) this.lock();
            }, App.AUTO_LOCK_DELAY);
        };

        ['click', 'keydown', 'touchstart', 'scroll'].forEach(e => {
            document.addEventListener(e, resetTimer, { passive: true });
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
        const el = document.getElementById('password-message');
        if (el) {
            el.textContent = message;
            el.classList.add('error');
            el.classList.remove('success');
            setTimeout(() => el.classList.remove('error'), 2000);
        }
    },

    showSuccess(message) {
        const el = document.getElementById('password-message');
        if (el) {
            el.textContent = message;
            el.classList.add('success');
            el.classList.remove('error');
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// AUTH MODULE - Email/Password (Restricted to lqm186005@gmail.com)
// ═══════════════════════════════════════════════════════════════

const Auth = {
    async init() {
        // Check if Supabase is configured
        if (!SupabaseClient.isConfigured()) {
            console.log('Supabase not configured, using local storage');
            return false;
        }

        // Initialize Supabase
        if (!SupabaseClient.init()) return false;

        // Check existing session
        try {
            const session = await SupabaseClient.getSession();
            if (session) {
                await this.onLoginSuccess();
                return true;
            }
        } catch (error) {
            if (error.message === 'EMAIL_NOT_ALLOWED') {
                this.showAuthScreen();
                this.showMessage('⛔ Email không được phép truy cập!', 'error');
                return false;
            }
        }

        this.showAuthScreen();
        return false;
    },

    showAuthScreen() {
        const lockScreen = document.getElementById('lock-screen');
        if (!lockScreen) return;

        lockScreen.innerHTML = `
            <div class="lock-logo">🌙</div>
            <h1 class="lock-title">Lá Số Lâm Quốc Minh</h1>
            <p class="lock-subtitle">Chỉ dành cho chủ sở hữu</p>
            
            <div class="password-container" id="auth-container">
                <input type="email" id="auth-email" class="password-input" 
                    placeholder="Email" value="${SupabaseClient.ALLOWED_EMAIL}" readonly 
                    style="background: #f0f0f0; text-align: left;">
                <input type="password" id="auth-password" class="password-input" 
                    placeholder="Mật khẩu" style="text-align: left;">
                
                <button class="password-submit" onclick="Auth.handleLogin()">
                    🔓 Đăng Nhập
                </button>
                
                <p style="text-align: center; margin-top: 1rem; font-size: 0.85rem; color: #666;">
                    Chưa có tài khoản? 
                    <a href="javascript:void(0)" onclick="Auth.handleSignUp()" 
                       style="color: var(--accent-gold); text-decoration: underline;">Đăng ký</a>
                </p>
                
                <button type="button" class="forgot-password-btn" onclick="Auth.handleForgotPassword()">
                    Quên mật khẩu?
                </button>
                
                <p id="auth-message" class="password-message" style="margin-top: 1rem;"></p>
            </div>
            
            <div class="lock-footer"><p>☁️ Dữ liệu đồng bộ qua Supabase</p></div>
        `;

        // Focus password field
        setTimeout(() => {
            document.getElementById('auth-password')?.focus();
        }, 100);
    },

    async handleForgotPassword() {
        const email = document.getElementById('auth-email').value.trim();

        if (!email) {
            this.showMessage('⚠️ Vui lòng nhập email', 'error');
            return;
        }

        this.showMessage('⏳ Đang gửi email khôi phục...', '');

        try {
            // Use Supabase password reset
            const { error } = await SupabaseClient.client.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname
            });

            if (error) throw error;

            this.showMessage('✅ Đã gửi email khôi phục! Kiểm tra hộp thư của bạn.', 'success');
        } catch (error) {
            console.error('Reset password error:', error);
            // Fallback to EmailJS if Supabase fails
            await this.sendRecoveryEmailJS();
        }
    },

    async sendRecoveryEmailJS() {
        try {
            const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
            localStorage.setItem('recovery_code', recoveryCode);
            localStorage.setItem('recovery_expiry', Date.now() + 10 * 60 * 1000);

            await emailjs.send('service_h4ufunn', 'template_2f3okkd', {
                recovery_code: recoveryCode,
                to_email: 'lqm186005@gmail.com'
            });

            this.showMessage('✅ Đã gửi mã khôi phục qua email!', 'success');
            this.showRecoveryCodeInput();
        } catch (error) {
            console.error('EmailJS error:', error);
            this.showMessage('❌ Lỗi gửi email. Vui lòng thử lại.', 'error');
        }
    },

    showRecoveryCodeInput() {
        const container = document.getElementById('auth-container');
        if (!container) return;

        container.innerHTML = `
            <h3 style="color: var(--accent-gold); margin-bottom: 1rem;">🔑 Khôi Phục Mật Khẩu</h3>
            <p style="color: #666; font-size: 0.85rem; margin-bottom: 1rem;">Nhập mã 6 số đã gửi tới email</p>
            
            <input type="text" id="recovery-code" class="password-input" placeholder="Nhập mã 6 số..." maxlength="6" style="text-align: center; letter-spacing: 0.5rem; font-size: 1.5rem;">
            
            <button class="password-submit" onclick="Auth.verifyRecoveryCode()">✅ Xác Nhận</button>
            
            <button type="button" class="forgot-password-btn" onclick="Auth.showAuthScreen()">← Quay lại</button>
            
            <p id="auth-message" class="password-message" style="margin-top: 1rem;"></p>
        `;
    },

    verifyRecoveryCode() {
        const inputCode = document.getElementById('recovery-code').value.trim();
        const savedCode = localStorage.getItem('recovery_code');
        const expiry = parseInt(localStorage.getItem('recovery_expiry') || '0');

        if (Date.now() > expiry) {
            this.showMessage('❌ Mã đã hết hạn. Vui lòng gửi lại.', 'error');
            return;
        }

        if (inputCode !== savedCode) {
            this.showMessage('❌ Mã không đúng. Vui lòng thử lại.', 'error');
            return;
        }

        // Code is correct, show new password form
        this.showNewPasswordForm();
    },

    showNewPasswordForm() {
        const container = document.getElementById('auth-container');
        if (!container) return;

        container.innerHTML = `
            <h3 style="color: var(--accent-gold); margin-bottom: 1rem;">🔐 Đặt Mật Khẩu Mới</h3>
            
            <input type="password" id="new-password" class="password-input" placeholder="Mật khẩu mới..." style="text-align: left;">
            <input type="password" id="confirm-password" class="password-input" placeholder="Xác nhận mật khẩu..." style="text-align: left; margin-top: 0.5rem;">
            
            <button class="password-submit" onclick="Auth.saveNewPassword()">💾 Lưu Mật Khẩu</button>
            
            <p id="auth-message" class="password-message" style="margin-top: 1rem;"></p>
        `;
    },

    async saveNewPassword() {
        const newPass = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('confirm-password').value;

        if (newPass.length < 6) {
            this.showMessage('❌ Mật khẩu phải có ít nhất 6 ký tự', 'error');
            return;
        }

        if (newPass !== confirmPass) {
            this.showMessage('❌ Mật khẩu xác nhận không khớp', 'error');
            return;
        }

        this.showMessage('⏳ Đang cập nhật mật khẩu...', '');

        try {
            // Try Supabase first
            if (SupabaseClient.client) {
                const { error } = await SupabaseClient.client.auth.updateUser({ password: newPass });
                if (error) throw error;
            }

            // Clear recovery data
            localStorage.removeItem('recovery_code');
            localStorage.removeItem('recovery_expiry');

            this.showMessage('✅ Đã cập nhật mật khẩu! Đang chuyển hướng...', 'success');

            setTimeout(() => {
                this.showAuthScreen();
            }, 1500);
        } catch (error) {
            console.error('Update password error:', error);
            this.showMessage('❌ Lỗi cập nhật mật khẩu: ' + error.message, 'error');
        }
    },

    async handleLogin() {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;

        if (!password) {
            this.showMessage('⚠️ Vui lòng nhập mật khẩu', 'error');
            return;
        }

        // ⭐ Mật khẩu mặc định bypass
        const DEFAULT_PASSWORD = 'lamquocminh';
        if (password === DEFAULT_PASSWORD) {
            this.showMessage('✅ Đăng nhập thành công!', 'success');
            await this.onLoginSuccess();
            return;
        }

        this.showMessage('⏳ Đang đăng nhập...', '');

        try {
            await SupabaseClient.signIn(email, password);
            await this.onLoginSuccess();
        } catch (error) {
            this.showMessage('❌ ' + (error.message || 'Đăng nhập thất bại'), 'error');
        }
    },

    async handleSignUp() {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;

        if (!password || password.length < 6) {
            this.showMessage('⚠️ Mật khẩu phải có ít nhất 6 ký tự', 'error');
            return;
        }

        this.showMessage('⏳ Đang đăng ký...', '');

        try {
            await SupabaseClient.signUp(email, password);
            this.showMessage('✅ Đăng ký thành công! Bạn có thể đăng nhập ngay.', 'success');
        } catch (error) {
            this.showMessage('❌ ' + (error.message || 'Đăng ký thất bại'), 'error');
        }
    },

    async onLoginSuccess() {
        // Load data from cloud
        const cloudData = await CloudStorage.load();

        if (cloudData) {
            App.profiles = cloudData.profiles || [];
            App.geminiApiKey = cloudData.settings?.geminiApiKey || '';

            if (App.profiles.length > 0) {
                App.activeProfile = App.profiles[0];
                if (cloudData.lifeContext) {
                    App.activeProfile.lifeContext = cloudData.lifeContext;
                }
            }
        }

        // Hide lock screen, show app
        document.getElementById('lock-screen').classList.add('hidden');
        document.getElementById('app-container').classList.add('unlocked');

        App.isUnlocked = true;
        AppController.init();
    },

    async logout() {
        await SupabaseClient.signOut();
        location.reload();
    },

    showMessage(text, type) {
        const el = document.getElementById('auth-message');
        if (el) {
            el.innerHTML = text;
            el.className = 'password-message ' + type;
        }
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
            btn.addEventListener('click', () => this.showPage(btn.dataset.page));
        });
    },

    bindHeaderActions() {
        document.getElementById('btn-lock')?.addEventListener('click', () => LockScreen.lock());
        document.getElementById('btn-settings')?.addEventListener('click', () => this.openSettings());
    },

    showPage(pageName) {
        App.currentPage = pageName;

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageName);
        });

        document.querySelectorAll('.page-section').forEach(page => {
            page.classList.toggle('active', page.id === `page-${pageName}`);
        });

        // Load content based on page
        if (pageName === 'battu' && App.activeProfile) this.loadBatTuPage();
        if (pageName === 'numerology' && App.activeProfile) this.loadNumerologyPage();
        if (pageName === 'zodiac' && App.activeProfile) this.loadZodiacPage();
        if (pageName === 'congap' && App.activeProfile) this.loadConGapPage();
        if (pageName === 'moon') this.loadMoonPage();
        if (pageName === 'daily' && App.activeProfile) this.loadDailyPage();
        if (pageName === 'aichat' && App.activeProfile) this.loadAIChatPage();
        if (pageName === 'profiles') this.loadProfilesPage();
    },

    updateUI() {
        const badge = document.getElementById('user-badge');
        const noProfile = document.getElementById('no-profile-msg');
        const cards = document.getElementById('dashboard-cards');

        if (App.activeProfile) {
            badge?.classList.remove('hidden');
            if (badge) badge.innerHTML = `<span>👤</span><span>${App.activeProfile.name}</span>`;
            noProfile?.classList.add('hidden');
            cards?.classList.remove('hidden');
        } else {
            badge?.classList.add('hidden');
            noProfile?.classList.remove('hidden');
            cards?.classList.add('hidden');
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════════

    openSettings() {
        const modal = document.getElementById('settings-modal');
        const input = document.getElementById('api-key-input');

        if (modal) modal.classList.remove('hidden');
        if (input) input.value = App.geminiApiKey || '';
    },

    closeSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) modal.classList.add('hidden');
    },

    saveSettings() {
        const input = document.getElementById('api-key-input');
        const apiKey = input?.value?.trim() || '';

        App.geminiApiKey = apiKey;
        Storage.save('gemini_api_key', apiKey);

        this.closeSettings();
        UI.toast('✅ Đã lưu cài đặt!');
    },

    async loadBatTuPage() {
        const container = document.getElementById('battu-content');
        if (!container || !App.activeProfile) return;

        UI.showLoading('Đang tính Bát Tự...');

        try {
            const hour = App.activeProfile.birthHour ? parseInt(App.activeProfile.birthHour) : 12;
            const battu = BatTu.calculate(App.activeProfile.birthDate, hour);
            App.cache.battu = battu;

            container.innerHTML = `
                <div class="result-section">
                    <h3>🏛️ Tứ Trụ</h3>
                    ${UI.renderPillars(battu.pillars)}
                </div>
                
                <div class="result-section">
                    <h3>🌊 Ngũ Hành</h3>
                    ${UI.renderElementsChart(battu.elements)}
                    <p class="analysis-text">${battu.analysis.summary}</p>
                </div>
                
                <div class="result-section">
                    <h3>🍀 Hành May Mắn</h3>
                    <div class="lucky-elements">
                        ${battu.analysis.luckyColors.map(c => `
                            <span class="lucky-tag" style="background: ${c.bg}; color: ${c.color}; border: 1px solid ${c.color}">
                                ${c.icon} ${c.name}
                            </span>
                        `).join('')}
                    </div>
                </div>
                
                <button class="btn btn-ai btn-block mt-md" onclick="AppController.getAIBatTuAnalysis()">
                    🤖 Luận Giải AI Chi Tiết
                </button>
                
                <div id="battu-ai-result" class="mt-md"></div>
            `;
        } catch (error) {
            console.error('Bát Tự error:', error);
            container.innerHTML = '<p class="error-text">Có lỗi xảy ra khi tính toán</p>';
        } finally {
            UI.hideLoading();
        }
    },

    async getAIBatTuAnalysis() {
        if (!App.geminiApiKey) {
            UI.toast('⚙️ Vui lòng cài đặt API Key trong Settings');
            this.openSettings();
            return;
        }

        const resultEl = document.getElementById('battu-ai-result');
        if (!resultEl || !App.cache.battu) return;

        UI.showLoading('🤖 AI đang phân tích lá số...');

        try {
            const analysis = await GeminiAI.analyzeBatTu(App.cache.battu, App.activeProfile, App.geminiApiKey);
            const formatted = GeminiAI.formatResponse(analysis);
            resultEl.innerHTML = UI.renderAIResult(formatted, 'Luận Giải Bát Tự');
        } catch (error) {
            if (error.message === 'API_KEY_INVALID') {
                UI.toast('❌ API Key không hợp lệ');
                this.openSettings();
            } else {
                UI.toast('❌ Lỗi kết nối AI');
            }
        } finally {
            UI.hideLoading();
        }
    },

    async loadNumerologyPage() {
        const container = document.getElementById('numerology-content');
        if (!container || !App.activeProfile) return;

        UI.showLoading('Đang tính Thần Số Học...');

        try {
            const num = ThanSoHoc.calculate(App.activeProfile.name, App.activeProfile.birthDate);
            App.cache.numerology = num;

            container.innerHTML = `
                <div class="result-section">
                    <h3>🔢 Các Con Số Cốt Lõi</h3>
                    ${UI.renderCoreNumbers(num.coreNumbers)}
                </div>
                
                <div class="result-section">
                    <h3>📅 Chu Kỳ Hiện Tại (${new Date().getFullYear()})</h3>
                    <div class="cycles-row">
                        <div class="cycle-item">
                            <span class="cycle-value">${num.cycles.personalYear}</span>
                            <span class="cycle-label">Năm Cá Nhân</span>
                        </div>
                        <div class="cycle-item">
                            <span class="cycle-value">${num.cycles.personalMonth}</span>
                            <span class="cycle-label">Tháng Cá Nhân</span>
                        </div>
                        <div class="cycle-item">
                            <span class="cycle-value">${num.cycles.personalDay}</span>
                            <span class="cycle-label">Ngày Cá Nhân</span>
                        </div>
                    </div>
                </div>
                
                <div class="result-section">
                    <h3>🔲 Biểu Đồ Ngày Sinh</h3>
                    ${UI.renderBirthdayGrid(num.grid)}
                </div>
                
                <div class="result-section">
                    <h3>➡️ Mũi Tên</h3>
                    <div class="arrows-list">
                        ${num.arrows.map(a => `
                            <div class="arrow-item ${a.type}">
                                <span>${a.type === 'full' ? '✅' : '⚠️'}</span>
                                <span>${a.name}</span>
                                <span class="arrow-desc">${a.desc}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <button class="btn btn-ai btn-block mt-md" onclick="AppController.getAINumerologyAnalysis()">
                    🤖 Luận Giải AI Chi Tiết
                </button>
                
                <div id="numerology-ai-result" class="mt-md"></div>
            `;
        } catch (error) {
            console.error('Numerology error:', error);
            container.innerHTML = '<p class="error-text">Có lỗi xảy ra khi tính toán</p>';
        } finally {
            UI.hideLoading();
        }
    },

    async getAINumerologyAnalysis() {
        if (!App.geminiApiKey) {
            UI.toast('⚙️ Vui lòng cài đặt API Key trong Settings');
            this.openSettings();
            return;
        }

        const resultEl = document.getElementById('numerology-ai-result');
        if (!resultEl || !App.cache.numerology) return;

        UI.showLoading('🤖 AI đang phân tích...');

        try {
            const analysis = await GeminiAI.analyzeNumerology(App.cache.numerology, App.activeProfile, App.geminiApiKey);
            const formatted = GeminiAI.formatResponse(analysis);
            resultEl.innerHTML = UI.renderAIResult(formatted, 'Luận Giải Thần Số Học');
        } catch (error) {
            if (error.message === 'API_KEY_INVALID') {
                UI.toast('❌ API Key không hợp lệ');
                this.openSettings();
            } else {
                UI.toast('❌ Lỗi kết nối AI');
            }
        } finally {
            UI.hideLoading();
        }
    },

    async loadDailyPage() {
        const container = document.getElementById('daily-content');
        if (!container || !App.activeProfile) return;

        const today = new Date();
        const dateStr = today.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        // Show loading immediately
        container.innerHTML = `
            <div class="daily-header">
                <h3>📅 ${dateStr}</h3>
                <p>Dự đoán riêng cho <strong>${App.activeProfile.name}</strong></p>
            </div>
            <div id="daily-ai-result" class="mt-md">
                <div style="text-align: center; padding: 2rem;">
                    <div class="loading-spinner" style="margin: 0 auto;"></div>
                    <p class="text-muted mt-md">🌟 Đang tạo dự đoán AI...</p>
                </div>
            </div>
        `;

        // Auto-load if has API key
        if (App.geminiApiKey) {
            await this.getDailyForecast();
        } else {
            // Show prompt to add API key
            document.getElementById('daily-ai-result').innerHTML = `
                <div class="interview-prompt" style="padding: 1.5rem;">
                    <div style="font-size: 3rem;">🔑</div>
                    <h4 style="color: var(--accent-gold); margin: 0.5rem 0;">Cần API Key</h4>
                    <p class="text-muted">Để xem dự đoán AI, hãy thêm Gemini API Key</p>
                    <button class="btn btn-primary mt-md" onclick="AppController.openSettings()">⚙️ Cài Đặt API Key</button>
                </div>
            `;
        }
    },

    async getDailyForecast() {
        if (!App.geminiApiKey) {
            UI.toast('⚙️ Vui lòng cài đặt API Key trong Settings');
            this.openSettings();
            return;
        }

        const resultEl = document.getElementById('daily-ai-result');
        if (!resultEl) return;

        UI.showLoading('🌟 AI đang xem vận may hôm nay...');

        try {
            // Calculate if not cached
            if (!App.cache.battu) {
                const hour = App.activeProfile.birthHour ? parseInt(App.activeProfile.birthHour) : 12;
                App.cache.battu = BatTu.calculate(App.activeProfile.birthDate, hour);
            }
            if (!App.cache.numerology) {
                App.cache.numerology = ThanSoHoc.calculate(App.activeProfile.name, App.activeProfile.birthDate);
            }

            const analysis = await GeminiAI.getDailyForecast(
                App.activeProfile,
                App.cache.battu,
                App.cache.numerology,
                App.geminiApiKey
            );
            const formatted = GeminiAI.formatResponse(analysis);
            resultEl.innerHTML = UI.renderAIResult(formatted, `Vận May Hôm Nay - ${new Date().toLocaleDateString('vi-VN')}`);
        } catch (error) {
            if (error.message === 'API_KEY_INVALID') {
                UI.toast('❌ API Key không hợp lệ');
                this.openSettings();
            } else {
                UI.toast('❌ Lỗi kết nối AI');
            }
        } finally {
            UI.hideLoading();
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ZODIAC PAGES
    // ═══════════════════════════════════════════════════════════════

    loadZodiacPage() {
        const container = document.getElementById('zodiac-content');
        if (!container || !App.activeProfile) return;

        try {
            const hour = App.activeProfile.birthHour ? parseInt(App.activeProfile.birthHour) : null;
            const zodiac = WesternZodiac.calculate(App.activeProfile.birthDate, hour);
            const traits = zodiac.traits || { strengths: [], weaknesses: [] };

            container.innerHTML = `
                <div class="result-section">
                    <h3>☀️ Bộ Ba Cung</h3>
                    <div class="zodiac-row">
                        <div class="zodiac-card">
                            <div class="zodiac-label">Cung Mặt Trời</div>
                            <div class="zodiac-emoji">${zodiac.sunSign.emoji}</div>
                            <div class="zodiac-symbol">${zodiac.sunSign.symbol}</div>
                            <div class="zodiac-name">${zodiac.sunSign.name}</div>
                            <div class="zodiac-name-en">${zodiac.sunSign.nameEn}</div>
                        </div>
                        <div class="zodiac-card">
                            <div class="zodiac-label">Cung Mặt Trăng</div>
                            <div class="zodiac-emoji">${zodiac.moonSign.emoji}</div>
                            <div class="zodiac-symbol">${zodiac.moonSign.symbol}</div>
                            <div class="zodiac-name">${zodiac.moonSign.name}</div>
                        </div>
                        ${zodiac.risingSign ? `
                        <div class="zodiac-card">
                            <div class="zodiac-label">Cung Mọc</div>
                            <div class="zodiac-emoji">${zodiac.risingSign.emoji}</div>
                            <div class="zodiac-symbol">${zodiac.risingSign.symbol}</div>
                            <div class="zodiac-name">${zodiac.risingSign.name}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <div class="result-section">
                    <h3>⭐ Chi Tiết Cung ${zodiac.sunSign.name}</h3>
                    <div class="zodiac-meta" style="justify-content: flex-start; gap: 1rem; margin-bottom: 1rem;">
                        <span class="zodiac-element">${zodiac.element}</span>
                        <span class="zodiac-ruler">🌟 ${zodiac.ruler}</span>
                        <span class="zodiac-element">${zodiac.quality}</span>
                    </div>
                </div>

                <div class="result-section traits-section">
                    <h3>💪 Tính Cách</h3>
                    <div class="traits-grid">
                        <div class="traits-column strengths">
                            <h4>✅ Điểm Mạnh</h4>
                            <ul class="traits-list">
                                ${traits.strengths.map(t => `<li>${t}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="traits-column weaknesses">
                            <h4>⚠️ Điểm Yếu</h4>
                            <ul class="traits-list">
                                ${traits.weaknesses.map(t => `<li>${t}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="result-section compat-section">
                    <h3>💕 Tương Hợp</h3>
                    <p>Cung ${zodiac.element} hợp nhất với: <strong>${zodiac.compatibility.best.join(', ')}</strong></p>
                    <p>Nên tránh: <strong>${zodiac.compatibility.avoid.join(', ')}</strong></p>
                </div>
            `;
        } catch (error) {
            console.error('Zodiac error:', error);
            container.innerHTML = '<p class="error-text">Có lỗi xảy ra</p>';
        }
    },

    loadConGapPage() {
        const container = document.getElementById('congap-content');
        if (!container || !App.activeProfile) return;

        try {
            const hour = App.activeProfile.birthHour ? parseInt(App.activeProfile.birthHour) : null;
            const congap = ChineseZodiac.calculate(App.activeProfile.birthDate, hour);
            const currentYear = new Date().getFullYear();
            const yearForecast = ChineseZodiac.getYearForecast(
                new Date(App.activeProfile.birthDate).getFullYear(),
                currentYear
            );

            container.innerHTML = `
                <div class="result-section">
                    <h3>🐲 Con Giáp Của Bạn</h3>
                    <div class="zodiac-row">
                        <div class="chinese-zodiac-card">
                            <div class="zodiac-label">Tuổi (Năm)</div>
                            <div class="cz-emoji">${congap.yearAnimal.emoji}</div>
                            <div class="cz-name">${congap.yearAnimal.name} - ${congap.yearAnimal.animal}</div>
                            <div class="cz-element">${ELEMENT_COLORS[congap.element]?.icon || ''} ${congap.element}</div>
                            <div class="cz-traits">${congap.traits.join(' • ')}</div>
                        </div>
                        <div class="chinese-zodiac-card">
                            <div class="zodiac-label">Tháng</div>
                            <div class="cz-emoji">${congap.monthAnimal.emoji}</div>
                            <div class="cz-name">${congap.monthAnimal.name}</div>
                        </div>
                        ${congap.hourAnimal ? `
                        <div class="chinese-zodiac-card">
                            <div class="zodiac-label">Giờ</div>
                            <div class="cz-emoji">${congap.hourAnimal.emoji}</div>
                            <div class="cz-name">${congap.hourAnimal.name}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <div class="result-section compat-section">
                    <h3>🤝 Tương Hợp & Xung Khắc</h3>
                    ${congap.tamHop ? `
                        <p><strong>Tam Hợp:</strong></p>
                        <div class="compat-row">
                            ${congap.tamHop.compatible.map(chi => {
                const a = ChineseZodiac.ANIMALS.find(x => x.name === chi);
                return `<span class="compat-tag good">${a?.emoji || ''} ${chi}</span>`;
            }).join('')}
                        </div>
                    ` : ''}
                    ${congap.lucHop ? `
                        <p style="margin-top: 1rem;"><strong>Lục Hợp:</strong></p>
                        <div class="compat-row">
                            ${congap.lucHop.compatible.map(chi => {
                const a = ChineseZodiac.ANIMALS.find(x => x.name === chi);
                return `<span class="compat-tag good">${a?.emoji || ''} ${chi}</span>`;
            }).join('')}
                        </div>
                    ` : ''}
                    ${congap.lucXung ? `
                        <p style="margin-top: 1rem;"><strong>Lục Xung (Tránh):</strong></p>
                        <div class="compat-row">
                            ${congap.lucXung.conflict.map(chi => {
                const a = ChineseZodiac.ANIMALS.find(x => x.name === chi);
                return `<span class="compat-tag bad">${a?.emoji || ''} ${chi}</span>`;
            }).join('')}
                        </div>
                    ` : ''}
                </div>

                ${congap.taiSui.warning ? `
                <div class="tai-sui-warning">
                    <h4>⚠️ ${congap.taiSui.warning}</h4>
                    <p>Năm ${currentYear} cần hóa giải Thái Tuế, cẩn thận trong công việc và sức khỏe.</p>
                </div>
                ` : ''}

                <div class="result-section">
                    <h3>📅 Dự Đoán Năm ${currentYear} (${yearForecast.targetAnimal.animal})</h3>
                    <div class="year-forecast-card">
                        <div class="forecast-luck">${yearForecast.luck}%</div>
                        <div class="forecast-summary">${yearForecast.summary}</div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('ConGap error:', error);
            container.innerHTML = '<p class="error-text">Có lỗi xảy ra</p>';
        }
    },

    loadMoonPage() {
        const container = document.getElementById('moon-content');
        if (!container) return;

        try {
            const today = MoonPhase.getTodayPhase();
            const advice = MoonPhase.getTodayAdvice();
            const nextMoons = MoonPhase.getNextSpecialMoon();

            let birthMoon = null;
            if (App.activeProfile) {
                birthMoon = MoonPhase.getBirthMoonPhase(App.activeProfile.birthDate);
            }

            container.innerHTML = `
                <div class="result-section">
                    <h3>🌙 Pha Trăng Hôm Nay</h3>
                    <div class="zodiac-row">
                        <div class="moon-phase-card">
                            <div class="moon-emoji">${today.emoji}</div>
                            <div class="moon-name">${today.name}</div>
                            <div class="moon-illumination">${today.percentIlluminated}% sáng</div>
                            <div class="moon-meaning">${today.meaning}</div>
                            <div class="moon-energy">${today.energy}</div>
                        </div>
                    </div>
                </div>

                <div class="result-section">
                    <h3>💡 Lời Khuyên Hôm Nay</h3>
                    <p><strong>Nên làm:</strong> ${advice.shouldDo}</p>
                    <p><strong>Nên tránh:</strong> ${advice.avoid}</p>
                    <div class="compat-row" style="margin-top: 1rem;">
                        ${advice.advice.map(a => `<span class="compat-tag good">${a}</span>`).join('')}
                    </div>
                </div>

                ${birthMoon ? `
                <div class="result-section">
                    <h3>🌕 Pha Trăng Ngày Sinh</h3>
                    <div class="zodiac-row">
                        <div class="moon-phase-card">
                            <div class="moon-emoji">${birthMoon.emoji}</div>
                            <div class="moon-name">${birthMoon.name}</div>
                            <div class="moon-meaning">${birthMoon.personality}</div>
                        </div>
                    </div>
                </div>
                ` : ''}

                <div class="result-section">
                    <h3>📆 Sự Kiện Sắp Tới</h3>
                    <div class="zodiac-row">
                        ${nextMoons.nextNewMoon ? `
                        <div class="moon-phase-card" style="min-width: 150px;">
                            <div class="moon-emoji">🌑</div>
                            <div class="moon-name">Trăng Mới</div>
                            <div class="moon-meaning">${nextMoons.nextNewMoon.date.toLocaleDateString('vi-VN')}</div>
                        </div>
                        ` : ''}
                        ${nextMoons.nextFullMoon ? `
                        <div class="moon-phase-card" style="min-width: 150px;">
                            <div class="moon-emoji">🌕</div>
                            <div class="moon-name">Trăng Tròn</div>
                            <div class="moon-meaning">${nextMoons.nextFullMoon.date.toLocaleDateString('vi-VN')}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Moon error:', error);
            container.innerHTML = '<p class="error-text">Có lỗi xảy ra</p>';
        }
    },

    loadAIChatPage() {
        const container = document.getElementById('aichat-content');
        if (!container || !App.activeProfile) return;

        // Check if already has context
        if (AIChat.hasContext()) {
            const ctx = AIChat.viewContext();
            const updateDate = new Date(ctx.updatedAt).toLocaleDateString('vi-VN');

            container.innerHTML = `
                <div class="context-card">
                    <div class="context-header">
                        <span class="context-title">📋 Thông tin đã lưu</span>
                        <span class="context-update">Cập nhật: ${updateDate}</span>
                    </div>
                    <div class="context-items">
                        ${ctx.occupation ? `<div class="context-item"><strong>Nghề nghiệp:</strong> ${ctx.occupation}</div>` : ''}
                        ${ctx.work_status ? `<div class="context-item"><strong>Công việc:</strong> ${ctx.work_status}</div>` : ''}
                        ${ctx.relationship_status ? `<div class="context-item"><strong>Tình cảm:</strong> ${ctx.relationship_status}</div>` : ''}
                        ${ctx.family ? `<div class="context-item"><strong>Gia đình:</strong> ${ctx.family}</div>` : ''}
                        ${ctx.health ? `<div class="context-item"><strong>Sức khỏe:</strong> ${ctx.health}</div>` : ''}
                        ${ctx.finance ? `<div class="context-item"><strong>Tài chính:</strong> ${ctx.finance}</div>` : ''}
                        ${ctx.goals ? `<div class="context-item"><strong>Mục tiêu:</strong> ${ctx.goals}</div>` : ''}
                        ${ctx.concerns ? `<div class="context-item"><strong>Lo lắng:</strong> ${ctx.concerns}</div>` : ''}
                        ${ctx.wish ? `<div class="context-item"><strong>Tập trung:</strong> ${ctx.wish}</div>` : ''}
                    </div>
                </div>
                
                <div style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-md);">
                    <button class="btn btn-primary" onclick="AppController.startNewInterview()">🔄 Cập Nhật Thông Tin</button>
                    <button class="btn btn-secondary" onclick="AppController.askAIQuestion()">💬 Hỏi AI</button>
                </div>
                
                <div id="chat-messages" class="chat-messages"></div>
            `;
        } else {
            container.innerHTML = `
                <div class="interview-prompt">
                    <div class="interview-prompt-icon">🤖</div>
                    <h3>Cá Nhân Hóa Lá Số</h3>
                    <p>Để AI có thể đưa ra phân tích chính xác và phù hợp với cuộc sống thực của bạn, hãy trả lời một số câu hỏi về tình hình hiện tại.</p>
                    <button class="btn btn-primary" onclick="AppController.startNewInterview()">✨ Bắt Đầu Phỏng Vấn</button>
                </div>
            `;
        }
    },

    startNewInterview() {
        const container = document.getElementById('aichat-content');
        if (!container) return;

        container.innerHTML = `
            <div class="chat-container">
                <div class="chat-header">
                    <span class="chat-header-icon">🤖</span>
                    <div>
                        <div class="chat-header-title">AI Phỏng Vấn</div>
                        <div class="chat-header-status">Thu thập thông tin...</div>
                    </div>
                </div>
                <div id="chat-messages" class="chat-messages"></div>
            </div>
        `;

        AIChat.startInterview();
    },

    async askAIQuestion() {
        const question = prompt('Bạn muốn hỏi AI điều gì về lá số của mình?');
        if (!question || !question.trim()) return;

        if (!App.geminiApiKey) {
            UI.toast('⚙️ Vui lòng cài đặt API Key trong Settings');
            this.openSettings();
            return;
        }

        UI.showLoading('🤖 AI đang trả lời...');

        try {
            // Get cached data
            if (!App.cache.battu && App.activeProfile) {
                const hour = App.activeProfile.birthHour ? parseInt(App.activeProfile.birthHour) : 12;
                App.cache.battu = BatTu.calculate(App.activeProfile.birthDate, hour);
            }
            if (!App.cache.numerology && App.activeProfile) {
                App.cache.numerology = ThanSoHoc.calculate(App.activeProfile.name, App.activeProfile.birthDate);
            }

            const answer = await GeminiAI.askQuestion(
                question,
                App.activeProfile,
                App.cache.battu,
                App.cache.numerology,
                App.geminiApiKey
            );

            const formatted = GeminiAI.formatResponse(answer);

            const chatArea = document.getElementById('chat-messages');
            if (chatArea) {
                chatArea.innerHTML = `
                    <div class="chat-message user">
                        <div class="chat-bubble">${question}</div>
                        <div class="chat-avatar">👤</div>
                    </div>
                    <div class="chat-message ai">
                        <div class="chat-avatar">🤖</div>
                        <div class="chat-bubble">${formatted}</div>
                    </div>
                `;
            } else {
                UI.toast('✅ Đã trả lời!');
            }
        } catch (error) {
            UI.toast('❌ Lỗi kết nối AI');
        } finally {
            UI.hideLoading();
        }
    },

    loadProfilesPage() {
        const list = document.getElementById('profile-list');
        if (!list) return;

        if (App.profiles.length === 0) {
            list.innerHTML = '<p class="text-muted text-center">Chưa có hồ sơ nào</p>';
            return;
        }

        list.innerHTML = App.profiles.map(p => `
            <div class="profile-card ${p.id === App.activeProfile?.id ? 'active' : ''}">
                <div class="profile-avatar">${p.gender === 'male' ? '👨' : '👩'}</div>
                <div class="profile-info">
                    <h4>${p.name}</h4>
                    <p>${UI.formatDate(p.birthDate)}</p>
                </div>
                <div class="profile-actions">
                    ${p.id !== App.activeProfile?.id ? `
                        <button class="btn-icon" onclick="ProfileManager.switchProfile('${p.id}')" title="Chọn">✓</button>
                    ` : ''}
                    <button class="btn-icon danger" onclick="ProfileManager.deleteProfile('${p.id}')" title="Xóa">🗑️</button>
                </div>
            </div>
        `).join('');
    },

    openSettings() {
        UI.showModal('settings-modal');
        const input = document.getElementById('api-key-input');
        if (input) input.value = App.geminiApiKey || '';
    },

    closeSettings() {
        UI.hideModal('settings-modal');
    },

    saveSettings() {
        const apiKey = document.getElementById('api-key-input').value.trim();
        App.geminiApiKey = apiKey;
        Storage.save('gemini_api_key', apiKey);

        // Sync to cloud if available
        if (typeof CloudStorage !== 'undefined') {
            CloudStorage.sync();
        }

        this.closeSettings();
        UI.toast('✅ Đã lưu cài đặt!');
    }
};

// ═══════════════════════════════════════════════════════════════
// PROFILE MANAGER
// ═══════════════════════════════════════════════════════════════

const ProfileManager = {
    openCreateModal() {
        UI.showModal('profile-modal');
        document.getElementById('profile-form')?.reset();
    },

    closeModal() {
        UI.hideModal('profile-modal');
    },

    async createProfile(formData) {
        const profile = {
            id: Date.now().toString(),
            name: formData.name,
            birthDate: formData.birthDate,
            birthHour: formData.birthHour || null,
            gender: formData.gender || 'male',
            createdAt: new Date().toISOString()
        };

        App.profiles.push(profile);
        App.activeProfile = profile;
        App.cache = { battu: null, numerology: null, aiAnalysis: {} };

        await Storage.saveSecure('profiles', App.profiles, App.currentPassword);
        Storage.save('active_profile_id', profile.id);

        // Sync to cloud
        if (typeof CloudStorage !== 'undefined') {
            CloudStorage.sync();
        }

        this.closeModal();
        AppController.updateUI();
        UI.toast('✅ Đã tạo hồ sơ mới!');

        return profile;
    },

    async deleteProfile(profileId) {
        if (!confirm('Bạn có chắc muốn xóa hồ sơ này?')) return;

        App.profiles = App.profiles.filter(p => p.id !== profileId);

        if (App.activeProfile?.id === profileId) {
            App.activeProfile = App.profiles[0] || null;
            Storage.save('active_profile_id', App.activeProfile?.id || null);
        }

        await Storage.saveSecure('profiles', App.profiles, App.currentPassword);
        AppController.updateUI();
        AppController.loadProfilesPage();
        UI.toast('🗑️ Đã xóa hồ sơ');
    },

    async switchProfile(profileId) {
        const profile = App.profiles.find(p => p.id === profileId);
        if (profile) {
            App.activeProfile = profile;
            App.cache = { battu: null, numerology: null, aiAnalysis: {} };
            Storage.save('active_profile_id', profile.id);
            AppController.updateUI();
            AppController.loadProfilesPage();
            UI.toast(`✅ Đã chuyển sang: ${profile.name}`);
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    // Try Supabase auth first
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured()) {
        const authSuccess = await Auth.init();
        if (authSuccess) return; // Already logged in
        // Auth screen is shown, wait for login
        return;
    }

    // Fallback to local password auth
    LockScreen.init();
});
