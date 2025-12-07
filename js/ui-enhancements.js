// --- FILE: js/ui-enhancements.js ---
// UI Enhancements - Phase J
// #1 Theme System, #14 Tab Reorder, #15 Kanban View, #16 Timeline View

import { showNotification } from './common.js';

// ============================================================
// #1 - THEME SYSTEM (20+ presets)
// ============================================================
const THEMES = {
    default: {
        name: 'Mặc định',
        primary: '#667eea',
        secondary: '#764ba2',
        background: '#f8fafc'
    },
    ocean: {
        name: 'Đại dương',
        primary: '#0ea5e9',
        secondary: '#06b6d4',
        background: '#f0f9ff'
    },
    sunset: {
        name: 'Hoàng hôn',
        primary: '#f97316',
        secondary: '#ef4444',
        background: '#fef3c7'
    },
    forest: {
        name: 'Rừng xanh',
        primary: '#22c55e',
        secondary: '#10b981',
        background: '#f0fdf4'
    },
    lavender: {
        name: 'Lavender',
        primary: '#a855f7',
        secondary: '#8b5cf6',
        background: '#faf5ff'
    },
    rose: {
        name: 'Hồng',
        primary: '#f43f5e',
        secondary: '#ec4899',
        background: '#fdf2f8'
    },
    midnight: {
        name: 'Đêm',
        primary: '#6366f1',
        secondary: '#8b5cf6',
        background: '#1e1b4b',
        dark: true
    },
    charcoal: {
        name: 'Than chì',
        primary: '#64748b',
        secondary: '#475569',
        background: '#1e293b',
        dark: true
    },
    coffee: {
        name: 'Cà phê',
        primary: '#a16207',
        secondary: '#92400e',
        background: '#fef3c7'
    },
    mint: {
        name: 'Bạc hà',
        primary: '#14b8a6',
        secondary: '#0d9488',
        background: '#f0fdfa'
    }
};

let currentTheme = 'default';

const applyTheme = (themeName) => {
    const theme = THEMES[themeName] || THEMES.default;
    currentTheme = themeName;

    document.documentElement.style.setProperty('--primary-color', theme.primary);
    document.documentElement.style.setProperty('--secondary-color', theme.secondary);
    document.documentElement.style.setProperty('--bg-color', theme.background);

    if (theme.dark) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }

    localStorage.setItem('app-theme', themeName);
    showNotification(`Đã áp dụng theme ${theme.name}! 🎨`);
};

const loadSavedTheme = () => {
    const saved = localStorage.getItem('app-theme');
    if (saved && THEMES[saved]) {
        applyTheme(saved);
    }
};

const renderThemeSelector = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px;">
            ${Object.entries(THEMES).map(([key, theme]) => `
                <button class="theme-option ${key === currentTheme ? 'active' : ''}" 
                        data-theme="${key}"
                        style="padding:15px 10px;border:2px solid ${key === currentTheme ? theme.primary : '#e5e7eb'};
                               border-radius:12px;background:${theme.background};cursor:pointer;
                               transition:all 0.2s;">
                    <div style="width:30px;height:30px;border-radius:50%;margin:0 auto 8px;
                                background:linear-gradient(135deg,${theme.primary},${theme.secondary});"></div>
                    <div style="font-size:0.8rem;color:${theme.dark ? '#fff' : '#374151'};">${theme.name}</div>
                </button>
            `).join('')}
        </div>
    `;

    container.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
    });
};

// ============================================================
// #15 - KANBAN VIEW (Bảng Kanban)
// ============================================================
const KANBAN_COLUMNS = [
    { id: 'todo', title: '📋 Chờ làm', status: 'Chưa thực hiện', color: '#6b7280' },
    { id: 'inprogress', title: '🔄 Đang làm', status: 'Đang thực hiện', color: '#3b82f6' },
    { id: 'review', title: '👀 Review', status: 'Chờ review', color: '#f59e0b' },
    { id: 'done', title: '✅ Xong', status: 'Hoàn thành', color: '#10b981' }
];

const renderKanbanBoard = (tasks, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="kanban-board" style="display:flex;gap:15px;overflow-x:auto;padding:10px 0;">
            ${KANBAN_COLUMNS.map(col => `
                <div class="kanban-column" data-status="${col.status}" 
                     style="min-width:280px;background:#f8fafc;border-radius:12px;padding:15px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:15px;">
                        <span style="font-weight:600;">${col.title}</span>
                        <span style="background:${col.color}20;color:${col.color};padding:2px 8px;
                                     border-radius:10px;font-size:0.75rem;">
                            ${tasks.filter(t => t.status === col.status).length}
                        </span>
                    </div>
                    <div class="kanban-cards" style="display:flex;flex-direction:column;gap:10px;min-height:200px;">
                        ${tasks.filter(t => t.status === col.status).map(task => `
                            <div class="kanban-card" draggable="true" data-id="${task.id}"
                                 style="background:white;padding:12px;border-radius:8px;
                                        box-shadow:0 1px 3px rgba(0,0,0,0.1);cursor:grab;
                                        border-left:3px solid ${task.priority === 'high' ? '#ef4444' : task.priority === 'low' ? '#10b981' : '#f59e0b'};">
                                <div style="font-weight:500;margin-bottom:6px;">${task.name}</div>
                                ${task.dueDate ? `<div style="font-size:0.75rem;color:#6b7280;">📅 ${task.dueDate}</div>` : ''}
                                ${task.category ? `<span style="background:#e5e7eb;padding:2px 6px;border-radius:4px;font-size:0.7rem;">${task.category}</span>` : ''}
                            </div>
                        `).join('') || '<p style="color:#9ca3af;font-size:0.85rem;text-align:center;">Kéo thả task vào đây</p>'}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Simple drag and drop
    setupKanbanDragDrop(container);
};

const setupKanbanDragDrop = (container) => {
    let draggedCard = null;

    container.querySelectorAll('.kanban-card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedCard = card;
            card.style.opacity = '0.5';
        });
        card.addEventListener('dragend', () => {
            card.style.opacity = '1';
            draggedCard = null;
        });
    });

    container.querySelectorAll('.kanban-column').forEach(col => {
        col.addEventListener('dragover', (e) => e.preventDefault());
        col.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedCard) {
                const taskId = draggedCard.dataset.id;
                const newStatus = col.dataset.status;

                // Dispatch custom event
                window.dispatchEvent(new CustomEvent('kanban-task-moved', {
                    detail: { taskId, newStatus }
                }));

                col.querySelector('.kanban-cards').appendChild(draggedCard);
            }
        });
    });
};

// ============================================================
// #16 - TIMELINE VIEW (Vertical Timeline)
// ============================================================
const renderTimelineView = (items, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Sort by date
    const sortedItems = [...items].sort((a, b) =>
        new Date(a.date || a.dueDate) - new Date(b.date || b.dueDate)
    );

    container.innerHTML = `
        <div class="timeline" style="position:relative;padding-left:30px;">
            <div style="position:absolute;left:10px;top:0;bottom:0;width:2px;background:linear-gradient(to bottom,#667eea,#764ba2);"></div>
            ${sortedItems.map((item, i) => `
                <div class="timeline-item" style="position:relative;padding:15px 0 15px 20px;
                            ${i < sortedItems.length - 1 ? 'border-bottom:1px dashed #e5e7eb;' : ''}">
                    <div style="position:absolute;left:-20px;top:18px;width:12px;height:12px;
                                background:${item.status === 'Hoàn thành' ? '#10b981' : '#667eea'};
                                border-radius:50%;border:2px solid white;box-shadow:0 0 0 2px #667eea;"></div>
                    <div style="font-size:0.75rem;color:#6b7280;margin-bottom:4px;">
                        📅 ${item.date || item.dueDate || 'Không có ngày'}
                    </div>
                    <div style="font-weight:600;color:#1f2937;">${item.title || item.name}</div>
                    ${item.description || item.notes ? `<div style="font-size:0.85rem;color:#6b7280;margin-top:4px;">${(item.description || item.notes).substring(0, 100)}...</div>` : ''}
                </div>
            `).join('')}
        </div>
    `;
};

// ============================================================
// #36 - CUSTOM CSS EDITOR
// ============================================================
const showCustomCSSEditor = () => {
    const savedCSS = localStorage.getItem('custom-css') || '';

    const modal = document.createElement('div');
    modal.id = 'css-editor-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;';
    modal.innerHTML = `
        <div style="background:white;border-radius:16px;width:90%;max-width:600px;overflow:hidden;">
            <div style="padding:20px;background:linear-gradient(135deg,#1e293b,#334155);color:white;">
                <h3 style="margin:0;">🎨 Custom CSS Editor</h3>
            </div>
            <div style="padding:20px;">
                <textarea id="custom-css-input" style="width:100%;height:300px;font-family:monospace;
                          padding:15px;border:1px solid #e5e7eb;border-radius:8px;resize:vertical;
                          background:#1e293b;color:#22d3ee;">${savedCSS}</textarea>
                <div style="display:flex;gap:10px;margin-top:15px;">
                    <button id="btn-apply-css" style="flex:1;padding:12px;background:#10b981;color:white;
                            border:none;border-radius:8px;cursor:pointer;">✅ Áp dụng</button>
                    <button id="btn-reset-css" style="padding:12px 20px;background:#f3f4f6;
                            border:none;border-radius:8px;cursor:pointer;">🔄 Reset</button>
                    <button id="btn-close-css" style="padding:12px 20px;background:#f3f4f6;
                            border:none;border-radius:8px;cursor:pointer;">❌ Đóng</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('#custom-css-input');

    modal.querySelector('#btn-apply-css').onclick = () => {
        applyCustomCSS(input.value);
        localStorage.setItem('custom-css', input.value);
        showNotification('Đã áp dụng CSS!');
    };

    modal.querySelector('#btn-reset-css').onclick = () => {
        input.value = '';
        applyCustomCSS('');
        localStorage.removeItem('custom-css');
        showNotification('Đã reset CSS!');
    };

    modal.querySelector('#btn-close-css').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
};

const applyCustomCSS = (css) => {
    let styleEl = document.getElementById('custom-user-css');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-user-css';
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
};

const loadCustomCSS = () => {
    const saved = localStorage.getItem('custom-css');
    if (saved) applyCustomCSS(saved);
};

// ============================================================
// #7 - SIDEBAR COLLAPSE (Thu gọn sidebar)
// ============================================================
let sidebarCollapsed = false;

const setupSidebarCollapse = () => {
    const btn = document.getElementById('btn-collapse-sidebar');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (!btn || !sidebar) return;

    // Load saved state
    sidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        mainContent?.classList.add('sidebar-collapsed');
        btn.textContent = '▶';
    }

    btn.addEventListener('click', () => {
        sidebarCollapsed = !sidebarCollapsed;

        if (sidebarCollapsed) {
            sidebar.classList.add('collapsed');
            mainContent?.classList.add('sidebar-collapsed');
            btn.textContent = '▶';
        } else {
            sidebar.classList.remove('collapsed');
            mainContent?.classList.remove('sidebar-collapsed');
            btn.textContent = '◀';
        }

        localStorage.setItem('sidebar-collapsed', sidebarCollapsed);
    });

    // Add CSS for collapse
    addCollapsibleStyles();
};

const addCollapsibleStyles = () => {
    if (document.getElementById('sidebar-collapse-styles')) return;

    const style = document.createElement('style');
    style.id = 'sidebar-collapse-styles';
    style.textContent = `
        .sidebar.collapsed {
            width: 70px !important;
            overflow: hidden;
        }
        .sidebar.collapsed .sidebar-header > *:not(#btn-collapse-sidebar) {
            display: none !important;
        }
        .sidebar.collapsed .nav-menu .nav-btn,
        .sidebar.collapsed .nav-menu .nav-group-toggle {
            font-size: 0 !important;
            padding: 12px !important;
        }
        .sidebar.collapsed .nav-menu .nav-btn::before,
        .sidebar.collapsed .nav-menu .nav-group-toggle::before {
            font-size: 1.2rem !important;
        }
        .sidebar.collapsed .sidebar-footer,
        .sidebar.collapsed .nav-submenu,
        .sidebar.collapsed .info-widget {
            display: none !important;
        }
        .main-content.sidebar-collapsed {
            margin-left: 70px !important;
        }
    `;
    document.head.appendChild(style);
};

// ============================================================
// #54 - VOICE INPUT (Nhập bằng giọng nói)
// ============================================================
const startVoiceInput = (targetInputId, callback) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showNotification('Trình duyệt không hỗ trợ nhập giọng nói!', 'error');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        showNotification('🎤 Đang nghe... Hãy nói!', 'info');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById(targetInputId);
        if (input) {
            input.value = transcript;
            input.focus();
        }
        if (callback) callback(transcript);
        showNotification(`Đã nhận: "${transcript}"`, 'success');
    };

    recognition.onerror = (event) => {
        showNotification('Lỗi nhận giọng nói: ' + event.error, 'error');
    };

    recognition.start();
    return recognition;
};

// ============================================================
// #2 - DARK MODE 2.0 (Auto-switch by time)
// ============================================================
const initDarkMode2 = () => {
    const savedMode = localStorage.getItem('dark-mode');
    const autoSwitch = localStorage.getItem('dark-mode-auto') === 'true';

    if (autoSwitch) {
        const hour = new Date().getHours();
        const isDark = hour >= 19 || hour < 6; // 7PM - 6AM
        document.body.classList.toggle('dark-theme', isDark);
    } else if (savedMode === 'dark') {
        document.body.classList.add('dark-theme');
    }
};

const toggleDarkMode = (auto = false) => {
    if (auto) {
        const current = localStorage.getItem('dark-mode-auto') === 'true';
        localStorage.setItem('dark-mode-auto', !current);
        showNotification(`Dark Mode Auto: ${!current ? 'BẬT' : 'TẮT'}`);
        initDarkMode2();
    } else {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('dark-mode', isDark ? 'dark' : 'light');
        showNotification(`Dark Mode: ${isDark ? 'BẬT' : 'TẮT'}`);
    }
};

// ============================================================
// #53 - AUTOCOMPLETE (Gợi ý câu khi gõ)
// ============================================================
const setupAutocomplete = (inputId, suggestions) => {
    const input = document.getElementById(inputId);
    if (!input) return;

    const container = document.createElement('div');
    container.className = 'autocomplete-container';
    container.style.cssText = `
        position: absolute;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
    `;
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(container);

    input.addEventListener('input', () => {
        const value = input.value.toLowerCase().trim();
        if (value.length < 2) {
            container.style.display = 'none';
            return;
        }

        const matches = suggestions.filter(s =>
            s.toLowerCase().includes(value)
        ).slice(0, 5);

        if (matches.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = matches.map(m => `
            <div class="autocomplete-item" style="padding:10px 15px;cursor:pointer;border-bottom:1px solid #f3f4f6;"
                 onmouseover="this.style.background='#f3f4f6'"
                 onmouseout="this.style.background='white'">
                ${m}
            </div>
        `).join('');
        container.style.display = 'block';

        container.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.textContent.trim();
                container.style.display = 'none';
            });
        });
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !container.contains(e.target)) {
            container.style.display = 'none';
        }
    });
};

// ============================================================
// SETUP EVENT LISTENERS CHO BUTTONS MỚI
// ============================================================

const setupThemeButtons = () => {
    // Dùng event delegation để bắt click từ theme buttons
    document.addEventListener('click', (e) => {
        const themeBtn = e.target.closest('.theme-btn[data-theme]');
        if (themeBtn) {
            const theme = themeBtn.dataset.theme;
            applyTheme(theme);

            // Visual feedback
            document.querySelectorAll('.theme-btn').forEach(b => {
                b.style.transform = 'scale(1)';
                b.style.boxShadow = 'none';
            });
            themeBtn.style.transform = 'scale(1.05)';
            themeBtn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        }

        // Custom CSS button
        if (e.target.id === 'btn-custom-css-settings') {
            showCustomCSSEditor();
        }
    });
};

const setupCalendarViewButtons = () => {
    document.querySelectorAll('.view-btn[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;

            // Update active state
            document.querySelectorAll('.view-btn').forEach(b => {
                b.style.background = 'transparent';
                b.style.color = '#4b5563';
            });
            btn.style.background = '#667eea';
            btn.style.color = 'white';

            // Dispatch event for calendar-views.js to handle
            window.dispatchEvent(new CustomEvent('calendar-view-change', { detail: { view } }));

            showNotification(`Chuyển sang view: ${view}`);
        });
    });
};

const setupAutoDarkToggle = () => {
    const toggle = document.getElementById('toggle-auto-dark');
    if (!toggle) return;

    // Load saved state
    toggle.checked = localStorage.getItem('dark-mode-auto') === 'true';

    toggle.addEventListener('change', () => {
        localStorage.setItem('dark-mode-auto', toggle.checked);
        if (toggle.checked) {
            initDarkMode2();
            showNotification('Auto Dark Mode: BẬT (7PM-6AM)');
        } else {
            showNotification('Auto Dark Mode: TẮT');
        }
    });
};

// Initialize
export const initUIEnhancements = () => {
    loadSavedTheme();
    loadCustomCSS();
    setupSidebarCollapse();
    initDarkMode2();

    // Setup buttons sau khi DOM ready
    setTimeout(() => {
        setupThemeButtons();
        setupCalendarViewButtons();
        setupAutoDarkToggle();
    }, 100);
};

// Export
export {
    THEMES,
    applyTheme,
    renderThemeSelector,
    KANBAN_COLUMNS,
    renderKanbanBoard,
    renderTimelineView,
    showCustomCSSEditor,
    setupSidebarCollapse,
    startVoiceInput,
    toggleDarkMode,
    setupAutocomplete,
    setupThemeButtons,
    setupCalendarViewButtons
};
