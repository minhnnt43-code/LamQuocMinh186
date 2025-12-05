/* ═══════════════════════════════════════════════════════════════
   STORAGE MODULE - Encrypted Local Storage
   Lá Số Lâm Quốc Minh
   ═══════════════════════════════════════════════════════════════ */

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

if (typeof module !== 'undefined') module.exports = Storage;
