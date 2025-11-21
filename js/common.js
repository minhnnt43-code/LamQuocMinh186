// --- FILE: js/common.js ---

// 1. CÁC HÀM XỬ LÝ DỮ LIỆU (Format, ID, Security)

// Tạo ID ngẫu nhiên (Ví dụ: task_1709...) để không bị trùng
export const generateID = (prefix = 'id') => {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};

// Chống lỗi bảo mật XSS (Biến các ký tự đặc biệt thành text thường)
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

// Format ngày hiển thị cho người Việt (DD/MM/YYYY)
export const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return dateString; // Nếu lỗi ngày thì trả về nguyên gốc
    return date.toLocaleDateString('vi-VN');
};

// Format ngày để điền vào thẻ input type="date" (YYYY-MM-DD)
export const toLocalISOString = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Format dung lượng file (Ví dụ: 1024 -> 1 KB)
export const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// 2. CÁC HÀM GIAO DIỆN (UI)

// Hiển thị thông báo nhỏ ở góc màn hình
export const showNotification = (message, type = 'success') => {
    const container = document.getElementById("notification-container");
    if (!container) return;

    const notif = document.createElement("div");
    notif.className = `notification ${type}`;
    notif.textContent = message;
    
    container.appendChild(notif);

    // Tự động tắt sau 3 giây
    setTimeout(() => {
        notif.style.opacity = '0'; 
        // Đợi hiệu ứng mờ dần xong mới xóa hẳn khỏi DOM
        setTimeout(() => notif.remove(), 500);
    }, 3000);
};

// Bật/Tắt vòng xoay Loading
export const toggleLoading = (show) => {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = show ? 'flex' : 'none';
};

// 3. QUẢN LÝ MODAL (CỬA SỔ BẬT LÊN)

// Cài đặt sự kiện đóng modal (gọi 1 lần khi khởi động)
export const setupModal = (modalId, closeBtnId) => {
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(closeBtnId);
    
    if (!modal) return;

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // Click ra ngoài vùng nội dung thì đóng modal
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