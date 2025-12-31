// ============================================================
// FILE: js/lifeos-temporal.js
// Mục đích: LifeOS Phase 9 - Trí tuệ Thời gian (10 tính năng)
// ============================================================

import { showNotification, generateID, toLocalISOString } from './common.js';
import { aiPowerHub } from './ai-power-hub.js';

// ============================================================
// GLOBAL DATA
// ============================================================
let globalData = null;
let currentUser = null;

// ============================================================
// #1 - PHÂN TÍCH GIÁ TRỊ THỜI GIAN (Time Decay Analysis)
// Xem giá trị của task thay đổi theo thời gian
// ============================================================
function analyzeTimeDecay(tasks) {
    const now = new Date();

    return tasks.map(task => {
        if (!task.dueDate) {
            return { ...task, urgencyScore: 50, decayStatus: 'stable' };
        }

        const deadline = new Date(task.dueDate);
        const created = new Date(task.createdAt);
        const totalTime = deadline - created;
        const remainingTime = deadline - now;
        const elapsed = now - created;

        // Calculate urgency score (0-100)
        let urgencyScore = 0;
        if (remainingTime <= 0) {
            urgencyScore = 100; // Overdue
        } else {
            urgencyScore = Math.round((elapsed / totalTime) * 100);
        }

        // Determine decay status
        let decayStatus = 'stable';
        if (urgencyScore >= 90) decayStatus = 'critical';
        else if (urgencyScore >= 70) decayStatus = 'urgent';
        else if (urgencyScore >= 50) decayStatus = 'moderate';

        return {
            ...task,
            urgencyScore: Math.min(100, urgencyScore),
            decayStatus,
            remainingDays: Math.ceil(remainingTime / (1000 * 60 * 60 * 24)),
            percentComplete: urgencyScore
        };
    }).sort((a, b) => b.urgencyScore - a.urgencyScore);
}

// ============================================================
// #2 - BẢN ĐỒ NHIỆT NĂNG SUẤT (Productivity Heatmap)
// Heatmap năng suất theo giờ/ngày
// ============================================================
function generateProductivityHeatmap() {
    const tasks = globalData?.tasks || [];
    const heatmap = {};

    // Initialize heatmap grid (7 days x 24 hours)
    for (let day = 0; day < 7; day++) {
        heatmap[day] = {};
        for (let hour = 0; hour < 24; hour++) {
            heatmap[day][hour] = 0;
        }
    }

    // Count completed tasks by day and hour
    for (const task of tasks) {
        if (task.status === 'Hoàn thành' && task.completedAt) {
            const date = new Date(task.completedAt);
            const day = date.getDay();
            const hour = date.getHours();
            heatmap[day][hour]++;
        }
    }

    // Find max for normalization
    let max = 0;
    for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
            if (heatmap[day][hour] > max) max = heatmap[day][hour];
        }
    }

    // Normalize to 0-100
    for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
            heatmap[day][hour] = max > 0
                ? Math.round((heatmap[day][hour] / max) * 100)
                : 0;
        }
    }

    return {
        data: heatmap,
        peakDay: findPeakDay(heatmap),
        peakHours: findPeakHours(heatmap)
    };
}

function findPeakDay(heatmap) {
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const daySums = [];

    for (let day = 0; day < 7; day++) {
        let sum = 0;
        for (let hour = 0; hour < 24; hour++) {
            sum += heatmap[day][hour];
        }
        daySums.push({ day, name: dayNames[day], sum });
    }

    return daySums.sort((a, b) => b.sum - a.sum)[0];
}

function findPeakHours(heatmap) {
    const hourSums = [];

    for (let hour = 0; hour < 24; hour++) {
        let sum = 0;
        for (let day = 0; day < 7; day++) {
            sum += heatmap[day][hour];
        }
        hourSums.push({ hour, sum });
    }

    return hourSums.sort((a, b) => b.sum - a.sum).slice(0, 3);
}

// ============================================================
// #3 - DỰ ĐOÁN TRỄ DEADLINE (Deadline Prediction)
// AI cảnh báo task có thể trễ
// ============================================================
function predictLateDeadlines() {
    const tasks = globalData?.tasks || [];
    const now = new Date();

    const atRiskTasks = [];

    for (const task of tasks) {
        if (task.status === 'Hoàn thành' || !task.dueDate) continue;

        const deadline = new Date(task.dueDate);
        const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

        // Estimate completion likelihood based on patterns
        let riskLevel = 'low';
        let probability = 90;

        // High priority tasks need more time
        if (task.priority === 'high' && daysUntil <= 2) {
            riskLevel = 'high';
            probability = 40;
        } else if (task.priority === 'medium' && daysUntil <= 1) {
            riskLevel = 'high';
            probability = 50;
        } else if (daysUntil <= 0) {
            riskLevel = 'critical';
            probability = 20;
        } else if (daysUntil <= 1) {
            riskLevel = 'medium';
            probability = 60;
        }

        if (riskLevel !== 'low') {
            atRiskTasks.push({
                ...task,
                daysUntil,
                riskLevel,
                completionProbability: probability,
                suggestion: getSuggestion(riskLevel, daysUntil)
            });
        }
    }

    return atRiskTasks.sort((a, b) => a.completionProbability - b.completionProbability);
}

function getSuggestion(riskLevel, daysUntil) {
    if (riskLevel === 'critical') return 'Cần làm ngay hoặc xin gia hạn!';
    if (riskLevel === 'high') return 'Ưu tiên hoàn thành hôm nay';
    if (riskLevel === 'medium') return 'Nên bắt đầu ngay để tránh trễ';
    return '';
}

// ============================================================
// #4 - ĐO ROI THỜI GIAN (Time Investment ROI)
// Report: 1h làm việc = X kết quả
// ============================================================
function calculateTimeROI() {
    const tasks = globalData?.tasks || [];
    const completed = tasks.filter(t => t.status === 'Hoàn thành');

    // Group by category
    const byCategory = {};

    for (const task of completed) {
        const cat = task.category || 'Khác';
        if (!byCategory[cat]) {
            byCategory[cat] = { count: 0, highPriority: 0, avgDays: 0, totalDays: 0 };
        }

        byCategory[cat].count++;
        if (task.priority === 'high') byCategory[cat].highPriority++;

        if (task.completedAt && task.createdAt) {
            const days = (new Date(task.completedAt) - new Date(task.createdAt)) / (1000 * 60 * 60 * 24);
            byCategory[cat].totalDays += days;
        }
    }

    // Calculate ROI for each category
    const roi = [];
    for (const [cat, stats] of Object.entries(byCategory)) {
        const avgDays = stats.count > 0 ? stats.totalDays / stats.count : 0;
        const efficiency = stats.count > 0 ? (stats.highPriority / stats.count) * 100 : 0;

        roi.push({
            category: cat,
            tasksCompleted: stats.count,
            avgCompletionDays: Math.round(avgDays * 10) / 10,
            highPriorityRate: Math.round(efficiency),
            roiScore: Math.round((stats.count * 10) + (efficiency * 0.5) - (avgDays * 2))
        });
    }

    return roi.sort((a, b) => b.roiScore - a.roiScore);
}

// ============================================================
// #5 - TỐI ƯU NHỊP SINH HỌC (Chronotype Optimizer)
// Sắp lịch theo chronotype
// ============================================================
function optimizeByChronotype(chronotype = 'normal') {
    // Chronotypes: early_bird, normal, night_owl
    const schedules = {
        early_bird: {
            deepWork: '06:00 - 10:00',
            meetings: '10:00 - 12:00',
            creative: '13:00 - 15:00',
            admin: '15:00 - 17:00'
        },
        normal: {
            deepWork: '09:00 - 12:00',
            meetings: '13:00 - 15:00',
            creative: '15:00 - 17:00',
            admin: '17:00 - 18:00'
        },
        night_owl: {
            admin: '10:00 - 12:00',
            meetings: '13:00 - 15:00',
            creative: '16:00 - 19:00',
            deepWork: '20:00 - 00:00'
        }
    };

    const schedule = schedules[chronotype] || schedules.normal;

    return {
        chronotype,
        schedule,
        recommendations: getChronotypeRecommendations(chronotype)
    };
}

function getChronotypeRecommendations(type) {
    switch (type) {
        case 'early_bird':
            return [
                'Làm việc quan trọng nhất vào sáng sớm (6-10h)',
                'Tránh lên lịch cuộc họp sau 15h',
                'Nghỉ ngơi sớm, ngủ trước 22h'
            ];
        case 'night_owl':
            return [
                'Không lên lịch quan trọng trước 10h sáng',
                'Dành thời gian tối cho công việc sáng tạo',
                'Có thể làm việc muộn nếu không ảnh hưởng ngày mai'
            ];
        default:
            return [
                'Làm việc quan trọng vào buổi sáng (9-12h)',
                'Họp hành sau giờ ăn trưa',
                'Deadline cho bản thân trước 18h'
            ];
    }
}

// ============================================================
// #6 - TÍNH NỢ THỜI GIAN (Time Debt Calculator)
// Dashboard nợ thời gian từ trì hoãn
// ============================================================
function calculateTimeDebt() {
    const tasks = globalData?.tasks || [];
    const now = new Date();

    let totalDebt = 0;
    const debtItems = [];

    for (const task of tasks) {
        if (task.status === 'Hoàn thành' || !task.dueDate) continue;

        const deadline = new Date(task.dueDate);
        if (deadline < now) {
            const daysOverdue = Math.ceil((now - deadline) / (1000 * 60 * 60 * 24));
            const debtHours = daysOverdue * 2; // Estimate 2 hours debt per day overdue

            totalDebt += debtHours;
            debtItems.push({
                task: task.name,
                daysOverdue,
                debtHours,
                priority: task.priority
            });
        }
    }

    return {
        totalDebtHours: totalDebt,
        debtItems: debtItems.sort((a, b) => b.daysOverdue - a.daysOverdue),
        repaymentPlan: generateRepaymentPlan(debtItems)
    };
}

function generateRepaymentPlan(debtItems) {
    if (debtItems.length === 0) return 'Tuyệt vời! Bạn không có nợ thời gian!';

    const highPriority = debtItems.filter(d => d.priority === 'high');
    if (highPriority.length > 0) {
        return `Ưu tiên hoàn thành ${highPriority.length} task quan trọng trước`;
    }
    return `Cần hoàn thành ${debtItems.length} task để xóa nợ`;
}

// ============================================================
// #7 - MÔ PHỎNG VŨ TRỤ SONG SONG (What-If Scenarios)
// Xem nếu bạn chọn khác thì sao
// ============================================================
async function simulateAlternateReality(decision, alternativeChoice) {
    try {
        const result = await aiPowerHub.call(`
            Mô phỏng kịch bản: Nếu thay vì "${decision}", bạn đã chọn "${alternativeChoice}".
            
            Hãy tưởng tượng và mô tả ngắn gọn (3-4 câu):
            1. Kết quả ngắn hạn (1 tuần)
            2. Kết quả trung hạn (1 tháng)
            3. Bài học có thể rút ra
            
            Trả lời bằng tiếng Việt, tích cực và xây dựng.
        `, { maxTokens: 300 });

        return {
            originalDecision: decision,
            alternative: alternativeChoice,
            simulation: result.content
        };
    } catch (error) {
        return { error: 'Không thể mô phỏng' };
    }
}

// ============================================================
// #8 - VIÊN NANG THỜI GIAN AI (Time Capsule)
// Gửi notes cho tương lai
// ============================================================
function getTimeCapsules() {
    const stored = localStorage.getItem('lifeos_time_capsules');
    return stored ? JSON.parse(stored) : [];
}

function createTimeCapsule(message, openDate, category = 'general') {
    const capsules = getTimeCapsules();

    const newCapsule = {
        id: generateID('capsule'),
        message,
        openDate,
        category,
        createdAt: toLocalISOString(new Date()),
        opened: false
    };

    capsules.push(newCapsule);
    localStorage.setItem('lifeos_time_capsules', JSON.stringify(capsules));

    return newCapsule;
}

function checkOpenableCapsules() {
    const capsules = getTimeCapsules();
    const now = new Date();

    return capsules.filter(c => !c.opened && new Date(c.openDate) <= now);
}

function openCapsule(id) {
    const capsules = getTimeCapsules();
    const capsule = capsules.find(c => c.id === id);

    if (capsule) {
        capsule.opened = true;
        capsule.openedAt = toLocalISOString(new Date());
        localStorage.setItem('lifeos_time_capsules', JSON.stringify(capsules));
    }

    return capsule;
}

// ============================================================
// #9 - MA TRẬN XÁC SUẤT DEADLINE (Probability Matrix)
// % hoàn thành từng task
// ============================================================
function generateDeadlineProbabilityMatrix() {
    const tasks = globalData?.tasks || [];
    const now = new Date();

    const matrix = [];

    for (const task of tasks) {
        if (task.status === 'Hoàn thành') continue;

        let probability = 80; // Base probability

        // Adjust by deadline proximity
        if (task.dueDate) {
            const deadline = new Date(task.dueDate);
            const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

            if (daysUntil <= 0) probability -= 50;
            else if (daysUntil <= 1) probability -= 30;
            else if (daysUntil <= 3) probability -= 15;
            else if (daysUntil <= 7) probability -= 5;
        }

        // Adjust by priority
        if (task.priority === 'high') probability += 10;
        else if (task.priority === 'low') probability -= 10;

        // Ensure bounds
        probability = Math.max(5, Math.min(95, probability));

        matrix.push({
            id: task.id,
            name: task.name,
            dueDate: task.dueDate,
            priority: task.priority,
            probability,
            status: probability >= 70 ? 'likely' : probability >= 40 ? 'uncertain' : 'at_risk'
        });
    }

    return matrix.sort((a, b) => a.probability - b.probability);
}

// ============================================================
// #10 - PHÁT HIỆN BẤT THƯỜNG THỜI GIAN (Temporal Anomalies)
// Alert patterns lạ
// ============================================================
function detectTemporalAnomalies() {
    const tasks = globalData?.tasks || [];
    const anomalies = [];

    // Check for unusual patterns
    const today = new Date();
    const lastWeek = tasks.filter(t => {
        const created = new Date(t.createdAt);
        return (today - created) <= 7 * 24 * 60 * 60 * 1000;
    });

    const previousWeek = tasks.filter(t => {
        const created = new Date(t.createdAt);
        const diff = today - created;
        return diff > 7 * 24 * 60 * 60 * 1000 && diff <= 14 * 24 * 60 * 60 * 1000;
    });

    // Anomaly 1: Sudden drop in productivity
    if (lastWeek.length < previousWeek.length * 0.5 && previousWeek.length > 3) {
        anomalies.push({
            type: 'productivity_drop',
            severity: 'warning',
            message: `Số task giảm ${Math.round((1 - lastWeek.length / previousWeek.length) * 100)}% so với tuần trước`,
            suggestion: 'Kiểm tra xem có gì đang ảnh hưởng không'
        });
    }

    // Anomaly 2: Too many high priority tasks
    const highPriority = lastWeek.filter(t => t.priority === 'high');
    if (highPriority.length > lastWeek.length * 0.5 && lastWeek.length > 5) {
        anomalies.push({
            type: 'priority_inflation',
            severity: 'info',
            message: `${Math.round(highPriority.length / lastWeek.length * 100)}% tasks là ưu tiên cao`,
            suggestion: 'Cân nhắc đánh giá lại độ ưu tiên'
        });
    }

    // Anomaly 3: Overdue tasks piling up
    const overdue = tasks.filter(t => t.status !== 'Hoàn thành' && t.dueDate && new Date(t.dueDate) < today);
    if (overdue.length >= 5) {
        anomalies.push({
            type: 'overdue_pile',
            severity: 'critical',
            message: `Có ${overdue.length} task đã quá hạn`,
            suggestion: 'Cần xử lý ngay hoặc điều chỉnh deadline'
        });
    }

    // Anomaly 4: Weekend work pattern
    const weekendTasks = lastWeek.filter(t => {
        const day = new Date(t.createdAt).getDay();
        return day === 0 || day === 6;
    });
    if (weekendTasks.length > lastWeek.length * 0.4 && lastWeek.length > 5) {
        anomalies.push({
            type: 'weekend_work',
            severity: 'info',
            message: 'Bạn đang làm việc nhiều vào cuối tuần',
            suggestion: 'Cân bằng để không bị kiệt sức'
        });
    }

    return anomalies;
}

// ============================================================
// UI RENDER - TEMPORAL DASHBOARD
// ============================================================
function renderTemporalDashboard() {
    const container = document.getElementById('temporal-dashboard-content');
    if (!container) return;

    try {
        const tasks = globalData?.tasks || [];
        const decay = analyzeTimeDecay(tasks.filter(t => !t.completed));
        const heatmap = generateProductivityHeatmap();
        const atRisk = predictLateDeadlines();
        const timeDebt = calculateTimeDebt();
        const anomalies = detectTemporalAnomalies();
        const probMatrix = generateDeadlineProbabilityMatrix();

        container.innerHTML = `
        <div class="temporal-grid">
            <!-- Urgency Overview -->
            <div class="temporal-card urgency-card">
                <h3>🔥 Độ Gấp Tasks</h3>
                <div class="urgency-list">
                    ${decay.slice(0, 5).map(t => `
                        <div class="urgency-item ${t.decayStatus}">
                            <span class="urgency-title">${(t.name || t.title || 'Untitled').substring(0, 30)}${(t.name || t.title || '').length > 30 ? '...' : ''}</span>
                            <div class="urgency-bar">
                                <div class="urgency-fill" style="width: ${t.urgencyScore}%"></div>
                            </div>
                            <span class="urgency-score">${t.urgencyScore}%</span>
                        </div>
                    `).join('') || '<p style="color: #888; font-style: italic; text-align: center; padding: 15px;">Không có task nào</p>'}
                </div>
            </div>
            
            <!-- Peak Hours -->
            <div class="temporal-card peak-card">
                <h3>⏰ Giờ Năng suất Cao</h3>
                <div class="peak-info">
                    <div class="peak-day">
                        <span class="peak-label">Ngày tốt nhất</span>
                        <span class="peak-value">${heatmap.peakDay?.name || 'N/A'}</span>
                    </div>
                    <div class="peak-hours">
                        <span class="peak-label">Giờ vàng</span>
                        <div class="peak-times">
                            ${heatmap.peakHours.map(h => `<span class="time-badge">${h.hour}:00</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- At Risk -->
            <div class="temporal-card risk-card">
                <h3>⚠️ Có Nguy cơ Trễ</h3>
                <div class="risk-list">
                    ${atRisk.slice(0, 4).map(t => `
                        <div class="risk-item ${t.riskLevel}">
                            <span class="risk-title">${(t.name || t.title || 'Untitled').substring(0, 25)}...</span>
                            <span class="risk-prob">${t.completionProbability}% hoàn thành</span>
                        </div>
                    `).join('') || '<p style="color: #10b981; font-weight: 500; text-align: center; padding: 15px;">✅ Không có task nào có nguy cơ trễ!</p>'}
                </div>
            </div>
            
            <!-- Time Debt -->
            <div class="temporal-card debt-card">
                <h3>⏳ Nợ Thời gian</h3>
                <div class="debt-summary">
                    <div class="debt-amount">
                        <span class="debt-value">${timeDebt.totalDebtHours}</span>
                        <span class="debt-unit">giờ</span>
                    </div>
                    <p class="debt-plan">${timeDebt.repaymentPlan}</p>
                </div>
            </div>
            
            <!-- Anomalies -->
            <div class="temporal-card anomaly-card">
                <h3>🔍 Phát hiện Bất thường</h3>
                <div class="anomaly-list">
                    ${anomalies.map(a => `
                        <div class="anomaly-item ${a.severity}">
                            <span class="anomaly-msg">${a.message}</span>
                            <span class="anomaly-tip">${a.suggestion}</span>
                        </div>
                    `).join('') || '<p style="color: #10b981; font-weight: 500; text-align: center; padding: 15px;">✅ Mọi thứ bình thường!</p>'}
                </div>
            </div>
            
            <!-- Time Capsule -->
            <div class="temporal-card capsule-card">
                <h3>💊 Viên Nang Thời gian</h3>
                <button id="btn-create-capsule" class="btn-capsule">+ Tạo Viên nang Mới</button>
                <div id="openable-capsules" class="capsule-list">
                    ${renderOpenableCapsules()}
                </div>
            </div>
        </div>
    `;

        setupTemporalEvents();
    } catch (error) {
        console.error('❌ Temporal Dashboard Error:', error);
        container.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <h3 style="color: #ef4444;">⚠️ Lỗi hiển thị Dashboard</h3>
                <p style="color: #666;">Vui lòng kiểm tra console để xem chi tiết lỗi.</p>
                <p style="color: #888; font-size: 0.9rem;">${error.message}</p>
            </div>
        `;
    }
}

function renderOpenableCapsules() {
    const openable = checkOpenableCapsules();
    if (openable.length === 0) return '<p class="no-capsules">Chưa có viên nang nào sẵn sàng mở</p>';

    return openable.map(c => `
        <div class="capsule-item">
            <span>📬 Viên nang từ ${new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
            <button class="btn-open-capsule" data-id="${c.id}">Mở</button>
        </div>
    `).join('');
}

// ============================================================
// EVENT HANDLERS
// ============================================================
function setupTemporalEvents() {
    const btnCreate = document.getElementById('btn-create-capsule');

    if (btnCreate) {
        btnCreate.addEventListener('click', async () => {
            const message = await showCustomPrompt('💊 Viết tin nhắn cho tương lai:', '', 'Ví dụ: Nhớ ơn bản thân vì đã cố gắng!');
            if (!message) return;

            const daysStr = await showCustomPrompt('📅 Mở sau bao nhiêu ngày?', '7', 'VD: 7, 30, 365');
            const days = parseInt(daysStr) || 7;

            const openDate = new Date();
            openDate.setDate(openDate.getDate() + days);

            createTimeCapsule(message, toLocalISOString(openDate));
            showNotification(`Đã tạo viên nang! Sẽ mở vào ${openDate.toLocaleDateString('vi-VN')}`, 'success');
            renderTemporalDashboard();
        });
    }

    document.querySelectorAll('.btn-open-capsule').forEach(btn => {
        btn.addEventListener('click', () => {
            const capsule = openCapsule(btn.dataset.id);
            if (capsule) {
                alert(`📬 Tin nhắn từ quá khứ:\n\n"${capsule.message}"\n\n- Bạn, ngày ${new Date(capsule.createdAt).toLocaleDateString('vi-VN')}`);
                renderTemporalDashboard();
            }
        });
    });
}

// ============================================================
// CUSTOM PROMPT MODAL (Better than native prompt)
// ============================================================
function showCustomPrompt(title, defaultValue = '', placeholder = '') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="
                background: #fff;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                min-width: 400px;
                max-width: 500px;
            ">
                <h3 style="margin: 0 0 20px 0; color: #333; font-size: 1.2rem;">${title}</h3>
                <input type="text" 
                    value="${defaultValue}" 
                    placeholder="${placeholder}"
                    style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #ddd;
                        border-radius: 8px;
                        font-size: 1rem;
                        color: #333;
                        background: #f9f9f9;
                        box-sizing: border-box;
                    " />
                <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;">
                    <button class="btn-cancel" style="
                        padding: 10px 20px;
                        border: none;
                        border-radius: 8px;
                        background: #e0e0e0;
                        color: #333;
                        cursor: pointer;
                        font-size: 1rem;
                    ">Hủy</button>
                    <button class="btn-ok" style="
                        padding: 10px 20px;
                        border: none;
                        border-radius: 8px;
                        background: #005B96;
                        color: white;
                        cursor: pointer;
                        font-size: 1rem;
                    ">OK</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = modal.querySelector('input');
        const btnOk = modal.querySelector('.btn-ok');
        const btnCancel = modal.querySelector('.btn-cancel');

        input.focus();
        input.select();

        const close = (value) => {
            modal.remove();
            resolve(value);
        };

        btnOk.addEventListener('click', () => close(input.value.trim()));
        btnCancel.addEventListener('click', () => close(null));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close(null);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') close(input.value.trim());
            if (e.key === 'Escape') close(null);
        });
    });
}

// ============================================================
// INIT
// ============================================================
export function initTemporal(data, user) {
    globalData = data;
    currentUser = user;
    console.log('✅ LifeOS Phase 9 - Temporal Intelligence đã sẵn sàng');

    // Cách 1: Click listener cho menu button
    const menuBtn = document.querySelector('[data-target="temporal-dashboard"]');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            setTimeout(() => renderTemporalDashboard(), 100);
        });
    }

    // Cách 2: MutationObserver để auto-render khi section visible
    const section = document.getElementById('temporal-dashboard');
    if (section) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (section.classList.contains('active')) {
                        console.log('📊 Temporal dashboard visible, rendering...');
                        renderTemporalDashboard();
                    }
                }
            });
        });

        observer.observe(section, { attributes: true });

        // Cách 3: Check ngay lập tức nếu section đang active
        if (section.classList.contains('active')) {
            renderTemporalDashboard();
        }
    }
}

// Exports
export {
    analyzeTimeDecay,
    generateProductivityHeatmap,
    predictLateDeadlines,
    calculateTimeROI,
    optimizeByChronotype,
    calculateTimeDebt,
    simulateAlternateReality,
    createTimeCapsule,
    getTimeCapsules,
    generateDeadlineProbabilityMatrix,
    detectTemporalAnomalies,
    renderTemporalDashboard
};
