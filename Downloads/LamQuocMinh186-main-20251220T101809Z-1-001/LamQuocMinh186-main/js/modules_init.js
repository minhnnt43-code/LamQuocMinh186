// ============================================================
// FILE: js/modules_init.js
// Mục đích: Khởi tạo tất cả modules mới (Phase 2-4)
// ============================================================

// Import các modules
import { KanbanBoard, toggleView, loadViewPreference } from './kanban.js';
import { trackerManager, TimeAnalytics } from './time_tracker.js';
import { autoColorCode, detectConflicts, injectCalendarStyles } from './smart_calendar.js';
import { setupDropZone, injectFileUploadStyles, createDropZoneHTML } from './file_upload.js';
import { calculateSV5TScores, renderBarChart, renderScoreCard, injectSV5TStyles } from './sv5t_charts.js';
import { bookingManager, renderBookingSettings, renderBookingRequests, setupBookingFilters } from './booking.js';
import { notificationManager, renderNotificationCenter, renderNotificationBadge } from './notifications.js';
import { showNotification } from './common.js';

// Store references globally
let kanbanBoard = null;

/**
 * Initialize all new modules
 */
export function initNewModules(userData, user) {
    console.log('🚀 Initializing Phase 2-4 Modules...');

    try {
        // Inject CSS styles
        injectCalendarStyles();
        injectFileUploadStyles();
        injectSV5TStyles();

        // Initialize Kanban Board
        initKanbanBoard(userData);

        // Initialize Time Tracker (already auto-restores from localStorage)
        initTimeTrackerUI();

        // Initialize SV5T Charts if container exists
        initSV5TCharts(userData);

        // Initialize Resolutions Library


        // Initialize Booking
        initBookingManager(userData);

        // Initialize Notifications
        initNotificationCenter();

        // Setup sidebar menu items for new sections
        // (Functionality moved to static HTML to prevent duplicates)

        console.log('✅ All Phase 2-4 Modules initialized!');

    } catch (error) {
        console.error('Error initializing new modules:', error);
    }
}

/**
 * Initialize Kanban Board
 */
function initKanbanBoard(userData) {
    // 1. Tìm container trong HTML tĩnh trước
    let container = document.getElementById('kanban-board-container');

    // 2. Nếu chưa có (nghĩa là section chưa render?), thử tìm section tĩnh
    if (!container) {
        // Thử tìm trong section static
        const staticSection = document.getElementById('kanban-board');
        if (staticSection) {
            container = staticSection.querySelector('.kanban-board');
            if (!container) {
                // Nếu section có nhưng chưa có board, tạo container vào đó
                container = document.createElement('div');
                container.id = 'kanban-board-container';
                staticSection.appendChild(container);
            }
        }
    }

    if (!container) {
        console.log('Kanban container not found, creating dynamic section...');
        createKanbanSection();
        container = document.getElementById('kanban-board-container');
    }

    const tasks = userData?.tasks || [];
    kanbanBoard = new KanbanBoard(tasks, (updatedTask) => {
        console.log('Task updated:', updatedTask.title);
    });

    // [FIX] Render the board immediately
    kanbanBoard.render('kanban-board-container');

    // Load user's view preference
    loadViewPreference();
}

/**
 * Create Kanban section in HTML
 */
function createKanbanSection() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // Check if section already exists
    if (document.getElementById('kanban-section')) return;

    const section = document.createElement('section');
    section.id = 'kanban-section';
    section.className = 'content-section';
    section.style.display = 'none';
    section.innerHTML = `
        <h1>📋 Kanban Board</h1>
        <p style="color:var(--text-secondary); margin-bottom:20px;">
            Quản lý tiến độ công việc với giao diện kéo thả trực quan
        </p>
        
        <div class="view-toggle" style="margin-bottom:20px;">
            <button id="btn-view-list" class="btn-toggle">📝 List View</button>
            <button id="btn-view-kanban" class="btn-toggle active">📋 Kanban View</button>
        </div>
        
        <div id="tasks-list-view" style="display:none;">
            <!-- List view content -->
        </div>
        
        <div id="tasks-kanban-view">
            <div id="kanban-board-container"></div>
        </div>
    `;

    mainContent.appendChild(section);

    // Setup toggle buttons
    document.getElementById('btn-view-list')?.addEventListener('click', () => toggleView('list'));
    document.getElementById('btn-view-kanban')?.addEventListener('click', () => toggleView('kanban'));
}

/**
 * Initialize Time Tracker UI
 */
function initTimeTrackerUI() {
    // Time tracker is task-specific, initialized when viewing a task
    console.log('⏱️ Time Tracker ready');
}

/**
 * Initialize SV5T Charts
 */
function initSV5TCharts(userData) {
    const barContainer = document.getElementById('sv5t-bar-chart');
    const scoreContainer = document.getElementById('sv5t-score-card');

    if (barContainer || scoreContainer) {
        const activities = userData?.tasks || [];
        const scores = calculateSV5TScores(activities);

        if (barContainer) renderBarChart('sv5t-bar-chart', scores);
        if (scoreContainer) renderScoreCard('sv5t-score-card', scores);
    }
}





/**
 * Initialize Booking Manager
 */
function initBookingManager(userData) {
    // Load saved data
    // Load saved data
    if (userData?.bookings) {
        // [FIX] Ensure bookings is an array (Firebase returns object for lists sometimes)
        if (Array.isArray(userData.bookings)) {
            bookingManager.bookings = userData.bookings;
        } else if (typeof userData.bookings === 'object') {
            bookingManager.bookings = Object.values(userData.bookings);
        } else {
            bookingManager.bookings = [];
        }
    }
    if (userData?.bookingSettings) {
        bookingManager.updateSettings(userData.bookingSettings);
    }

    // Render settings UI
    const settingsContainer = document.getElementById('booking-settings-container');
    if (settingsContainer) {
        renderBookingSettings('booking-settings-container', bookingManager.settings, (newSettings) => {
            bookingManager.updateSettings(newSettings);
        });
    }

    // Setup Filters
    setupBookingFilters();

    // Initial Render of Pending Requests (Local Data First)
    const requestsContainer = document.getElementById('booking-list-container');
    if (requestsContainer) {
        renderBookingRequests('booking-list-container', bookingManager.bookings, 'pending');

        // [NEW] Sync with Firestore External Requests & Re-render
        bookingManager.syncRequests().then(() => {
            console.log("🔄 Re-rendering bookings after sync...");
            // Kiểm tra tab nào đang active để filter đúng
            const activeFilterBtn = document.querySelector('.filter-btn.active');
            const filter = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'pending';
            renderBookingRequests('booking-list-container', bookingManager.bookings, filter);
        });
    }
}

/**
 * Initialize Notification Center
 */
function initNotificationCenter() {
    const centerContainer = document.getElementById('notification-center');
    const badgeContainer = document.getElementById('notification-badge');

    // Subscribe to notification changes
    notificationManager.subscribe((notifications, unread) => {
        if (centerContainer) {
            renderNotificationCenter('notification-center', notifications, notificationManager);
        }
        if (badgeContainer) {
            renderNotificationBadge('notification-badge', unread);
        }
    });

    // Add sample notification
    notificationManager.add({
        title: '🎉 Chào mừng!',
        message: 'Hệ thống đã sẵn sàng sử dụng',
        category: 'INFO'
    });
}

/**
 * Setup new sidebar menu items
 */
function setupNewSidebarItems() {
    const sidebar = document.querySelector('.sidebar-menu, nav ul');
    if (!sidebar) return;

    // Check if already added
    if (document.getElementById('menu-kanban')) return;

    const newItems = [
        { id: 'menu-kanban', icon: '📋', label: 'Kanban Board', section: 'kanban-section' },

        { id: 'menu-booking', icon: '📅', label: 'Đặt lịch', section: 'booking-section' }
    ];

    newItems.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <a href="#" data-section="${item.section}" id="${item.id}">
                <span class="menu-icon">${item.icon}</span>
                <span>${item.label}</span>
            </a>
        `;
        sidebar.appendChild(li);
    });
}

// Export utilities
export { kanbanBoard, trackerManager, notificationManager };
