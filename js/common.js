// --- FILE: js/common.js ---

// 1. TẠO ID NGẪU NHIÊN
export const generateID = (prefix = 'id') => {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};

// 2. CHỐNG LỖI BẢO MẬT XSS (Sanitize Input)
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

// 3. FORMAT DATE & TIME
export const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString('vi-VN'); // DD/MM/YYYY
};

// Format sang chuẩn input type="date" (YYYY-MM-DD)
export const toLocalISOString = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// 4. FORMAT DỮ LIỆU KHÁC (FILE, TIỀN TỆ)
export const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// 5. XỬ LÝ LINK GOOGLE DRIVE (Direct Link)
export const convertDriveLink = (url) => {
    if (!url) return '';
    if (!url.includes('drive.google.com') && !url.includes('googleusercontent.com')) return url;
    
    try {
        let id = '';
        const parts = url.split('/');
        // Dạng 1: .../d/ID_FILE/...
        const dIndex = parts.indexOf('d');
        if (dIndex !== -1 && parts[dIndex + 1]) {
            id = parts[dIndex + 1];
        } 
        // Dạng 2: ...id=ID_FILE...
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

// 6. [MỚI] TÍNH ĐIỂM HỌC TẬP (GPA 4.0 & CHỮ)
// Quy chuẩn phổ biến: 8.5+ A (4.0), 7.0-8.4 B (3.0), v.v...
export const calculateAcademicScore = (score10) => {
    const s = parseFloat(score10);
    if (isNaN(s)) return { char: 'F', scale4: 0 };

    if (s >= 8.5) return { char: 'A', scale4: 4.0 };
    if (s >= 8.0) return { char: 'B+', scale4: 3.5 };
    if (s >= 7.0) return { char: 'B', scale4: 3.0 };
    if (s >= 6.5) return { char: 'C+', scale4: 2.5 };
    if (s >= 5.5) return { char: 'C', scale4: 2.0 };
    if (s >= 5.0) return { char: 'D+', scale4: 1.5 };
    if (s >= 4.0) return { char: 'D', scale4: 1.0 };
    return { char: 'F', scale4: 0.0 };
};

// 7. UI HELPERS (Notification & Loading)
export const showNotification = (message, type = 'success') => {
    const container = document.getElementById("notification-container");
    if (!container) return;

    const notif = document.createElement("div");
    // type có thể là: success, error, info, warning
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

// 8. MODAL HELPERS
export const setupModal = (modalId, closeBtnId) => {
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(closeBtnId);
    
    if (!modal) return;

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // Đóng khi click ra ngoài vùng content
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
};

export const openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        // Reset scroll nếu modal dài
        const content = modal.querySelector('.modal-body');
        if (content) content.scrollTop = 0;
    }
};

export const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';

};
