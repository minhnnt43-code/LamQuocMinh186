/* ═══════════════════════════════════════════════════════════════
   SECURITY MODULE - Secure Password Authentication
   Password is NEVER stored in code, only hashed
   Lá Số Lâm Quốc Minh
   ═══════════════════════════════════════════════════════════════ */

const Security = {
    // Hash password using SHA-256 with salt
    async hashPassword(password) {
        const salt = 'LasoLamQuocMinh2024@SecureApp';
        const data = new TextEncoder().encode(password + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Double hash for extra security (password never stored in plain text)
    async secureHash(password) {
        const firstHash = await this.hashPassword(password);
        return await this.hashPassword(firstHash + password.length);
    },

    // Derive encryption key from password using PBKDF2
    async deriveKey(password) {
        const enc = new TextEncoder();
        const salt = enc.encode('LasoLamQuocMinh-Salt-2024');

        const baseKey = await crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    // Encrypt data with AES-256-GCM
    async encrypt(data, password) {
        try {
            const key = await this.deriveKey(password);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encoded = new TextEncoder().encode(JSON.stringify(data));

            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encoded
            );

            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);

            return btoa(String.fromCharCode(...combined));
        } catch (e) {
            console.error('Encryption error:', e);
            return null;
        }
    },

    // Decrypt data with AES-256-GCM
    async decrypt(encryptedData, password) {
        try {
            const key = await this.deriveKey(password);
            const combined = new Uint8Array(
                atob(encryptedData).split('').map(c => c.charCodeAt(0))
            );

            const iv = combined.slice(0, 12);
            const data = combined.slice(12);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                data
            );

            return JSON.parse(new TextDecoder().decode(decrypted));
        } catch (e) {
            console.error('Decryption error:', e);
            return null;
        }
    },

    getPasswordStrength(password) {
        let score = 0;

        if (password.length >= 6) score++;
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        if (score <= 2) return { level: 'weak', class: 'strength-weak' };
        if (score <= 3) return { level: 'medium', class: 'strength-medium' };
        return { level: 'strong', class: 'strength-strong' };
    }
};

/* ═══════════════════════════════════════════════════════════════
   RECOVERY MANAGER - Forgot Password with EmailJS
   ═══════════════════════════════════════════════════════════════ */

const RecoveryManager = {
    currentCode: null,
    codeExpiry: null,

    // Generate 6-digit code
    generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    },

    // Open recovery modal
    open() {
        document.getElementById('recovery-modal').classList.remove('hidden');
        this.resetState();
    },

    // Close recovery modal
    close() {
        document.getElementById('recovery-modal').classList.add('hidden');
        this.resetState();
    },

    // Reset state
    resetState() {
        this.currentCode = null;
        this.codeExpiry = null;
        document.getElementById('recovery-send').classList.remove('hidden');
        document.getElementById('recovery-verify').classList.add('hidden');
        document.getElementById('recovery-newpass').classList.add('hidden');
        document.getElementById('recovery-step').textContent = 'Nhấn gửi để nhận mã qua email';
        document.getElementById('recovery-message').textContent = '';
        document.getElementById('recovery-message').className = 'recovery-message';
    },

    // Send recovery email
    async sendEmail() {
        const btn = document.getElementById('send-recovery-btn');
        const msg = document.getElementById('recovery-message');

        btn.disabled = true;
        btn.textContent = '⏳ Đang gửi...';
        msg.textContent = '';

        this.currentCode = this.generateCode();
        this.codeExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

        try {
            await emailjs.send('service_h4ufunn', 'template_2f3okkd', {
                recovery_code: this.currentCode,
                to_email: 'lqm186005@gmail.com'
            });

            msg.textContent = '✅ Đã gửi mã! Kiểm tra email của bạn.';
            msg.className = 'recovery-message success';

            document.getElementById('recovery-send').classList.add('hidden');
            document.getElementById('recovery-verify').classList.remove('hidden');
            document.getElementById('recovery-step').textContent = 'Nhập mã 6 số từ email';

        } catch (error) {
            console.error('EmailJS Error:', error);
            msg.textContent = '❌ Lỗi gửi email. Vui lòng thử lại.';
            msg.className = 'recovery-message error';
        }

        btn.disabled = false;
        btn.textContent = '📤 Gửi Mã Khôi Phục';
    },

    // Verify code
    verifyCode() {
        const input = document.getElementById('recovery-code-input');
        const msg = document.getElementById('recovery-message');
        const code = input.value.trim();

        if (!this.currentCode || !this.codeExpiry) {
            msg.textContent = '❌ Vui lòng gửi mã trước.';
            msg.className = 'recovery-message error';
            return;
        }

        if (Date.now() > this.codeExpiry) {
            msg.textContent = '❌ Mã đã hết hạn. Vui lòng gửi lại.';
            msg.className = 'recovery-message error';
            this.resetState();
            return;
        }

        if (code !== this.currentCode) {
            msg.textContent = '❌ Mã không đúng. Vui lòng thử lại.';
            msg.className = 'recovery-message error';
            return;
        }

        msg.textContent = '✅ Mã xác nhận thành công!';
        msg.className = 'recovery-message success';

        document.getElementById('recovery-verify').classList.add('hidden');
        document.getElementById('recovery-newpass').classList.remove('hidden');
        document.getElementById('recovery-step').textContent = 'Đặt mật khẩu mới';
    },

    // Save new password
    async saveNewPassword() {
        const newPass = document.getElementById('new-password-input').value;
        const confirmPass = document.getElementById('confirm-password-input').value;
        const msg = document.getElementById('recovery-message');

        if (newPass.length < 4) {
            msg.textContent = '❌ Mật khẩu tối thiểu 4 ký tự.';
            msg.className = 'recovery-message error';
            return;
        }

        if (newPass !== confirmPass) {
            msg.textContent = '❌ Mật khẩu xác nhận không khớp.';
            msg.className = 'recovery-message error';
            return;
        }

        // Hash and save new password
        const hash = await Security.secureHash(newPass);
        localStorage.setItem('laso_password_hash', hash);

        msg.textContent = '✅ Đã đặt mật khẩu mới thành công!';
        msg.className = 'recovery-message success';

        // Close after 1.5s
        setTimeout(() => {
            this.close();
            document.getElementById('password-message').textContent = 'Nhập mật khẩu mới để mở khóa';
        }, 1500);
    },

    // Initialize event listeners
    init() {
        document.getElementById('forgot-password-btn')?.addEventListener('click', () => this.open());
        document.getElementById('send-recovery-btn')?.addEventListener('click', () => this.sendEmail());
        document.getElementById('verify-recovery-btn')?.addEventListener('click', () => this.verifyCode());
        document.getElementById('save-new-password-btn')?.addEventListener('click', () => this.saveNewPassword());

        // Enter key handlers
        document.getElementById('recovery-code-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.verifyCode();
        });
        document.getElementById('confirm-password-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveNewPassword();
        });
    }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => RecoveryManager.init());

if (typeof module !== 'undefined') module.exports = Security;
