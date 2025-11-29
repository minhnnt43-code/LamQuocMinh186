/**
 * HSV Frame Generator - Canvas-based Avatar Frame Creator
 */

const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');
const uploadZone = document.getElementById('uploadZone');
const imageInput = document.getElementById('imageInput');
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');
const downloadBtn = document.getElementById('downloadBtn');
const frameOptions = document.querySelectorAll('.frame-option');

let userImage = null;
let currentFrame = 'frame1';
let imageScale = 1;
let imageX = 0;
let imageY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// Initialize canvas
function initCanvas() {
    ctx.fillStyle = '#F8F9FA';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ADB5BD';
    ctx.font = '24px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Chưa có ảnh', canvas.width / 2, canvas.height / 2);
    ctx.font = '16px Inter';
    ctx.fillText('Tải ảnh lên để bắt đầu', canvas.width / 2, canvas.height / 2 + 30);
}

initCanvas();

// File Upload Handlers
uploadZone.addEventListener('click', () => {
    imageInput.click();
});

uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        loadImage(file);
    }
});

// Load and display image
function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            userImage = img;
            imageScale = 1;
            imageX = (canvas.width - img.width) / 2;
            imageY = (canvas.height - img.height) / 2;
            renderCanvas();
            showNotification('✅ Đã tải ảnh thành công!', 'success');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Frame Selection
frameOptions.forEach(option => {
    option.addEventListener('click', () => {
        frameOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        currentFrame = option.dataset.frame;
        renderCanvas();
    });
});

// Zoom Control
zoomSlider.addEventListener('input', (e) => {
    imageScale = e.target.value / 100;
    zoomValue.textContent = e.target.value;
    renderCanvas();
});

// Canvas Drag functionality
canvas.addEventListener('mousedown', (e) => {
    if (!userImage) return;
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    dragStartX = e.clientX - rect.left - imageX;
    dragStartY = e.clientY - rect.top - imageY;
    canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging || !userImage) return;
    const rect = canvas.getBoundingClientRect();
    imageX = e.clientX - rect.left - dragStartX;
    imageY = e.clientY - rect.top - dragStartY;
    renderCanvas();
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = userImage ? 'move' : 'default';
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    canvas.style.cursor = 'default';
});

// Render Canvas with image and frame
function renderCanvas() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw user image if exists
    if (userImage) {
        const scaledWidth = userImage.width * imageScale;
        const scaledHeight = userImage.height * imageScale;

        ctx.save();
        ctx.drawImage(
            userImage,
            imageX,
            imageY,
            scaledWidth,
            scaledHeight
        );
        ctx.restore();
    }

    // Draw frame overlay
    drawFrame(currentFrame);
}

// Draw frame based on selection
function drawFrame(frameType) {
    ctx.save();

    // Create circular mask for profile picture effect
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 50;

    if (frameType === 'frame1') {
        // Blue gradient frame
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#0056B3');
        gradient.addColorStop(1, '#00A8FF');

        // Draw border
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 40;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Add text
        ctx.fillStyle = '#0056B3';
        ctx.font = 'bold 48px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('THANH NIÊN 2024', centerX, 100);

    } else if (frameType === 'frame2') {
        // Orange gradient frame
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#FF6B00');
        gradient.addColorStop(1, '#FFD700');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 40;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#FF6B00';
        ctx.font = 'bold 48px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('TÌNH NGUYỆN', centerX, 100);

    } else if (frameType === 'frame3') {
        // Green gradient frame
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#28a745');
        gradient.addColorStop(1, '#20c997');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 40;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#28a745';
        ctx.font = 'bold 48px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('MÙA HÈ XANH', centerX, 100);
    }

    ctx.restore();
}

// Download button
downloadBtn.addEventListener('click', () => {
    if (!userImage) {
        showNotification('⚠️ Vui lòng tải ảnh lên trước!', 'error');
        return;
    }

    // Create download link
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `avatar-frame-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);

        showNotification('✅ Đã tải xuống ảnh thành công!', 'success');
    }, 'image/png', 1.0);
});

// Notification helper
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
