// ============================================================
// FILE: js/lifeos-meta.js
// Mục đích: LifeOS Phase 12 - Phân tích Siêu cấp
// Bao gồm 10 tính năng (#91-100)
// ============================================================

import { showNotification, generateID, toLocalISOString } from './common.js';
import { aiPowerHub } from './ai-power-hub.js';
import { getUserProfile } from './ai-onboarding.js';

// ============================================================
// GLOBAL DATA
// ============================================================
let globalData = null;
let currentUser = null;

// Life dimensions for analysis
const LIFE_DIMENSIONS = [
    { id: 'work', name: 'Công việc', icon: '💼', color: '#3788d8' },
    { id: 'health', name: 'Sức khỏe', icon: '💪', color: '#28a745' },
    { id: 'finance', name: 'Tài chính', icon: '💰', color: '#ffc107' },
    { id: 'relationships', name: 'Quan hệ', icon: '👥', color: '#e83e8c' },
    { id: 'creativity', name: 'Sáng tạo', icon: '🎨', color: '#6f42c1' },
    { id: 'growth', name: 'Phát triển', icon: '📈', color: '#17a2b8' },
    { id: 'happiness', name: 'Hạnh phúc', icon: '😊', color: '#fd7e14' },
    { id: 'productivity', name: 'Năng suất', icon: '⚡', color: '#20c997' }
];

// ============================================================
// #91 - DASHBOARD ĐIỂM CUỘC SỐNG
// Central hub hiển thị tất cả data
// ============================================================
function calculateLifeScore() {
    const scores = {};
    let totalScore = 0;

    // Calculate each dimension score
    for (const dim of LIFE_DIMENSIONS) {
        scores[dim.id] = calculateDimensionScore(dim.id);
        totalScore += scores[dim.id];
    }

    const overallScore = Math.round(totalScore / LIFE_DIMENSIONS.length);

    return {
        overall: overallScore,
        dimensions: scores,
        trend: calculateTrend(),
        lastUpdated: new Date().toISOString()
    };
}

function calculateDimensionScore(dimensionId) {
    if (!globalData) return 50; // Default

    const tasks = globalData.tasks || [];
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    switch (dimensionId) {
        case 'work': {
            // Based on task completion rate
            const workTasks = tasks.filter(t =>
                t.category === 'Công việc' &&
                new Date(t.createdAt) > weekAgo
            );
            if (workTasks.length === 0) return 50;
            const completed = workTasks.filter(t => t.completed).length;
            return Math.round((completed / workTasks.length) * 100);
        }
        case 'productivity': {
            // Based on all task completion
            const recentTasks = tasks.filter(t => new Date(t.createdAt) > weekAgo);
            if (recentTasks.length === 0) return 50;
            const completed = recentTasks.filter(t => t.completed).length;
            const onTime = recentTasks.filter(t =>
                t.completed && t.deadline && new Date(t.completedAt) <= new Date(t.deadline)
            ).length;
            return Math.round(((completed / recentTasks.length) * 70 + (onTime / Math.max(completed, 1)) * 30));
        }
        case 'growth': {
            // Based on tasks with "học", "phát triển", etc
            const growthKeywords = ['học', 'đọc', 'nghiên cứu', 'phát triển', 'cải thiện', 'training'];
            const growthTasks = tasks.filter(t =>
                t.title && growthKeywords.some(k => t.title.toLowerCase().includes(k))
            );
            const recentGrowth = growthTasks.filter(t => new Date(t.createdAt) > weekAgo);
            return Math.min(100, 50 + recentGrowth.length * 10);
        }
        case 'relationships': {
            // Based on tasks with social keywords
            const socialKeywords = ['gặp', 'họp', 'gọi', 'cafe', 'ăn', 'chơi', 'bạn', 'gia đình'];
            const socialTasks = tasks.filter(t =>
                t.title && socialKeywords.some(k => t.title.toLowerCase().includes(k))
            );
            const recentSocial = socialTasks.filter(t => new Date(t.createdAt) > weekAgo);
            return Math.min(100, 40 + recentSocial.length * 15);
        }
        case 'health': {
            // Based on health-related activities
            const healthKeywords = ['tập', 'gym', 'chạy', 'yoga', 'thiền', 'ngủ', 'ăn'];
            const healthTasks = tasks.filter(t =>
                t.title && healthKeywords.some(k => t.title.toLowerCase().includes(k))
            );
            const recentHealth = healthTasks.filter(t => new Date(t.createdAt) > weekAgo);
            return Math.min(100, 30 + recentHealth.length * 20);
        }
        case 'creativity': {
            // Based on creative activities
            const creativeKeywords = ['viết', 'thiết kế', 'vẽ', 'sáng tạo', 'ý tưởng', 'brainstorm'];
            const creativeTasks = tasks.filter(t =>
                t.title && creativeKeywords.some(k => t.title.toLowerCase().includes(k))
            );
            const recentCreative = creativeTasks.filter(t => new Date(t.createdAt) > weekAgo);
            return Math.min(100, 40 + recentCreative.length * 15);
        }
        case 'finance': {
            // Placeholder - would need finance data
            return 60;
        }
        case 'happiness': {
            // Composite of other factors
            const productivity = calculateDimensionScore('productivity');
            const relationships = calculateDimensionScore('relationships');
            const health = calculateDimensionScore('health');
            return Math.round((productivity + relationships + health) / 3);
        }
        default:
            return 50;
    }
}

function calculateTrend() {
    // Compare this week to last week
    if (!globalData?.tasks) return 'stable';

    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeek = globalData.tasks.filter(t =>
        t.completed && new Date(t.completedAt || t.createdAt) > weekAgo
    ).length;

    const lastWeek = globalData.tasks.filter(t =>
        t.completed &&
        new Date(t.completedAt || t.createdAt) > twoWeeksAgo &&
        new Date(t.completedAt || t.createdAt) <= weekAgo
    ).length;

    if (thisWeek > lastWeek * 1.2) return 'up';
    if (thisWeek < lastWeek * 0.8) return 'down';
    return 'stable';
}

// ============================================================
// #92 - RADAR CÂN BẰNG CÁC CHIỀU
// Balance radar chart
// ============================================================
function generateRadarData() {
    const lifeScore = calculateLifeScore();
    return LIFE_DIMENSIONS.map(dim => ({
        ...dim,
        score: lifeScore.dimensions[dim.id] || 50
    }));
}

// ============================================================
// #93 - AI BÁO CÁO NĂM
// Auto year-in-review
// ============================================================
async function generateYearInReview() {
    const tasks = globalData?.tasks || [];
    const year = new Date().getFullYear();

    const yearTasks = tasks.filter(t =>
        new Date(t.createdAt).getFullYear() === year
    );

    const stats = {
        totalTasks: yearTasks.length,
        completed: yearTasks.filter(t => t.completed).length,
        byCategory: {},
        byMonth: {},
        topKeywords: []
    };

    // Group by category
    for (const task of yearTasks) {
        const cat = task.category || 'Khác';
        stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
    }

    // Group by month
    for (const task of yearTasks) {
        const month = new Date(task.createdAt).getMonth();
        stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
    }

    // Generate AI summary
    try {
        const result = await aiPowerHub.call(`
            Dựa trên dữ liệu năm ${year}:
            - Tổng số tasks: ${stats.totalTasks}
            - Hoàn thành: ${stats.completed} (${Math.round(stats.completed / stats.totalTasks * 100)}%)
            - Theo category: ${JSON.stringify(stats.byCategory)}
            
            Hãy viết một bản tổng kết năm ngắn gọn (3-4 câu) bằng tiếng Việt, tích cực và khích lệ.
        `, { maxTokens: 200 });

        stats.aiSummary = result.content;
    } catch (error) {
        stats.aiSummary = `Năm ${year}, bạn đã tạo ${stats.totalTasks} công việc và hoàn thành ${stats.completed}. Hãy tiếp tục phát huy!`;
    }

    return stats;
}

// ============================================================
// #94 - THEO DÕI CỘT MỐC ĐỜI
// Milestone timeline
// ============================================================
function getMilestones() {
    const stored = localStorage.getItem('lifeos_milestones');
    return stored ? JSON.parse(stored) : [];
}

function addMilestone(title, date, category, description = '') {
    const milestones = getMilestones();
    milestones.push({
        id: generateID('milestone'),
        title,
        date: date || toLocalISOString(new Date()),
        category,
        description,
        createdAt: toLocalISOString(new Date())
    });
    localStorage.setItem('lifeos_milestones', JSON.stringify(milestones));
    return milestones;
}

// ============================================================
// #95 - KHUNG GIẢM HỐI TIẾC
// Regret minimization framework
// ============================================================
async function analyzeRegret(decision, options) {
    try {
        const result = await aiPowerHub.call(`
            Phân tích quyết định: "${decision}"
            Các lựa chọn: ${JSON.stringify(options)}
            
            Sử dụng Regret Minimization Framework (Jeff Bezos):
            - Hãy tưởng tượng bạn 80 tuổi nhìn lại
            - Lựa chọn nào sẽ ít hối tiếc nhất?
            
            Trả về JSON: {"recommendation": "option_name", "reasoning": "lý do ngắn gọn", "regretScore": [1-10 cho mỗi option]}
        `, { maxTokens: 300 });

        return JSON.parse(result.content);
    } catch (error) {
        return { error: 'Không thể phân tích' };
    }
}

// ============================================================
// #96 - TÍNH ĐIỂM DI SẢN
// Legacy score
// ============================================================
function calculateLegacyScore() {
    const tasks = globalData?.tasks || [];
    const milestones = getMilestones();

    let score = 0;

    // Tasks completed
    score += tasks.filter(t => t.completed).length * 1;

    // High priority completed
    score += tasks.filter(t => t.completed && t.priority === 'high').length * 3;

    // Milestones achieved
    score += milestones.length * 10;

    // Cap at 1000
    return Math.min(1000, score);
}

// ============================================================
// #97 - CHỈ SỐ HẠNH PHÚC REAL-TIME
// Happiness gauge
// ============================================================
function calculateHappinessIndex() {
    const lifeScore = calculateLifeScore();
    const dimensions = lifeScore.dimensions;

    // Weighted average focusing on emotional factors
    const happinessWeights = {
        relationships: 0.25,
        health: 0.20,
        creativity: 0.15,
        growth: 0.15,
        productivity: 0.10,
        work: 0.10,
        finance: 0.05
    };

    let weightedSum = 0;
    for (const [dim, weight] of Object.entries(happinessWeights)) {
        weightedSum += (dimensions[dim] || 50) * weight;
    }

    return Math.round(weightedSum);
}

// ============================================================
// #98 - TỶ LỆ HIỆU QUẢ SỐNG
// Life efficiency percentage
// ============================================================
function calculateLifeEfficiency() {
    const tasks = globalData?.tasks || [];
    const today = new Date();
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const monthTasks = tasks.filter(t => new Date(t.createdAt) > monthAgo);
    if (monthTasks.length === 0) return 50;

    const completed = monthTasks.filter(t => t.completed).length;
    const onTime = monthTasks.filter(t =>
        t.completed && t.deadline &&
        new Date(t.completedAt || t.createdAt) <= new Date(t.deadline)
    ).length;

    const completionRate = completed / monthTasks.length;
    const onTimeRate = onTime / Math.max(completed, 1);

    return Math.round((completionRate * 60 + onTimeRate * 40));
}

// ============================================================
// #99 - TỐC ĐỘ PHÁT TRIỂN CÁ NHÂN
// Personal growth velocity
// ============================================================
function calculateGrowthVelocity() {
    const tasks = globalData?.tasks || [];
    const today = new Date();

    // Calculate tasks per week for last 4 weeks
    const weeks = [];
    for (let i = 0; i < 4; i++) {
        const weekStart = new Date(today.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000);

        const weekTasks = tasks.filter(t => {
            const created = new Date(t.createdAt);
            return created >= weekStart && created < weekEnd;
        });

        weeks.push(weekTasks.filter(t => t.completed).length);
    }

    // Calculate velocity (average change)
    const changes = [];
    for (let i = 0; i < weeks.length - 1; i++) {
        changes.push(weeks[i] - weeks[i + 1]);
    }

    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;

    // Convert to velocity indicator
    if (avgChange > 2) return { value: 'fast', label: 'Tăng nhanh', icon: '🚀' };
    if (avgChange > 0) return { value: 'moderate', label: 'Tăng đều', icon: '📈' };
    if (avgChange === 0) return { value: 'stable', label: 'Ổn định', icon: '➡️' };
    if (avgChange > -2) return { value: 'slow', label: 'Giảm nhẹ', icon: '📉' };
    return { value: 'declining', label: 'Giảm mạnh', icon: '⚠️' };
}

// ============================================================
// #100 - AI TỔNG HỢP HUẤN LUYỆN ĐỜI
// AI life coach synthesis
// ============================================================
async function getAILifeCoachAdvice(question = null) {
    const lifeScore = calculateLifeScore();
    const profile = getUserProfile();
    const efficiency = calculateLifeEfficiency();
    const velocity = calculateGrowthVelocity();
    const happiness = calculateHappinessIndex();

    const context = `
        THÔNG TIN NGƯỜI DÙNG:
        ${profile.occupation ? `- Nghề nghiệp: ${profile.occupation}` : ''}
        ${profile.goals ? `- Mục tiêu: ${profile.goals}` : ''}
        ${profile.challenges ? `- Thách thức: ${profile.challenges}` : ''}
        
        CHỈ SỐ HIỆN TẠI:
        - Điểm cuộc sống tổng: ${lifeScore.overall}/100
        - Xu hướng: ${lifeScore.trend}
        - Hiệu quả sống: ${efficiency}%
        - Tốc độ phát triển: ${velocity.label}
        - Chỉ số hạnh phúc: ${happiness}/100
        
        ĐIỂM TỪNG CHIỀU:
        ${Object.entries(lifeScore.dimensions).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
    `;

    const prompt = question
        ? `${context}\n\nCâu hỏi: ${question}\n\nHãy trả lời như một life coach chuyên nghiệp, ngắn gọn và thực tế.`
        : `${context}\n\nHãy đưa ra 3 lời khuyên cụ thể, ngắn gọn để cải thiện cuộc sống dựa trên dữ liệu trên.`;

    try {
        const result = await aiPowerHub.call(prompt, { maxTokens: 400 });
        return result.content;
    } catch (error) {
        return 'Hiện tại không thể kết nối AI. Vui lòng thử lại sau.';
    }
}

// ============================================================
// UI RENDER - DASHBOARD CHÍNH
// ============================================================
function renderLifeOSDashboard() {
    const container = document.getElementById('lifeos-dashboard-content');
    if (!container) return;

    try {
        const lifeScore = calculateLifeScore();
        const radarData = generateRadarData();
        const efficiency = calculateLifeEfficiency();
        const velocity = calculateGrowthVelocity();
        const happiness = calculateHappinessIndex();
        const legacy = calculateLegacyScore();

        const trendIcon = lifeScore.trend === 'up' ? '📈' : lifeScore.trend === 'down' ? '📉' : '➡️';
        const scoreColor = lifeScore.overall >= 70 ? '#28a745' : lifeScore.overall >= 50 ? '#ffc107' : '#dc3545';

        container.innerHTML = `
            <div class="lifeos-grid">
                <!-- Main Score Card -->
                <div class="lifeos-card lifeos-main-score">
                    <div class="score-circle" style="--score-color: ${scoreColor}">
                        <div class="score-value">${lifeScore.overall}</div>
                        <div class="score-label">Life Score</div>
                    </div>
                    <div class="score-trend">
                        <span class="trend-icon">${trendIcon}</span>
                        <span class="trend-text">${lifeScore.trend === 'up' ? 'Đang tiến bộ' : lifeScore.trend === 'down' ? 'Cần cải thiện' : 'Ổn định'}</span>
                    </div>
                </div>

                <!-- Quick Stats -->
                <div class="lifeos-card lifeos-quick-stats">
                    <h3>📊 Chỉ số Nhanh</h3>
                    <div class="quick-stat-item">
                        <span class="stat-label">😊 Hạnh phúc</span>
                        <div class="stat-bar">
                            <div class="stat-fill" style="width: ${happiness}%; background: #fd7e14;"></div>
                        </div>
                        <span class="stat-value">${happiness}%</span>
                    </div>
                    <div class="quick-stat-item">
                        <span class="stat-label">⚡ Hiệu quả</span>
                        <div class="stat-bar">
                            <div class="stat-fill" style="width: ${efficiency}%; background: #20c997;"></div>
                        </div>
                        <span class="stat-value">${efficiency}%</span>
                    </div>
                    <div class="quick-stat-item">
                        <span class="stat-label">📈 Phát triển</span>
                        <div class="stat-bar">
                            <div class="stat-fill" style="width: ${velocity.value === 'fast' ? 100 : velocity.value === 'moderate' ? 70 : 50}%; background: #17a2b8;"></div>
                        </div>
                        <span class="stat-value">${velocity.icon}</span>
                    </div>
                    <div class="quick-stat-item">
                        <span class="stat-label">🏆 Di sản</span>
                        <div class="stat-bar">
                            <div class="stat-fill" style="width: ${Math.min(legacy / 10, 100)}%; background: #6f42c1;"></div>
                        </div>
                        <span class="stat-value">${legacy}</span>
                    </div>
                </div>

                <!-- Dimension Cards -->
                <div class="lifeos-card lifeos-dimensions">
                    <h3>🎯 Cân bằng Cuộc sống</h3>
                    <div class="dimension-grid">
                        ${radarData.map(dim => `
                            <div class="dimension-item" style="--dim-color: ${dim.color}">
                                <span class="dim-icon">${dim.icon}</span>
                                <span class="dim-name">${dim.name}</span>
                                <div class="dim-bar">
                                    <div class="dim-fill" style="width: ${dim.score}%"></div>
                                </div>
                                <span class="dim-score">${dim.score}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- AI Coach -->
                <div class="lifeos-card lifeos-ai-coach">
                    <h3>🤖 AI Life Coach</h3>
                    <div id="ai-coach-response" class="ai-coach-response">
                        <p>Nhấn nút bên dưới để nhận lời khuyên từ AI...</p>
                    </div>
                    <div class="ai-coach-input">
                        <input type="text" id="ai-coach-question" placeholder="Hỏi AI bất cứ điều gì về cuộc sống..." />
                        <button id="btn-ask-ai-coach">💬 Hỏi</button>
                    </div>
                    <button id="btn-get-ai-advice" class="btn-ai-advice">✨ Nhận Lời khuyên AI</button>
                </div>

                <!-- Milestones -->
                <div class="lifeos-card lifeos-milestones">
                    <h3>🏁 Cột mốc Quan trọng</h3>
                    <div id="milestones-list" class="milestones-list">
                        ${renderMilestones()}
                    </div>
                    <button id="btn-add-milestone" class="btn-add-milestone">+ Thêm Cột mốc</button>
                </div>
            </div>
        `;

        setupLifeOSEvents();
    } catch (error) {
        console.error('❌ LifeOS Dashboard Error:', error);
        container.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <h3 style="color: #ef4444;">⚠️ Lỗi hiển thị Dashboard</h3>
                <p style="color: #666;">Vui lòng kiểm tra console để xem chi tiết lỗi.</p>
                <p style="color: #888; font-size: 0.9rem;">${error.message}</p>
            </div>
        `;
    }
}


function renderMilestones() {
    const milestones = getMilestones().slice(-5).reverse();
    if (milestones.length === 0) {
        return '<p class="no-milestones">Chưa có cột mốc nào. Hãy thêm cột mốc đầu tiên!</p>';
    }
    return milestones.map(m => `
        <div class="milestone-item">
            <span class="milestone-date">${new Date(m.date).toLocaleDateString('vi-VN')}</span>
            <span class="milestone-title">${m.title}</span>
        </div>
    `).join('');
}

// Helper function to format AI responses
function formatAIResponse(text) {
    if (!text) return '';

    // Split by double line breaks first (paragraphs)
    let formatted = text
        // Convert numbered lists to HTML lists
        .replace(/(\d+\.\s+\*\*[^*]+\*\*:.*?)(?=\d+\.\s+\*\*|\n\n|$)/gs, (match) => {
            return `<div class="ai-list-item">${match}</div>`;
        })
        // Convert **bold** to <strong>
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // Convert line breaks to <br> but preserve structure
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    // Wrap in paragraph if not already
    if (!formatted.startsWith('<')) {
        formatted = `<p>${formatted}</p>`;
    }

    return formatted;
}

// ============================================================
// EVENT HANDLERS
// ============================================================
function setupLifeOSEvents() {
    const btnAdvice = document.getElementById('btn-get-ai-advice');
    const btnAsk = document.getElementById('btn-ask-ai-coach');
    const btnAddMilestone = document.getElementById('btn-add-milestone');

    if (btnAdvice) {
        btnAdvice.addEventListener('click', async () => {
            const responseDiv = document.getElementById('ai-coach-response');
            responseDiv.innerHTML = '<p>⏳ Đang phân tích...</p>';

            const advice = await getAILifeCoachAdvice();
            responseDiv.innerHTML = `<p>${advice.replace(/\n/g, '<br>')}</p>`;
        });
    }

    if (btnAsk) {
        btnAsk.addEventListener('click', async () => {
            const input = document.getElementById('ai-coach-question');
            const question = input.value.trim();
            if (!question) return;

            const responseDiv = document.getElementById('ai-coach-response');
            responseDiv.innerHTML = '<p>⏳ Đang suy nghĩ...</p>';
            input.value = '';

            const answer = await getAILifeCoachAdvice(question);
            responseDiv.innerHTML = `<p><strong>Q:</strong> ${question}</p><p><strong>A:</strong> ${answer.replace(/\n/g, '<br>')}</p>`;
        });
    }

    if (btnAddMilestone) {
        btnAddMilestone.addEventListener('click', () => {
            showMilestoneModal();
        });
    }
}

// Custom modal for adding milestone (no popup)
function showMilestoneModal() {
    const modal = document.createElement('div');
    modal.id = 'milestone-modal';
    modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.7);
        display: flex; align-items: center; justify-content: center; z-index: 10000;
    `;

    modal.innerHTML = `
        <div style="background: #fff; padding: 25px; border-radius: 12px; max-width: 400px; width: 90%;">
            <h3 style="margin: 0 0 20px; color: #333;">🏁 Thêm Cột mốc Quan trọng</h3>
            <input type="text" id="milestone-title" placeholder="Tên cột mốc..."
                style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 12px; color: #333; background: #f9f9f9; box-sizing: border-box;">
            <input type="date" id="milestone-date"
                style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 15px; color: #333; background: #f9f9f9; box-sizing: border-box;">
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="document.getElementById('milestone-modal').remove()" 
                    style="padding: 10px 20px; border: none; border-radius: 8px; background: #e0e0e0; cursor: pointer;">Hủy</button>
                <button id="btn-save-milestone"
                    style="padding: 10px 20px; border: none; border-radius: 8px; background: #6f42c1; color: white; cursor: pointer;">💾 Lưu</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('milestone-title').focus();

    // Close on backdrop click
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Save handler
    document.getElementById('btn-save-milestone').addEventListener('click', () => {
        const title = document.getElementById('milestone-title').value.trim();
        if (!title) {
            showNotification('Vui lòng nhập tên cột mốc!', 'warning');
            return;
        }
        const dateVal = document.getElementById('milestone-date').value || null;
        addMilestone(title, dateVal, 'general');

        const list = document.getElementById('milestones-list');
        if (list) list.innerHTML = renderMilestones();

        modal.remove();
        showNotification('Đã thêm cột mốc!', 'success');
    });
}

// ============================================================
// INIT
// ============================================================
export function initLifeOS(data, user) {
    globalData = data;
    currentUser = user;
    console.log('✅ LifeOS Phase 12 đã sẵn sàng');

    // Cách 1: Click listener
    const menuBtn = document.querySelector('[data-target="lifeos-dashboard"]');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            setTimeout(() => renderLifeOSDashboard(), 100);
        });
    }

    // Cách 2: MutationObserver
    const section = document.getElementById('lifeos-dashboard');
    if (section) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (section.classList.contains('active')) {
                        console.log('🎯 LifeOS dashboard visible, rendering...');
                        renderLifeOSDashboard();
                    }
                }
            });
        });
        observer.observe(section, { attributes: true });

        if (section.classList.contains('active')) {
            renderLifeOSDashboard();
        }
    }
}

// Export all functions
export {
    calculateLifeScore,
    generateRadarData,
    generateYearInReview,
    getMilestones,
    addMilestone,
    analyzeRegret,
    calculateLegacyScore,
    calculateHappinessIndex,
    calculateLifeEfficiency,
    calculateGrowthVelocity,
    getAILifeCoachAdvice,
    renderLifeOSDashboard,
    LIFE_DIMENSIONS
};
