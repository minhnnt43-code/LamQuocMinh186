// ============================================================
// FILE: js/sv5t_charts.js
// Mục đích: Biểu đồ tiến độ 5 tiêu chuẩn Sinh viên 5 tốt
// ============================================================

import { showNotification } from './common.js';

/**
 * SV5T Categories
 */
const SV5T_CATEGORIES = [
    { id: 'dao_duc', name: 'Đạo đức tốt', color: '#e74c3c', icon: '❤️' },
    { id: 'hoc_tap', name: 'Học tập tốt', color: '#3498db', icon: '📚' },
    { id: 'the_chat', name: 'Thể lực tốt', color: '#27ae60', icon: '💪' },
    { id: 'ky_nang', name: 'Kỹ năng tốt', color: '#9b59b6', icon: '🎯' },
    { id: 'hoi_nhap', name: 'Hội nhập tốt', color: '#f39c12', icon: '🌍' }
];

/**
 * Tính điểm cho từng tiêu chuẩn dựa trên hoạt động
 */
export function calculateSV5TScores(activities) {
    const scores = {
        dao_duc: 0,
        hoc_tap: 0,
        the_chat: 0,
        ky_nang: 0,
        hoi_nhap: 0
    };

    // Keywords mapping
    const keywordMap = {
        dao_duc: ['tình nguyện', 'từ thiện', 'hiến máu', 'giúp đỡ', 'thiện nguyện', 'cộng đồng'],
        hoc_tap: ['học', 'ôn thi', 'nghiên cứu', 'seminar', 'workshop', 'nckh', 'học bổng'],
        the_chat: ['thể thao', 'chạy', 'bơi', 'gym', 'bóng đá', 'cầu lông', 'thể dục'],
        ky_nang: ['kỹ năng', 'training', 'soft skill', 'giao tiếp', 'lãnh đạo', 'teamwork'],
        hoi_nhap: ['quốc tế', 'ngoại ngữ', 'exchange', 'giao lưu', 'văn hóa', 'đa dạng']
    };

    activities.forEach(activity => {
        const text = (activity.title + ' ' + (activity.description || '')).toLowerCase();

        for (const [category, keywords] of Object.entries(keywordMap)) {
            if (keywords.some(kw => text.includes(kw))) {
                scores[category] += activity.completed ? 10 : 5;
            }
        }
    });

    // Normalize scores (max 100)
    for (const key in scores) {
        scores[key] = Math.min(100, scores[key]);
    }

    return scores;
}

/**
 * Render biểu đồ radar (Canvas)
 */
export function renderRadarChart(canvasId, scores) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Canvas not found:', canvasId);
        return;
    }

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background circles
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * (i / 5), 0, Math.PI * 2);
        ctx.stroke();
    }

    // Draw axes
    const categories = Object.keys(scores);
    const angleStep = (Math.PI * 2) / categories.length;

    categories.forEach((cat, i) => {
        const angle = -Math.PI / 2 + angleStep * i;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#ccc';
        ctx.stroke();

        // Draw label
        const labelRadius = radius + 25;
        const labelX = centerX + Math.cos(angle) * labelRadius;
        const labelY = centerY + Math.sin(angle) * labelRadius;

        ctx.font = '12px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(SV5T_CATEGORIES[i].name, labelX, labelY);
    });

    // Draw data polygon
    ctx.beginPath();
    categories.forEach((cat, i) => {
        const angle = -Math.PI / 2 + angleStep * i;
        const value = scores[cat] / 100;
        const x = centerX + Math.cos(angle) * radius * value;
        const y = centerY + Math.sin(angle) * radius * value;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
    ctx.fill();
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw data points
    categories.forEach((cat, i) => {
        const angle = -Math.PI / 2 + angleStep * i;
        const value = scores[cat] / 100;
        const x = centerX + Math.cos(angle) * radius * value;
        const y = centerY + Math.sin(angle) * radius * value;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = SV5T_CATEGORIES[i].color;
        ctx.fill();
    });
}

/**
 * Render biểu đồ cột ngang (HTML)
 */
export function renderBarChart(containerId, scores) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
        <div class="sv5t-bar-chart">
            ${SV5T_CATEGORIES.map(cat => `
                <div class="bar-item">
                    <div class="bar-label">
                        <span class="bar-icon">${cat.icon}</span>
                        <span class="bar-name">${cat.name}</span>
                    </div>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${scores[cat.id]}%; background: ${cat.color}"></div>
                    </div>
                    <span class="bar-value">${scores[cat.id]}%</span>
                </div>
            `).join('')}
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Render bảng điểm chi tiết
 */
export function renderScoreCard(containerId, scores) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const avgScore = (totalScore / 5).toFixed(1);
    const grade = getGrade(avgScore);

    const html = `
        <div class="sv5t-score-card">
            <div class="score-header">
                <h3>🎖️ Tổng kết SV5T</h3>
                <div class="total-score">
                    <span class="score-number">${avgScore}</span>
                    <span class="score-grade ${grade.class}">${grade.label}</span>
                </div>
            </div>
            <div class="score-details">
                ${SV5T_CATEGORIES.map(cat => `
                    <div class="score-row">
                        <span class="score-cat">${cat.icon} ${cat.name}</span>
                        <span class="score-val">${scores[cat.id]}/100</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function getGrade(score) {
    if (score >= 80) return { label: 'Xuất sắc', class: 'grade-a' };
    if (score >= 65) return { label: 'Tốt', class: 'grade-b' };
    if (score >= 50) return { label: 'Khá', class: 'grade-c' };
    if (score >= 35) return { label: 'Trung bình', class: 'grade-d' };
    return { label: 'Cần cố gắng', class: 'grade-f' };
}

/**
 * Export biểu đồ thành ảnh
 */
export function exportChartAsImage(canvasId, filename = 'sv5t_chart.png') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();

    showNotification('📊 Đã export biểu đồ!');
}

/**
 * Inject CSS
 */
export function injectSV5TStyles() {
    const styles = `
        .sv5t-bar-chart {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .bar-item {
            display: grid;
            grid-template-columns: 140px 1fr 50px;
            align-items: center;
            gap: 15px;
        }
        
        .bar-label {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .bar-icon {
            font-size: 1.2rem;
        }
        
        .bar-name {
            font-weight: 600;
            font-size: 0.9rem;
            color: var(--text-primary);
        }
        
        .bar-container {
            height: 20px;
            background: var(--bg-secondary);
            border-radius: 10px;
            overflow: hidden;
        }
        
        .bar-fill {
            height: 100%;
            border-radius: 10px;
            transition: width 0.8s ease;
        }
        
        .bar-value {
            font-weight: 700;
            color: var(--primary-color);
        }
        
        .sv5t-score-card {
            background: var(--bg-card);
            border-radius: 16px;
            padding: 25px;
            box-shadow: var(--shadow-sm);
        }
        
        .score-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--border-color);
        }
        
        .score-header h3 {
            margin: 0;
            color: var(--text-primary);
        }
        
        .total-score {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .score-number {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary-color);
        }
        
        .score-grade {
            padding: 5px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.85rem;
        }
        
        .grade-a { background: #27ae60; color: white; }
        .grade-b { background: #2ecc71; color: white; }
        .grade-c { background: #f39c12; color: white; }
        .grade-d { background: #e67e22; color: white; }
        .grade-f { background: #e74c3c; color: white; }
        
        .score-details {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .score-row {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: var(--bg-secondary);
            border-radius: 8px;
        }
        
        .score-cat {
            font-weight: 500;
        }
        
        .score-val {
            font-weight: 700;
            color: var(--text-secondary);
        }
        
        @media (max-width: 768px) {
            .bar-item {
                grid-template-columns: 100px 1fr 40px;
            }
            
            .bar-name {
                font-size: 0.8rem;
            }
        }
        
        [data-theme="dark"] .bar-container {
            background: #1a1a1a;
        }
        
        [data-theme="dark"] .sv5t-score-card {
            background: #2a2a2a;
        }
        
        [data-theme="dark"] .score-row {
            background: #1a1a1a;
        }
    `;

    if (!document.getElementById('sv5t-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'sv5t-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }
}
