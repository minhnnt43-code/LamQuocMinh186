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