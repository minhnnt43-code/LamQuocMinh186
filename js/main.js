// --- FILE: js/main.js (FINAL FIXED VERSION) ---

import { 
    loginWithGoogle, logoutUser, subscribeToAuthChanges, 
    getUserData, saveUserData, uploadFileToStorage 
} from './firebase.js';

import { 
    toggleLoading, showNotification, setupModal, convertDriveLink 
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
            
            let photoURL = user.photoURL;
            
            // Tải dữ liệu từ Firebase
            try {
                const data = await getUserData(user.uid);
                currentUserData = data ? data : JSON.parse(JSON.stringify(DEFAULT_DATA));

                // Nếu đã có ảnh custom thì dùng
                if (currentUserData.settings && currentUserData.settings.customAvatarUrl) {
                    photoURL = currentUserData.settings.customAvatarUrl;
                }

                document.getElementById('sidebar-profile-pic').src = photoURL || "https://placehold.co/80x80/FFFFFF/005B96?text=User";
                
                const settingsPreview = document.getElementById('settings-profile-preview');
                if(settingsPreview) settingsPreview.src = photoURL;

                // Tự động đồng bộ thông tin cá nhân
                if (!currentUserData.personalInfo) currentUserData.personalInfo = {};
                currentUserData.personalInfo.fullName = user.displayName;
                currentUserData.personalInfo.email = user.email;
                
                if (!currentUserData.settings) currentUserData.settings = {};
                
                saveUserData(user.uid, { 
                    personalInfo: currentUserData.personalInfo,
                    settings: currentUserData.settings,
                    email: user.email 
                });
                
                applyUserSettings(currentUserData.settings);

                // Khởi chạy các module
                initWorkModule(currentUserData, user);
                initStudyModule(currentUserData, user);
                initAdminModule(user); 
                
                setupNavigation();
                setupAllModals();
                setupSettings(user);
                loadProfileDataToForm();
                
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

    // 3. SỰ KIỆN NÚT GOOGLE LOGIN (ĐÃ SỬA LỖI BẤM NHIỀU LẦN)
    const btnGoogle = document.getElementById('btn-login-google');
    if (btnGoogle) {
        btnGoogle.addEventListener('click', async () => {
            // Khóa nút lại ngay lập tức
            btnGoogle.disabled = true;
            btnGoogle.style.opacity = "0.6";
            btnGoogle.style.cursor = "not-allowed";
            
            // Lưu text cũ để khôi phục nếu lỗi
            const originalText = btnGoogle.innerHTML;
            
            try {
                await loginWithGoogle();
                // Nếu thành công, trang sẽ tự chuyển, không cần mở lại nút
            } catch (error) {
                const errEl = document.getElementById('login-error');
                
                // Xử lý thông báo lỗi thân thiện hơn
                if (error.code === 'auth/cancelled-popup-request' || error.message.includes('cancelled')) {
                    errEl.textContent = "Đăng nhập bị hủy. Vui lòng thử lại.";
                } else if (error.code === 'auth/popup-closed-by-user') {
                    errEl.textContent = "Bạn đã đóng cửa sổ đăng nhập.";
                } else {
                    errEl.textContent = "Lỗi: " + error.message;
                }
                errEl.style.display = 'block';

                // Mở lại nút để bấm lại
                btnGoogle.disabled = false;
                btnGoogle.style.opacity = "1";
                btnGoogle.style.cursor = "pointer";
                btnGoogle.innerHTML = originalText;
            }
        });
    }

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

    // --- XỬ LÝ AVATAR (LINK DRIVE) ---
    const btnSaveAvatar = document.getElementById('btn-save-avatar');
    if (btnSaveAvatar) {
        btnSaveAvatar.addEventListener('click', async () => {
            const linkInput = document.getElementById('profile-pic-link');
            const rawLink = linkInput.value.trim();

            if (!rawLink) return showNotification('Vui lòng dán link ảnh!', 'error');

            // Convert link Drive sang link ảnh trực tiếp
            const directLink = convertDriveLink(rawLink);

            // Cập nhật giao diện ngay lập tức
            document.getElementById('sidebar-profile-pic').src = directLink;
            const preview = document.getElementById('settings-profile-preview');
            if (preview) preview.src = directLink;

            // Lưu vào Firebase
            await saveSettings({ customAvatarUrl: directLink }, user);
            showNotification('Đã cập nhật ảnh đại diện!');
            linkInput.value = ''; 
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

    document.getElementById('sv5t-panel-close-btn')?.addEventListener('click', closeSidePanels);
    document.getElementById('sv5t-panel-overlay')?.addEventListener('click', closeSidePanels);
    document.getElementById('outline-node-panel-close-btn')?.addEventListener('click', closeSidePanels);
    document.getElementById('outline-node-panel-overlay')?.addEventListener('click', closeSidePanels);
}

// --- LOGIC QUẢN LÝ HỒ SƠ (PROFILE) ---
function loadProfileDataToForm() {
    if (!currentUserData || !currentUserData.personalInfo) return;
    
    const info = currentUserData.personalInfo;
    
    document.getElementById('pi-fullname').value = info.fullName || '';
    document.getElementById('pi-email').value = info.email || '';
    document.getElementById('pi-phone').value = info.phone || '';
    document.getElementById('pi-occupation').value = info.occupation || '';

    document.getElementById('pf-school').value = info.school || '';
    document.getElementById('pf-award').value = info.award || '';
    document.getElementById('pf-role').value = info.role || '';
    document.getElementById('pf-location').value = info.location || '';
}

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

            if (currentUserData) { 
                 import('./firebase.js').then(async (module) => {
                    const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
                    const auth = getAuth();
                    if(auth.currentUser) {
                        await module.saveUserData(auth.currentUser.uid, { personalInfo: updatedInfo });
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
