// --- FILE: js/profile.js ---
import { saveUserData, auth } from './firebase.js';
import { showNotification } from './common.js';

export function loadProfileDataToForm(currentUserData) {
    if (!currentUserData || !currentUserData.personalInfo) return;
    const info = currentUserData.personalInfo;

    const safeSet = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ''; };

    safeSet('pi-fullname', info.fullName);
    safeSet('pi-email', info.email);
    safeSet('pi-phone', info.phone);
    safeSet('pi-occupation', info.occupation);
    safeSet('pf-school', info.school);
    safeSet('pf-award', info.award);
    safeSet('pf-role', info.role);
    safeSet('pf-location', info.location);
}

export function setupProfileListeners(currentUserData) {
    const btnSaveProfile = document.getElementById('btn-save-profile');
    if (btnSaveProfile) {
        // Clone để xóa listener cũ
        const newBtn = btnSaveProfile.cloneNode(true);
        btnSaveProfile.parentNode.replaceChild(newBtn, btnSaveProfile);

        newBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user) return;

            const originalText = newBtn.innerText;
            newBtn.innerText = "Đang lưu...";
            newBtn.disabled = true;

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
                newBtn.innerText = originalText;
                newBtn.disabled = false;
            }
        });
    }
}
