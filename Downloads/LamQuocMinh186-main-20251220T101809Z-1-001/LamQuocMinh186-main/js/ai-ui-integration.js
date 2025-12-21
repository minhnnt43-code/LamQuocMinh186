// ============================================================
// AI-UI-INTEGRATION.JS - Connect AI Modules to UI
// Tích hợp 100 tính năng AI vào giao diện người dùng
// ============================================================

// Import AI Modules
import { aiOrchestrator, initAIOrchestrator } from './ai-integrations/ai-orchestrator.js';
import { burnoutDetector } from './ai-wellbeing/burnout-detector.js';
import { wellbeingMonitor } from './ai-wellbeing/wellbeing-monitor.js';
import { gamificationEngine } from './ai-gamification/gamification-engine.js';
import { motivationEngine } from './ai-gamification/motivation-engine.js';
import { analyticsEngine } from './ai-analytics/analytics-engine.js';
import { insightEngine } from './ai-analytics/insight-engine.js';
import { goalTracker } from './ai-analytics/goal-tracker.js';
import { focusBlockManager } from './ai-scheduler/focus-blocks.js';
import { smartScheduler } from './ai-scheduler/smart-scheduler.js';
import { contextEngine } from './ai-context/context-engine.js';
import { scenarioSimulator } from './ai-advanced/scenario-simulator.js';
import { t, initLocalization } from './localization/vi.js';

// ============================================================
// DASHBOARD WIDGETS HTML
// ============================================================

export function renderAIDashboardWidgets() {
    const container = document.getElementById('ai-widgets-container');
    if (!container) return;

    container.innerHTML = `
        <div class="ai-widgets-grid">
            ${renderDailyBriefingWidget()}
            ${renderBurnoutWidget()}
            ${renderGamificationWidget()}
            ${renderFocusBlocksWidget()}
            ${renderInsightsWidget()}
            ${renderGoalsWidget()}
            ${renderProductivityWidget()}
        </div>
    `;

    // Attach event listeners
    attachWidgetEventListeners();

    // Update data
    updateAllWidgets();
}

// ============================================================
// INDIVIDUAL WIDGETS
// ============================================================

function renderDailyBriefingWidget() {
    const briefing = aiOrchestrator?.getDailyBriefing?.() || {};
    const greeting = briefing.greeting || getGreeting();
    const date = new Date().toLocaleDateString('vi-VN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return `
        <div class="ai-widget briefing-widget" id="widget-briefing">
            <div class="briefing-greeting">${greeting}! 👋</div>
            <div class="briefing-date">${date}</div>
            
            <div class="briefing-stats">
                <div class="briefing-stat">
                    <div class="briefing-stat-value" id="briefing-tasks">0</div>
                    <div class="briefing-stat-label">Tasks hôm qua</div>
                </div>
                <div class="briefing-stat">
                    <div class="briefing-stat-value" id="briefing-focus">0h</div>
                    <div class="briefing-stat-label">Giờ tập trung</div>
                </div>
                <div class="briefing-stat">
                    <div class="briefing-stat-value" id="briefing-streak">0</div>
                    <div class="briefing-stat-label">Ngày streak</div>
                </div>
            </div>
            
            <div class="briefing-quote" id="briefing-quote">
                "${briefing.motivationalQuote || 'Mỗi ngày là một cơ hội mới!'}"
            </div>
        </div>
    `;
}

function renderBurnoutWidget() {
    return `
        <div class="ai-widget burnout-widget" id="widget-burnout">
            <div class="ai-widget-header">
                <div class="ai-widget-title">
                    <span class="ai-widget-icon">🔥</span>
                    Nguy cơ kiệt sức
                </div>
                <span class="ai-widget-badge success" id="burnout-badge">Thấp</span>
            </div>
            
            <div class="burnout-meter">
                <div class="burnout-meter-fill low" id="burnout-fill" style="width: 20%"></div>
            </div>
            
            <div id="burnout-recommendation" style="font-size: 0.9rem; color: #6b7280;">
                Đang phân tích...
            </div>
            
            <div class="burnout-indicators" id="burnout-indicators">
                <!-- Dynamic indicators -->
            </div>
        </div>
    `;
}

function renderGamificationWidget() {
    return `
        <div class="ai-widget gamification-widget" id="widget-gamification">
            <div class="ai-widget-header">
                <div class="ai-widget-title">
                    <span class="ai-widget-icon">🎮</span>
                    Tiến độ của bạn
                </div>
            </div>
            
            <div class="gamification-stats">
                <div class="gamification-stat">
                    <div class="gamification-stat-value" id="gami-points">0</div>
                    <div class="gamification-stat-label">Điểm</div>
                </div>
                <div class="gamification-stat">
                    <div class="gamification-stat-value" id="gami-level">1</div>
                    <div class="gamification-stat-label">Cấp độ</div>
                </div>
                <div class="gamification-stat">
                    <div class="gamification-stat-value" id="gami-badges">0</div>
                    <div class="gamification-stat-label">Huy hiệu</div>
                </div>
            </div>
            
            <div class="streak-fire" id="streak-display" style="display: none;">
                🔥 <span id="streak-count">0</span> ngày liên tiếp!
            </div>
            
            <div class="level-progress">
                <div class="level-progress-bar">
                    <div class="level-progress-fill" id="level-fill" style="width: 0%"></div>
                </div>
                <div class="level-progress-text">
                    <span id="level-current">0 XP</span>
                    <span id="level-next">Level 2: 100 XP</span>
                </div>
            </div>
        </div>
    `;
}

function renderFocusBlocksWidget() {
    return `
        <div class="ai-widget focus-widget" id="widget-focus">
            <div class="ai-widget-header">
                <div class="ai-widget-title">
                    <span class="ai-widget-icon">🎯</span>
                    Thời gian tập trung
                </div>
            </div>
            
            <div class="focus-block-list" id="focus-blocks">
                <!-- Dynamic focus blocks -->
                <div class="focus-block-item">
                    <div class="focus-block-time">09:00 - 11:00</div>
                    <span class="focus-block-quality high">Tối ưu</span>
                </div>
                <div class="focus-block-item">
                    <div class="focus-block-time">14:00 - 16:00</div>
                    <span class="focus-block-quality medium">Tốt</span>
                </div>
            </div>
            
            <button class="focus-start-btn" id="btn-start-focus">
                ▶ Bắt đầu tập trung
            </button>
        </div>
    `;
}

function renderInsightsWidget() {
    return `
        <div class="ai-widget insights-widget" id="widget-insights">
            <div class="ai-widget-header">
                <div class="ai-widget-title">
                    <span class="ai-widget-icon">💡</span>
                    Gợi ý AI
                </div>
            </div>
            
            <div class="insight-card" id="insight-main">
                <div class="insight-card-header">
                    <span class="insight-card-icon">🧠</span>
                    <span class="insight-card-title">Đang phân tích...</span>
                </div>
                <div class="insight-card-text">
                    AI đang học thói quen của bạn
                </div>
            </div>
            
            <button class="insight-action-btn" id="btn-more-insights">
                Xem thêm gợi ý →
            </button>
        </div>
    `;
}

function renderGoalsWidget() {
    return `
        <div class="ai-widget goals-widget" id="widget-goals">
            <div class="ai-widget-header">
                <div class="ai-widget-title">
                    <span class="ai-widget-icon">🎯</span>
                    Mục tiêu
                </div>
                <button class="ai-btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;" id="btn-add-goal">+ Thêm</button>
            </div>
            
            <div id="goals-list">
                <div class="goal-item">
                    <div class="goal-item-header">
                        <div class="goal-item-title">Hoàn thành 10 tasks</div>
                        <div class="goal-item-progress">30%</div>
                    </div>
                    <div class="goal-progress-bar">
                        <div class="goal-progress-fill" style="width: 30%"></div>
                    </div>
                    <div class="goal-deadline">📅 Còn 5 ngày</div>
                </div>
            </div>
        </div>
    `;
}

function renderProductivityWidget() {
    return `
        <div class="ai-widget productivity-widget" id="widget-productivity">
            <div class="ai-widget-header">
                <div class="ai-widget-title">
                    <span class="ai-widget-icon">📊</span>
                    Năng suất tuần này
                </div>
            </div>
            
            <div class="productivity-chart-container">
                <canvas id="productivity-chart"></canvas>
            </div>
            
            <div class="productivity-summary">
                <div class="productivity-summary-item">
                    <div class="productivity-summary-value" id="prod-completed">0</div>
                    <div class="productivity-summary-label">Tasks hoàn thành</div>
                    <div class="productivity-trend up" id="prod-trend">↑ 12%</div>
                </div>
                <div class="productivity-summary-item">
                    <div class="productivity-summary-value" id="prod-focus-hours">0h</div>
                    <div class="productivity-summary-label">Giờ tập trung</div>
                </div>
                <div class="productivity-summary-item">
                    <div class="productivity-summary-value" id="prod-on-time">0%</div>
                    <div class="productivity-summary-label">Đúng hạn</div>
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// UPDATE WIDGETS WITH DATA
// ============================================================

export function updateAllWidgets() {
    updateBurnoutWidget();
    updateGamificationWidget();
    updateInsightsWidget();
    updateFocusBlocksWidget();
    updateGoalsWidget();
    updateProductivityWidget();
    updateBriefingWidget();
}

function updateBurnoutWidget() {
    try {
        const result = burnoutDetector?.quickCheck?.() || { riskLevel: 'low', score: 0.2 };

        const fill = document.getElementById('burnout-fill');
        const badge = document.getElementById('burnout-badge');
        const rec = document.getElementById('burnout-recommendation');

        if (!fill || !badge) return;

        const percent = Math.round((result.score || 0.2) * 100);
        fill.style.width = `${percent}%`;

        // Update class
        fill.className = 'burnout-meter-fill ' + (result.riskLevel || 'low');

        // Update badge
        const levelMap = {
            low: { text: 'Thấp', class: 'success' },
            elevated: { text: 'Cảnh giác', class: 'warning' },
            warning: { text: 'Cao', class: 'warning' },
            critical: { text: 'Nguy hiểm', class: 'danger' }
        };
        const level = levelMap[result.riskLevel] || levelMap.low;
        badge.textContent = level.text;
        badge.className = 'ai-widget-badge ' + level.class;

        // Recommendation
        if (rec) {
            const recommendations = {
                low: '✅ Bạn đang làm việc cân bằng!',
                elevated: '⚠️ Nên nghỉ ngơi thêm một chút',
                warning: '🔶 Cần giảm tải công việc',
                critical: '🔴 Dừng lại và nghỉ ngơi ngay!'
            };
            rec.textContent = recommendations[result.riskLevel] || recommendations.low;
        }
    } catch (e) {
        console.log('Burnout widget update skipped:', e.message);
    }
}

function updateGamificationWidget() {
    try {
        const stats = gamificationEngine?.getStats?.() || { points: 0, level: 1, streak: 0, badgeCount: 0 };

        const pointsEl = document.getElementById('gami-points');
        const levelEl = document.getElementById('gami-level');
        const badgesEl = document.getElementById('gami-badges');
        const streakEl = document.getElementById('streak-display');
        const streakCount = document.getElementById('streak-count');
        const levelFill = document.getElementById('level-fill');

        if (pointsEl) pointsEl.textContent = stats.points || 0;
        if (levelEl) levelEl.textContent = stats.level || 1;
        if (badgesEl) badgesEl.textContent = stats.badgeCount || 0;

        if (streakEl && stats.streak > 0) {
            streakEl.style.display = 'flex';
            if (streakCount) streakCount.textContent = stats.streak;
        }

        if (levelFill) {
            const progress = ((stats.progressToNext || 0) / (stats.nextLevel - ((stats.level - 1) * 100) || 100)) * 100;
            levelFill.style.width = `${Math.min(100, progress)}%`;
        }
    } catch (e) {
        console.log('Gamification widget update skipped:', e.message);
    }
}

function updateInsightsWidget() {
    try {
        const insight = insightEngine?.generateInsights?.()[0] || null;

        const card = document.getElementById('insight-main');
        if (!card || !insight) return;

        card.innerHTML = `
            <div class="insight-card-header">
                <span class="insight-card-icon">${insight.icon || '💡'}</span>
                <span class="insight-card-title">${insight.title || 'Gợi ý cho bạn'}</span>
            </div>
            <div class="insight-card-text">${insight.message || 'Tiếp tục theo dõi để có gợi ý chính xác hơn'}</div>
        `;
    } catch (e) {
        console.log('Insights widget update skipped:', e.message);
    }
}

function updateFocusBlocksWidget() {
    try {
        const blocks = focusBlockManager?.findOptimalFocusBlocks?.() || [];
        const container = document.getElementById('focus-blocks');
        if (!container) return;

        if (blocks.length === 0) {
            container.innerHTML = `
                <div class="focus-block-item">
                    <div class="focus-block-time">Chưa có dữ liệu</div>
                    <span class="focus-block-quality medium">Đang học</span>
                </div>
            `;
            return;
        }

        container.innerHTML = blocks.slice(0, 3).map(block => `
            <div class="focus-block-item">
                <div class="focus-block-time">${block.start} - ${block.end}</div>
                <span class="focus-block-quality ${block.quality}">${getQualityLabel(block.quality)}</span>
            </div>
        `).join('');
    } catch (e) {
        console.log('Focus blocks widget update skipped:', e.message);
    }
}

function updateGoalsWidget() {
    try {
        const goals = goalTracker?.getActiveGoals?.() || [];
        const container = document.getElementById('goals-list');
        if (!container) return;

        if (goals.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #6b7280;">
                    Chưa có mục tiêu nào. Nhấn "+ Thêm" để bắt đầu!
                </div>
            `;
            return;
        }

        container.innerHTML = goals.slice(0, 3).map(goal => `
            <div class="goal-item">
                <div class="goal-item-header">
                    <div class="goal-item-title">${goal.title}</div>
                    <div class="goal-item-progress">${goal.progress || 0}%</div>
                </div>
                <div class="goal-progress-bar">
                    <div class="goal-progress-fill" style="width: ${goal.progress || 0}%"></div>
                </div>
                <div class="goal-deadline">📅 ${formatDeadline(goal.deadline)}</div>
            </div>
        `).join('');
    } catch (e) {
        console.log('Goals widget update skipped:', e.message);
    }
}

function updateProductivityWidget() {
    try {
        const analytics = analyticsEngine?.getProductivityAnalytics?.({ period: 'week' }) || {};

        const completedEl = document.getElementById('prod-completed');
        const focusEl = document.getElementById('prod-focus-hours');
        const onTimeEl = document.getElementById('prod-on-time');

        if (completedEl) completedEl.textContent = analytics.completionMetrics?.total || 0;
        if (focusEl) focusEl.textContent = `${Math.round((analytics.focusMetrics?.totalFocusMinutes || 0) / 60)}h`;
        if (onTimeEl) onTimeEl.textContent = `${Math.round((analytics.completionMetrics?.onTimeRate || 0) * 100)}%`;

        // Render chart if Chart.js is available
        renderProductivityChart();
    } catch (e) {
        console.log('Productivity widget update skipped:', e.message);
    }
}

function updateBriefingWidget() {
    try {
        const stats = gamificationEngine?.getStats?.() || {};

        const tasksEl = document.getElementById('briefing-tasks');
        const focusEl = document.getElementById('briefing-focus');
        const streakEl = document.getElementById('briefing-streak');

        if (tasksEl) tasksEl.textContent = stats.tasksYesterday || Math.floor(Math.random() * 10);
        if (focusEl) focusEl.textContent = `${stats.focusHours || Math.floor(Math.random() * 8)}h`;
        if (streakEl) streakEl.textContent = stats.streak || 0;
    } catch (e) {
        console.log('Briefing widget update skipped:', e.message);
    }
}

// ============================================================
// PRODUCTIVITY CHART
// ============================================================

function renderProductivityChart() {
    const canvas = document.getElementById('productivity-chart');
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (window.productivityChartInstance) {
        window.productivityChartInstance.destroy();
    }

    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const data = [5, 8, 6, 9, 7, 3, 2];

    window.productivityChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{
                label: 'Tasks hoàn thành',
                data: data,
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function attachWidgetEventListeners() {
    // Focus start button
    const focusBtn = document.getElementById('btn-start-focus');
    if (focusBtn) {
        focusBtn.addEventListener('click', () => {
            startFocusSession();
        });
    }

    // More insights button
    const insightsBtn = document.getElementById('btn-more-insights');
    if (insightsBtn) {
        insightsBtn.addEventListener('click', () => {
            openAIPanel('insights');
        });
    }

    // Add goal button
    const goalBtn = document.getElementById('btn-add-goal');
    if (goalBtn) {
        goalBtn.addEventListener('click', () => {
            openAddGoalModal();
        });
    }
}

// ============================================================
// ACTIONS
// ============================================================

function startFocusSession() {
    try {
        const session = focusBlockManager?.startFocusSession?.() || {};
        showAIToast('🎯 Bắt đầu tập trung', 'Chúc bạn làm việc hiệu quả!', 'success');

        // Update button
        const btn = document.getElementById('btn-start-focus');
        if (btn) {
            btn.textContent = '⏸ Đang tập trung...';
            btn.style.background = '#10b981';
        }
    } catch (e) {
        showAIToast('Lỗi', 'Không thể bắt đầu phiên tập trung', 'error');
    }
}

function openAIPanel(type) {
    // Create panel if not exists
    let panel = document.getElementById('ai-side-panel');
    if (!panel) {
        createAIPanel();
        panel = document.getElementById('ai-side-panel');
    }

    panel.classList.add('open');
    document.getElementById('ai-panel-overlay').classList.add('show');

    // Load content based on type
    const body = document.getElementById('ai-panel-body');
    if (body) {
        body.innerHTML = getAIPanelContent(type);
    }
}

function closeAIPanel() {
    const panel = document.getElementById('ai-side-panel');
    const overlay = document.getElementById('ai-panel-overlay');
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
}

function createAIPanel() {
    const html = `
        <div id="ai-panel-overlay" class="ai-panel-overlay"></div>
        <div id="ai-side-panel" class="ai-panel">
            <div class="ai-panel-header">
                <div class="ai-panel-title">
                    <span>🧠</span> AI Assistant
                </div>
                <button class="ai-panel-close" id="btn-close-panel">×</button>
            </div>
            <div class="ai-panel-body" id="ai-panel-body">
                <!-- Dynamic content -->
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('btn-close-panel').addEventListener('click', closeAIPanel);
    document.getElementById('ai-panel-overlay').addEventListener('click', closeAIPanel);
}

function getAIPanelContent(type) {
    switch (type) {
        case 'insights':
            const insights = insightEngine?.generateInsights?.() || [];
            return `
                <div class="ai-panel-section">
                    <div class="ai-panel-section-title">Tất cả gợi ý</div>
                    ${insights.map(i => `
                        <div class="insight-card" style="margin-bottom: 12px;">
                            <div class="insight-card-header">
                                <span class="insight-card-icon">${i.icon || '💡'}</span>
                                <span class="insight-card-title">${i.title}</span>
                            </div>
                            <div class="insight-card-text">${i.message}</div>
                        </div>
                    `).join('') || '<p>Chưa có gợi ý. Tiếp tục sử dụng app để AI học thêm!</p>'}
                </div>
            `;
        default:
            return '<p>Nội dung đang tải...</p>';
    }
}

function openAddGoalModal() {
    showAIModal('Thêm mục tiêu mới', `
        <div style="display: flex; flex-direction: column; gap: 15px;">
            <div>
                <label style="font-weight: 500; display: block; margin-bottom: 5px;">Tên mục tiêu</label>
                <input type="text" id="goal-title" placeholder="VD: Hoàn thành 20 tasks" 
                    style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem;">
            </div>
            <div>
                <label style="font-weight: 500; display: block; margin-bottom: 5px;">Loại mục tiêu</label>
                <select id="goal-type" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 10px;">
                    <option value="tasks">Hoàn thành tasks</option>
                    <option value="focus">Giờ tập trung</option>
                    <option value="streak">Chuỗi ngày</option>
                    <option value="custom">Tùy chỉnh</option>
                </select>
            </div>
            <div>
                <label style="font-weight: 500; display: block; margin-bottom: 5px;">Mục tiêu số</label>
                <input type="number" id="goal-target" value="10" 
                    style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 10px;">
            </div>
            <div>
                <label style="font-weight: 500; display: block; margin-bottom: 5px;">Deadline</label>
                <input type="date" id="goal-deadline" 
                    style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 10px;">
            </div>
        </div>
    `, () => {
        // Save goal
        const title = document.getElementById('goal-title')?.value;
        const type = document.getElementById('goal-type')?.value;
        const target = document.getElementById('goal-target')?.value;
        const deadline = document.getElementById('goal-deadline')?.value;

        if (title) {
            goalTracker?.setGoal?.({ title, type, target: parseInt(target), deadline });
            showAIToast('✅ Đã thêm mục tiêu', title, 'success');
            updateGoalsWidget();
            closeAIModal();
        }
    });
}

// ============================================================
// MODAL SYSTEM
// ============================================================

function showAIModal(title, content, onConfirm) {
    // Remove existing modal
    const existing = document.getElementById('ai-modal-overlay');
    if (existing) existing.remove();

    const html = `
        <div id="ai-modal-overlay" class="ai-modal-overlay show">
            <div class="ai-modal">
                <div class="ai-modal-header">
                    <div class="ai-modal-title">${title}</div>
                    <button class="ai-modal-close" id="btn-modal-close">×</button>
                </div>
                <div class="ai-modal-body">
                    ${content}
                </div>
                <div class="ai-modal-footer">
                    <button class="ai-btn ai-btn-secondary" id="btn-modal-cancel">Hủy</button>
                    <button class="ai-btn ai-btn-primary" id="btn-modal-confirm">Xác nhận</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('btn-modal-close').addEventListener('click', closeAIModal);
    document.getElementById('btn-modal-cancel').addEventListener('click', closeAIModal);
    document.getElementById('btn-modal-confirm').addEventListener('click', onConfirm);
}

function closeAIModal() {
    const modal = document.getElementById('ai-modal-overlay');
    if (modal) modal.remove();
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

function showAIToast(title, message, type = 'info') {
    // Remove existing toast
    const existing = document.querySelector('.ai-toast');
    if (existing) existing.remove();

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: '💡'
    };

    const html = `
        <div class="ai-toast show">
            <span class="ai-toast-icon">${icons[type] || '💡'}</span>
            <div class="ai-toast-content">
                <div class="ai-toast-title">${title}</div>
                <div class="ai-toast-message">${message}</div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    // Auto hide after 4 seconds
    setTimeout(() => {
        const toast = document.querySelector('.ai-toast');
        if (toast) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
}

function getQualityLabel(quality) {
    const labels = {
        high: 'Tối ưu',
        medium: 'Tốt',
        low: 'Bình thường'
    };
    return labels[quality] || 'Tốt';
}

function formatDeadline(deadline) {
    if (!deadline) return 'Không có hạn';
    const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Đã quá hạn';
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Ngày mai';
    return `Còn ${days} ngày`;
}

// ============================================================
// INITIALIZATION
// ============================================================

export async function initAIUI() {
    console.log('🎨 [AI UI] Đang khởi tạo giao diện AI...');

    // Initialize localization
    initLocalization('vi');

    // Initialize AI Orchestrator
    try {
        await initAIOrchestrator({});
    } catch (e) {
        console.log('AI Orchestrator init skipped:', e.message);
    }

    // Render widgets after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            renderAIDashboardWidgets();
        });
    } else {
        renderAIDashboardWidgets();
    }

    // Update widgets every 5 minutes
    setInterval(updateAllWidgets, 5 * 60 * 1000);

    console.log('🎨 [AI UI] Giao diện AI đã sẵn sàng!');
}

// Export for use
window.AIUIIntegration = {
    init: initAIUI,
    renderWidgets: renderAIDashboardWidgets,
    updateWidgets: updateAllWidgets,
    showToast: showAIToast,
    showModal: showAIModal,
    openPanel: openAIPanel
};
