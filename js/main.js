// --- FILE: js/main.js ---

import {
    loginWithGoogle, logoutUser, subscribeToAuthChanges,
    getUserData, saveUserData, auth
} from './firebase.js';

import {
    toggleLoading, showNotification, setupModal, convertDriveLink
} from './common.js';

import { initWorkModule } from './work.js';
import { initStudyModule } from './study.js';
import { initAdminModule } from './admin.js';

// Dữ liệu mặc định cho tài khoản mới tinh (tránh lỗi null)
const DEFAULT_DATA = {
    tasks: [],
    todos: [],
    projects: [],
    documents: [],
    achievements: [],
    studentJourney: {},
    drafts: [],
    personalInfo: {},
    settings: {
        darkMode: false,
        primaryColor: '#005B96',
        secondaryColor: '#FF7A00',
        customAvatarUrl: ''
    }
};

let currentUserData = null;

document.addEventListener('DOMContentLoaded', () => {

    // --- BẮT ĐẦU ĐỒNG HỒ THỜI GIAN THỰC ---
    startRealTimeClock();

    // 1. LẮNG NGHE TRẠNG THÁI ĐĂNG NHẬP
    subscribeToAuthChanges(async (user) => {
        if (user) {
            console.log("User đã đăng nhập:", user.email);
            toggleLoading(true);

            // --- CƠ CHẾ AN TOÀN: Tự tắt Loading sau 3 giây ---
            const safetyTimer = setTimeout(() => {
                toggleLoading(false);
            }, 3000); 

            // Ẩn màn hình Login, Hiện màn hình App
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';

            // Hiển thị tên User lên Sidebar
            document.getElementById('sidebar-user-name').textContent = user.displayName;

            // Tải dữ liệu từ Firebase
            try {
                const data = await getUserData(user.uid);
                
                // Nếu chưa có dữ liệu (user mới), dùng Default Data
                currentUserData = data ? data : JSON.parse(JSON.stringify(DEFAULT_DATA));

                // --- XỬ LÝ AVATAR ---
                let photoURL = user.photoURL;
                if (currentUserData.settings && currentUserData.settings.customAvatarUrl) {
                    photoURL = currentUserData.settings.customAvatarUrl;
                }
                const sidebarPic = document.getElementById('sidebar-profile-pic');
                if(sidebarPic) sidebarPic.src = photoURL;
                
                const settingsPreview = document.getElementById('settings-profile-preview');
                if (settingsPreview) settingsPreview.src = photoURL;

                // --- ĐỒNG BỘ THÔNG TIN CƠ BẢN ---
                if (!currentUserData.personalInfo) currentUserData.personalInfo = {};
                currentUserData.email = user.email;

                // Lưu lại thông tin cơ bản
                saveUserData(user.uid, {
                    email: user.email,
                    'personalInfo.email': user.email
                });

                // Áp dụng cài đặt giao diện
                applyUserSettings(currentUserData.settings, user);

                // --- KHỞI CHẠY CÁC MODULE CON ---
                initAdminModule(user);
                initWorkModule(currentUserData, user);
                initStudyModule(currentUserData, user);

                // --- KHỞI TẠO UI CHUNG ---
                setupNavigation(); // <--- HÀM NÀY ĐÃ ĐƯỢC ĐỊNH NGHĨA BÊN DƯỚI
                setupAllModals();
                setupSettings(user);
                loadProfileDataToForm();

                showNotification(`Chào mừng trở lại, ${user.displayName}!`);
                
            } catch (error) {
                console.error(error);
                showNotification('Lỗi tải dữ liệu: ' + error.message, 'error');
            } finally {
                clearTimeout(safetyTimer);
                toggleLoading(false);
            }

        } else {
            console.log("User chưa đăng nhập");
            document.getElementById('login-container').style.display = 'flex';
            document.getElementById('app-container').style.display = 'none';
            currentUserData = null;
            toggleLoading(false);
        }
    });

    // 2. XỬ LÝ UI MÀN HÌNH LOGIN
    const eyeIcon = document.querySelector('.eye-icon');
    if (eyeIcon) {
        eyeIcon.addEventListener('click', (e) => {
            const input = e.target.previousElementSibling;
            if (input) {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                e.target.style.opacity = type === 'text' ? '1' : '0.5';
            }
        });
    }

    // 3. SỰ KIỆN NÚT GOOGLE LOGIN
    document.getElementById('btn-login-google').addEventListener('click', async () => {
        try {
            await loginWithGoogle();
        } catch (error) {
            const errEl = document.getElementById('login-error');
            if(errEl) {
                errEl.textContent = "Đăng nhập thất bại: " + error.message;
                errEl.style.display = 'block';
            }
            alert("Lỗi đăng nhập: " + error.message);
        }
    });

    // 4. SỰ KIỆN ĐĂNG XUẤT
    document.getElementById('btn-logout').addEventListener('click', async () => {
        if (confirm('Bạn muốn đăng xuất khỏi hệ thống?')) {
            await logoutUser();
            location.reload();
        }
    });
});

// --- HÀM ĐỒNG HỒ ---
function startRealTimeClock() {
    const timeEl = document.getElementById('current-time');
    const dateEl = document.getElementById('current-date');
    
    const updateClock = () => {
        const now = new Date();
        if(timeEl) {
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            timeEl.textContent = `${hours}:${minutes}:${seconds}`;
        }
        if(dateEl) {
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            dateEl.textContent = `${day}/${month}/${year}`;
        }
    };
    updateClock();
    setInterval(updateClock, 1000);
}

// ============================================================
// [FIX] HÀM setupNavigation ĐÃ ĐƯỢC BỔ SUNG VÀO ĐÂY
// ============================================================
function setupNavigation() {
    const buttons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.content-section');

    // 1. Xử lý chuyển Tab
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Nếu nút này là nút Admin (không có data-target) thì bỏ qua, admin.js sẽ xử lý
            const targetId = btn.getAttribute('data-target');
            if (!targetId) return;

            // Active button
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show Section
            sections.forEach(sec => sec.classList.remove('active'));
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('active');

            // Tự động đóng menu mobile sau khi chọn
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('mobile-open');
            }
        });
    });

    // 2. Xử lý Menu đa cấp (Accordion)
    const groupToggles = document.querySelectorAll('.nav-group-toggle');
    groupToggles.forEach(toggle => {
        // Clone để xóa sự kiện cũ
        const newToggle = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(newToggle, toggle);

        newToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const parentGroup = newToggle.parentElement;
            parentGroup.classList.toggle('open');
        });
    });

    // 3. Xử lý Hamburger Menu (Mobile)
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    
    if (btnToggle && sidebar) {
        // Clone nút để tránh gán sự kiện nhiều lần
        const newBtnToggle = btnToggle.cloneNode(true);
        btnToggle.parentNode.replaceChild(newBtnToggle, btnToggle);

        newBtnToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('mobile-open'); // Class này đã định nghĩa trong style.css
        });

        // Bấm ra ngoài thì đóng sidebar
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('mobile-open') && 
                !sidebar.contains(e.target) && 
                e.target !== newBtnToggle) {
                sidebar.classList.remove('mobile-open');
            }
        });
    }
}

// --- 4. CÀI ĐẶT HỆ THỐNG (SETTINGS) ---
function setupSettings(user) {
    // A. Dark Mode
    const darkModeToggle = document.getElementById('toggle-dark-mode');
    if (darkModeToggle) {
        darkModeToggle.checked = currentUserData.settings?.darkMode || false;
        darkModeToggle.addEventListener('change', (e) => {
            const isDark = e.target.checked;
            document.body.classList.toggle('dark-mode', isDark);
            saveSettings({ darkMode: isDark }, user);
        });
    }

    // B. Màu sắc
    const bluePicker = document.getElementById('color-picker-blue');
    const orangePicker = document.getElementById('color-picker-orange');

    if (bluePicker) {
        bluePicker.value = currentUserData.settings?.primaryColor || '#005B96';
        bluePicker.addEventListener('change', (e) => {
            document.documentElement.style.setProperty('--custom-primary-blue', e.target.value);
            saveSettings({ primaryColor: e.target.value }, user);
        });
    }

    if (orangePicker) {
        orangePicker.value = currentUserData.settings?.secondaryColor || '#FF7A00';
        orangePicker.addEventListener('change', (e) => {
            document.documentElement.style.setProperty('--custom-primary-orange', e.target.value);
            saveSettings({ secondaryColor: e.target.value }, user);
        });
    }

    const btnReset = document.getElementById('btn-reset-colors');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            document.documentElement.style.setProperty('--custom-primary-blue', '#005B96');
            document.documentElement.style.setProperty('--custom-primary-orange', '#FF7A00');
            if(bluePicker) bluePicker.value = '#005B96';
            if(orangePicker) orangePicker.value = '#FF7A00';
            saveSettings({ primaryColor: '#005B96', secondaryColor: '#FF7A00' }, user);
            showNotification('Đã khôi phục màu mặc định');
        });
    }

    // C. Avatar (Link Drive)
    const btnSaveAvatar = document.getElementById('btn-save-avatar');
    if (btnSaveAvatar) {
        btnSaveAvatar.addEventListener('click', async () => {
            const linkInput = document.getElementById('profile-pic-link');
            const rawLink = linkInput.value.trim();
            if (!rawLink) return showNotification('Vui lòng dán link ảnh!', 'error');
            const directLink = convertDriveLink(rawLink);

            document.getElementById('sidebar-profile-pic').src = directLink;
            const preview = document.getElementById('settings-profile-preview');
            if (preview) preview.src = directLink;

            await saveSettings({ customAvatarUrl: directLink }, user);
            showNotification('Đã cập nhật ảnh đại diện!');
            linkInput.value = '';
        });
    }

    // D. Xóa dữ liệu
    const btnClear = document.getElementById('btn-clear-data');
    if (btnClear) {
        btnClear.addEventListener('click', async () => {
            if (confirm("CẢNH BÁO: Xóa sạch dữ liệu?")) {
                toggleLoading(true);
                await saveUserData(user.uid, DEFAULT_DATA);
                location.reload();
            }
        });
    }

    // E. Export/Import
    const btnExport = document.getElementById('btn-export-data');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentUserData));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "backup_data.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });
    }

    const importInput = document.getElementById('import-file-input');
    const btnImport = document.getElementById('btn-import-data');
    if (btnImport && importInput) {
        btnImport.addEventListener('click', () => importInput.click());
        const newImportInput = importInput.cloneNode(true);
        importInput.parentNode.replaceChild(newImportInput, importInput);

        newImportInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (confirm("Dữ liệu từ file sẽ GHI ĐÈ lên dữ liệu hiện tại. Tiếp tục?")) {
                        toggleLoading(true);
                        const mergedData = { ...currentUserData, ...data };
                        await saveUserData(user.uid, mergedData);
                        showNotification("Nhập dữ liệu thành công! Đang tải lại...");
                        setTimeout(() => location.reload(), 1000);
                    }
                } catch (err) {
                    showNotification("File lỗi hoặc sai định dạng!", "error");
                } finally {
                    toggleLoading(false);
                    newImportInput.value = '';
                }
            };
            reader.readAsText(file);
        });
    }
}

async function saveSettings(newSettings, user) {
    if (!currentUserData.settings) currentUserData.settings = {};
    currentUserData.settings = { ...currentUserData.settings, ...newSettings };
    await saveUserData(user.uid, { settings: currentUserData.settings });
}

function applyUserSettings(settings, user) {
    if (!settings) return;
    if (settings.darkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    if (settings.primaryColor) document.documentElement.style.setProperty('--custom-primary-blue', settings.primaryColor);
    if (settings.secondaryColor) document.documentElement.style.setProperty('--custom-primary-orange', settings.secondaryColor);
}

// --- 5. QUẢN LÝ MODAL ---
function setupAllModals() {
    const modals = [
        'edit-modal', 'event-modal', 'achievement-modal', 'project-modal',
        'document-modal', 'document-viewer-modal', 'outline-modal',
        'confirm-modal', 'duplicate-review-modal', 'admin-modal'
    ];
    const closes = [
        'close-edit-modal', 'close-event-modal', 'close-achievement-modal', 'close-project-modal',
        'close-document-modal', 'close-viewer-modal', 'close-outline-modal',
        'btn-cancel-confirm', 'close-duplicate-modal', 'close-admin-modal'
    ];

    modals.forEach((id, i) => setupModal(id, closes[i]));

    const closeSidePanels = () => {
        document.querySelectorAll('.sv5t-side-panel').forEach(p => p.classList.remove('open'));
        document.querySelectorAll('.sv5t-panel-overlay').forEach(o => o.classList.remove('active'));
    };

    document.getElementById('sv5t-panel-close-btn')?.addEventListener('click', closeSidePanels);
    document.getElementById('sv5t-panel-overlay')?.addEventListener('click', closeSidePanels);
    document.getElementById('outline-node-panel-close-btn')?.addEventListener('click', closeSidePanels);
    document.getElementById('outline-node-panel-overlay')?.addEventListener('click', closeSidePanels);
}

// --- 6. LOGIC HỒ SƠ CÁ NHÂN ---
function loadProfileDataToForm() {
    if (!currentUserData || !currentUserData.personalInfo) return;
    const info = currentUserData.personalInfo;
    
    const safeSet = (id, value) => { const el = document.getElementById(id); if(el) el.value = value || ''; };

    safeSet('pi-fullname', info.fullName);
    safeSet('pi-email', info.email);
    safeSet('pi-phone', info.phone);
    safeSet('pi-occupation', info.occupation);
    safeSet('pf-school', info.school);
    safeSet('pf-award', info.award);
    safeSet('pf-role', info.role);
    safeSet('pf-location', info.location);
}

const btnSaveProfile = document.getElementById('btn-save-profile');
if (btnSaveProfile) {
    btnSaveProfile.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;

        const originalText = btnSaveProfile.innerText;
        btnSaveProfile.innerText = "Đang lưu...";
        btnSaveProfile.disabled = true;

        try {
            const updatedInfo = {
                fullName: document.getElementById('pi-fullname').value,
                email: document.getElementById('pi-email').value,
                phone: document.getElementById('pi-phone').value,
                occupation: document.getElementById('pi-occupation').value,
                school: document.getElementById('pf-school').value,
                award: document.getElementById('pf-award').value,
                role: document.getElementById('pf-role').value,
                location: document.getElementById('pf-location').value
            };

            if (!currentUserData.personalInfo) currentUserData.personalInfo = {};
            currentUserData.personalInfo = { ...currentUserData.personalInfo, ...updatedInfo };

            await saveUserData(user.uid, { personalInfo: updatedInfo });
            showNotification("Đã cập nhật hồ sơ & Portfolio!");
        } catch (error) {
            console.error(error);
            alert("Lỗi: " + error.message);
        } finally {
            btnSaveProfile.innerText = originalText;
            btnSaveProfile.disabled = false;
        }
    });
}
