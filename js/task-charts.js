// ============================================================
// FILE: js/task-charts.js
// Task Analytics Charts - Pie Chart + Bar Chart
// ============================================================

let chartInstances = {
    pieChart: null,
    barChart: null
};

/**
 * Render Task Status Pie Chart
 */
export const renderTaskStatusChart = (tasks, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Destroy previous chart
    if (chartInstances.pieChart) {
        chartInstances.pieChart.destroy();
    }

    // Create canvas if not exists
    let canvas = container.querySelector('#task-pie-chart');
    if (!canvas) {
        container.innerHTML = `
            <div style="background:white;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <h4 style="margin:0 0 15px;color:#1f2937;font-size:1rem;">📊 Trạng thái công việc</h4>
                <div style="width:280px;height:280px;margin:0 auto;">
                    <canvas id="task-pie-chart"></canvas>
                </div>
            </div>
        `;
        canvas = container.querySelector('#task-pie-chart');
    }

    const ctx = canvas.getContext('2d');

    // Count tasks by status
    const statusCounts = {
        'Chưa thực hiện': 0,
        'Đang thực hiện': 0,
        'Chờ review': 0,
        'Hoàn thành': 0
    };

    tasks.forEach(t => {
        const status = t.status || 'Chưa thực hiện';
        if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status]++;
        } else {
            statusCounts['Chưa thực hiện']++;
        }
    });

    chartInstances.pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['📋 Chờ làm', '⚡ Đang làm', '👀 Review', '✅ Hoàn thành'],
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: ['#6b7280', '#3b82f6', '#f59e0b', '#10b981'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: { size: 11 }
                    }
                }
            }
        }
    });
};

/**
 * Render Tasks Completed Per Day Bar Chart
 */
export const renderTaskCompletionChart = (tasks, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Destroy previous chart
    if (chartInstances.barChart) {
        chartInstances.barChart.destroy();
    }

    // Create canvas if not exists
    let canvas = container.querySelector('#task-bar-chart');
    if (!canvas) {
        container.innerHTML = `
            <div style="background:white;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <h4 style="margin:0 0 15px;color:#1f2937;font-size:1rem;">📈 Công việc theo ngày (7 ngày qua)</h4>
                <div style="height:300px;">
                    <canvas id="task-bar-chart"></canvas>
                </div>
            </div>
        `;
        canvas = container.querySelector('#task-bar-chart');
    }

    const ctx = canvas.getContext('2d');

    // Get last 7 days
    const days = [];
    const labels = [];
    const createdCounts = [];
    const completedCounts = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        // Fix timezone: dùng local date thay vì UTC
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        days.push(dateStr);
        labels.push(d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' }));

        // Count tasks due on this day
        const dueOnDay = tasks.filter(t => t.dueDate === dateStr).length;
        createdCounts.push(dueOnDay);

        // Count tasks completed on this day (by lastUpdated)
        const completedOnDay = tasks.filter(t => {
            if (t.status !== 'Hoàn thành') return false;
            const updated = t.lastUpdated ? t.lastUpdated.split('T')[0] : null;
            return updated === dateStr;
        }).length;
        completedCounts.push(completedOnDay);
    }

    chartInstances.barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '📅 Hạn chót',
                    data: createdCounts,
                    backgroundColor: '#dbeafe',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: 6
                },
                {
                    label: '✅ Hoàn thành',
                    data: completedCounts,
                    backgroundColor: '#dcfce7',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        font: { size: 11 }
                    }
                }
            }
        }
    });
};

/**
 * Initialize charts on load
 */
export const initTaskCharts = (tasks) => {
    // Wait for Chart.js to load
    if (typeof Chart === 'undefined') {
        console.log('Chart.js not loaded yet');
        return;
    }

    // Find or create chart containers
    let pieContainer = document.getElementById('task-status-chart-container');
    let barContainer = document.getElementById('task-completion-chart-container');
    let statsContainer = document.getElementById('task-stats-container');
    let heatmapContainer = document.getElementById('task-heatmap-container');

    // If containers don't exist, create them in dashboard
    const dashboard = document.getElementById('dashboard');
    if (dashboard && (!pieContainer || !barContainer)) {
        const chartSection = document.createElement('div');
        chartSection.id = 'task-charts-section';
        chartSection.style.cssText = 'display:flex;flex-direction:column;gap:20px;margin-top:20px;';
        chartSection.innerHTML = `
            <!-- Stats Cards -->
            <div id="task-stats-container"></div>
            
            <!-- Heatmap -->
            <div id="task-heatmap-container"></div>
            
            <!-- Charts Row -->
            <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:20px;">
                <div id="task-status-chart-container"></div>
                <div id="task-completion-chart-container"></div>
            </div>
        `;

        // Insert after dashboard header or at beginning
        const dashboardContent = dashboard.querySelector('.dashboard-widgets') || dashboard;
        dashboardContent.appendChild(chartSection);

        pieContainer = document.getElementById('task-status-chart-container');
        barContainer = document.getElementById('task-completion-chart-container');
        statsContainer = document.getElementById('task-stats-container');
        heatmapContainer = document.getElementById('task-heatmap-container');
    }

    // Render all components
    if (statsContainer) renderStatsCards(tasks, 'task-stats-container');
    if (heatmapContainer) renderHeatmap(tasks, 'task-heatmap-container');
    if (pieContainer) renderTaskStatusChart(tasks, 'task-status-chart-container');
    if (barContainer) renderTaskCompletionChart(tasks, 'task-completion-chart-container');
};

/**
 * [MỚI] Render animated stats cards
 */
export const renderStatsCards = (tasks, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Calculate stats
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const completedThisWeek = tasks.filter(t => {
        if (t.status !== 'done' && !t.completed) return false;
        const updated = t.lastUpdated ? new Date(t.lastUpdated) : null;
        return updated && updated >= weekStart;
    }).length;

    const totalHours = tasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0) / 3600;
    const completionRate = tasks.length > 0
        ? Math.round((tasks.filter(t => t.status === 'done' || t.completed).length / tasks.length) * 100)
        : 0;

    // Calculate streak (consecutive days with completed tasks)
    let streak = 0;
    for (let i = 0; i < 30; i++) {
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];

        const hasCompletedTask = tasks.some(t => {
            const updated = t.lastUpdated ? t.lastUpdated.split('T')[0] : null;
            return (t.status === 'done' || t.completed) && updated === dateStr;
        });

        if (hasCompletedTask) streak++;
        else if (i > 0) break; // Break streak if gap (skip today)
    }

    container.innerHTML = `
        <div class="stats-cards-grid">
            <div class="stat-card stat-card-primary">
                <div class="stat-icon">✅</div>
                <div class="stat-value" data-target="${completedThisWeek}">0</div>
                <div class="stat-label">Tasks tuần này</div>
                <div class="stat-sparkline" id="sparkline-tasks"></div>
            </div>
            
            <div class="stat-card stat-card-success">
                <div class="stat-icon">⏱️</div>
                <div class="stat-value" data-target="${Math.round(totalHours)}">0</div>
                <div class="stat-label">Giờ làm việc</div>
                <div class="stat-unit">giờ</div>
            </div>
            
            <div class="stat-card stat-card-warning">
                <div class="stat-icon">🔥</div>
                <div class="stat-value" data-target="${streak}">0</div>
                <div class="stat-label">Streak ngày</div>
                ${streak >= 7 ? '<div class="stat-badge">🏆 Tuyệt vời!</div>' : ''}
            </div>
            
            <div class="stat-card stat-card-info">
                <div class="stat-icon">🎯</div>
                <div class="stat-value" data-target="${completionRate}">0</div>
                <div class="stat-label">Tỷ lệ hoàn thành</div>
                <div class="stat-unit">%</div>
            </div>
        </div>
    `;

    // Animate counters
    setTimeout(() => animateCounters(), 100);
};

/**
 * [MỚI] Animate counter values
 */
const animateCounters = () => {
    document.querySelectorAll('.stat-value[data-target]').forEach(el => {
        const target = parseInt(el.dataset.target);
        const duration = 1500;
        const start = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(target * easeOut);

            el.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    });
};

/**
 * [MỚI] Render GitHub-style productivity heatmap
 */
export const renderHeatmap = (tasks, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Count tasks by date
    const activityMap = {};
    tasks.forEach(t => {
        if (t.status === 'done' || t.completed || t.status === 'Hoàn thành') {
            const dateStr = t.lastUpdated ? t.lastUpdated.split('T')[0] :
                (t.createdAt ? t.createdAt.split('T')[0] : null);
            if (dateStr) {
                activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
            }
        }
    });

    // Get last 3 months
    const now = new Date();
    const months = [];
    for (let i = 2; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            name: date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }),
            year: date.getFullYear(),
            month: date.getMonth()
        });
    }

    // Generate calendar for each month
    let monthsHTML = months.map(m => {
        const firstDay = new Date(m.year, m.month, 1);
        const lastDay = new Date(m.year, m.month + 1, 0);
        const startOffset = firstDay.getDay(); // 0 = Sunday

        let daysHTML = '';

        // Empty cells for offset
        for (let i = 0; i < startOffset; i++) {
            daysHTML += '<div class="cal-day empty"></div>';
        }

        // Days of month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateStr = `${m.year}-${String(m.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const count = activityMap[dateStr] || 0;

            let level = 0;
            if (count >= 1) level = 1;
            if (count >= 3) level = 2;
            if (count >= 5) level = 3;
            if (count >= 8) level = 4;

            // Fix timezone: dùng local date thay vì UTC
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;

            daysHTML += `
                <div class="cal-day level-${level} ${isToday ? 'today' : ''}" 
                     data-date="${dateStr}" data-count="${count}"
                     onclick="showDayAnalysis('${dateStr}', ${count})"
                     title="${day}/${m.month + 1}: ${count} việc">
                    <span class="cal-day-num">${day}</span>
                </div>
            `;
        }

        return `
            <div class="cal-month">
                <div class="cal-month-name">${m.name}</div>
                <div class="cal-weekdays">
                    <span>CN</span><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span>
                </div>
                <div class="cal-grid">${daysHTML}</div>
            </div>
        `;
    }).join('');

    // Calculate stats
    const totalCompleted = Object.values(activityMap).reduce((a, b) => a + b, 0);
    const activeDays = Object.keys(activityMap).length;

    container.innerHTML = `
        <div class="activity-calendar">
            <div class="activity-header">
                <h4>📊 Hoạt động 3 tháng gần đây</h4>
                <div class="activity-stats">
                    <span><strong>${totalCompleted}</strong> việc hoàn thành</span>
                    <span><strong>${activeDays}</strong> ngày làm việc</span>
                </div>
            </div>
            <div class="cal-months-row">${monthsHTML}</div>
            <div class="cal-legend">
                <span>Ít</span>
                <div class="cal-day level-0"></div>
                <div class="cal-day level-1"></div>
                <div class="cal-day level-2"></div>
                <div class="cal-day level-3"></div>
                <div class="cal-day level-4"></div>
                <span>Nhiều</span>
            </div>
        </div>
        
        <style>
            .activity-calendar { 
                background: white; 
                border-radius: 16px; 
                padding: 24px; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.08); 
            }
            .activity-header { 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                margin-bottom: 20px; 
                flex-wrap: wrap;
                gap: 10px;
            }
            .activity-header h4 { 
                margin: 0; 
                font-size: 1.1rem; 
                color: #1f2937; 
            }
            .activity-stats { 
                display: flex; 
                gap: 20px; 
                font-size: 0.9rem; 
                color: #64748b; 
            }
            .activity-stats strong { 
                color: #10b981; 
                font-size: 1.1rem;
            }
            .cal-months-row { 
                display: grid; 
                grid-template-columns: repeat(3, 1fr); 
                gap: 20px; 
            }
            .cal-month { 
                background: #f8fafc; 
                border-radius: 12px; 
                padding: 15px; 
            }
            .cal-month-name { 
                font-weight: 600; 
                color: #374151; 
                margin-bottom: 10px; 
                text-align: center;
                font-size: 0.9rem;
            }
            .cal-weekdays { 
                display: grid; 
                grid-template-columns: repeat(7, 1fr); 
                gap: 4px; 
                margin-bottom: 8px; 
            }
            .cal-weekdays span { 
                font-size: 0.7rem; 
                color: #94a3b8; 
                text-align: center; 
            }
            .cal-grid { 
                display: grid; 
                grid-template-columns: repeat(7, 1fr); 
                gap: 4px; 
            }
            .cal-day { 
                aspect-ratio: 1; 
                border-radius: 4px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-size: 0.75rem;
                cursor: pointer;
                transition: transform 0.1s;
            }
            .cal-day:not(.empty):hover { 
                transform: scale(1.2); 
                z-index: 10;
            }
            .cal-day.empty { background: transparent; }
            .cal-day.level-0 { background: #e2e8f0; color: #64748b; }
            .cal-day.level-1 { background: #bbf7d0; color: #166534; }
            .cal-day.level-2 { background: #4ade80; color: white; }
            .cal-day.level-3 { background: #22c55e; color: white; }
            .cal-day.level-4 { background: #15803d; color: white; }
            .cal-day.today { 
                outline: 2px solid #3b82f6; 
                outline-offset: 1px; 
            }
            .cal-day-num { font-weight: 500; }
            .cal-legend { 
                display: flex; 
                justify-content: flex-end; 
                align-items: center; 
                gap: 6px; 
                margin-top: 16px; 
                font-size: 0.8rem; 
                color: #64748b; 
            }
            .cal-legend .cal-day { 
                width: 16px; 
                height: 16px; 
                aspect-ratio: auto;
            }
            @media (max-width: 768px) {
                .cal-months-row { grid-template-columns: 1fr; }
            }
        </style>
    `;
};

// Export for window access
window.initTaskCharts = initTaskCharts;
window.renderStatsCards = renderStatsCards;
window.renderHeatmap = renderHeatmap;

/**
 * AI Day Analysis - Hiển thị popup phân tích ngày
 */
window.showDayAnalysis = (dateStr, taskCount) => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('vi-VN', { weekday: 'long' });
    const dateDisplay = date.toLocaleDateString('vi-VN', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    // Fix timezone: dùng local date thay vì UTC
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isPast = dateStr < today;
    const isToday = dateStr === today;
    const isFuture = dateStr > today;

    // Generate AI analysis
    const analysis = generateAIDayAnalysis(taskCount, isPast, isToday, isFuture, dayName);

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'day-analysis-modal';
    modal.innerHTML = `
        <div class="dam-overlay" onclick="closeDayAnalysis()"></div>
        <div class="dam-content">
            <div class="dam-header">
                <div class="dam-date-badge">
                    <span class="dam-day">${date.getDate()}</span>
                    <span class="dam-month">${date.toLocaleDateString('vi-VN', { month: 'short' })}</span>
                </div>
                <div class="dam-title">
                    <h3>${dayName}</h3>
                    <p>${dateDisplay}</p>
                </div>
                <button class="dam-close" onclick="closeDayAnalysis()">×</button>
            </div>
            
            <div class="dam-body">
                <div class="dam-stats">
                    <div class="dam-stat ${taskCount > 0 ? 'active' : ''}">
                        <span class="dam-stat-icon">${taskCount > 0 ? '✅' : '📋'}</span>
                        <span class="dam-stat-value">${taskCount}</span>
                        <span class="dam-stat-label">việc hoàn thành</span>
                    </div>
                    <div class="dam-stat">
                        <span class="dam-stat-icon">${analysis.rating.icon}</span>
                        <span class="dam-stat-value">${analysis.rating.score}</span>
                        <span class="dam-stat-label">${analysis.rating.label}</span>
                    </div>
                </div>
                
                <div class="dam-ai-section">
                    <div class="dam-ai-header">
                        <span>🤖</span>
                        <span>Nhận xét AI</span>
                    </div>
                    <div class="dam-ai-message">
                        ${analysis.message}
                    </div>
                </div>
                
                ${analysis.tips.length > 0 ? `
                <div class="dam-tips">
                    <h4>💡 Gợi ý</h4>
                    <ul>
                        ${analysis.tips.map(tip => `<li>${tip}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                <div class="dam-mood">
                    <span class="dam-mood-emoji">${analysis.mood.emoji}</span>
                    <span class="dam-mood-text">${analysis.mood.text}</span>
                </div>
            </div>
            
            <div class="dam-footer">
                <button onclick="closeDayAnalysis()" class="dam-btn-primary">Đã hiểu</button>
            </div>
        </div>
        
        <style>
            #day-analysis-modal { position:fixed; top:0; left:0; right:0; bottom:0; z-index:10000; display:flex; align-items:center; justify-content:center; animation: damFadeIn 0.2s ease; }
            @keyframes damFadeIn { from { opacity:0; } to { opacity:1; } }
            @keyframes damSlideUp { from { transform:translateY(30px); opacity:0; } to { transform:translateY(0); opacity:1; } }
            .dam-overlay { position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); }
            .dam-content { position:relative; background:white; border-radius:20px; width:90%; max-width:420px; box-shadow:0 25px 80px rgba(0,0,0,0.3); animation: damSlideUp 0.3s ease; overflow:hidden; }
            .dam-header { background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; padding:20px; display:flex; align-items:center; gap:15px; }
            .dam-date-badge { background:rgba(255,255,255,0.2); border-radius:12px; padding:10px 15px; text-align:center; }
            .dam-day { font-size:1.8rem; font-weight:700; display:block; line-height:1; }
            .dam-month { font-size:0.8rem; text-transform:uppercase; opacity:0.9; }
            .dam-title { flex:1; }
            .dam-title h3 { margin:0; font-size:1.2rem; font-weight:600; }
            .dam-title p { margin:5px 0 0; font-size:0.9rem; opacity:0.9; }
            .dam-close { background:rgba(255,255,255,0.2); border:none; color:white; width:36px; height:36px; border-radius:50%; font-size:1.5rem; cursor:pointer; transition:background 0.2s; }
            .dam-close:hover { background:rgba(255,255,255,0.3); }
            .dam-body { padding:20px; }
            .dam-stats { display:flex; gap:15px; margin-bottom:20px; }
            .dam-stat { flex:1; background:#f8fafc; border-radius:12px; padding:15px; text-align:center; }
            .dam-stat.active { background:linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); }
            .dam-stat-icon { font-size:1.5rem; display:block; margin-bottom:5px; }
            .dam-stat-value { font-size:1.5rem; font-weight:700; color:#1f2937; display:block; }
            .dam-stat-label { font-size:0.75rem; color:#64748b; }
            .dam-ai-section { background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius:12px; padding:15px; margin-bottom:15px; }
            .dam-ai-header { display:flex; align-items:center; gap:8px; font-weight:600; color:#3b82f6; margin-bottom:10px; }
            .dam-ai-message { font-size:0.95rem; color:#374151; line-height:1.6; }
            .dam-tips { background:#fefce8; border-radius:12px; padding:15px; margin-bottom:15px; }
            .dam-tips h4 { margin:0 0 10px; font-size:0.9rem; color:#854d0e; }
            .dam-tips ul { margin:0; padding-left:20px; }
            .dam-tips li { font-size:0.85rem; color:#713f12; margin-bottom:5px; }
            .dam-mood { display:flex; align-items:center; gap:12px; padding:15px; background:#f1f5f9; border-radius:12px; }
            .dam-mood-emoji { font-size:2rem; }
            .dam-mood-text { font-size:0.9rem; color:#475569; }
            .dam-footer { padding:15px 20px; background:#f8fafc; display:flex; justify-content:center; }
            .dam-btn-primary { background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; border:none; padding:12px 40px; border-radius:10px; font-weight:600; font-size:1rem; cursor:pointer; transition:transform 0.2s, box-shadow 0.2s; }
            .dam-btn-primary:hover { transform:translateY(-2px); box-shadow:0 5px 20px rgba(102,126,234,0.4); }
        </style>
    `;

    document.body.appendChild(modal);
};

window.closeDayAnalysis = () => {
    const modal = document.getElementById('day-analysis-modal');
    if (modal) modal.remove();
};

function generateAIDayAnalysis(taskCount, isPast, isToday, isFuture, dayName) {
    let message = '';
    let rating = { icon: '⭐', score: '---', label: 'điểm năng suất' };
    let tips = [];
    let mood = { emoji: '🤔', text: 'Đang phân tích...' };

    if (isFuture) {
        message = `Ngày ${dayName} sắp tới! Hãy lên kế hoạch từ bây giờ để có một ngày làm việc hiệu quả.`;
        rating = { icon: '🔮', score: '?', label: 'chưa đến' };
        tips = ['Đặt 3 mục tiêu chính cho ngày này', 'Ước tính thời gian cần thiết', 'Chuẩn bị tài liệu trước'];
        mood = { emoji: '✨', text: 'Tương lai đầy tiềm năng!' };
    } else if (isToday) {
        if (taskCount === 0) {
            message = `Hôm nay mới bắt đầu! Đây là cơ hội tuyệt vời để hoàn thành những việc quan trọng. Hãy bắt đầu với task đơn giản nhất.`;
            rating = { icon: '🚀', score: '0', label: 'đang tiến hành' };
            tips = ['Bắt đầu với task 5 phút', 'Tắt thông báo gây xao nhãng', 'Nghỉ 5 phút mỗi 25 phút làm'];
            mood = { emoji: '💪', text: 'Ngày mới, năng lượng mới!' };
        } else {
            message = `Tuyệt vời! Bạn đã hoàn thành ${taskCount} việc hôm nay. ${taskCount >= 5 ? 'Đây là một ngày làm việc rất năng suất!' : 'Tiếp tục phát huy nhé!'}`;
            rating = { icon: '⭐', score: Math.min(10, Math.round(taskCount * 1.5)).toString(), label: 'điểm hôm nay' };
            mood = { emoji: taskCount >= 5 ? '🔥' : '👍', text: taskCount >= 5 ? 'Siêu sao năng suất!' : 'Đang làm tốt!' };
        }
    } else {
        // Past day
        if (taskCount === 0) {
            message = `Ngày ${dayName} không có công việc nào được hoàn thành. Có thể đây là ngày nghỉ, hoặc là cơ hội để cải thiện quy trình làm việc.`;
            rating = { icon: '😴', score: '0', label: 'điểm năng suất' };
            tips = ['Đánh giá lại mục tiêu ngày', 'Chia nhỏ công việc lớn', 'Đặt deadline rõ ràng hơn'];
            mood = { emoji: '🌙', text: 'Ngày nghỉ ngơi hoặc cần cải thiện' };
        } else if (taskCount >= 1 && taskCount <= 2) {
            message = `Bạn đã hoàn thành ${taskCount} việc trong ngày ${dayName}. Đây là một khởi đầu tốt, nhưng có thể cải thiện thêm.`;
            rating = { icon: '👌', score: (taskCount * 2).toString(), label: 'điểm' };
            tips = ['Thử kỹ thuật Pomodoro', 'Ưu tiên task quan trọng vào buổi sáng'];
            mood = { emoji: '🌱', text: 'Có tiến bộ!' };
        } else if (taskCount >= 3 && taskCount <= 5) {
            message = `Tuyệt vời! ${taskCount} việc hoàn thành trong ngày ${dayName}. Bạn đã có một ngày làm việc hiệu quả.`;
            rating = { icon: '⭐', score: (taskCount * 1.5).toFixed(0), label: 'điểm' };
            mood = { emoji: '😊', text: 'Ngày làm việc tốt!' };
        } else {
            message = `Xuất sắc! ${taskCount} việc được hoàn thành. Đây là một trong những ngày năng suất nhất của bạn! Hãy duy trì phong độ này.`;
            rating = { icon: '🏆', score: '10', label: 'điểm tuyệt đối!' };
            mood = { emoji: '🔥', text: 'Siêu sao năng suất!' };
        }
    }

    return { message, rating, tips, mood };
}
