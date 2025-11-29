/**
 * HSV Admin - Admin Panel JavaScript
 */

document.addEventListener('DOMContentLoaded', function () {
    console.log('Admin Panel loaded');

    // Document approval
    document.querySelectorAll('.document-item button').forEach(btn => {
        btn.addEventListener('click', function () {
            const docTitle = this.closest('.document-item').querySelector('.document-title').textContent;
            if (confirm(`Duyệt văn bản: "${docTitle}"?`)) {
                showNotification('Đã duyệt văn bản thành công!', 'success');
                this.closest('.document-item').style.opacity = '0.5';
                this.textContent = 'Đã duyệt';
                this.disabled = true;
            }
        });
    });
});

// Create Event Modal
function showCreateEventModal() {
    const modal = createModal('Tạo Sự kiện mới', `
        <form id="createEventForm">
            <div class="form-group">
                <label class="form-label">Tên sự kiện</label>
                <input type="text" class="form-input" placeholder="VD: Ngày Hội Tình nguyện" required>
            </div>
            <div class="form-group">
                <label class="form-label">Ngày diễn ra</label>
                <input type="date" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">Thời gian</label>
                <div class="grid grid-2 gap-md">
                    <input type="time" class="form-input" placeholder="Bắt đầu" required>
                    <input type="time" class="form-input" placeholder="Kết thúc" required>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Địa điểm</label>
                <input type="text" class="form-input" placeholder="VD: Sân trường" required>
            </div>
            <div class="form-group">
                <label class="form-label">Mô tả</label>
                <textarea class="form-textarea" placeholder="Mô tả chi tiết sự kiện"></textarea>
            </div>
        </form>
    `, [
        { text: 'Hủy', class: 'btn-outline', onClick: 'close' },
        {
            text: 'Tạo sự kiện', class: 'btn-accent', onClick: () => {
                showNotification('Đã tạo sự kiện thành công!');
                return true;
            }
        }
    ]);
}

//Create News Modal
function showCreateNewsModal() {
    const modal = createModal('Đăng Thông báo mới', `
        <form id="createNewsForm">
            <div class="form-group">
                <label class="form-label">Loại thông báo</label>
                <select class="form-select">
                    <option value="urgent">🔊 Khẩn cấp</option>
                    <option value="important">📢 Quan trọng</option>
                    <option value="normal">📋 Thường</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Tiêu đề</label>
                <input type="text" class="form-input" placeholder="Tiêu đề thông báo" required>
            </div>
            <div class="form-group">
                <label class="form-label">Nội dung</label>
                <textarea class="form-textarea" placeholder="Nội dung chi tiết" required></textarea>
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: var(--spacing-sm); cursor: pointer;">
                    <input type="checkbox">
                    <span>Ghim thông báo lên đầu</span>
                </label>
            </div>
        </form>
    `, [
        { text: 'Hủy', class: 'btn-outline', onClick: 'close' },
        {
            text: 'Đăng thông báo', class: 'btn-accent', onClick: () => {
                showNotification('Đã đăng thông báo thành công!');
                return true;
            }
        }
    ]);
}

// Add Member Modal
function showAddMemberModal() {
    const modal = createModal('Thêm Thành viên mới', `
        <form id="addMemberForm">
            <div class="form-group">
                <label class="form-label">MSSV</label>
                <input type="text" class="form-input" placeholder="2024..." required>
            </div>
            <div class="form-group">
                <label class="form-label">Họ và tên</label>
                <input type="text" class="form-input" placeholder="Nguyễn Văn A" required>
            </div>
            <div class="form-group">
                <label class="form-label">Lớp</label>
                <input type="text" class="form-input" placeholder="CNTT K18" required>
            </div>
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" placeholder="student@edu.vn" required>
            </div>
            <div class="form-group">
                <label class="form-label">Số điện thoại</label>
                <input type="tel" class="form-input" placeholder="0912345678">
            </div>
        </form>
    `, [
        { text: 'Hủy', class: 'btn-outline', onClick: 'close' },
        {
            text: 'Thêm thành viên', class: 'btn-accent', onClick: () => {
                showNotification('Đã thêm thành viên thành công!');
                return true;
            }
        }
    ]);
}

// Export Report
function exportReport() {
    if (confirm('Xuất báo cáo tổng hợp (PDF)?')) {
        showNotification('Đang tạo báo cáo...', 'success');
        setTimeout(() => {
            showNotification('Báo cáo đã được tải xuống!');
        }, 2000);
    }
}

// Modal Creator Helper
function createModal(title, bodyHTML, buttons) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';

    let buttonsHTML = '';
    buttons.forEach(btn => {
        buttonsHTML += `<button class="btn ${btn.class}" data-action="${btn.onClick === 'close' ? 'close' : 'submit'}">${btn.text}</button>`;
    });

    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close" data-action="close">&times;</button>
            </div>
            <div class="modal-body">
                ${bodyHTML}
            </div>
            <div class="modal-footer">
                ${buttonsHTML}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close handlers
    overlay.querySelectorAll('[data-action="close"]').forEach(el => {
        el.addEventListener('click', () => overlay.remove());
    });

    // Submit handler
    const submitBtn = overlay.querySelector('[data-action="submit"]');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const callback = buttons.find(b => b.onClick !== 'close')?.onClick;
            if (callback && callback()) {
                overlay.remove();
            }
        });
    }

    // Close on overlay click
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.remove();
    });

    return overlay;
}

// Notification (reuse from hsv-app.js)
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'};
        color: white;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-xl);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
