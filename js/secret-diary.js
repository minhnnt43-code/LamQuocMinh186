// ============================================================
// FILE: js/secret-diary.js
// Nhật ký bí mật - Bảo vệ bằng mật khẩu SHA-256
// Decoy notes khi nhập sai 3 lần
// ============================================================

import { showNotification, generateID } from './common.js';
import { saveUserData } from './firebase.js';

let globalData = null;
let currentUser = null;
let failedAttempts = 0;
let isUnlocked = false;
let isDecoyMode = false;
let autoLockTimer = null;
const AUTO_LOCK_MS = 5 * 60 * 1000; // 5 phút

// Decoy notes giả
const DECOY_ENTRIES = [
    { id: 'decoy1', date: '2025-02-20T10:30:00', content: 'Nhớ mua quà sinh nhật cho Hà — 25/02. Cô ấy thích hoa hướng dương.' },
    { id: 'decoy2', date: '2025-02-18T14:00:00', content: 'Lịch họp nhóm đồ án thứ 5 tuần sau, quán Highland Coffee gần trường.' },
    { id: 'decoy3', date: '2025-02-15T09:00:00', content: 'Deadline nộp bài tập lớn cuối tháng 3. Cần chia part cho các bạn trong nhóm.' },
    { id: 'decoy4', date: '2025-02-10T20:00:00', content: 'Gọi điện hỏi thăm bà ngoại cuối tuần. Mua thêm thuốc bổ.' },
    { id: 'decoy5', date: '2025-02-05T16:00:00', content: 'Ý tưởng: làm app quản lý chi tiêu cho sinh viên. Research thêm về Flutter.' }
];

// --- INIT ---
export function initSecretDiary(data, user) {
    globalData = data;
    currentUser = user;
    if (!globalData.diaryEntries) globalData.diaryEntries = [];

    // Setup icon click
    const diaryBtn = document.getElementById('secret-diary-btn');
    if (diaryBtn) {
        diaryBtn.addEventListener('click', handleDiaryClick);
    }
}

// --- SHA-256 HASH ---
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- MAIN CLICK HANDLER ---
async function handleDiaryClick() {
    // Nếu đang mở → đóng
    if (isUnlocked || isDecoyMode) {
        closeDiary();
        return;
    }

    const hasPassword = globalData.diaryPasswordHash;

    if (!hasPassword) {
        showCreatePasswordModal();
    } else {
        showPasswordModal();
    }
}

// --- TẠO MẬT KHẨU LẦN ĐẦU ---
function showCreatePasswordModal() {
    const overlay = document.createElement('div');
    overlay.className = 'diary-overlay';
    overlay.id = 'diary-modal-overlay';
    overlay.innerHTML = `
        <div class="diary-modal">
            <div class="diary-modal-header">
                <span>🔐</span>
                <h3>Tạo mật khẩu nhật ký bí mật</h3>
            </div>
            <div class="diary-modal-body">
                <div class="diary-form-group">
                    <label>Mật khẩu mới</label>
                    <input type="password" id="diary-new-pw" placeholder="Nhập mật khẩu..." autocomplete="off">
                </div>
                <div class="diary-form-group">
                    <label>Xác nhận mật khẩu</label>
                    <input type="password" id="diary-confirm-pw" placeholder="Nhập lại mật khẩu..." autocomplete="off">
                </div>
                <p class="diary-hint">⚡ Mật khẩu được mã hóa SHA-256, không ai có thể đọc được.</p>
            </div>
            <div class="diary-modal-footer">
                <button class="diary-btn diary-btn-cancel" id="diary-create-cancel">Huỷ</button>
                <button class="diary-btn diary-btn-primary" id="diary-create-submit">Tạo mật khẩu</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('diary-create-cancel').onclick = () => overlay.remove();
    document.getElementById('diary-create-submit').onclick = async () => {
        const pw1 = document.getElementById('diary-new-pw').value;
        const pw2 = document.getElementById('diary-confirm-pw').value;

        if (!pw1 || pw1.length < 4) {
            showNotification('⚠️ Mật khẩu phải ít nhất 4 ký tự!', 'error');
            return;
        }
        if (pw1 !== pw2) {
            shakeElement(document.querySelector('.diary-modal'));
            showNotification('❌ Mật khẩu không khớp!', 'error');
            return;
        }

        const hash = await hashPassword(pw1);
        globalData.diaryPasswordHash = hash;
        await saveUserData(currentUser.uid, { diaryPasswordHash: hash });
        overlay.remove();
        showNotification('✅ Đã tạo mật khẩu nhật ký bí mật!');
    };

    // Focus
    setTimeout(() => document.getElementById('diary-new-pw')?.focus(), 100);
}

// --- NHẬP MẬT KHẨU ---
function showPasswordModal() {
    const overlay = document.createElement('div');
    overlay.className = 'diary-overlay';
    overlay.id = 'diary-modal-overlay';
    overlay.innerHTML = `
        <div class="diary-modal diary-pw-modal">
            <div class="diary-modal-header">
                <span>🔒</span>
                <h3>Nhập mật khẩu</h3>
            </div>
            <div class="diary-modal-body">
                <div class="diary-form-group">
                    <input type="password" id="diary-pw-input" placeholder="Mật khẩu nhật ký..." autocomplete="off">
                </div>
                <p class="diary-attempts">${failedAttempts > 0 ? `Sai ${failedAttempts}/3 lần` : ''}</p>
            </div>
            <div class="diary-modal-footer">
                <button class="diary-btn diary-btn-cancel" id="diary-pw-cancel">Huỷ</button>
                <button class="diary-btn diary-btn-primary" id="diary-pw-submit">Mở khoá</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const pwInput = document.getElementById('diary-pw-input');
    const submitBtn = document.getElementById('diary-pw-submit');

    document.getElementById('diary-pw-cancel').onclick = () => overlay.remove();

    const handleSubmit = async () => {
        const pw = pwInput.value;
        if (!pw) return;

        const hash = await hashPassword(pw);

        if (hash === globalData.diaryPasswordHash) {
            // ĐÚng → mở nhật ký thật
            failedAttempts = 0;
            isUnlocked = true;
            isDecoyMode = false;
            overlay.remove();
            renderRealDiary();
            startAutoLock();
            showNotification('🔓 Đã mở nhật ký bí mật');
        } else {
            failedAttempts++;
            if (failedAttempts >= 3) {
                // SAI 3 LẦN → mở trang DECOY
                isDecoyMode = true;
                isUnlocked = false;
                overlay.remove();
                renderDecoyDiary();
                failedAttempts = 0; // Reset cho lần sau
            } else {
                shakeElement(document.querySelector('.diary-pw-modal'));
                pwInput.value = '';
                document.querySelector('.diary-attempts').textContent = `⚠️ Sai ${failedAttempts}/3 lần`;
                showNotification('❌ Sai mật khẩu!', 'error');
            }
        }
    };

    submitBtn.onclick = handleSubmit;
    pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });
    setTimeout(() => pwInput?.focus(), 100);
}

// --- RENDER NHẬT KÝ THẬT ---
function renderRealDiary() {
    const section = document.getElementById('secret-diary-section');
    if (!section) return;

    const entries = globalData.diaryEntries || [];
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    section.style.display = 'block';
    section.innerHTML = `
        <div class="diary-container">
            <div class="diary-top-bar">
                <h2>📓 Nhật ký bí mật</h2>
                <div class="diary-top-actions">
                    <button class="diary-btn diary-btn-primary" id="diary-add-entry">+ Ghi chú mới</button>
                    <button class="diary-btn diary-btn-ghost" id="diary-close-btn">🔒 Khoá lại</button>
                </div>
            </div>
            <div class="diary-entries">
                ${entries.length === 0
            ? `<div class="diary-empty">
                        <div class="diary-empty-icon">📝</div>
                        <p>Chưa có ghi chú nào. Bấm "Ghi chú mới" để bắt đầu!</p>
                       </div>`
            : entries.map(e => renderEntry(e, false)).join('')
        }
            </div>
        </div>
    `;

    setupDiaryEvents(section);
}

// --- RENDER NHẬT KÝ GIẢ (DECOY) ---
function renderDecoyDiary() {
    const section = document.getElementById('secret-diary-section');
    if (!section) return;

    section.style.display = 'block';
    section.innerHTML = `
        <div class="diary-container">
            <div class="diary-top-bar">
                <h2>📓 Nhật ký bí mật</h2>
                <div class="diary-top-actions">
                    <button class="diary-btn diary-btn-primary" id="diary-add-entry">+ Ghi chú mới</button>
                    <button class="diary-btn diary-btn-ghost" id="diary-close-btn">🔒 Khoá lại</button>
                </div>
            </div>
            <div class="diary-entries">
                ${DECOY_ENTRIES.map(e => renderEntry(e, true)).join('')}
            </div>
        </div>
    `;

    // Decoy events - add/edit sẽ giả vờ lưu nhưng không làm gì
    document.getElementById('diary-close-btn')?.addEventListener('click', closeDiary);
    document.getElementById('diary-add-entry')?.addEventListener('click', () => {
        showNotification('✅ Đã lưu ghi chú!'); // Giả vờ
    });
}

// --- RENDER 1 ENTRY ---
function renderEntry(entry, isDecoy) {
    const d = new Date(entry.date);
    const dateStr = d.toLocaleDateString('vi-VN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    return `
        <div class="diary-entry" data-id="${entry.id}">
            <div class="diary-entry-header">
                <span class="diary-entry-date">${dateStr}</span>
                ${!isDecoy ? `
                    <div class="diary-entry-actions">
                        <button class="diary-entry-btn diary-edit-btn" data-id="${entry.id}" title="Sửa">✏️</button>
                        <button class="diary-entry-btn diary-delete-btn" data-id="${entry.id}" title="Xoá">🗑️</button>
                    </div>
                ` : ''}
            </div>
            <div class="diary-entry-content">${entry.content}</div>
        </div>
    `;
}

// --- EVENTS ---
function setupDiaryEvents(container) {
    // Close/Lock
    document.getElementById('diary-close-btn')?.addEventListener('click', closeDiary);

    // Add new entry
    document.getElementById('diary-add-entry')?.addEventListener('click', () => {
        showEntryEditor(null);
    });

    // Edit entry
    container.querySelectorAll('.diary-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const entry = globalData.diaryEntries.find(e => e.id === id);
            if (entry) showEntryEditor(entry);
        });
    });

    // Delete entry
    container.querySelectorAll('.diary-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            globalData.diaryEntries = globalData.diaryEntries.filter(e => e.id !== id);
            await saveUserData(currentUser.uid, { diaryEntries: globalData.diaryEntries });
            showNotification('🗑️ Đã xoá ghi chú');
            renderRealDiary();
            resetAutoLock();
        });
    });
}

// --- EDITOR POPUP ---
function showEntryEditor(existingEntry) {
    const overlay = document.createElement('div');
    overlay.className = 'diary-overlay';
    overlay.id = 'diary-editor-overlay';
    overlay.innerHTML = `
        <div class="diary-modal diary-editor-modal">
            <div class="diary-modal-header">
                <span>${existingEntry ? '✏️' : '📝'}</span>
                <h3>${existingEntry ? 'Sửa ghi chú' : 'Ghi chú mới'}</h3>
            </div>
            <div class="diary-modal-body">
                <textarea id="diary-entry-text" rows="8" placeholder="Viết suy nghĩ, nhật ký, ghi chú bí mật của bạn...">${existingEntry?.content || ''}</textarea>
            </div>
            <div class="diary-modal-footer">
                <button class="diary-btn diary-btn-cancel" id="diary-editor-cancel">Huỷ</button>
                <button class="diary-btn diary-btn-primary" id="diary-editor-save">💾 Lưu</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('diary-editor-cancel').onclick = () => overlay.remove();
    document.getElementById('diary-editor-save').onclick = async () => {
        const text = document.getElementById('diary-entry-text').value.trim();
        if (!text) {
            showNotification('⚠️ Nội dung không được rỗng!', 'error');
            return;
        }

        if (existingEntry) {
            existingEntry.content = text;
            existingEntry.date = new Date().toISOString();
        } else {
            globalData.diaryEntries.push({
                id: generateID(),
                date: new Date().toISOString(),
                content: text
            });
        }

        await saveUserData(currentUser.uid, { diaryEntries: globalData.diaryEntries });
        overlay.remove();
        showNotification('✅ Đã lưu ghi chú');
        renderRealDiary();
        resetAutoLock();
    };

    setTimeout(() => document.getElementById('diary-entry-text')?.focus(), 100);
}

// --- AUTO LOCK ---
function startAutoLock() {
    clearTimeout(autoLockTimer);
    autoLockTimer = setTimeout(() => {
        closeDiary();
        showNotification('🔒 Nhật ký đã tự khoá sau 5 phút');
    }, AUTO_LOCK_MS);

    // Reset trên mọi tương tác
    document.addEventListener('click', resetAutoLock, { once: true });
    document.addEventListener('keydown', resetAutoLock, { once: true });
}

function resetAutoLock() {
    if (!isUnlocked) return;
    clearTimeout(autoLockTimer);
    startAutoLock();
}

// --- CLOSE ---
function closeDiary() {
    isUnlocked = false;
    isDecoyMode = false;
    clearTimeout(autoLockTimer);
    const section = document.getElementById('secret-diary-section');
    if (section) {
        section.style.display = 'none';
        section.innerHTML = '';
    }
}

// --- SHAKE ANIMATION ---
function shakeElement(el) {
    if (!el) return;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
}
