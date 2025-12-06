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

    // Validate password strength
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

if (typeof module !== 'undefined') module.exports = Security;
