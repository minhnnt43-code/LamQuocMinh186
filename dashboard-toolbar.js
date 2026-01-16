// --- FILE: js/dashboard-toolbar.js ---
// Event listeners cho AI Mega Toolbar trong Dashboard

import { showNotification, showAIModal } from './common.js';
import { applyTheme, showCustomCSSEditor, toggleDarkMode, renderKanbanBoard, renderTimelineView } from './ui-enhancements.js';
import { switchView, renderMonthView, renderYearView, renderListView } from './calendar-views.js';
import { handleNaturalSearch, handleAutoCategorize, handleMeetingSummary, handleEmailDraft, handleQuickTranslate, handleCodeExplain } from './ai-automation.js';
import { getDailyBriefing, getWeeklyReview } from './ai-chatbot.js';

let globalData = null;
let currentUser = null;

/**
 * Khởi tạo Dashboard Toolbar
 */
export const initDashboardToolbar = (data, user) => {
    globalData = data;
    currentUser = user;
    setupToolbarEvents();
};

/**
 * Setup tất cả event listeners
 */
const setupToolbarEvents = () => {
    // === CALENDAR VIEWS ===
    document.getElementById('btn-view-week')?.addEventListener('click', () => {
        if (window.renderCalendar) window.renderCalendar();
        showNotification('📅 Chuyển sang Tuần');
    });

    document.getElementById('btn-view-month')?.addEventListener('click', () => {
        const container = document.getElementById('calendar-container') || document.querySelector('.calendar-week');
        if (container) renderMonthView(container);
        showNotification('📆 Chuyển sang Tháng');
    });

    document.getElementById('btn-view-year')?.addEventListener('click', () => {
        const container = document.getElementById('calendar-container') || document.querySelector('.calendar-week');
        if (container) renderYearView(container);
        showNotification('🗓️ Chuyển sang Năm');
    });

    document.getElementById('btn-view-list')?.addEventListener('click', () => {
        const container = document.getElementById('calendar-container') || document.querySelector('.calendar-week');
        if (container) renderListView(container);
        showNotification('📋 Chuyển sang List');
    });

    document.getElementById('btn-view-kanban')?.addEventListener('click', () => {
        const tasks = globalData?.tasks || [];
        showKanbanModal(tasks);
    });

    document.getElementById('btn-view-timeline')?.addEventListener('click', () => {
        const events = globalData?.calendarEvents || [];
        const tasks = globalData?.tasks || [];
        showTimelineModal([...events, ...tasks]);
    });

    // === AI AUTOMATION ===
    document.getElementById('btn-ai-search')?.addEventListener('click', () => {
        showSearchModal();
    });

    document.getElementById('btn-ai-categorize')?.addEventListener('click', async () => {
        showNotification('🏷️ Đang phân loại tasks...', 'info');
        await handleAutoCategorize();
    });

    document.getElementById('btn-ai-meeting')?.addEventListener('click', () => {
        showMeetingModal();
    });

    document.getElementById('btn-ai-email')?.addEventListener('click', () => {
        showEmailModal();
    });

    document.getElementById('btn-ai-translate')?.addEventListener('click', () => {
        showTranslateModal();
    });

    document.getElementById('btn-ai-code')?.addEventListener('click', () => {
        showCodeModal();
    });

    // === THEMES ===
    document.querySelectorAll('[data-theme]').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            applyTheme(theme);
        });
    });

    document.getElementById('btn-custom-css')?.addEventListener('click', () => {
        showCustomCSSEditor();
    });

    document.getElementById('btn-toggle-dark')?.addEventListener('click', () => {
        toggleDarkMode();
    });

    // === CHAT & BRIEFING ===
    document.getElementById('btn-daily-briefing')?.addEventListener('click', async () => {
        showNotification('☀️ Đang tạo Daily Briefing...', 'info');
        const result = await getDailyBriefing();
        if (result) showAIModal('☀️ Daily Briefing', result);
    });

    document.getElementById('btn-weekly-review')?.addEventListener('click', async () => {
        showNotification('📊 Đang tạo Weekly Review...', 'info');
        const result = await getWeeklyReview();
        if (result) showAIModal('📊 Weekly Review', result);
    });

    document.getElementById('btn-open-chatbot')?.addEventListener('click', () => {
        const chatbot = document.getElementById('chatbot-container');
        if (chatbot) {
            chatbot.style.display = chatbot.style.display === 'none' ? 'flex' : 'none';
        }
    });
};

// === MODAL HELPERS ===

const showKanbanModal = (tasks) => {
    const modal = createModal('📊 Kanban Board', `
        <div id="kanban-modal-container" style="min-height:400px;overflow-x:auto;"></div>
    `);
    document.body.appendChild(modal);
    renderKanbanBoard(tasks, 'kanban-modal-container');
};

const showTimelineModal = (items) => {
    const modal = createModal('⏳ Timeline View', `
        <div id="timeline-modal-container" style="max-height:500px;overflow-y:auto;"></div>
    `);
    document.body.appendChild(modal);
    renderTimelineView(items, 'timeline-modal-container');
};

const showSearchModal = () => {
    const modal = createModal('🔍 AI Smart Search', `
        <input type="text" id="search-query" placeholder="Tìm kiếm bằng ngôn ngữ tự nhiên..." style="width:100%;padding:12px;border:1px solid #e5e7eb;border-radius:8px;font-size:1rem;">
        <button id="btn-do-search" style="width:100%;margin-top:15px;padding:12px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;">🔍 Tìm kiếm</button>
        <div id="search-results" style="margin-top:15px;"></div>
    `);
    document.body.appendChild(modal);

    modal.querySelector('#btn-do-search')?.addEventListener('click', async () => {
        const query = modal.querySelector('#search-query').value;
        if (query) {
            const results = await handleNaturalSearch(query);
            modal.querySelector('#search-results').innerHTML = results || 'Không tìm thấy kết quả';
        }
    });
};

const showMeetingModal = () => {
    const modal = createModal('📝 Meeting Summary', `
        <textarea id="meeting-notes" placeholder="Paste nội dung cuộc họp vào đây..." style="width:100%;height:200px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;"></textarea>
        <button id="btn-do-meeting" style="width:100%;margin-top:15px;padding:12px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;">📝 Tóm tắt</button>
    `);
    document.body.appendChild(modal);

    modal.querySelector('#btn-do-meeting')?.addEventListener('click', async () => {
        const notes = modal.querySelector('#meeting-notes').value;
        if (notes) {
            const result = await handleMeetingSummary(notes);
            if (result) showAIModal('📝 Kết quả tóm tắt', result);
            modal.remove();
        }
    });
};

const showEmailModal = () => {
    const modal = createModal('✉️ Email Draft', `
        <input type="text" id="email-context" placeholder="Mô tả email cần viết..." style="width:100%;padding:12px;border:1px solid #e5e7eb;border-radius:8px;">
        <button id="btn-do-email" style="width:100%;margin-top:15px;padding:12px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;">✉️ Tạo Email</button>
    `);
    document.body.appendChild(modal);

    modal.querySelector('#btn-do-email')?.addEventListener('click', async () => {
        const context = modal.querySelector('#email-context').value;
        if (context) {
            const result = await handleEmailDraft(context);
            if (result) showAIModal('✉️ Email Draft', result);
            modal.remove();
        }
    });
};

const showTranslateModal = () => {
    const modal = createModal('🌐 Quick Translate', `
        <textarea id="translate-text" placeholder="Nhập văn bản cần dịch..." style="width:100%;height:150px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;"></textarea>
        <button id="btn-do-translate" style="width:100%;margin-top:15px;padding:12px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;">🌐 Dịch</button>
    `);
    document.body.appendChild(modal);

    modal.querySelector('#btn-do-translate')?.addEventListener('click', async () => {
        const text = modal.querySelector('#translate-text').value;
        if (text) {
            const result = await handleQuickTranslate(text);
            if (result) showAIModal('🌐 Kết quả dịch', result);
            modal.remove();
        }
    });
};

const showCodeModal = () => {
    const modal = createModal('💻 Code Explainer', `
        <textarea id="code-input" placeholder="Paste code vào đây..." style="width:100%;height:200px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;font-family:monospace;"></textarea>
        <button id="btn-do-code" style="width:100%;margin-top:15px;padding:12px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;">💻 Giải thích</button>
    `);
    document.body.appendChild(modal);

    modal.querySelector('#btn-do-code')?.addEventListener('click', async () => {
        const code = modal.querySelector('#code-input').value;
        if (code) {
            const result = await handleCodeExplain(code);
            if (result) showAIModal('💻 Code Explanation', result);
            modal.remove();
        }
    });
};

const createModal = (title, content) => {
    const modal = document.createElement('div');
    modal.className = 'toolbar-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;';
    modal.innerHTML = `
        <div style="background:white;border-radius:16px;width:90%;max-width:600px;overflow:hidden;">
            <div style="padding:15px 20px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;display:flex;justify-content:space-between;align-items:center;">
                <h3 style="margin:0;">${title}</h3>
                <button class="modal-close" style="background:none;border:none;color:white;font-size:1.5rem;cursor:pointer;">×</button>
            </div>
            <div style="padding:20px;">${content}</div>
        </div>
    `;
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    return modal;
};
