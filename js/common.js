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

// 3. FORMAT DATE & TIME (HIỂN THỊ GIAO DIỆN - dd/mm/yyyy)
export const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString;
    }
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

    // Fix: Dùng local date thay vì offset calculation
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

// 5. XỬ LÝ LINK GOOGLE DRIVE (Direct Link cho ảnh)
// Lưu ý: Chỉ hoạt động với file ẢNH (jpg, png, gif...), KHÔNG hoạt động với PDF
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
            // Sử dụng Google Content URL - hoạt động với file ẢNH đã share public
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
    if (s >= 8.0) return { char: 'A', scale4: 3.5, rank: 'Giỏi' };
    if (s >= 7.0) return { char: 'B+', scale4: 3.0, rank: 'Khá' };
    if (s >= 6.0) return { char: 'B', scale4: 2.5, rank: 'Trung bình khá' };
    if (s >= 5.0) return { char: 'C', scale4: 2.0, rank: 'Trung bình' };
    if (s >= 4.0) return { char: 'D+', scale4: 1.5, rank: 'Yếu' }; // Điểm khác biệt: D+ ở mức 4.0-5.0
    if (s >= 3.0) return { char: 'D', scale4: 1.0, rank: 'Kém' }; // Điểm khác biệt: D ở mức 3.0-4.0
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

// 9. FORMAT AI CONTENT - Styling đẹp cho AI output
export const formatAIContent = (text) => {
    if (!text) return '';

    let formatted = escapeHTML(text);

    // Format headings (### hoặc **Title:**)
    formatted = formatted.replace(/^###\s*(.+)$/gm,
        '<div style="font-weight:700;font-size:1.1em;color:#667eea;margin:16px 0 8px;border-bottom:2px solid #e2e8f0;padding-bottom:6px;">$1</div>');
    formatted = formatted.replace(/\*\*([^*]+):\*\*/g,
        '<strong style="color:#4f46e5;font-weight:700;">$1:</strong>');
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g,
        '<strong style="font-weight:700;">$1</strong>');

    // Format numbered lists (1. 2. 3.)
    formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm,
        '<div style="display:flex;align-items:flex-start;gap:10px;margin:8px 0;"><span style="min-width:24px;height:24px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;">$1</span><span style="flex:1;line-height:1.6;">$2</span></div>');

    // Format bullet points (- hoặc •)
    formatted = formatted.replace(/^[-•]\s+(.+)$/gm,
        '<div style="display:flex;align-items:flex-start;gap:10px;margin:6px 0;padding-left:8px;"><span style="color:#667eea;font-size:1.2em;">•</span><span style="flex:1;line-height:1.5;">$1</span></div>');

    // Format time blocks (9:00 - 11:00 hoặc 14h-16h)
    formatted = formatted.replace(/(\d{1,2}[h:]\d{0,2})\s*[-–]\s*(\d{1,2}[h:]\d{0,2})/g,
        '<span style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);color:#0369a1;padding:2px 8px;border-radius:6px;font-weight:600;font-size:0.9em;white-space:nowrap;">$1 - $2</span>');

    // Format single time (lúc 14h, 9:30)
    formatted = formatted.replace(/\b(\d{1,2}[h:]\d{0,2})\b(?!.*[-–])/g,
        '<span style="background:#f0f9ff;color:#0369a1;padding:1px 6px;border-radius:4px;font-weight:600;">$1</span>');

    // Format emojis sections
    formatted = formatted.replace(/(📌|✅|⚠️|💡|🎯|📊|⏰|🔥|✨|📚|💪|🧠|⭐)/g,
        '<span style="font-size:1.1em;">$1</span>');

    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
};

// 10. SHOW AI MODAL - Modal đẹp cho AI results
export const showAIModal = (title, content, options = {}) => {
    // Remove existing modal
    const existing = document.getElementById('ai-result-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'ai-result-modal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:10000;animation:fadeIn 0.3s ease;';

    const formattedContent = formatAIContent(content);

    modal.innerHTML = `
        <div style="background:white;border-radius:20px;max-width:600px;width:90%;max-height:80vh;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,0.25);animation:slideUp 0.4s cubic-bezier(0.4,0,0.2,1);">
            <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;">
                <h3 style="margin:0;font-size:1.2rem;font-weight:700;display:flex;align-items:center;gap:10px;">
                    ${options.icon || '🤖'} ${title}
                </h3>
                <button id="close-ai-modal" style="background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px;transition:background 0.2s;">&times;</button>
            </div>
            <div style="padding:24px;max-height:60vh;overflow-y:auto;line-height:1.7;color:#1e293b;">
                ${formattedContent}
            </div>
            ${options.footer ? `<div style="padding:16px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;">${options.footer}</div>` : ''}
        </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    const closeBtn = modal.querySelector('#close-ai-modal');
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', escHandler); }
    });
};

// ============================================================
// 11. [#30] EMPTY STATE - Hiển thị trạng thái trống đẹp
// ============================================================
const EMPTY_STATE_CONFIGS = {
    tasks: { icon: '📋', title: 'Chưa có công việc nào', desc: 'Thêm công việc mới để bắt đầu!' },
    events: { icon: '📅', title: 'Chưa có sự kiện', desc: 'Lịch của bạn đang trống' },
    projects: { icon: '📁', title: 'Chưa có dự án', desc: 'Tạo dự án đầu tiên!' },
    notes: { icon: '📝', title: 'Chưa có ghi chú', desc: 'Bắt đầu viết ngay!' },
    search: { icon: '🔍', title: 'Không tìm thấy kết quả', desc: 'Thử từ khóa khác' },
    error: { icon: '⚠️', title: 'Có lỗi xảy ra', desc: 'Vui lòng thử lại sau' },
    default: { icon: '📭', title: 'Chưa có dữ liệu', desc: 'Hãy thêm dữ liệu mới!' }
};

export const showEmptyState = (container, type = 'default', customConfig = {}) => {
    const config = { ...EMPTY_STATE_CONFIGS[type] || EMPTY_STATE_CONFIGS.default, ...customConfig };

    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state" style="
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            padding: 40px 20px; text-align: center; min-height: 200px;
            background: linear-gradient(135deg, rgba(102,126,234,0.05), rgba(118,75,162,0.05));
            border-radius: 16px; border: 2px dashed rgba(102,126,234,0.2);
        ">
            <div style="font-size: 3rem; margin-bottom: 15px; animation: bounce 1s infinite;">${config.icon}</div>
            <h3 style="margin: 0 0 8px; color: #4b5563; font-weight: 600;">${config.title}</h3>
            <p style="margin: 0; color: #9ca3af; font-size: 0.9rem;">${config.desc}</p>
            ${config.action ? `
                <button class="empty-state-action btn-submit" style="margin-top: 20px; padding: 10px 24px;">
                    ${config.actionIcon || '➕'} ${config.action}
                </button>
            ` : ''}
        </div>
    `;

    if (config.action && config.onAction) {
        container.querySelector('.empty-state-action')?.addEventListener('click', config.onAction);
    }
};

// ============================================================
// 12. [#49] LIGHTBOX - Xem ảnh fullscreen
// ============================================================
export const showLightbox = (imageSrc, options = {}) => {
    const existing = document.getElementById('lightbox-overlay');
    if (existing) existing.remove();

    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox-overlay';
    lightbox.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.95);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999; animation: fadeIn 0.3s ease; cursor: zoom-out;
    `;

    lightbox.innerHTML = `
        <button id="lightbox-close" style="
            position: absolute; top: 20px; right: 20px;
            background: rgba(255,255,255,0.1); border: none; color: white;
            width: 44px; height: 44px; border-radius: 50%; cursor: pointer;
            font-size: 24px; transition: background 0.2s;
        ">&times;</button>
        <img src="${imageSrc}" alt="${options.alt || 'Image'}" style="
            max-width: 90%; max-height: 90%; object-fit: contain;
            border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            animation: zoomIn 0.3s ease;
        ">
        ${options.caption ? `
            <div style="position: absolute; bottom: 20px; color: white; text-align: center;
                 background: rgba(0,0,0,0.6); padding: 10px 20px; border-radius: 8px;">
                ${options.caption}
            </div>
        ` : ''}
    `;

    document.body.appendChild(lightbox);
    document.body.style.overflow = 'hidden';

    const close = () => {
        lightbox.remove();
        document.body.style.overflow = '';
    };

    lightbox.querySelector('#lightbox-close').onclick = close;
    lightbox.onclick = (e) => { if (e.target === lightbox) close(); };
    document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
    });
};

// ============================================================
// 13. [#10] TOAST PRO - Thông báo nâng cao với undo, progress
// ============================================================
export const showToastPro = (message, options = {}) => {
    const {
        type = 'success',
        duration = 5000,
        undoAction = null,
        undoLabel = 'Hoàn tác',
        icon = null,
        progress = true
    } = options;

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const colors = {
        success: 'linear-gradient(135deg, #10b981, #059669)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
        info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
    };

    const container = document.getElementById('notification-container') || document.body;

    const toast = document.createElement('div');
    toast.className = 'toast-pro';
    toast.style.cssText = `
        position: relative; min-width: 300px; max-width: 400px;
        padding: 16px 20px; margin-bottom: 10px;
        background: white; border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        display: flex; align-items: center; gap: 12px;
        animation: slideInRight 0.3s ease;
        overflow: hidden;
    `;

    toast.innerHTML = `
        <div style="
            width: 36px; height: 36px; border-radius: 10px;
            background: ${colors[type]}; display: flex;
            align-items: center; justify-content: center; font-size: 1.2rem;
        ">${icon || icons[type]}</div>
        <div style="flex: 1;">
            <div style="font-weight: 600; color: #1f2937; font-size: 0.95rem;">${message}</div>
        </div>
        ${undoAction ? `
            <button class="toast-undo" style="
                background: none; border: 1px solid #e5e7eb; color: #4b5563;
                padding: 6px 12px; border-radius: 6px; cursor: pointer;
                font-size: 0.8rem; font-weight: 500; transition: all 0.2s;
            ">${undoLabel}</button>
        ` : ''}
        <button class="toast-close" style="
            background: none; border: none; color: #9ca3af;
            cursor: pointer; font-size: 1.2rem; padding: 4px;
        ">&times;</button>
        ${progress ? `
            <div class="toast-progress" style="
                position: absolute; bottom: 0; left: 0; height: 3px;
                background: ${colors[type]}; width: 100%;
                animation: shrink ${duration}ms linear forwards;
            "></div>
        ` : ''}
    `;

    container.appendChild(toast);

    const remove = () => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-close').onclick = remove;

    if (undoAction) {
        toast.querySelector('.toast-undo').onclick = () => {
            undoAction();
            remove();
        };
    }

    // Auto remove
    setTimeout(remove, duration);

    return { remove };
};

// Add CSS animations for new components
const addUIStyles = () => {
    if (document.getElementById('ui-enhancements-styles')) return;

    const style = document.createElement('style');
    style.id = 'ui-enhancements-styles';
    style.textContent = `
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        @keyframes zoomIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
        }
        .toast-undo:hover {
            background: #f3f4f6 !important;
            border-color: #9ca3af !important;
        }
    `;
    document.head.appendChild(style);
};

// Initialize styles on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addUIStyles);
} else {
    addUIStyles();
}
