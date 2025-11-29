/**
 * HSV Documents - Document Upload & Management
 */

const docUploadZone = document.getElementById('docUploadZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const documentForm = document.getElementById('documentForm');

// Drag & Drop
docUploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    docUploadZone.classList.add('dragover');
});

docUploadZone.addEventListener('dragleave', () => {
    docUploadZone.classList.remove('dragover');
});

docUploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    docUploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
        handleFileSelect(file);
    }
});

// File Input Change
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFileSelect(file);
    }
});

// Handle file selection
function handleFileSelect(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
        showNotification('⚠️ File quá lớn! Vui lòng chọn file nhỏ hơn 10MB', 'error');
        return;
    }

    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];

    if (!validTypes.includes(file.type)) {
        showNotification('⚠️ Định dạng file không hợp lệ!', 'error');
        return;
    }

    // Show file info
    fileInfo.style.display = 'block';
    fileInfo.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <strong>${file.name}</strong> (${(file.size / 1024).toFixed(2)} KB)
    `;
}

// Form Submit
documentForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!fileInput.files[0]) {
        showNotification('⚠️ Vui lòng chọn file đính kèm!', 'error');
        return;
    }

    // Simulate upload
    const btn = documentForm.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';

    setTimeout(() => {
        showNotification('✅ Đã gửi văn bản thành công! Chờ Ban Thanh niên duyệt.', 'success');

        // Reset form
        documentForm.reset();
        fileInfo.style.display = 'none';

        btn.disabled = false;
        btn.innerHTML = originalText;

        // Reload page (in real app, would update list dynamically)
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }, 2000);
});

// Notification
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

// Pagination
document.querySelectorAll('.pagination-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.pagination-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        // In real app, would fetch new page data
        console.log('Load page:', this.textContent);
    });
});
