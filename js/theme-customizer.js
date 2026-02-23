// --- FILE: js/theme-customizer.js ---
// Theme Customizer with Live Preview & CSS Export

import { showNotification } from './common.js';

// Default theme values (matching variables.css)
const DEFAULT_THEME = {
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    bgColor: '#f8fafc',
    textColor: '#1e3a5f',
    textSecondary: '#64748b',
    cardBg: '#ffffff',
    borderColor: '#e2e8f0',
    priorityHigh: '#ef4444',
    priorityMedium: '#f59e0b',
    priorityLow: '#22c55e',
    successColor: '#22c55e',
    warningColor: '#f59e0b',
    dangerColor: '#ef4444',
    infoColor: '#3b82f6'
};

// Theme presets
const THEME_PRESETS = {
    purpleDream: {
        name: 'Purple Dream',
        primaryColor: '#667eea',
        secondaryColor: '#764ba2'
    },
    oceanBlue: {
        name: 'Ocean Blue',
        primaryColor: '#0ea5e9',
        secondaryColor: '#0284c7'
    },
    forestGreen: {
        name: 'Forest Green',
        primaryColor: '#10b981',
        secondaryColor: '#059669'
    },
    sunsetOrange: {
        name: 'Sunset Orange',
        primaryColor: '#f97316',
        secondaryColor: '#ea580c'
    },
    roseGold: {
        name: 'Rose Gold',
        primaryColor: '#f472b6',
        secondaryColor: '#db2777'
    },
    darkNight: {
        name: 'Dark Night',
        primaryColor: '#6366f1',
        secondaryColor: '#4f46e5',
        bgColor: '#0f172a',
        textColor: '#f1f5f9',
        cardBg: '#1e293b'
    }
};

let currentTheme = { ...DEFAULT_THEME };
let panelOpen = false;

/**
 * Initialize Theme Customizer
 */
export const initThemeCustomizer = () => {
    // Load saved theme
    loadSavedTheme();

    // Create UI elements
    createToggleButton();
    createPanel();
    createOverlay();

    // Apply saved theme
    applyTheme(currentTheme);
};

/**
 * Load theme from localStorage
 */
const loadSavedTheme = () => {
    const saved = localStorage.getItem('custom-theme');
    if (saved) {
        try {
            currentTheme = { ...DEFAULT_THEME, ...JSON.parse(saved) };
        } catch (e) {
            currentTheme = { ...DEFAULT_THEME };
        }
    }
};

/**
 * Save theme to localStorage
 */
const saveTheme = () => {
    localStorage.setItem('custom-theme', JSON.stringify(currentTheme));
};

/**
 * Apply theme to CSS variables
 */
const applyTheme = (theme) => {
    const root = document.documentElement;

    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--secondary-color', theme.secondaryColor);
    root.style.setProperty('--bg-color', theme.bgColor);
    root.style.setProperty('--text-color', theme.textColor);
    root.style.setProperty('--text-color-primary', theme.textColor);
    root.style.setProperty('--text-color-secondary', theme.textSecondary);
    root.style.setProperty('--card-bg', theme.cardBg);
    root.style.setProperty('--border-color', theme.borderColor);
    root.style.setProperty('--priority-high-color', theme.priorityHigh);
    root.style.setProperty('--priority-medium-color', theme.priorityMedium);
    root.style.setProperty('--priority-low-color', theme.priorityLow);
    root.style.setProperty('--success-color', theme.successColor);
    root.style.setProperty('--warning-color', theme.warningColor);
    root.style.setProperty('--danger-color', theme.dangerColor);
    root.style.setProperty('--info-color', theme.infoColor);

    // Update gradient
    root.style.setProperty('--grad-main', `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`);
    root.style.setProperty('--aura-gradient', `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`);
};

/**
 * Create toggle button
 */
const createToggleButton = () => {
    const btn = document.createElement('button');
    btn.className = 'theme-toggle-btn';
    btn.innerHTML = '🎨';
    btn.title = 'Tùy chỉnh giao diện';
    btn.addEventListener('click', togglePanel);
    document.body.appendChild(btn);
};

/**
 * Create customizer panel
 */
const createPanel = () => {
    const panel = document.createElement('div');
    panel.className = 'theme-customizer-panel';
    panel.id = 'theme-customizer-panel';

    panel.innerHTML = `
        <div class="tc-header">
            <h3>🎨 Tùy chỉnh màu sắc</h3>
            <button class="tc-close-btn" id="tc-close">✕</button>
        </div>
        
        <div class="tc-content">
            <!-- Presets -->
            <div class="tc-section">
                <div class="tc-section-title">Theme có sẵn</div>
                <div class="tc-presets" id="tc-presets">
                    ${Object.entries(THEME_PRESETS).map(([key, preset]) => `
                        <button class="tc-preset-btn" data-preset="${key}">
                            <div class="tc-preset-colors">
                                <span class="tc-preset-color" style="background:${preset.primaryColor}"></span>
                                <span class="tc-preset-color" style="background:${preset.secondaryColor}"></span>
                            </div>
                            <span class="tc-preset-name">${preset.name}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <!-- Main Colors -->
            <div class="tc-section">
                <div class="tc-section-title">Màu chính</div>
                <div class="tc-color-row">
                    <span class="tc-color-label">Primary Color</span>
                    <input type="color" class="tc-color-input" id="tc-primary" value="${currentTheme.primaryColor}">
                </div>
                <div class="tc-color-row">
                    <span class="tc-color-label">Secondary Color</span>
                    <input type="color" class="tc-color-input" id="tc-secondary" value="${currentTheme.secondaryColor}">
                </div>
            </div>
            
            <!-- Text Colors -->
            <div class="tc-section">
                <div class="tc-section-title">Màu chữ</div>
                <div class="tc-color-row">
                    <span class="tc-color-label">Text Primary</span>
                    <input type="color" class="tc-color-input" id="tc-text" value="${currentTheme.textColor}">
                </div>
                <div class="tc-color-row">
                    <span class="tc-color-label">Text Secondary</span>
                    <input type="color" class="tc-color-input" id="tc-text-secondary" value="${currentTheme.textSecondary}">
                </div>
            </div>
            
            <!-- Background -->
            <div class="tc-section">
                <div class="tc-section-title">Background</div>
                <div class="tc-color-row">
                    <span class="tc-color-label">Background</span>
                    <input type="color" class="tc-color-input" id="tc-bg" value="${currentTheme.bgColor}">
                </div>
                <div class="tc-color-row">
                    <span class="tc-color-label">Card Background</span>
                    <input type="color" class="tc-color-input" id="tc-card-bg" value="${currentTheme.cardBg}">
                </div>
            </div>
            
            <!-- Priority Colors -->
            <div class="tc-section">
                <div class="tc-section-title">Màu ưu tiên</div>
                <div class="tc-color-row">
                    <span class="tc-color-label">🔴 Cao</span>
                    <input type="color" class="tc-color-input" id="tc-priority-high" value="${currentTheme.priorityHigh}">
                </div>
                <div class="tc-color-row">
                    <span class="tc-color-label">🟠 Trung bình</span>
                    <input type="color" class="tc-color-input" id="tc-priority-medium" value="${currentTheme.priorityMedium}">
                </div>
                <div class="tc-color-row">
                    <span class="tc-color-label">🟢 Thấp</span>
                    <input type="color" class="tc-color-input" id="tc-priority-low" value="${currentTheme.priorityLow}">
                </div>
            </div>
        </div>
        
        <div class="tc-actions">
            <button class="tc-btn tc-btn-primary" id="tc-export">📥 Xuất file CSS</button>
            <button class="tc-btn tc-btn-secondary" id="tc-reset">🔄 Khôi phục mặc định</button>
        </div>
    `;

    document.body.appendChild(panel);

    // Event listeners
    panel.querySelector('#tc-close').addEventListener('click', togglePanel);

    // Color inputs
    setupColorInput('tc-primary', 'primaryColor');
    setupColorInput('tc-secondary', 'secondaryColor');
    setupColorInput('tc-text', 'textColor');
    setupColorInput('tc-text-secondary', 'textSecondary');
    setupColorInput('tc-bg', 'bgColor');
    setupColorInput('tc-card-bg', 'cardBg');
    setupColorInput('tc-priority-high', 'priorityHigh');
    setupColorInput('tc-priority-medium', 'priorityMedium');
    setupColorInput('tc-priority-low', 'priorityLow');

    // Presets
    panel.querySelectorAll('.tc-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const presetKey = btn.dataset.preset;
            const preset = THEME_PRESETS[presetKey];
            if (preset) {
                currentTheme = { ...DEFAULT_THEME, ...preset };
                applyTheme(currentTheme);
                saveTheme();
                updateColorInputs();
                showNotification(`✅ Đã áp dụng theme "${preset.name}"`, 'success');
            }
        });
    });

    // Export
    panel.querySelector('#tc-export').addEventListener('click', exportCSS);

    // Reset
    panel.querySelector('#tc-reset').addEventListener('click', () => {
        currentTheme = { ...DEFAULT_THEME };
        applyTheme(currentTheme);
        saveTheme();
        updateColorInputs();
        showNotification('🔄 Đã khôi phục màu mặc định', 'info');
    });
};

/**
 * Setup color input listener
 */
const setupColorInput = (inputId, themeKey) => {
    const input = document.getElementById(inputId);
    if (input) {
        input.addEventListener('input', (e) => {
            currentTheme[themeKey] = e.target.value;
            applyTheme(currentTheme);
            saveTheme();
        });
    }
};

/**
 * Update all color inputs to match current theme
 */
const updateColorInputs = () => {
    const inputs = {
        'tc-primary': 'primaryColor',
        'tc-secondary': 'secondaryColor',
        'tc-text': 'textColor',
        'tc-text-secondary': 'textSecondary',
        'tc-bg': 'bgColor',
        'tc-card-bg': 'cardBg',
        'tc-priority-high': 'priorityHigh',
        'tc-priority-medium': 'priorityMedium',
        'tc-priority-low': 'priorityLow'
    };

    Object.entries(inputs).forEach(([inputId, themeKey]) => {
        const input = document.getElementById(inputId);
        if (input) input.value = currentTheme[themeKey];
    });
};

/**
 * Create overlay
 */
const createOverlay = () => {
    const overlay = document.createElement('div');
    overlay.className = 'tc-overlay';
    overlay.id = 'tc-overlay';
    overlay.addEventListener('click', togglePanel);
    document.body.appendChild(overlay);
};

/**
 * Toggle panel open/close
 */
const togglePanel = () => {
    panelOpen = !panelOpen;
    const panel = document.getElementById('theme-customizer-panel');
    const overlay = document.getElementById('tc-overlay');

    if (panelOpen) {
        panel.classList.add('open');
        overlay.classList.add('active');
    } else {
        panel.classList.remove('open');
        overlay.classList.remove('active');
    }
};

/**
 * Export CSS file
 */
const exportCSS = () => {
    const cssContent = `/* Font UTM Avo */
@font-face {
    font-family: 'UTM Avo';
    src: url('../fonts/UTM-Avo.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
}

@font-face {
    font-family: 'UTM Avo';
    src: url('../fonts/UTM-AvoBold.ttf') format('truetype');
    font-weight: bold;
    font-style: normal;
}

:root {
    /* MÀU SẮC THƯƠNG HIỆU */
    --blue: #005B96;
    --orange: #FF7A00;
    --white: #ffffff;

    /* THEME SYSTEM - Custom Colors */
    --primary-color: ${currentTheme.primaryColor};
    --secondary-color: ${currentTheme.secondaryColor};
    --bg-color: ${currentTheme.bgColor};
    --text-color: ${currentTheme.textColor};
    --text-accent: #FF7A00;
    --text-color-primary: ${currentTheme.textColor};
    --text-color-secondary: ${currentTheme.textSecondary};
    --card-bg: ${currentTheme.cardBg};
    --border-color: ${currentTheme.borderColor};

    /* GRADIENTS */
    --grad-main: linear-gradient(135deg, ${currentTheme.primaryColor}, ${currentTheme.secondaryColor});
    --glass-bg: rgba(255, 255, 255, 0.85);
    --sidebar-background: linear-gradient(135deg, #1a1a2e, #16213e);

    /* SHADOWS */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    --card-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);

    /* AURA SYSTEM cho sidebar + Dashboard */
    --aura-color-1: ${currentTheme.primaryColor};
    --aura-color-2: ${currentTheme.secondaryColor};
    --aura-gradient: linear-gradient(135deg, ${currentTheme.primaryColor}, ${currentTheme.secondaryColor});
    --aura-glow: 0 0 20px ${currentTheme.primaryColor}4d;

    /* Priority Colors */
    --priority-high-color: ${currentTheme.priorityHigh};
    --priority-medium-color: ${currentTheme.priorityMedium};
    --priority-low-color: ${currentTheme.priorityLow};

    /* Calendar */
    --calendar-event-color: #3b82f6;
    --calendar-task-color: #f59e0b;

    /* Status Colors */
    --success-color: ${currentTheme.successColor};
    --warning-color: ${currentTheme.warningColor};
    --danger-color: ${currentTheme.dangerColor};
    --info-color: ${currentTheme.infoColor};

    /* Due Soon */
    --due-soon-color: #f97316;

    /* Legacy compatibility */
    --primary-blue: #005B96;
    --primary-orange: #FF7A00;
    --secondary-orange: #fbbf24;

    /* FONTS - UTM Avo */
    --font-body: 'UTM Avo', Arial, sans-serif;
    --font-title: 'UTM Avo', Arial, sans-serif;
}
`;

    // Create and download file
    const blob = new Blob([cssContent], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'variables.css';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('📥 Đã xuất file variables.css - Thay thế file cũ trong thư mục css/', 'success');
};

// Auto-init when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeCustomizer);
} else {
    initThemeCustomizer();
}
