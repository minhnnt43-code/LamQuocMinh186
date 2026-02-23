// ============================================================
// FILE: js/task-analytics-view.js
// Analytics Dashboard - Thống kê chi tiết theo thời gian
// ============================================================

import { formatDate } from './common.js';

/** Normalize category: gộp 'Chung' vào 'Khác' */
function normCat(cat) {
    if (!cat || cat === 'Chung') return 'Khác';
    return cat;
}

let globalData = null;
let currentUser = null;
let currentRange = 'month'; // 'today', 'week', 'month', 'quarter', 'year', 'all'

// --- INIT ---
export function initAnalyticsView(data, user) {
    globalData = data;
    currentUser = user;
}

// --- RENDER ---
export function renderAnalyticsView() {
    const container = document.getElementById('analytics-view');
    if (!container) return;

    const tasks = globalData?.tasks || [];
    const filtered = filterByRange(tasks, currentRange);
    const stats = calculateStats(filtered, tasks);

    container.innerHTML = `
        <div class="analytics-wrapper">
            <!-- Time Range Tabs -->
            <div class="analytics-time-tabs">
                ${renderTab('today', '📅 Hôm nay')}
                ${renderTab('week', '🗓️ Tuần')}
                ${renderTab('month', '🌙 Tháng')}
                ${renderTab('quarter', '📊 Quý')}
                ${renderTab('year', '🌍 Năm')}
                ${renderTab('all', '♾️ Tất cả')}
            </div>

            <!-- Hero Metrics -->
            <div class="analytics-metrics">
                <div class="metric-card metric-total">
                    <div class="metric-icon">📝</div>
                    <div class="metric-value">${stats.total}</div>
                    <div class="metric-label">Tổng công việc</div>
                </div>
                <div class="metric-card metric-done">
                    <div class="metric-icon">✅</div>
                    <div class="metric-value">${stats.done}</div>
                    <div class="metric-label">Hoàn thành</div>
                </div>
                <div class="metric-card metric-overdue">
                    <div class="metric-icon">⚠️</div>
                    <div class="metric-value">${stats.overdue}</div>
                    <div class="metric-label">Quá hạn</div>
                </div>
                <div class="metric-card metric-rate">
                    <div class="metric-icon">🎯</div>
                    <div class="metric-ring">
                        ${renderCompletionRing(stats.completionRate)}
                    </div>
                    <div class="metric-label">Tỉ lệ hoàn thành</div>
                </div>
            </div>

            <!-- Smart Insights -->
            <div class="analytics-insights">
                ${generateInsights(stats, filtered)}
            </div>

            <!-- Charts Row -->
            <div class="analytics-charts-row">
                <!-- Donut Chart - Phân loại -->
                <div class="chart-card">
                    <h3 class="chart-title">🍕 Phân loại công việc</h3>
                    <div class="chart-body">
                        <canvas id="analytics-category-chart" width="200" height="200"></canvas>
                        <div class="chart-legend" id="analytics-category-legend"></div>
                    </div>
                </div>

                <!-- Bar Chart - Xu hướng -->
                <div class="chart-card">
                    <h3 class="chart-title">📈 Xu hướng hoàn thành</h3>
                    <div class="chart-body">
                        <div class="bar-chart-container" id="analytics-trend-chart"></div>
                    </div>
                </div>
            </div>

            <!-- Heatmap -->
            <div class="chart-card chart-card-full">
                <h3 class="chart-title">🟩 Bản đồ hoạt động (23/02/2026 → 05/02/2027)</h3>
                <div class="heatmap-container" id="analytics-heatmap"></div>
            </div>

            <!-- Category Breakdown Table -->
            <div class="chart-card chart-card-full">
                <h3 class="chart-title">📊 Chi tiết theo phân loại</h3>
                <div class="breakdown-table-container">
                    ${renderBreakdownTable(filtered)}
                </div>
            </div>
        </div>
    `;

    // Setup events & draw charts
    setupTimeTabEvents(container);
    drawCategoryDonut(filtered);
    drawTrendChart(filtered);
    drawHeatmap(tasks); // Heatmap luôn hiện cả năm
}

// --- TIME RANGE FILTER ---
function filterByRange(tasks, range) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate;
    switch (range) {
        case 'today':
            startDate = today;
            break;
        case 'week':
            startDate = new Date(today);
            const dayOfWeek = startDate.getDay() || 7;
            startDate.setDate(startDate.getDate() - dayOfWeek + 1);
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'quarter':
            const qMonth = Math.floor(today.getMonth() / 3) * 3;
            startDate = new Date(today.getFullYear(), qMonth, 1);
            break;
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            break;
        case 'all':
        default:
            return tasks;
    }

    return tasks.filter(t => {
        const created = t.createdAt ? new Date(t.createdAt) : null;
        const due = t.dueDate ? new Date(t.dueDate) : null;
        const ref = created || due;
        return ref && ref >= startDate;
    });
}

// --- STATISTICS ---
function calculateStats(filtered, allTasks) {
    const now = new Date();
    const total = filtered.length;
    const done = filtered.filter(t => t.status === 'Hoàn thành').length;
    const overdue = filtered.filter(t =>
        t.status !== 'Hoàn thành' && t.status !== 'Đã hủy' &&
        t.dueDate && new Date(t.dueDate) < now
    ).length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, done, overdue, completionRate };
}

// --- RENDER HELPERS ---
function renderTab(value, label) {
    const active = value === currentRange ? 'active' : '';
    return `<button class="analytics-tab ${active}" data-range="${value}">${label}</button>`;
}

function renderCompletionRing(percent) {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - percent / 100);

    return `
        <svg viewBox="0 0 100 100" class="completion-ring-svg">
            <circle cx="50" cy="50" r="${radius}" class="ring-bg"></circle>
            <circle cx="50" cy="50" r="${radius}" class="ring-fill"
                style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset}">
            </circle>
        </svg>
        <span class="ring-text">${percent}%</span>
    `;
}

function renderBreakdownTable(tasks) {
    const categories = {};
    tasks.forEach(t => {
        const cat = normCat(t.category);
        if (!categories[cat]) categories[cat] = { total: 0, done: 0 };
        categories[cat].total++;
        if (t.status === 'Hoàn thành') categories[cat].done++;
    });

    const rows = Object.entries(categories).map(([cat, data]) => {
        const rate = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
        return `
            <tr>
                <td class="breakdown-cat">${cat}</td>
                <td>${data.total}</td>
                <td>${data.done}</td>
                <td>${data.total - data.done}</td>
                <td>
                    <div class="breakdown-bar-wrap">
                        <div class="breakdown-bar" style="width: ${rate}%"></div>
                        <span>${rate}%</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <table class="breakdown-table">
            <thead>
                <tr>
                    <th>Phân loại</th>
                    <th>Tổng</th>
                    <th>Xong</th>
                    <th>Còn lại</th>
                    <th>Tỉ lệ</th>
                </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8">Không có dữ liệu</td></tr>'}</tbody>
        </table>
    `;
}

// --- EVENTS ---
function setupTimeTabEvents(container) {
    container.querySelectorAll('.analytics-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            currentRange = btn.dataset.range;
            renderAnalyticsView();
        });
    });
}

// --- DRAW CATEGORY DONUT ---
function drawCategoryDonut(tasks) {
    const canvas = document.getElementById('analytics-category-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const categories = {};
    tasks.forEach(t => {
        const cat = normCat(t.category);
        categories[cat] = (categories[cat] || 0) + 1;
    });

    const colors = {
        'Học tập': '#3b82f6',
        'Công việc': '#f59e0b',
        'Cá nhân': '#ec4899',
        'Gia đình': '#22c55e',
        'Khác': '#94a3b8'
    };

    const entries = Object.entries(categories);
    const total = entries.reduce((sum, [, v]) => sum + v, 0);

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (total === 0) {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(100, 100, 70, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Trống', 100, 105);
        return;
    }

    let startAngle = -Math.PI / 2;
    entries.forEach(([cat, count]) => {
        const sliceAngle = (count / total) * 2 * Math.PI;
        ctx.fillStyle = colors[cat] || '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(100, 100);
        ctx.arc(100, 100, 80, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();
        startAngle += sliceAngle;
    });

    // Center hole (donut)
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-color') || '#ffffff';
    ctx.beginPath();
    ctx.arc(100, 100, 50, 0, 2 * Math.PI);
    ctx.fill();

    // Center text
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(total, 100, 105);

    // Legend
    const legendEl = document.getElementById('analytics-category-legend');
    if (legendEl) {
        legendEl.innerHTML = entries.map(([cat, count]) => `
            <div class="legend-row">
                <span class="legend-dot" style="background:${colors[cat] || '#94a3b8'}"></span>
                <span class="legend-name">${cat}</span>
                <span class="legend-count">${count}</span>
            </div>
        `).join('');
    }
}

// --- DRAW TREND BAR CHART ---
function drawTrendChart(tasks) {
    const container = document.getElementById('analytics-trend-chart');
    if (!container) return;

    // Determine date buckets based on range
    const buckets = getTrendBuckets();
    const completed = tasks.filter(t => t.status === 'Hoàn thành' && t.completedAt);

    // Count completed per bucket
    const counts = buckets.map(b => {
        return completed.filter(t => {
            const d = new Date(t.completedAt);
            return d >= b.start && d < b.end;
        }).length;
    });

    const max = Math.max(...counts, 1);

    container.innerHTML = `
        <div class="trend-bars">
            ${buckets.map((b, i) => `
                <div class="trend-bar-col">
                    <div class="trend-bar-value">${counts[i]}</div>
                    <div class="trend-bar" style="height: ${(counts[i] / max) * 100}%"></div>
                    <div class="trend-bar-label">${b.label}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function getTrendBuckets() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const buckets = [];
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    if (currentRange === 'today') {
        // Show hours
        for (let h = 6; h <= 22; h += 2) {
            const start = new Date(today);
            start.setHours(h, 0, 0, 0);
            const end = new Date(start);
            end.setHours(h + 2);
            buckets.push({ start, end, label: `${h}h` });
        }
    } else if (currentRange === 'week') {
        for (let i = 0; i < 7; i++) {
            const start = new Date(today);
            const dow = start.getDay() || 7;
            start.setDate(start.getDate() - dow + 1 + i);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            buckets.push({ start, end, label: dayNames[start.getDay()] });
        }
    } else if (currentRange === 'month') {
        // 4 weeks
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        for (let w = 0; w < 4; w++) {
            const start = new Date(monthStart);
            start.setDate(start.getDate() + w * 7);
            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            buckets.push({ start, end, label: `Tuần ${w + 1}` });
        }
    } else if (currentRange === 'quarter') {
        const qMonth = Math.floor(today.getMonth() / 3) * 3;
        for (let m = 0; m < 3; m++) {
            const start = new Date(today.getFullYear(), qMonth + m, 1);
            const end = new Date(today.getFullYear(), qMonth + m + 1, 1);
            buckets.push({ start, end, label: `T${qMonth + m + 1}` });
        }
    } else if (currentRange === 'year') {
        for (let m = 0; m < 12; m++) {
            const start = new Date(today.getFullYear(), m, 1);
            const end = new Date(today.getFullYear(), m + 1, 1);
            buckets.push({ start, end, label: `T${m + 1}` });
        }
    } else {
        // All → last 12 months
        for (let i = 11; i >= 0; i--) {
            const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
            buckets.push({ start, end, label: `${start.getMonth() + 1}/${start.getFullYear() % 100}` });
        }
    }

    return buckets;
}

// --- DRAW HEATMAP ---
function drawHeatmap(tasks) {
    const container = document.getElementById('analytics-heatmap');
    if (!container) return;

    // Fixed range: 23/02/2026 → 31/12/2026 (giao thừa năm 2027)
    const startDate = new Date(2026, 1, 23); // 23/02/2026
    const endDate = new Date(2027, 1, 5);   // 05/02/2027

    // Count ALL tasks per day (dueDate OR createdAt)
    const dayCounts = {};
    const dayTasks = {};
    tasks.forEach(t => {
        const dates = [];
        if (t.dueDate) dates.push(t.dueDate);
        if (t.createdAt) {
            const cDate = t.createdAt.split('T')[0];
            if (!dates.includes(cDate)) dates.push(cDate);
        }
        dates.forEach(dateStr => {
            dayCounts[dateStr] = (dayCounts[dateStr] || 0) + 1;
            if (!dayTasks[dateStr]) dayTasks[dateStr] = [];
            dayTasks[dateStr].push(t);
        });
    });

    const maxCount = Math.max(...Object.values(dayCounts), 1);

    // Build weeks (columns) — GitHub-style: rows = days of week, columns = weeks
    const weeks = [];
    let currentWeek = [];
    const d = new Date(startDate);

    // Pad start: add empty cells until we reach the start day
    const startDow = d.getDay(); // 0=Sun
    for (let i = 0; i < startDow; i++) currentWeek.push(null);

    while (d <= endDate) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        currentWeek.push({ key, date: new Date(d), count: dayCounts[key] || 0 });
        if (d.getDay() === 6) { // Saturday = end of week
            weeks.push(currentWeek);
            currentWeek = [];
        }
        d.setDate(d.getDate() + 1);
    }
    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) currentWeek.push(null);
        weeks.push(currentWeek);
    }

    // Month labels
    const monthNames = ['', 'Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
    let monthLabels = '';
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
        const firstDay = week.find(c => c !== null);
        if (firstDay) {
            const m = firstDay.date.getMonth() + 1;
            if (m !== lastMonth) {
                monthLabels += `<span class="hm-month-label" style="grid-column:${wi + 1}">${monthNames[m]}</span>`;
                lastMonth = m;
            }
        }
    });

    // Build cell grid (7 rows × N columns)
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    let cellsHtml = '';
    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < weeks.length; col++) {
            const cell = weeks[col][row];
            if (!cell) {
                cellsHtml += `<div class="hm-cell hm-empty"></div>`;
            } else {
                let level = 0;
                if (cell.count > 0) level = 1;
                if (cell.count >= 2) level = 2;
                if (cell.count >= 4) level = 3;
                if (cell.count >= 6) level = 4;

                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                const isToday = cell.key === todayStr;

                const dd = cell.date.getDate();
                const mm = cell.date.getMonth() + 1;
                const titleStr = `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}: ${cell.count} việc`;

                cellsHtml += `<div class="hm-cell hm-level-${level}${isToday ? ' hm-today' : ''}" data-date="${cell.key}" data-count="${cell.count}" title="${titleStr}"></div>`;
            }
        }
    }

    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    container.innerHTML = `
        <div class="hm-wrapper">
            <div class="hm-day-labels">
                ${dayLabels.map(l => `<span>${l}</span>`).join('')}
            </div>
            <div class="hm-main">
                <div class="hm-months" style="grid-template-columns:repeat(${weeks.length},1fr)">${monthLabels}</div>
                <div class="hm-grid" style="grid-template-columns:repeat(${weeks.length},1fr);grid-template-rows:repeat(7,1fr);">${cellsHtml}</div>
            </div>
        </div>
        <div class="hm-footer">
            <span class="hm-range">23/02/2026 → 05/02/2027 (${totalDays} ngày)</span>
            <div class="hm-legend">
                <span>Ít</span>
                <div class="hm-cell hm-level-0"></div>
                <div class="hm-cell hm-level-1"></div>
                <div class="hm-cell hm-level-2"></div>
                <div class="hm-cell hm-level-3"></div>
                <div class="hm-cell hm-level-4"></div>
                <span>Nhiều</span>
            </div>
        </div>
        <div id="hm-popup" class="hm-popup"></div>
    `;

    // Click event for cells
    container.querySelectorAll('.hm-cell[data-date]').forEach(cell => {
        cell.addEventListener('click', (e) => {
            const dateStr = cell.dataset.date;
            const count = parseInt(cell.dataset.count) || 0;
            const [y, m, dd] = dateStr.split('-');
            const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(dd));
            const dayName = dateObj.toLocaleDateString('vi-VN', { weekday: 'long' });
            const dateDisplay = `${dd}/${m}/${y}`;

            const tasksOnDay = dayTasks[dateStr] || [];
            const taskListHtml = tasksOnDay.length > 0
                ? tasksOnDay.slice(0, 8).map(t => {
                    const statusIcon = t.status === 'Hoàn thành' ? '✅' : t.status === 'Đang làm' ? '🔄' : t.status === 'Đang chờ' ? '⏳' : '📋';
                    return `<div class="hm-task-item"><span>${statusIcon}</span><span>${t.name || 'Không tên'}</span></div>`;
                }).join('') + (tasksOnDay.length > 8 ? `<div class="hm-task-more">+${tasksOnDay.length - 8} việc nữa...</div>` : '')
                : '<div class="hm-task-empty">Không có công việc</div>';

            const popup = document.getElementById('hm-popup');
            popup.innerHTML = `
                <div class="hm-popup-header">
                    <div>
                        <strong>📅 ${dayName}</strong>
                        <span>${dateDisplay}</span>
                    </div>
                    <span class="hm-popup-count">${count} việc</span>
                </div>
                <div class="hm-popup-body">${taskListHtml}</div>
                <button class="hm-popup-close" title="Đóng">&times;</button>
            `;
            popup.classList.add('visible');

            // Position near the cell
            const rect = cell.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            let left = rect.left - containerRect.left + rect.width + 8;
            let top = rect.top - containerRect.top - 20;

            // Prevent overflow right
            if (left + 280 > containerRect.width) {
                left = rect.left - containerRect.left - 288;
            }
            popup.style.left = `${Math.max(0, left)}px`;
            popup.style.top = `${Math.max(0, top)}px`;

            popup.querySelector('.hm-popup-close').addEventListener('click', () => popup.classList.remove('visible'));
        });
    });

    // Close popup on outside click
    document.addEventListener('click', (e) => {
        const popup = document.getElementById('hm-popup');
        if (popup && !container.contains(e.target)) popup.classList.remove('visible');
    });
}

// --- SMART INSIGHTS ---
function generateInsights(stats, filtered) {
    const insights = [];

    // 1. Completion rate comment
    if (stats.total > 0) {
        if (stats.completionRate >= 80) {
            insights.push({ icon: '🏆', text: `Tuyệt vời! Bạn đã hoàn thành <strong>${stats.completionRate}%</strong> công việc — năng suất cực cao!`, type: 'success' });
        } else if (stats.completionRate >= 50) {
            insights.push({ icon: '👍', text: `Bạn đã hoàn thành <strong>${stats.completionRate}%</strong> công việc. Cố lên một chút nữa!`, type: 'info' });
        } else if (stats.completionRate > 0) {
            insights.push({ icon: '💪', text: `Mới hoàn thành <strong>${stats.completionRate}%</strong> — hãy tập trung hơn nhé!`, type: 'warning' });
        }
    }

    // 2. Overdue warning
    if (stats.overdue > 0) {
        insights.push({ icon: '⚠️', text: `Có <strong>${stats.overdue} task quá hạn</strong> cần xử lý ngay!`, type: 'danger' });
    }

    // 3. Top category
    const catCounts = {};
    filtered.forEach(t => {
        const cat = normCat(t.category);
        catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
    if (topCat && stats.total > 0) {
        const pct = Math.round((topCat[1] / stats.total) * 100);
        insights.push({ icon: '📌', text: `<strong>${pct}%</strong> công việc tập trung vào "${topCat[0]}"`, type: 'info' });
    }

    // 4. Productivity streak
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const hasCompletion = filtered.some(t => t.completedAt && t.completedAt.startsWith(key));
        if (hasCompletion) streak++;
        else if (i > 0) break; // Chỉ đếm chuỗi liên tiếp
    }
    if (streak >= 3) {
        insights.push({ icon: '🔥', text: `Chuỗi <strong>${streak} ngày liên tiếp</strong> hoàn thành công việc! Giữ vững nhé!`, type: 'success' });
    }

    if (insights.length === 0) {
        insights.push({ icon: '📋', text: 'Chưa đủ dữ liệu để phân tích. Hãy thêm và hoàn thành công việc!', type: 'info' });
    }

    return insights.map(i => `
        <div class="insight-card insight-${i.type}">
            <span class="insight-icon">${i.icon}</span>
            <span class="insight-text">${i.text}</span>
        </div>
    `).join('');
}
