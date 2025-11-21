// --- FILE: js/main.js ---

import { 
    loginWithGoogle, logoutUser, subscribeToAuthChanges, 
    getUserData, saveUserData, uploadFileToStorage 
} from './firebase.js';

import { 
    toggleLoading, showNotification, setupModal 
} from './common.js';

import { initWorkModule } from './work.js';
import { initStudyModule } from './study.js';
import { initAdminModule } from './admin.js';

// Dữ liệu mặc định cho tài khoản mới tinh
const DEFAULT_DATA = {
    tasks: [],
    todos: [],
    projects: [],
    documents: [],
    achievements: [],
    studentJourney: {},
    drafts: [],
    settings: { 
        darkMode: false, 
        primaryColor: '#005B96', 
        secondaryColor: '#FF7A00' 
    }
};

let currentUserData = null;

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. LẮNG NGHE TRẠNG THÁI ĐĂNG NHẬP
    subscribeToAuthChanges(async (user) => {
        if (user) {
            console.log("User đã đăng nhập:", user.email);
            toggleLoading(true);
            
            // Ẩn màn hình Login, Hiện màn hình App
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';
            
            // Hiển thị thông tin User lên Sidebar
            document.getElementById('sidebar-user-name').textContent = user.displayName;
            const photoURL = user.photoURL || "https://placehold.co/80x80/FFFFFF/005B96?text=User";
            document.getElementById('sidebar-profile-pic').src = photoURL;
            
            const settingsPreview = document.getElementById('settings-profile-preview');
            if(settingsPreview) settingsPreview.src = photoURL;

            // Tải dữ liệu từ Firebase
            try {
                const data = await getUserData(user.uid);
                currentUserData = data ? data : JSON.parse(JSON.stringify(DEFAULT_DATA));

                // ============================================================
                // 🔥 TỰ ĐỘNG ĐỒNG BỘ THÔNG TIN CÁ NHÂN (FIX LỖI ADMIN) 🔥
                // ============================================================
                if (!currentUserData.personalInfo) currentUserData.personalInfo = {};
                
                // Luôn lấy thông tin mới nhất từ Google
                currentUserData.personalInfo.fullName = user.displayName;
                currentUserData.personalInfo.email = user.email;
                
                if (!currentUserData.settings) currentUserData.settings = {};
                // Nếu chưa có avatar custom thì lấy từ Google
                if (!currentUserData.settings.customAvatarUrl) {
                    currentUserData.settings.customAvatarUrl = user.photoURL;
                }

                // Lưu ngược lên Firebase để Admin dashboard đọc được
                saveUserData(user.uid, { 
                    personalInfo: currentUserData.personalInfo,
                    settings: currentUserData.settings,
                    email: user.email // Lưu email ở root để dễ query
                });
                // ============================================================
                
                // Áp dụng cài đặt giao diện
                applyUserSettings(currentUserData.settings);

                // KHỞI CHẠY CÁC MODULE CON
                initWorkModule(currentUserData, user);
                initStudyModule(currentUserData, user);
                initAdminModule(user); // Kích hoạt Admin nếu đúng email
                
                // Khởi tạo điều hướng & Modal
                setupNavigation();
                setupAllModals();
                setupSettings(user);
                
                showNotification(`Chào mừng trở lại, ${user.displayName}!`);
            } catch (error) {
                console.error(error);
                showNotification('Lỗi tải dữ liệu: ' + error.message, 'error');
            } finally {
                toggleLoading(false);
            }

        } else {
            console.log("User chưa đăng nhập");
            document.getElementById('login-container').style.display = 'flex';
            document.getElementById('app-container').style.display = 'none';
            currentUserData = null;
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
    
    const btnLoginSubmit = document.querySelector('.btn-login-submit');
    if (btnLoginSubmit) {
        btnLoginSubmit.addEventListener('click', () => {
            alert("Vui lòng sử dụng nút Đăng nhập bằng Google ở dưới.");
        });
    }

    // 3. SỰ KIỆN NÚT GOOGLE LOGIN
    document.getElementById('btn-login-google').addEventListener('click', async () => {
        try {
            await loginWithGoogle();
        } catch (error) {
            const errEl = document.getElementById('login-error');
            errEl.textContent = "Đăng nhập thất bại: " + error.message;
            errEl.style.display = 'block';
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

// --- 3. HÀM ĐIỀU HƯỚNG (NAVIGATION) ---
function setupNavigation() {
    // A. Click nút Tab
    const buttons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.content-section');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            if (!targetId) return; 

            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            sections.forEach(sec => sec.classList.remove('active'));
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('active');
        });
    });

    // B. Click nhóm Menu (Accordion)
    const groupToggles = document.querySelectorAll('.nav-group-toggle');
    groupToggles.forEach(toggle => {
        // Xóa event cũ để tránh duplicate nếu gọi lại
        const newToggle = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(newToggle, toggle);
        
        newToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const parentGroup = newToggle.parentElement;
            parentGroup.classList.toggle('open');
        });
    });
}

// --- 4. CÀI ĐẶT HỆ THỐNG (SETTINGS) ---
function setupSettings(user) {
    // Dark Mode
    const darkModeToggle = document.getElementById('toggle-dark-mode');
    if(darkModeToggle) {
        darkModeToggle.checked = currentUserData.settings?.darkMode || false;
        darkModeToggle.addEventListener('change', (e) => {
            const isDark = e.target.checked;
            document.body.classList.toggle('dark-mode', isDark);
            saveSettings({ darkMode: isDark }, user);
        });
    }

    // Colors
    const bluePicker = document.getElementById('color-picker-blue');
    const orangePicker = document.getElementById('color-picker-orange');

    if(bluePicker) {
        bluePicker.value = currentUserData.settings?.primaryColor || '#005B96';
        bluePicker.addEventListener('change', (e) => {
            document.documentElement.style.setProperty('--custom-primary-blue', e.target.value);
            saveSettings({ primaryColor: e.target.value }, user);
        });
    }

    if(orangePicker) {
        orangePicker.value = currentUserData.settings?.secondaryColor || '#FF7A00';
        orangePicker.addEventListener('change', (e) => {
            document.documentElement.style.setProperty('--custom-primary-orange', e.target.value);
            saveSettings({ secondaryColor: e.target.value }, user);
        });
    }

    const btnReset = document.getElementById('btn-reset-colors');
    if(btnReset) {
        btnReset.addEventListener('click', () => {
            document.documentElement.style.setProperty('--custom-primary-blue', '#005B96');
            document.documentElement.style.setProperty('--custom-primary-orange', '#FF7A00');
            if(bluePicker) bluePicker.value = '#005B96';
            if(orangePicker) orangePicker.value = '#FF7A00';
            saveSettings({ primaryColor: '#005B96', secondaryColor: '#FF7A00' }, user);
            showNotification('Đã khôi phục màu mặc định');
        });
    }

    // Upload Avatar
    const fileInput = document.getElementById('profile-pic-input');
    if(fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                showNotification('Đang cập nhật ảnh...', 'info');
                try {
                    const res = await uploadFileToStorage(file, `avatars/${user.uid}`);
                    document.getElementById('sidebar-profile-pic').src = res.url;
                    document.getElementById('settings-profile-preview').src = res.url;
                    saveSettings({ customAvatarUrl: res.url }, user);
                    showNotification('Cập nhật ảnh thành công!');
                } catch (err) {
                    showNotification('Lỗi: ' + err.message, 'error');
                }
            }
        });
    }

    // Xóa dữ liệu
    const btnClear = document.getElementById('btn-clear-data');
    if(btnClear) {
        btnClear.addEventListener('click', async () => {
            if(confirm("CẢNH BÁO: Xóa sạch dữ liệu?")) {
                await saveUserData(user.uid, DEFAULT_DATA);
                location.reload();
            }
        });
    }

    // Export Data
    const btnExport = document.getElementById('btn-export-data');
    if(btnExport) {
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

    // Import Data
    const importInput = document.getElementById('import-file-input');
    const btnImport = document.getElementById('btn-import-data');
    if (btnImport && importInput) {
        btnImport.addEventListener('click', () => importInput.click());
        
        // Xóa event cũ bằng cách clone node (tránh gán nhiều lần)
        const newImportInput = importInput.cloneNode(true);
        importInput.parentNode.replaceChild(newImportInput, importInput);
        
        newImportInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (confirm("Dữ liệu từ file sẽ được GỘP vào dữ liệu hiện tại. Tiếp tục?")) {
                        toggleLoading(true);
                        await saveUserData(user.uid, data);
                        showNotification("Nhập dữ liệu thành công! Đang tải lại...");
                        setTimeout(() => location.reload(), 1500);
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

function applyUserSettings(settings) {
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

    // Thêm kiểm tra null để tránh lỗi nếu element chưa render
    document.getElementById('sv5t-panel-close-btn')?.addEventListener('click', closeSidePanels);
    document.getElementById('sv5t-panel-overlay')?.addEventListener('click', closeSidePanels);
    document.getElementById('outline-node-panel-close-btn')?.addEventListener('click', closeSidePanels);
    document.getElementById('outline-node-panel-overlay')?.addEventListener('click', closeSidePanels);
}
// --- LOGIC QUẢN LÝ HỒ SƠ (PROFILE) ---

// 1. Hàm đổ dữ liệu từ Firebase vào ô input khi mới vào
function loadProfileDataToForm() {
    if (!currentUserData || !currentUserData.personalInfo) return;
    
    const info = currentUserData.personalInfo;
    
    // Thông tin cơ bản
    document.getElementById('pi-fullname').value = info.fullName || '';
    document.getElementById('pi-email').value = info.email || '';
    document.getElementById('pi-phone').value = info.phone || '';
    document.getElementById('pi-occupation').value = info.occupation || '';

    // Thông tin Portfolio (Chip)
    document.getElementById('pf-school').value = info.school || '';
    document.getElementById('pf-award').value = info.award || '';
    document.getElementById('pf-role').value = info.role || '';
    document.getElementById('pf-location').value = info.location || '';
}

// --- LOGIC LƯU HỒ SƠ (DÁN VÀO CUỐI FILE, CHỈ 1 LẦN) ---
const btnSaveProfile = document.getElementById('btn-save-profile');

if (btnSaveProfile) {
    btnSaveProfile.addEventListener('click', async () => {
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

            // Kiểm tra biến firebase toàn cục hoặc import
            // Giả sử bạn đã import saveUserData ở đầu file
            if (currentUserData) { 
                // Lưu ý: Dòng này cần đảm bảo bạn đã import saveUserData và user đang login
                // Nếu biến 'user' không có sẵn ở scope này, ta dùng logic tạm này:
                 import('./firebase.js').then(async (module) => {
                    const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
                    const auth = getAuth();
                    if(auth.currentUser) {
                        await module.saveUserData(auth.currentUser.uid, { personalInfo: updatedInfo });
                        // Gọi hàm thông báo từ common nếu có
                        alert("Đã cập nhật hồ sơ thành công!"); 
                    }
                });
            }

        } catch (error) {
            console.error(error);
            alert("Lỗi: " + error.message);
        } finally {
            btnSaveProfile.innerText = originalText;
            btnSaveProfile.disabled = false;
        }
    });
}


// Gọi hàm load dữ liệu mỗi khi vào (Thêm dòng này vào chỗ subscribeToAuthChanges trong main.js nếu muốn chuẩn, hoặc để cuối file nó tự chạy nếu biến currentUserData đã có)
// Tuy nhiên, cách tốt nhất là thêm dòng này vào bên trong subscribeToAuthChanges, ngay sau khi tải data xong:
// loadProfileDataToForm();
