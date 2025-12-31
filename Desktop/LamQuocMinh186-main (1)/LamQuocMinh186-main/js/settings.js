// --- FILE: js/settings.js ---
import { saveUserData } from './api.js';
import { showNotification, toggleLoading } from './common.js';

// Dữ liệu mặc định (để dùng khi reset hoặc clear data)
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

export function setupSettings(user, currentUserData) {
    // A. Dark Mode
    const darkModeToggle = document.getElementById('toggle-dark-mode');
    if (darkModeToggle) {
        darkModeToggle.checked = currentUserData.settings?.darkMode || false;
        darkModeToggle.addEventListener('change', (e) => {
            const isDark = e.target.checked;
            document.body.classList.toggle('dark-mode', isDark);
            saveSettings({ darkMode: isDark }, user, currentUserData);
        });
    }

    // B. Màu sắc
    const bluePicker = document.getElementById('color-picker-blue');
    const orangePicker = document.getElementById('color-picker-orange');

    if (bluePicker) {
        bluePicker.value = currentUserData.settings?.primaryColor || '#005B96';
        bluePicker.addEventListener('change', (e) => {
            document.documentElement.style.setProperty('--custom-primary-blue', e.target.value);
            saveSettings({ primaryColor: e.target.value }, user, currentUserData);
        });
    }

    if (orangePicker) {
        orangePicker.value = currentUserData.settings?.secondaryColor || '#FF7A00';
        orangePicker.addEventListener('change', (e) => {
            document.documentElement.style.setProperty('--custom-primary-orange', e.target.value);
            saveSettings({ secondaryColor: e.target.value }, user, currentUserData);
        });
    }

    const btnReset = document.getElementById('btn-reset-colors');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            document.documentElement.style.setProperty('--custom-primary-blue', '#005B96');
            document.documentElement.style.setProperty('--custom-primary-orange', '#FF7A00');
            if (bluePicker) bluePicker.value = '#005B96';
            if (orangePicker) orangePicker.value = '#FF7A00';
            saveSettings({ primaryColor: '#005B96', secondaryColor: '#FF7A00' }, user, currentUserData);
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

            const directLink = rawLink;

            const sidebarPic = document.getElementById('sidebar-profile-pic');
            if (sidebarPic) sidebarPic.src = directLink;

            const preview = document.getElementById('settings-profile-preview');
            if (preview) preview.src = directLink;

            await saveSettings({ customAvatarUrl: directLink }, user, currentUserData);
            showNotification('Đã cập nhật ảnh đại diện!');
            linkInput.value = '';
        });
    }

    // D. Xóa dữ liệu (GIỮ LẠI AI Power Hub settings + TỰ ĐỘNG XUẤT BACKUP)
    const btnClear = document.getElementById('btn-clear-data');
    if (btnClear) {
        btnClear.addEventListener('click', async () => {
            if (confirm("CẢNH BÁO: Xóa sạch dữ liệu? (Tự động tải backup trước khi xóa)")) {
                // 1. TỰ ĐỘNG XUẤT DỮ LIỆU TRƯỚC KHI XÓA
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentUserData));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", `backup_before_clear_${timestamp}.json`);
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();

                showNotification('📥 Đã tải backup! Đang xóa dữ liệu...');

                // 2. Đợi 1 giây để download hoàn tất
                await new Promise(resolve => setTimeout(resolve, 1000));

                toggleLoading(true);

                // 3. Preserve AI Power Hub settings
                const aiPowerHub = currentUserData.aiPowerHub || null;

                // 4. Reset to default but keep AI settings
                const newData = {
                    ...DEFAULT_DATA,
                    aiPowerHub: aiPowerHub // Preserve AI API keys
                };

                await saveUserData(user.uid, newData);
                showNotification('✅ Đã xóa dữ liệu (giữ lại AI settings)');
                setTimeout(() => location.reload(), 1000);
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
    if (btnImport) {
        // Tạo input file ẩn nếu chưa có (mặc dù HTML có thể chưa có, ta tạo động hoặc giả định HTML có sẵn)
        // Trong code cũ: const importInput = document.getElementById('import-file-input');
        // Nếu HTML không có sẵn input này, ta cần tạo nó hoặc dùng input có sẵn.
        // Dựa vào code cũ, có vẻ input này được mong đợi tồn tại.
        // Tuy nhiên, để chắc chắn, ta sẽ kiểm tra lại HTML hoặc tạo động.
        // Ở đây ta giả định HTML có sẵn hoặc ta dùng logic click() vào input ẩn.

        // Nếu importInput null, ta tạo nó
        let fileInput = importInput;
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'import-file-input';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
        }

        btnImport.addEventListener('click', () => fileInput.click());

        // Clone để xóa event listener cũ nếu có
        const newImportInput = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newImportInput, fileInput);

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

export async function saveSettings(newSettings, user, currentUserData) {
    if (!currentUserData.settings) currentUserData.settings = {};
    currentUserData.settings = { ...currentUserData.settings, ...newSettings };
    await saveUserData(user.uid, { settings: currentUserData.settings });
}

export function applyUserSettings(settings, user) {
    if (!settings) return;
    if (settings.darkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    if (settings.primaryColor) document.documentElement.style.setProperty('--custom-primary-blue', settings.primaryColor);
    if (settings.secondaryColor) document.documentElement.style.setProperty('--custom-primary-orange', settings.secondaryColor);
}
