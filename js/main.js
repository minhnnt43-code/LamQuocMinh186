// --- FILE: js/main.js ---

import {
    loginWithGoogle, logoutUser, subscribeToAuthChanges,
    getUserData, saveUserData, auth
} from './firebase.js';

import {
    toggleLoading, showNotification
} from './common.js';

import { initWorkModule } from './work.js';
import { initStudyModule } from './study.js';
import { initAdminModule } from './admin.js';

// [MỚI] Import các module đã tách
import { setupNavigation } from './navigation.js';
import { setupSettings, applyUserSettings } from './settings.js';
import { setupAllModals } from './modals.js';
import { loadProfileDataToForm, setupProfileListeners } from './profile.js';

// Dữ liệu mặc định cho tài khoản mới tinh (tránh lỗi null)
const DEFAULT_DATA = {
    tasks: [],
    todos: [],
    projects: [],
    documents: [],
    achievements: [],
    studentJourney: {},
    drafts: [],
    outlines: [],
    calendarEvents: [],
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

            // --- CƠ CHẾ AN TOÀN: Tự tắt Loading sau 5 giây ---
            const safetyTimer = setTimeout(() => {
                toggleLoading(false);
            }, 5000);

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
                if (sidebarPic) sidebarPic.src = photoURL;

                const settingsPreview = document.getElementById('settings-profile-preview');
                if (settingsPreview) settingsPreview.src = photoURL;

                // --- ĐỒNG BỘ THÔNG TIN CƠ BẢN ---
                if (!currentUserData.personalInfo) currentUserData.personalInfo = {};
                currentUserData.email = user.email;

                // Lưu lại thông tin cơ bản (cập nhật email mới nhất)
                saveUserData(user.uid, {
                    email: user.email,
                    'personalInfo.email': user.email
                });

                // Áp dụng cài đặt giao diện (Dark mode, Color)
                applyUserSettings(currentUserData.settings, user);

                // --- KHỞI CHẠY CÁC MODULE CON (QUAN TRỌNG) ---
                await initAdminModule(user);       // Module Admin (Duyệt hẹn, Album, Timeline)
                initWorkModule(currentUserData, user);  // Module Lịch, Task, Google Sync
                initStudyModule(currentUserData, user); // Module Học tập, GPA, SV5T

                // --- KHỞI TẠO UI CHUNG ---
                setupNavigation();
                setupAllModals();
                setupSettings(user, currentUserData); // [MỚI] Truyền currentUserData
                loadProfileDataToForm(currentUserData); // [MỚI] Truyền currentUserData
                setupProfileListeners(currentUserData); // [MỚI] Setup listeners

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
            if (errEl) {
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
        if (timeEl) {
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            timeEl.textContent = `${hours}:${minutes}:${seconds}`;
        }
        if (dateEl) {
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            dateEl.textContent = `${day}/${month}/${year}`;
        }
    };
    updateClock();
    setInterval(updateClock, 1000);
}