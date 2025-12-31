// --- FILE: js/main.js ---
// [ĐÃ CHUYỂN ĐỔI] Từ Firebase sang PHP + MySQL Backend

import {
    loginWithGoogle, logoutUser, subscribeToAuthChanges,
    getUserData, saveUserData, auth, loginWithEmail, registerWithEmail, checkAuthStatus
} from './api.js'; // [ĐÃ ĐỔI] Dùng PHP API thay vì Firebase

import {
    toggleLoading, showNotification
} from './common.js';

import { initWorkModule } from './work.js';
import { initStudyModule } from './study.js';
// [DISABLED - PHP MODE] Admin module cần Firebase Firestore trực tiếp
// import { initAdminModule } from './admin.js';
const initAdminModule = async () => console.log('⚠️ Admin module disabled (PHP mode)');

// [MỚI] Import các module đã tách
import { setupNavigation } from './navigation.js';
import { setupSettings, applyUserSettings } from './settings.js';
import { setupAllModals } from './modals.js';
import { loadProfileDataToForm, setupProfileListeners } from './profile.js';

// [MỚI] Import AI modules
import { setupAISettings } from './ai-settings.js';
// import { initAITasks } from './ai-tasks.js'; // [XÓA] Dùng ai-tasks-lite thay thế
import { initAIStudy, setupStudyAssistantEvents } from './ai-study.js';
import { initAICalendar } from './ai-calendar.js';
import { initAIWriting } from './ai-writing.js';
import { initAIAnalytics } from './ai-analytics.js';
import { initAIChatbot } from './ai-chatbot.js';

import { initEmailAuth } from './auth-email.js';
// [DISABLED - PHP MODE] import { fetchGlobalKeys } from './ai-config.js';
// [DISABLED - PHP MODE] import './firebase-sync.js';
// [DISABLED] import './laso.js'; // Lá Số - Tử Vi / Bát Tự / Thần Số Học

// [MỚI] Phase D, H, J modules
import { initAIAutomation } from './ai-automation.js';
import { initAIEvents } from './ai-events.js';
import { initUIEnhancements } from './ui-enhancements.js';
import { initCalendarViews } from './calendar-views.js'; // Phase C
import { initAdvancedFeatures } from './advanced-features.js'; // 3 features cuối
import { initDashboardToolbar } from './dashboard-toolbar.js'; // AI Mega Toolbar
// [DISABLED] import { initLifestyleModule } from './lifestyle.js'; // Lifestyle: Journal, Habits, Goals, Finance, Productivity
import { initDashboardWidgets } from './dashboard-widgets.js'; // Dashboard Widgets
import { initAITasksLite } from './ai-tasks-lite.js'; // AI Task buttons (LITE version)
import { initChatbotWeekly } from './chatbot-weekly.js'; // [MỚI] Chatbot Lập kế hoạch Tuần
import { initTaskAnalytics } from './ai-task-analytics.js'; // [MỚI] Phase 3: Phân tích công việc
import { initProductivity } from './ai-productivity.js'; // Phase 4: Năng suất
import { initCommunication } from './ai-communication.js'; // Phase 5: Giao tiếp
import { initDataAnalytics } from './ai-data-analytics.js'; // [MỚI] Phase 6: Dữ liệu & Thống kê
import { initAutomationEngine } from './ai-automation-engine.js'; // [MỚI] Phase 7: Tự động hóa
import { initAdvancedAI } from './ai-advanced.js'; // [MỚI] Phase 8: Nâng cao
import { initAIPowerHub, renderPowerHubDashboard } from './ai-power-hub.js'; // [MỚI] AI Power Hub
import { initAIOnboarding } from './ai-onboarding.js'; // AI Onboarding Chatbot
import { initLifeOS } from './lifeos-meta.js'; // LifeOS Phase 12 - Phân tích Siêu cấp
import { initTemporal } from './lifeos-temporal.js'; // LifeOS Phase 9 - Trí tuệ Thời gian
import { initCreative } from './lifeos-creative.js'; // LifeOS Phase 10 - Dòng chảy Sáng tạo
import { initHyperAuto } from './lifeos-hyperauto.js'; // LifeOS Phase 11 - Siêu Tự động hóa
import { updateAllBadges } from './sidebar-badges.js'; // [MỚI] Sidebar badges management

// [MỚI] 44 Smart Features - Phase 1, 2, 3
import { initSmartFeatures } from './smart-features.js';
import { initAdvancedSmartFeatures } from './smart-features-advanced.js';
import { initSmartCalendar } from './smart-calendar.js';
import { initSmartFocus } from './smart-focus.js';
import { initSmartAIHub } from './smart-ai-hub.js';

// [MỚI] AI Phase 1 - 2026 Upgrade (25 features)
import { initAIPhase1, onTaskCompleted as aiPhase1OnTaskCompleted } from './ai-phase1.js';

// Dữ liệu mặc định cho tài khoản mới tinh (tránh lỗi null)
const DEFAULT_DATA = {
    tasks: [],
    todos: [],
    todoGroups: [], // [MỚI] To-do Groups
    projects: [],
    documents: [],
    achievements: [],
    studentJourney: {},
    drafts: [],
    outlines: [],
    calendarEvents: [],
    personalInfo: {},
    // [MỚI] Lifestyle data
    journal: [],
    habits: [],
    goals: [],
    transactions: [],
    productivityLog: [],
    healthLog: [],
    horoscopeSettings: {},
    settings: {
        darkMode: false,
        primaryColor: '#005B96',
        secondaryColor: '#FF7A00',
        customAvatarUrl: ''
    }
};

let currentUserData = null;

// ============================================================
// [REFACTORED] Các hàm helper cho auth flow - Tuân thủ SRP
// ============================================================

/**
 * Thiết lập UI cho user đã đăng nhập
 */
const setupUserUI = (user, userData) => {
    // Ẩn màn hình Login, Hiện màn hình App
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';

    // Hiển thị tên User lên Sidebar
    document.getElementById('sidebar-user-name').textContent = user.displayName;

    // Xử lý Avatar
    let photoURL = user.photoURL;
    if (userData.settings && userData.settings.customAvatarUrl) {
        photoURL = userData.settings.customAvatarUrl;
    }

    const sidebarPic = document.getElementById('sidebar-profile-pic');
    if (sidebarPic) sidebarPic.src = photoURL;

    const settingsPreview = document.getElementById('settings-profile-preview');
    if (settingsPreview) settingsPreview.src = photoURL;
};

/**
 * Load và đồng bộ dữ liệu user từ Firebase
 */
const loadAndSyncUserData = async (user) => {
    const data = await getUserData(user.uid);
    const userData = data ? data : JSON.parse(JSON.stringify(DEFAULT_DATA));

    // [AUTO-MIGRATION] Chuyển đổi legacy field names: title→name, deadline→dueDate, etc.
    if (userData.tasks && Array.isArray(userData.tasks)) {
        const needsMigration = userData.tasks.some(t =>
            t.title !== undefined ||
            t.deadline !== undefined ||
            t.description !== undefined ||
            t.status === 'pending' ||
            t.completed !== undefined
        );

        if (needsMigration) {
            console.log('🔄 Auto-migrating legacy task data...');
            userData.tasks = userData.tasks.map(task => {
                const migrated = { ...task };

                // title → name
                if (task.title && !task.name) {
                    migrated.name = task.title;
                    delete migrated.title;
                }

                // deadline → dueDate
                if (task.deadline && !task.dueDate) {
                    migrated.dueDate = task.deadline;
                    delete migrated.deadline;
                }

                // description → notes
                if (task.description !== undefined && task.notes === undefined) {
                    migrated.notes = task.description || '';
                    delete migrated.description;
                }

                // completed: true → status: 'Hoàn thành'
                if (task.completed === true && !task.status) {
                    migrated.status = 'Hoàn thành';
                    delete migrated.completed;
                }

                // status: 'pending' → 'Chưa thực hiện'
                if (task.status === 'pending') {
                    migrated.status = 'Chưa thực hiện';
                }

                return migrated;
            });

            // Lưu data đã migrate vào Firebase
            console.log('💾 Saving migrated tasks to Firebase...');
            saveUserData(user.uid, { tasks: userData.tasks });
            console.log('✅ Migration completed!');
        }
    }

    // [DISABLED - PHP MODE] Load shared API keys đã tắt vì không dùng Firebase
    // await fetchGlobalKeys();
    console.log('✅ PHP Mode - Không cần load Firebase global keys');

    // Đồng bộ thông tin cơ bản
    if (!userData.personalInfo) userData.personalInfo = {};
    userData.email = user.email;

    // [WARNING] Không clean data - chỉ log để debug
    const invalidTasks = (userData.tasks || []).filter(t => !t || !t.name);
    if (invalidTasks.length > 0) {
        console.warn(`⚠️ Có ${invalidTasks.length} tasks thiếu tên - cần kiểm tra nguồn lỗi`);
        console.warn('Invalid tasks:', invalidTasks);
    }

    // Lưu lại email mới nhất
    saveUserData(user.uid, {
        email: user.email,
        'personalInfo.email': user.email
    });

    return userData;
};

/**
 * Khởi tạo các module chính (Work, Study, Admin)
 */
const initCoreModules = async (user, userData) => {
    await initAdminModule(user);
    initWorkModule(userData, user);
    initStudyModule(userData, user);

    // UI chung
    setupNavigation();
    setupAllModals();
    setupSettings(user, userData);
    loadProfileDataToForm(userData);
    setupProfileListeners(userData);
};

/**
 * Khởi tạo các module AI
 */
const initAIModules = async (userData, user) => {
    setupAISettings();
    initAIStudy();
    setupStudyAssistantEvents();
    initAICalendar(userData, user);
    initAIWriting();
    initAIAnalytics(userData, user);
    initAIChatbot(userData, user);
    initAIAutomation(userData, user);
    initAIEvents(userData, user);
    initAITasksLite(userData, user);
    initChatbotWeekly(userData, user);
    initTaskAnalytics(userData, user);
    initProductivity(userData, user);
    initCommunication(userData, user);
    initDataAnalytics(userData, user);
    initAutomationEngine(userData, user);
    initAdvancedAI(userData, user);
    initAIPowerHub();
    initAIOnboarding();
    initLifeOS(userData, user);
    initTemporal(userData, user);
    initCreative(userData, user);
    initHyperAuto(userData, user);

    // [MỚI] AI Phase 1 - 2026 Upgrade (25 features)
    try {
        await initAIPhase1();
        console.log('✅ AI Phase 1 (2026) initialized');
    } catch (error) {
        console.warn('⚠️ AI Phase 1 init error:', error);
    }
};

/**
 * Khởi tạo các module UI nâng cao
 */
const initUIModules = (userData, user) => {
    initUIEnhancements();
    initCalendarViews(userData, user);
    initAdvancedFeatures();
    initDashboardToolbar(userData, user);
    // [DISABLED] initLifestyleModule(userData, user);
    initDashboardWidgets(userData, user);

    // [MỚI] 44 Smart Features
    initSmartFeatures(userData, user);
    initAdvancedSmartFeatures(userData, user);
    initSmartCalendar(userData, user);
    initSmartFocus(userData, user);
    initSmartAIHub();
};

/**
 * Xử lý khi user đăng nhập thành công
 */
const handleUserSignIn = async (user) => {
    console.log("User đã đăng nhập:", user.email);
    toggleLoading(true);

    // Cơ chế an toàn: Tự tắt Loading sau 5 giây
    const safetyTimer = setTimeout(() => toggleLoading(false), 5000);

    try {
        // 1. Load dữ liệu
        currentUserData = await loadAndSyncUserData(user);

        // 2. Setup UI
        setupUserUI(user, currentUserData);

        // 3. Áp dụng cài đặt giao diện
        applyUserSettings(currentUserData.settings, user);

        // 4. Khởi tạo các module
        await initCoreModules(user, currentUserData);
        await initAIModules(currentUserData, user);
        initUIModules(currentUserData, user);

        // 5. Update badges và thông báo
        updateAllBadges(currentUserData);
        showNotification(`Chào mừng trở lại, ${user.displayName}!`);

    } catch (error) {
        console.error(error);
        showNotification('Lỗi tải dữ liệu: ' + error.message, 'error');
    } finally {
        clearTimeout(safetyTimer);
        toggleLoading(false);
    }
};

/**
 * Xử lý khi user đăng xuất
 */
const handleUserSignOut = () => {
    console.log("User chưa đăng nhập");
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    currentUserData = null;
    toggleLoading(false);
};

// ============================================================
// MAIN INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- BẮT ĐẦU ĐỒNG HỒ THỜI GIAN THỰC ---
    startRealTimeClock();

    // [MỚI] INIT EMAIL AUTH
    initEmailAuth();

    // 1. LẮNG NGHE TRẠNG THÁI ĐĂNG NHẬP (REFACTORED)
    subscribeToAuthChanges(async (user) => {
        if (user) {
            await handleUserSignIn(user);
        } else {
            handleUserSignOut();
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