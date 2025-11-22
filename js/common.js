// --- FILE: js/common.js ---

// 1. TẠO ID NGẪU NHIÊN
export const generateID = (prefix = 'id') => {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};

// 2. CHỐNG LỖI BẢO MẬT XSS (Khi hiển thị text người dùng nhập)
export const escapeHTML = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag]));
};

// 3. FORMAT NGÀY THÁNG
export const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString('vi-VN'); // DD/MM/YYYY
};

export const toLocalISOString = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // YYYY-MM-DD
};

// 4. FORMAT DUNG LƯỢNG FILE
export const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// 5. CHUYỂN LINK GOOGLE DRIVE -> LINK ẢNH TRỰC TIẾP
export const convertDriveLink = (url) => {
    if (!url) return '';
    if (!url.includes('drive.google.com') && !url.includes('googleusercontent.com')) return url;
    
    try {
        let id = '';
        const parts = url.split('/');
        // Dạng: .../d/ID_FILE/...
        const dIndex = parts.indexOf('d');
        if (dIndex !== -1 && parts[dIndex + 1]) {
            id = parts[dIndex + 1];
        } 
        // Dạng: ...id=ID_FILE...
        else if (url.includes('id=')) {
            const match = url.match(/id=([^&]+)/);
            if (match) id = match[1];
        }

        if (id) {
            return `https://lh3.googleusercontent.com/d/${id}`;
        }
        return url;
    } catch (e) {
        return url;
    }
};

// 6. UI HELPERS
export const showNotification = (message, type = 'success') => {
    const container = document.getElementById("notification-container");
    if (!container) return;

    const notif = document.createElement("div");
    notif.className = `notification ${type}`;
    notif.textContent = message;
    
    container.appendChild(notif);

    setTimeout(() => {
        notif.style.opacity = '0'; 
        setTimeout(() => notif.remove(), 500);
    }, 3000);
};

export const toggleLoading = (show) => {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = show ? 'flex' : 'none';
};

// 7. MODAL HELPERS
export const setupModal = (modalId, closeBtnId) => {
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(closeBtnId);
    
    if (!modal) return;

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
};

export const openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
};

export const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
};
