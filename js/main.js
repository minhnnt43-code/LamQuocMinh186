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

            // --- [FIX] CƠ CHẾ AN TOÀN: Tự tắt Loading sau 3 giây bất kể mạng chậm ---
            const safetyTimer = setTimeout(() => {
                toggleLoading(false);
                console.warn("⚠️ Loading quá lâu, đã buộc tắt.");
            }, 3000); 
            // ---------------------------------------------------------------------

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

                // Lưu lại thông tin cơ bản (chạy ngầm, không cần await để đợi)
                saveUserData(user.uid, {
                    email: user.email,
                    'personalInfo.email': user.email
                });

                // Áp dụng cài đặt giao diện
                applyUserSettings(currentUserData.settings, user);

                // --- KHỞI CHẠY CÁC MODULE CON ---
                // Init các module này có thể chạy song song để nhanh hơn
                initAdminModule(user);
                initWorkModule(currentUserData, user);
                initStudyModule(currentUserData, user);

                // --- KHỞI TẠO UI CHUNG ---
                setupNavigation();
                setupAllModals();
                setupSettings(user);
                loadProfileDataToForm();

                showNotification(`Chào mừng trở lại, ${user.displayName}!`);
                
            } catch (error) {
                console.error(error);
                showNotification('Lỗi tải dữ liệu: ' + error.message, 'error');
            } finally {
                // Xóa bộ đếm an toàn vì đã tải xong thành công
                clearTimeout(safetyTimer);
                toggleLoading(false);
            }

        } else {
            console.log("User chưa đăng nhập");
            document.getElementById('login-container').style.display = 'flex';
            document.getElementById('app-container').style.display = 'none';
            currentUserData = null;
            toggleLoading(false); // Đảm bảo tắt loading nếu ở màn hình login
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
            location.reload(); // Tải lại trang cho sạch sẽ
        }
    });
});

// --- HÀM ĐỒNG HỒ (REAL-TIME CLOCK) ---
function startRealTimeClock() {
    const timeEl = document.getElementById('current-time');
    const dateEl = document.getElementById('current-date');
    
    const updateClock = () => {
        const now = new Date();
        
        // Cập nhật Giờ:Phút:Giây
        if(timeEl) {
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            timeEl.textContent = `${hours}:${minutes}:${seconds}`;
        }

        // Cập nhật Ngày/Tháng/Năm
        if(dateEl) {
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            dateEl.textContent = `${day}/${month}/${year}`;
        }
    };

    updateClock(); // Chạy ngay lập tức
    setInterval(updateClock, 1000); // Cập nhật mỗi giây
}

// --- 3. HÀM ĐIỀU HƯỚNG (NAVIGATION) - FIXED MOBILE ---
function setupNavigation() {
    // 1. Xử lý chuyển Tab
    const buttons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.content-section');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-menu-overlay');

    // Tạo Overlay nếu chưa có (Phòng trường hợp HTML thiếu)
    if (!overlay) {
        const newOverlay = document.createElement('div');
        newOverlay.id = 'mobile-menu-overlay';
        document.body.appendChild(newOverlay);
    }
    // Lấy lại biến overlay sau khi tạo
    const finalOverlay = document.getElementById('mobile-menu-overlay');

    // Hàm đóng menu mobile
    const closeMobileMenu = () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            finalOverlay.classList.remove('active');
        }
    };

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            if (!targetId) return;

            // Active nút
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Hiện section
            sections.forEach(sec => sec.classList.remove('active'));
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('active');

            // ĐÓNG MENU MOBILE SAU KHI CHỌN
            closeMobileMenu();
        });
    });

    // 2. Toggle menu con (Accordion)
    const groupToggles = document.querySelectorAll('.nav-group-toggle');
    groupToggles.forEach(toggle => {
        const newToggle = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(newToggle, toggle);

        newToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const parentGroup = newToggle.parentElement;
            parentGroup.classList.toggle('open');
        });
    });

    // 3. [MỚI] XỬ LÝ NÚT 3 GẠCH (HAMBURGER)
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    if (btnToggle) {
        // Xóa sự kiện cũ để tránh trùng lặp
        const newBtnToggle = btnToggle.cloneNode(true);
        btnToggle.parentNode.replaceChild(newBtnToggle, btnToggle);

        newBtnToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Không cho click lan ra ngoài
            sidebar.classList.toggle('active');
            finalOverlay.classList.toggle('active');
        });
    }

    // 4. Bấm vào vùng đen (Overlay) để đóng menu
    if (finalOverlay) {
        finalOverlay.addEventListener('click', closeMobileMenu);
    }
    
    // 5. Đồng bộ Avatar Header Mobile
    const mobileAvatar = document.getElementById('mobile-avatar');
    const mainAvatar = document.getElementById('sidebar-profile-pic');
    if(mobileAvatar && mainAvatar) {
        // Copy ảnh từ sidebar lên header mobile
        mobileAvatar.src = mainAvatar.src;
        // Theo dõi nếu ảnh chính thay đổi thì cập nhật ảnh mobile
        const observer = new MutationObserver(() => {
            mobileAvatar.src = mainAvatar.src;
        });
        observer.observe(mainAvatar, { attributes: true, attributeFilter: ['src'] });
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

    // Khôi phục màu mặc định
    const btnReset = document.getElementById('btn-reset-colors');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            const defBlue = '#005B96';
            const defOrange = '#FF7A00';
            
            document.documentElement.style.setProperty('--custom-primary-blue', defBlue);
            document.documentElement.style.setProperty('--custom-primary-orange', defOrange);
            
            if (bluePicker) bluePicker.value = defBlue;
            if (orangePicker) orangePicker.value = defOrange;
            
            saveSettings({ primaryColor: defBlue, secondaryColor: defOrange }, user);
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
            if (confirm("CẢNH BÁO: Xóa sạch dữ liệu? Hành động này không thể hoàn tác.")) {
                toggleLoading(true);
                await saveUserData(user.uid, DEFAULT_DATA);
                location.reload();
            }
        });
    }

    // E. Export Data
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

    // F. Import Data
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
    const safeSet = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    };

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
