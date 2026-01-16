// ============================================================
// FILE: js/lifeos-creative.js
// Mục đích: LifeOS Phase 10 - Dòng chảy Sáng tạo (10 tính năng)
// ============================================================

import { showNotification, generateID, toLocalISOString } from './common.js';
import { aiPowerHub } from './ai-power-hub.js';

// ============================================================
// GLOBAL DATA
// ============================================================
let globalData = null;
let currentUser = null;

// Storage keys
const STORAGE_KEYS = {
    ideas: 'lifeos_ideas',
    creativePeaks: 'lifeos_creative_peaks',
    innovationScore: 'lifeos_innovation_score'
};

// ============================================================
// #71 - BẮT CẢM HỨNG TỨC THÌ (Inspiration Capture)
// Quick capture ideas
// ============================================================
function getIdeas() {
    const stored = localStorage.getItem(STORAGE_KEYS.ideas);
    return stored ? JSON.parse(stored) : [];
}

function captureIdea(content, category = 'general', tags = []) {
    const ideas = getIdeas();

    const newIdea = {
        id: generateID('idea'),
        content,
        category,
        tags,
        status: 'new', // new, incubating, developing, implemented, archived
        createdAt: toLocalISOString(new Date()),
        updatedAt: toLocalISOString(new Date()),
        notes: [],
        connections: []
    };

    ideas.unshift(newIdea);
    localStorage.setItem(STORAGE_KEYS.ideas, JSON.stringify(ideas));

    updateInnovationScore('capture');
    return newIdea;
}

function updateIdea(id, updates) {
    const ideas = getIdeas();
    const index = ideas.findIndex(i => i.id === id);

    if (index !== -1) {
        ideas[index] = { ...ideas[index], ...updates, updatedAt: toLocalISOString(new Date()) };
        localStorage.setItem(STORAGE_KEYS.ideas, JSON.stringify(ideas));
    }

    return ideas[index];
}

// ============================================================
// #72 - PHÁT HIỆN ĐỈNH SÁNG TẠO (Creative Peak Detector)
// Indicator creative peak
// ============================================================
function detectCreativePeak() {
    const peaks = getCreativePeaks();
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Find patterns from history
    const hourCounts = {};
    for (const peak of peaks) {
        const peakHour = new Date(peak.timestamp).getHours();
        hourCounts[peakHour] = (hourCounts[peakHour] || 0) + 1;
    }

    // Check if current hour is a peak hour
    const maxCount = Math.max(...Object.values(hourCounts), 0);
    const isPeakHour = hourCounts[hour] && hourCounts[hour] >= maxCount * 0.7;

    // Calculate current creative energy (simplified)
    let creativeEnergy = 50;
    if (isPeakHour) creativeEnergy += 30;
    if (hour >= 9 && hour <= 11) creativeEnergy += 10; // Morning boost
    if (hour >= 20 && hour <= 23) creativeEnergy += 10; // Evening creativity
    if (day === 0 || day === 6) creativeEnergy += 10; // Weekend bonus

    return {
        isAtPeak: creativeEnergy >= 70,
        creativeEnergy: Math.min(100, creativeEnergy),
        peakHours: Object.entries(hourCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([h]) => parseInt(h)),
        suggestion: creativeEnergy >= 70
            ? 'Đây là lúc tốt để làm việc sáng tạo!'
            : 'Hãy nghỉ ngơi hoặc làm việc admin'
    };
}

function getCreativePeaks() {
    const stored = localStorage.getItem(STORAGE_KEYS.creativePeaks);
    return stored ? JSON.parse(stored) : [];
}

function logCreativePeak() {
    const peaks = getCreativePeaks();
    peaks.push({
        timestamp: toLocalISOString(new Date()),
        type: 'manual_log'
    });
    localStorage.setItem(STORAGE_KEYS.creativePeaks, JSON.stringify(peaks.slice(-100)));
}

// ============================================================
// #73 - ẤP Ủ Ý TƯỞNG (Idea Incubator)
// Idea incubator timeline
// ============================================================
function getIncubatingIdeas() {
    return getIdeas().filter(i => i.status === 'incubating');
}

function incubateIdea(id) {
    return updateIdea(id, { status: 'incubating' });
}

function addIdeaNote(id, note) {
    const ideas = getIdeas();
    const idea = ideas.find(i => i.id === id);

    if (idea) {
        if (!idea.notes) idea.notes = [];
        idea.notes.push({
            content: note,
            addedAt: toLocalISOString(new Date())
        });
        localStorage.setItem(STORAGE_KEYS.ideas, JSON.stringify(ideas));
    }

    return idea;
}

// ============================================================
// #74 - KẾT HỢP Ý TƯỞNG CHÉO (Cross-Pollination)
// AI mix 2 domains
// ============================================================
async function crossPollinateIdeas(domain1, domain2) {
    try {
        const result = await aiPowerHub.call(`
            Kết hợp sáng tạo giữa 2 lĩnh vực:
            - Lĩnh vực 1: ${domain1}
            - Lĩnh vực 2: ${domain2}
            
            Hãy đề xuất 3 ý tưởng mới kết hợp cả 2 lĩnh vực.
            Format: Mỗi ý tưởng 1-2 câu, đánh số 1, 2, 3.
            Trả lời bằng tiếng Việt, sáng tạo và thực tế.
        `, { maxTokens: 300 });

        return {
            domain1,
            domain2,
            ideas: result.content,
            generatedAt: toLocalISOString(new Date())
        };
    } catch (error) {
        return { error: 'Không thể tạo ý tưởng' };
    }
}

// ============================================================
// #75 - ĐO NHIỆT ĐAM MÊ DỰ ÁN (Passion Meter)
// Passion gauge for projects
// ============================================================
function calculateProjectPassion(projectId) {
    const tasks = globalData?.tasks || [];
    const projectTasks = tasks.filter(t => t.projectId === projectId);

    if (projectTasks.length === 0) return { score: 50, level: 'unknown' };

    // Factors: completion rate, update frequency, priority distribution
    const completed = projectTasks.filter(t => t.completed).length;
    const completionRate = completed / projectTasks.length;

    const now = new Date();
    const recentTasks = projectTasks.filter(t =>
        (now - new Date(t.updatedAt || t.createdAt)) <= 7 * 24 * 60 * 60 * 1000
    ).length;

    const highPriority = projectTasks.filter(t => t.priority === 'high').length;

    let passionScore = 50;
    passionScore += completionRate * 25;
    passionScore += Math.min(recentTasks * 5, 15);
    passionScore += (highPriority / projectTasks.length) * 10;

    passionScore = Math.min(100, Math.round(passionScore));

    let level = 'low';
    if (passionScore >= 80) level = 'on_fire';
    else if (passionScore >= 60) level = 'engaged';
    else if (passionScore >= 40) level = 'maintaining';

    return { score: passionScore, level };
}

// ============================================================
// #76 - PHÁ KHỐI SÁNG TẠO (Creative Block Buster)
// AI suggest new approaches
// ============================================================
async function bustCreativeBlock(problem) {
    try {
        const result = await aiPowerHub.call(`
            Tôi đang bị stuck với vấn đề: "${problem}"
            
            Hãy gợi ý 5 cách tiếp cận khác nhau để phá vỡ creative block:
            1. Cách tiếp cận ngược
            2. Kết hợp với lĩnh vực khác
            3. Đơn giản hóa
            4. Hỏi "What if...?"
            5. Học từ thiên nhiên
            
            Mỗi gợi ý ngắn gọn 1-2 câu, thực tế.
            Trả lời bằng tiếng Việt.
        `, { maxTokens: 400 });

        return {
            problem,
            suggestions: result.content,
            generatedAt: toLocalISOString(new Date())
        };
    } catch (error) {
        return { error: 'Không thể tạo gợi ý' };
    }
}

// ============================================================
// #77 - NHÂN BẢN Ý TƯỞNG (Idea Multiplier)
// 1 idea → 10 variations
// ============================================================
async function multiplyIdea(originalIdea) {
    try {
        const result = await aiPowerHub.call(`
            Ý tưởng gốc: "${originalIdea}"
            
            Hãy tạo 10 biến thể của ý tưởng này:
            - 3 biến thể mở rộng (lớn hơn, tham vọng hơn)
            - 3 biến thể thu nhỏ (nhỏ hơn, dễ thực hiện)
            - 2 biến thể kết hợp (với lĩnh vực khác)
            - 2 biến thể ngược (đảo ngược logic)
            
            Format: Đánh số 1-10, mỗi biến thể 1 câu ngắn.
            Tiếng Việt.
        `, { maxTokens: 500 });

        return {
            original: originalIdea,
            variations: result.content,
            count: 10
        };
    } catch (error) {
        return { error: 'Không thể tạo biến thể' };
    }
}

// ============================================================
// #78 - TẠO PROTOTYPE NHANH (Rapid Prototype)
// AI tạo mockup/outline
// ============================================================
async function generatePrototype(ideaDescription, type = 'outline') {
    const prompts = {
        outline: `Tạo outline chi tiết cho: "${ideaDescription}"
                  Format: 5-7 mục chính, mỗi mục có 2-3 sub-items.`,
        features: `Liệt kê tính năng cho: "${ideaDescription}"
                   Format: MVP (5 tính năng), Nice-to-have (5 tính năng).`,
        steps: `Các bước triển khai: "${ideaDescription}"
                Format: 5 bước, mỗi bước có timeline estimate.`
    };

    try {
        const result = await aiPowerHub.call(prompts[type] || prompts.outline + '\nTiếng Việt.', { maxTokens: 500 });

        return {
            idea: ideaDescription,
            type,
            prototype: result.content
        };
    } catch (error) {
        return { error: 'Không thể tạo prototype' };
    }
}

// ============================================================
// #79 - TĂNG TỐC PHẢN HỒI (Feedback Accelerator)
// Quick feedback system
// ============================================================
function createFeedbackRequest(ideaId, reviewers = []) {
    const ideas = getIdeas();
    const idea = ideas.find(i => i.id === ideaId);

    if (!idea) return null;

    const feedbackRequest = {
        id: generateID('feedback'),
        ideaId,
        ideaContent: idea.content,
        status: 'pending',
        reviewers,
        responses: [],
        createdAt: toLocalISOString(new Date()),
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    };

    // Store feedback requests
    const requests = JSON.parse(localStorage.getItem('lifeos_feedback_requests') || '[]');
    requests.push(feedbackRequest);
    localStorage.setItem('lifeos_feedback_requests', JSON.stringify(requests));

    return feedbackRequest;
}

function addFeedbackResponse(requestId, response, reviewer = 'anonymous') {
    const requests = JSON.parse(localStorage.getItem('lifeos_feedback_requests') || '[]');
    const request = requests.find(r => r.id === requestId);

    if (request) {
        request.responses.push({
            reviewer,
            response,
            addedAt: toLocalISOString(new Date())
        });
        localStorage.setItem('lifeos_feedback_requests', JSON.stringify(requests));
    }

    return request;
}

// ============================================================
// #80 - THEO DÕI ĐIỂM ĐỔI MỚI (Innovation Score)
// Innovation score tracker
// ============================================================
function getInnovationScore() {
    const stored = localStorage.getItem(STORAGE_KEYS.innovationScore);
    return stored ? JSON.parse(stored) : { score: 0, history: [], level: 'beginner' };
}

function updateInnovationScore(action) {
    const scoreData = getInnovationScore();

    const points = {
        capture: 5,
        develop: 10,
        implement: 25,
        cross_pollinate: 15,
        multiply: 10,
        feedback: 5
    };

    scoreData.score += points[action] || 1;
    scoreData.history.push({
        action,
        points: points[action] || 1,
        timestamp: toLocalISOString(new Date())
    });

    // Keep last 100 entries
    scoreData.history = scoreData.history.slice(-100);

    // Update level
    if (scoreData.score >= 500) scoreData.level = 'innovator';
    else if (scoreData.score >= 200) scoreData.level = 'creator';
    else if (scoreData.score >= 50) scoreData.level = 'explorer';
    else scoreData.level = 'beginner';

    localStorage.setItem(STORAGE_KEYS.innovationScore, JSON.stringify(scoreData));
    return scoreData;
}

function getInnovationTrend() {
    const scoreData = getInnovationScore();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeek = scoreData.history.filter(h => new Date(h.timestamp) > weekAgo)
        .reduce((sum, h) => sum + h.points, 0);

    const lastWeek = scoreData.history.filter(h => {
        const date = new Date(h.timestamp);
        return date > twoWeeksAgo && date <= weekAgo;
    }).reduce((sum, h) => sum + h.points, 0);

    if (thisWeek > lastWeek * 1.2) return 'rising';
    if (thisWeek < lastWeek * 0.8) return 'declining';
    return 'stable';
}

// ============================================================
// UI RENDER
// ============================================================
function renderCreativeDashboard() {
    const container = document.getElementById('creative-dashboard-content');
    if (!container) return;

    const ideas = getIdeas();
    const peak = detectCreativePeak();
    const innovation = getInnovationScore();
    const trend = getInnovationTrend();

    const levelColors = {
        beginner: '#94a3b8',
        explorer: '#3b82f6',
        creator: '#8b5cf6',
        innovator: '#f59e0b'
    };

    container.innerHTML = `
        <div class="creative-grid">
            <!-- Creative Energy -->
            <div class="creative-card energy-card">
                <h3>⚡ Năng lượng Sáng tạo</h3>
                <div class="energy-gauge">
                    <div class="energy-circle" style="--energy: ${peak.creativeEnergy}">
                        <span class="energy-value">${peak.creativeEnergy}%</span>
                    </div>
                    <p class="energy-status">${peak.isAtPeak ? '🔥 Đang ở đỉnh!' : '😌 Bình thường'}</p>
                    <p class="energy-suggestion">${peak.suggestion}</p>
                </div>
                <button id="btn-log-peak" class="btn-log-peak">📍 Ghi nhận Đỉnh Sáng tạo</button>
            </div>
            
            <!-- Innovation Score -->
            <div class="creative-card innovation-card" style="border-color: ${levelColors[innovation.level]}">
                <h3>🏆 Điểm Đổi mới</h3>
                <div class="innovation-score">
                    <span class="score-value">${innovation.score}</span>
                    <span class="score-level" style="color: ${levelColors[innovation.level]}">${innovation.level.toUpperCase()}</span>
                </div>
                <div class="innovation-trend ${trend}">
                    ${trend === 'rising' ? '📈 Đang tăng' : trend === 'declining' ? '📉 Giảm' : '➡️ Ổn định'}
                </div>
            </div>
            
            <!-- Quick Capture -->
            <div class="creative-card capture-card">
                <h3>💡 Bắt Ý tưởng Nhanh</h3>
                <div class="capture-input">
                    <textarea id="idea-input" placeholder="Ghi lại ý tưởng của bạn..."></textarea>
                    <button id="btn-capture-idea" class="btn-capture">✨ Lưu Ý tưởng</button>
                </div>
            </div>
            
            <!-- Recent Ideas -->
            <div class="creative-card ideas-card">
                <h3>📝 Ý tưởng Gần đây</h3>
                <div class="ideas-list">
                    ${ideas.slice(0, 5).map(idea => `
                        <div class="idea-item ${idea.status}">
                            <span class="idea-content">${idea.content.substring(0, 50)}${idea.content.length > 50 ? '...' : ''}</span>
                            <span class="idea-status">${idea.status}</span>
                        </div>
                    `).join('') || '<p class="no-ideas">Chưa có ý tưởng nào</p>'}
                </div>
                <p class="ideas-count">Tổng: ${ideas.length} ý tưởng</p>
            </div>
            
            <!-- AI Tools -->
            <div class="creative-card ai-tools-card">
                <h3>🤖 Công cụ AI Sáng tạo</h3>
                
                <!-- Inline inputs for AI tools -->
                <div class="ai-tool-inputs" style="margin-bottom: 15px;">
                    <input type="text" id="ai-input-1" placeholder="Lĩnh vực 1 hoặc ý tưởng..." style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 8px; color: #333; background: #f9f9f9;">
                    <input type="text" id="ai-input-2" placeholder="Lĩnh vực 2 (nếu cần)..." style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; color: #333; background: #f9f9f9;">
                </div>
                
                <div class="ai-tools-list">
                    <button id="btn-cross-pollinate" class="btn-ai-tool">🔀 Kết hợp Ý tưởng</button>
                    <button id="btn-bust-block" class="btn-ai-tool">💥 Phá Creative Block</button>
                    <button id="btn-multiply-idea" class="btn-ai-tool">✖️ Nhân bản Ý tưởng</button>
                    <button id="btn-prototype" class="btn-ai-tool">📋 Tạo Prototype</button>
                </div>
                <div id="ai-tool-result" class="ai-tool-result"></div>
            </div>
        </div>
    `;

    setupCreativeEvents();
}

function setupCreativeEvents() {
    // Capture idea
    document.getElementById('btn-capture-idea')?.addEventListener('click', () => {
        const input = document.getElementById('idea-input');
        const content = input.value.trim();
        if (!content) return;

        captureIdea(content);
        input.value = '';
        showNotification('Đã lưu ý tưởng!', 'success');
        renderCreativeDashboard();
    });

    // Log peak
    document.getElementById('btn-log-peak')?.addEventListener('click', () => {
        logCreativePeak();
        showNotification('Đã ghi nhận đỉnh sáng tạo!', 'success');
    });

    // AI Tools - using inline inputs instead of popups
    document.getElementById('btn-cross-pollinate')?.addEventListener('click', async () => {
        const domain1 = document.getElementById('ai-input-1')?.value.trim();
        const domain2 = document.getElementById('ai-input-2')?.value.trim();
        if (!domain1 || !domain2) {
            showNotification('Vui lòng nhập cả 2 lĩnh vực!', 'warning');
            return;
        }

        const resultDiv = document.getElementById('ai-tool-result');
        resultDiv.innerHTML = '⏳ Đang tạo ý tưởng...';

        const result = await crossPollinateIdeas(domain1, domain2);
        resultDiv.innerHTML = `<strong>Kết hợp ${domain1} + ${domain2}:</strong><br>${result.ideas?.replace(/\n/g, '<br>') || result.error}`;
    });

    document.getElementById('btn-bust-block')?.addEventListener('click', async () => {
        const problem = document.getElementById('ai-input-1')?.value.trim();
        if (!problem) {
            showNotification('Vui lòng nhập vấn đề bạn đang stuck!', 'warning');
            return;
        }

        const resultDiv = document.getElementById('ai-tool-result');
        resultDiv.innerHTML = '⏳ Đang tìm giải pháp...';

        const result = await bustCreativeBlock(problem);
        resultDiv.innerHTML = `<strong>Gợi ý phá block:</strong><br>${result.suggestions?.replace(/\n/g, '<br>') || result.error}`;
    });

    document.getElementById('btn-multiply-idea')?.addEventListener('click', async () => {
        const idea = document.getElementById('ai-input-1')?.value.trim();
        if (!idea) {
            showNotification('Vui lòng nhập ý tưởng gốc!', 'warning');
            return;
        }

        const resultDiv = document.getElementById('ai-tool-result');
        resultDiv.innerHTML = '⏳ Đang nhân bản...';

        const result = await multiplyIdea(idea);
        resultDiv.innerHTML = `<strong>10 biến thể:</strong><br>${result.variations?.replace(/\n/g, '<br>') || result.error}`;
    });

    document.getElementById('btn-prototype')?.addEventListener('click', async () => {
        const idea = document.getElementById('ai-input-1')?.value.trim();
        if (!idea) {
            showNotification('Vui lòng nhập ý tưởng cần prototype!', 'warning');
            return;
        }

        const resultDiv = document.getElementById('ai-tool-result');
        resultDiv.innerHTML = '⏳ Đang tạo prototype...';

        const result = await generatePrototype(idea);
        resultDiv.innerHTML = `<strong>Prototype:</strong><br>${result.prototype?.replace(/\n/g, '<br>') || result.error}`;
    });
}

// ============================================================
// INIT
// ============================================================
export function initCreative(data, user) {
    globalData = data;
    currentUser = user;
    console.log('✅ LifeOS Phase 10 - Creative Flow đã sẵn sàng');

    const menuBtn = document.querySelector('[data-target="creative-dashboard"]');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            setTimeout(() => renderCreativeDashboard(), 100);
        });
    }

    // MutationObserver để auto-render khi section visible
    const section = document.getElementById('creative-dashboard');
    if (section) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (section.classList.contains('active')) {
                        console.log('🎨 Creative dashboard visible, rendering...');
                        renderCreativeDashboard();
                    }
                }
            });
        });
        observer.observe(section, { attributes: true });

        if (section.classList.contains('active')) {
            renderCreativeDashboard();
        }
    }
}

export {
    captureIdea,
    getIdeas,
    detectCreativePeak,
    logCreativePeak,
    incubateIdea,
    crossPollinateIdeas,
    calculateProjectPassion,
    bustCreativeBlock,
    multiplyIdea,
    generatePrototype,
    getInnovationScore,
    updateInnovationScore,
    renderCreativeDashboard
};
