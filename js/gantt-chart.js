// ============================================================
// FILE: js/gantt-chart.js
// Góc nhìn Gantt Chart / Timeline cho Dự án
// ============================================================

import { escapeHTML, formatDate, toLocalISOString, showNotification } from './common.js';
import { saveUserData } from './firebase.js';

let globalData = null;
let currentUser = null;

// ============================================================
// INIT
// ============================================================
export function initGanttChart(userData, user) {
    globalData = userData;
    currentUser = user;

    setupGanttTab();
    console.log('✅ Gantt Chart Module initialized');
}

// ============================================================
// SETUP TAB TOGGLE (Kanban ↔ Gantt)
// ============================================================
function setupGanttTab() {
    const toggleContainer = document.getElementById('task-view-toggle');
    if (!toggleContainer) return;

    toggleContainer.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            toggleContainer.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const view = btn.dataset.taskView;
            const kanbanSection = document.getElementById('task-kanban-board');
            const ganttSection = document.getElementById('gantt-view');

            if (view === 'gantt') {
                if (kanbanSection) kanbanSection.style.display = 'none';
                if (ganttSection) {
                    ganttSection.style.display = 'block';
                    renderGantt();
                }
            } else {
                if (kanbanSection) kanbanSection.style.display = '';
                if (ganttSection) ganttSection.style.display = 'none';
            }
        });
    });

    // Listen for data changes
    window.addEventListener('kanban-refresh', () => {
        const ganttView = document.getElementById('gantt-view');
        if (ganttView && ganttView.style.display !== 'none') {
            renderGantt();
        }
    });
}

// ============================================================
// RENDER GANTT CHART
// ============================================================
function renderGantt() {
    const container = document.getElementById('gantt-view');
    if (!container) return;

    const tasks = globalData.tasks || [];
    const projects = getProjectData(tasks);

    if (projects.length === 0) {
        container.innerHTML = `
            <div class="gantt-empty">
                <div class="gantt-empty-icon">📊</div>
                <p>Chưa có dữ liệu dự án.</p>
                <p style="font-size:0.9rem; color:var(--text-color-secondary);">Hãy thêm tasks có dự án (Project) và ngày hạn (Due Date) để hiển thị Gantt Chart.</p>
            </div>
        `;
        return;
    }

    // Calculate date range
    const { minDate, maxDate, totalDays, dates } = getDateRange(projects);

    container.innerHTML = `
        <div class="gantt-chart">
            <div class="gantt-sidebar">
                <div class="gantt-sidebar-header">Dự án</div>
                ${projects.map(p => `
                    <div class="gantt-sidebar-row" title="${escapeHTML(p.name)}">
                        <span class="gantt-project-color" style="background: ${p.color}"></span>
                        <span class="gantt-project-name">${escapeHTML(p.name)}</span>
                        <span class="gantt-project-count">${p.completedTasks}/${p.totalTasks}</span>
                    </div>
                `).join('')}
            </div>
            <div class="gantt-timeline-wrapper">
                <div class="gantt-timeline" style="min-width: ${totalDays * 40}px;">
                    <div class="gantt-header-row gantt-month-row">
                        ${getMonthHeaders(dates)}
                    </div>
                    <div class="gantt-header-row">
                        ${dates.map(d => {
        const date = new Date(d);
        const isToday = d === toLocalISOString(new Date());
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        return `<div class="gantt-header-cell ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}">
                                <span class="gantt-date-day">${date.getDate()}</span>
                            </div>`;
    }).join('')}
                    </div>
                    ${projects.map(p => `
                        <div class="gantt-row">
                            ${renderGanttBar(p, minDate, totalDays)}
                            ${dates.map(d => {
        const isToday = d === toLocalISOString(new Date());
        const isWeekend = new Date(d).getDay() === 0 || new Date(d).getDay() === 6;
        return `<div class="gantt-cell ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}"></div>`;
    }).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // Add tooltip events
    container.querySelectorAll('.gantt-bar').forEach(bar => {
        bar.addEventListener('mouseenter', (e) => showGanttTooltip(e, bar));
        bar.addEventListener('mouseleave', () => hideGanttTooltip());
    });
}

// ============================================================
// HELPERS
// ============================================================
function getProjectData(tasks) {
    const projectMap = {};
    const COLORS = [
        'linear-gradient(135deg, #667eea, #764ba2)',
        'linear-gradient(135deg, #f093fb, #f5576c)',
        'linear-gradient(135deg, #4facfe, #00f2fe)',
        'linear-gradient(135deg, #43e97b, #38f9d7)',
        'linear-gradient(135deg, #fa709a, #fee140)',
        'linear-gradient(135deg, #a18cd1, #fbc2eb)',
        'linear-gradient(135deg, #fccb90, #d57eeb)',
        'linear-gradient(135deg, #667eea, #00d2ff)'
    ];

    let colorIdx = 0;

    tasks.forEach(task => {
        const projectName = task.project || task.category || 'Khác';
        if (!task.dueDate) return; // Skip tasks without dates

        if (!projectMap[projectName]) {
            projectMap[projectName] = {
                name: projectName,
                tasks: [],
                color: COLORS[colorIdx % COLORS.length],
                minDate: task.dueDate,
                maxDate: task.dueDate,
                totalTasks: 0,
                completedTasks: 0
            };
            colorIdx++;
        }

        const p = projectMap[projectName];
        p.tasks.push(task);
        p.totalTasks++;
        if (task.status === 'Hoàn thành') p.completedTasks++;
        if (task.dueDate < p.minDate) p.minDate = task.dueDate;
        if (task.dueDate > p.maxDate) p.maxDate = task.dueDate;

        // Use scheduledDate as start if available
        const startDate = task.scheduledDate || task.createdAt?.split('T')[0] || task.dueDate;
        if (startDate < p.minDate) p.minDate = startDate;
    });

    return Object.values(projectMap).sort((a, b) => a.minDate.localeCompare(b.minDate));
}

function getDateRange(projects) {
    if (projects.length === 0) return { minDate: '', maxDate: '', totalDays: 0, dates: [] };

    let min = projects[0].minDate;
    let max = projects[0].maxDate;
    projects.forEach(p => {
        if (p.minDate < min) min = p.minDate;
        if (p.maxDate > max) max = p.maxDate;
    });

    // Add 2-day padding
    const minD = new Date(min);
    minD.setDate(minD.getDate() - 2);
    const maxD = new Date(max);
    maxD.setDate(maxD.getDate() + 2);

    const dates = [];
    const current = new Date(minD);
    while (current <= maxD) {
        dates.push(toLocalISOString(current));
        current.setDate(current.getDate() + 1);
    }

    return {
        minDate: toLocalISOString(minD),
        maxDate: toLocalISOString(maxD),
        totalDays: dates.length,
        dates
    };
}

// Generate month header cells
function getMonthHeaders(dates) {
    const months = [];
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    let currentMonth = -1;
    let currentSpan = 0;

    dates.forEach((d, i) => {
        const date = new Date(d);
        const month = date.getMonth();
        if (month !== currentMonth) {
            if (currentSpan > 0) {
                months.push({ label: `${monthNames[currentMonth]} ${new Date(dates[i - 1]).getFullYear()}`, span: currentSpan });
            }
            currentMonth = month;
            currentSpan = 1;
        } else {
            currentSpan++;
        }
    });
    // Last month
    if (currentSpan > 0 && dates.length > 0) {
        const lastDate = new Date(dates[dates.length - 1]);
        months.push({ label: `${monthNames[currentMonth]} ${lastDate.getFullYear()}`, span: currentSpan });
    }

    return months.map(m => `<div class="gantt-month-cell" style="width: ${m.span * 40}px;">${m.label}</div>`).join('');
}

function renderGanttBar(project, minDate, totalDays) {
    const minD = new Date(minDate);
    const startD = new Date(project.minDate);
    const endD = new Date(project.maxDate);

    const startOffset = Math.max(0, Math.round((startD - minD) / (1000 * 60 * 60 * 24)));
    const duration = Math.max(1, Math.round((endD - startD) / (1000 * 60 * 60 * 24)) + 1);

    const progress = project.totalTasks > 0 ? Math.round((project.completedTasks / project.totalTasks) * 100) : 0;

    return `
        <div class="gantt-bar"
            style="left: ${startOffset * 40 + 4}px; width: ${duration * 40 - 8}px; background: ${project.color};"
            data-project="${escapeHTML(project.name)}"
            data-total="${project.totalTasks}"
            data-completed="${project.completedTasks}"
            data-start="${project.minDate}"
            data-end="${project.maxDate}">
            <span class="gantt-bar-label">${escapeHTML(project.name)} (${progress}%)</span>
            <div class="gantt-bar-progress" style="width: ${progress}%"></div>
        </div>
    `;
}

// ============================================================
// TOOLTIP
// ============================================================
let tooltipEl = null;

function showGanttTooltip(e, bar) {
    hideGanttTooltip();
    const project = bar.dataset.project;
    const total = bar.dataset.total;
    const completed = bar.dataset.completed;
    const start = bar.dataset.start;
    const end = bar.dataset.end;

    tooltipEl = document.createElement('div');
    tooltipEl.className = 'gantt-tooltip';
    tooltipEl.innerHTML = `
        <strong>${project}</strong><br>
        📋 ${completed}/${total} hoàn thành<br>
        📅 ${formatDate(start)} → ${formatDate(end)}
    `;
    document.body.appendChild(tooltipEl);

    const rect = bar.getBoundingClientRect();
    tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
    tooltipEl.style.top = `${rect.top - 10}px`;
}

function hideGanttTooltip() {
    if (tooltipEl) {
        tooltipEl.remove();
        tooltipEl = null;
    }
}
