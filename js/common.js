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

// 3. FORMAT DATE & TIME (HIỂN THỊ GIAO DIỆN)
export const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString('vi-VN'); // DD/MM/YYYY
};

// [ĐÃ FIX] Format sang chuẩn input type="date" (YYYY-MM-DD)
export const toLocalISOString = (date) => {
    if (!date) return "";
    
    // Nếu đã là chuỗi YYYY-MM-DD thì trả về luôn
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }

    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    // Tính toán offset để toISOString trả về giờ địa phương
    const offset = d.getTimezoneOffset() * 60000;
    const localDate = new Date(d.getTime() - offset);
    
    return localDate.toISOString().slice(0, 10);
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
        const dIndex = parts.indexOf('d');
        if (dIndex !== -1 && parts[dIndex + 1]) {
            id = parts[dIndex + 1];
        } else if (url.includes('id=')) {
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

// 6. [CẬP NHẬT] TÍNH ĐIỂM HỌC TẬP THEO QUY ĐỊNH MỚI
// Logic: 9.0->A+, 8.0->A, 7.0->B+, 6.0->B, 5.0->C, 4.0->D+, 3.0->D, <3.0->F
export const calculateAcademicScore = (score10) => {
    const s = parseFloat(score10);
    if (isNaN(s)) return { char: 'F', scale4: 0.0, rank: 'Kém' };

    if (s >= 9.0) return { char: 'A+', scale4: 4.0, rank: 'Xuất sắc' };
    if (s >= 8.0) return { char: 'A',  scale4: 3.5, rank: 'Giỏi' };
    if (s >= 7.0) return { char: 'B+', scale4: 3.0, rank: 'Khá' };
    if (s >= 6.0) return { char: 'B',  scale4: 2.5, rank: 'Trung bình khá' };
    if (s >= 5.0) return { char: 'C',  scale4: 2.0, rank: 'Trung bình' };
    if (s >= 4.0) return { char: 'D+', scale4: 1.5, rank: 'Yếu' }; // Điểm khác biệt: D+ ở mức 4.0-5.0
    if (s >= 3.0) return { char: 'D',  scale4: 1.0, rank: 'Kém' }; // Điểm khác biệt: D ở mức 3.0-4.0
    return { char: 'F', scale4: 0.0, rank: 'Kém' };                // < 3.0 là F
};

// 7. UI HELPERS (Notification & Loading)
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
        const content = modal.querySelector('.modal-body');
        if (content) content.scrollTop = 0;
    }
};

export const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
};