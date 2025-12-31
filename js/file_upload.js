// ============================================================
// FILE: js/file_upload.js
// Mục đích: Drag & Drop file upload - [PHP MODE: DISABLED]
// ============================================================

// [DISABLED - PHP MODE] Firebase Storage không dùng được
// import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';
// import { storage, auth } from './firebase.js';

import { auth } from './api.js';
import { showNotification } from './common.js';

console.warn('⚠️ File Upload: Firebase Storage disabled. Cần API PHP riêng để upload file.');

/**
 * Setup Drop Zone cho upload files
 */
export function setupDropZone(elementId, options = {}) {
    const dropZone = document.getElementById(elementId);
    if (!dropZone) {
        console.error('Drop zone not found:', elementId);
        return;
    }

    const {
        onUploadStart = () => { },
        onProgress = () => { },
        onUploadComplete = () => { },
        onError = () => { },
        maxFileSize = 10 * 1024 * 1024, // 10MB default
        allowedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx']
    } = options;

    // Add drop zone styling
    dropZone.classList.add('file-drop-zone');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when dragging over
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-active');
        }, false);
    });

    // Handle drop
    dropZone.addEventListener('drop', async (e) => {
        const files = Array.from(e.dataTransfer.files);

        for (const file of files) {
            // Validate file size
            if (file.size > maxFileSize) {
                showNotification(`❌ "${file.name}" quá lớn (max ${maxFileSize / 1024 / 1024}MB)`, 'error');
                continue;
            }

            await uploadFile(file, {
                onStart: () => onUploadStart(file),
                onProgress: (progress) => onProgress(file, progress),
                onComplete: (result) => onUploadComplete(result),
                onError: (error) => onError(file, error)
            });
        }
    }, false);

    // Also handle click to select files
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.style.display = 'none';
    dropZone.appendChild(input);

    dropZone.addEventListener('click', () => input.click());

    input.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
            if (file.size > maxFileSize) {
                showNotification(`❌ "${file.name}" quá lớn`, 'error');
                continue;
            }
            await uploadFile(file, {
                onStart: () => onUploadStart(file),
                onProgress: (progress) => onProgress(file, progress),
                onComplete: (result) => onUploadComplete(result),
                onError: (error) => onError(file, error)
            });
        }
        input.value = ''; // Reset
    });

    return dropZone;
}

/**
 * Upload một file - [PHP MODE: PLACEHOLDER]
 */
async function uploadFile(file, callbacks) {
    const { onStart, onProgress, onComplete, onError } = callbacks;

    // PHP MODE: File upload disabled - show error
    showNotification('⚠️ Tính năng upload file chưa được hỗ trợ với PHP backend', 'error');
    onError?.(new Error('File upload chưa được implement cho PHP backend'));
    return null;
}

/**
 * Xóa file - [PHP MODE: PLACEHOLDER]
 */
export async function deleteFile(filePath) {
    showNotification('⚠️ Xóa file chưa được hỗ trợ với PHP backend', 'error');
    return false;
}

/**
 * Render danh sách files đã upload
 */
export function renderFileList(files, containerId, onDelete) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!files || files.length === 0) {
        container.innerHTML = '<p class="no-files">Chưa có file nào</p>';
        return;
    }

    const html = `
        <div class="file-list">
            ${files.map((file, index) => `
                <div class="file-item" data-index="${index}">
                    <div class="file-icon">${getFileIcon(file.type)}</div>
                    <div class="file-info">
                        <a href="${file.url}" target="_blank" class="file-name">${file.name}</a>
                        <span class="file-size">${formatFileSize(file.size)}</span>
                    </div>
                    <button class="btn-delete-file" data-path="${file.path}" title="Xóa">
                        🗑️
                    </button>
                </div>
            `).join('')}
        </div>
    `;

    container.innerHTML = html;

    // Attach delete handlers
    container.querySelectorAll('.btn-delete-file').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const path = btn.getAttribute('data-path');
            if (confirm('Xóa file này?')) {
                const success = await deleteFile(path);
                if (success && onDelete) {
                    onDelete(path);
                }
            }
        });
    });
}

/**
 * Render progress bar
 */
export function renderProgressBar(containerId, progress) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="upload-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <span class="progress-text">${Math.round(progress)}%</span>
        </div>
    `;

    if (progress >= 100) {
        setTimeout(() => {
            container.innerHTML = '';
        }, 1000);
    }
}

/**
 * Create drop zone HTML
 */
export function createDropZoneHTML(id) {
    return `
        <div id="${id}" class="file-drop-zone">
            <div class="drop-zone-content">
                <span class="drop-icon">📁</span>
                <p><strong>Kéo thả file vào đây</strong></p>
                <p>hoặc click để chọn file</p>
                <span class="file-types">Hỗ trợ: Ảnh, PDF, Word, Excel</span>
            </div>
        </div>
        <div id="${id}-progress"></div>
        <div id="${id}-list"></div>
    `;
}

// ==================== HELPERS ====================

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function getFileIcon(type) {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    if (type.includes('video')) return '🎬';
    if (type.includes('audio')) return '🎵';
    return '📁';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ==================== CSS ====================

export function injectFileUploadStyles() {
    const styles = `
        .file-drop-zone {
            border: 3px dashed var(--border-color);
            border-radius: 12px;
            padding: 40px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            background: var(--bg-secondary);
        }
        
        .file-drop-zone:hover {
            border-color: var(--primary-color);
            background: var(--primary-color)10;
        }
        
        .file-drop-zone.drag-active {
            border-color: var(--primary-color);
            background: var(--primary-color)20;
            transform: scale(1.02);
        }
        
        .drop-zone-content {
            pointer-events: none;
        }
        
        .drop-icon {
            font-size: 3rem;
            display: block;
            margin-bottom: 10px;
        }
        
        .file-types {
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-top: 10px;
            display: block;
        }
        
        .upload-progress {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            background: var(--bg-card);
            border-radius: 8px;
            margin-top: 10px;
        }
        
        .progress-bar {
            flex: 1;
            height: 8px;
            background: var(--bg-secondary);
            border-radius: 10px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
            transition: width 0.3s;
        }
        
        .progress-text {
            font-weight: 600;
            color: var(--primary-color);
            min-width: 45px;
        }
        
        .file-list {
            margin-top: 15px;
        }
        
        .file-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: var(--bg-card);
            border-radius: 8px;
            margin-bottom: 8px;
            transition: all 0.2s;
        }
        
        .file-item:hover {
            background: var(--bg-secondary);
        }
        
        .file-icon {
            font-size: 1.5rem;
        }
        
        .file-info {
            flex: 1;
            overflow: hidden;
        }
        
        .file-name {
            display: block;
            font-weight: 600;
            color: var(--text-primary);
            text-decoration: none;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .file-name:hover {
            color: var(--primary-color);
        }
        
        .file-size {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        
        .btn-delete-file {
            background: none;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 5px;
            opacity: 0.6;
            transition: opacity 0.2s;
        }
        
        .btn-delete-file:hover {
            opacity: 1;
        }
        
        .no-files {
            text-align: center;
            color: var(--text-secondary);
            padding: 20px;
        }
        
        [data-theme="dark"] .file-drop-zone {
            background: #1a1a1a;
            border-color: #444;
        }
        
        [data-theme="dark"] .file-item {
            background: #2a2a2a;
        }
    `;

    if (!document.getElementById('file-upload-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'file-upload-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }
}
