/* ═══════════════════════════════════════════════════════════════
   UI MODULE - User Interface Helpers
   Lá Số Lâm Quốc Minh
   ═══════════════════════════════════════════════════════════════ */

const UI = {
    // Show toast notification
    toast(message, duration = 3000) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    showLoading(message = 'Đang xử lý...') {
        this.hideLoading();
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        document.body.appendChild(overlay);
    },

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.remove();
    },

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('hidden');
    },

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    },

    // Render Tứ Trụ
    renderPillars(pillars) {
        return `
            <div class="pillars-container">
                ${['hour', 'day', 'month', 'year'].map(key => {
            const p = pillars[key];
            const label = { hour: 'Giờ', day: 'Ngày', month: 'Tháng', year: 'Năm' }[key];
            const color = ELEMENT_COLORS[p.nguHanh];
            return `
                        <div class="pillar" style="border-color: ${color.color}">
                            <div class="pillar-label">${label}</div>
                            <div class="pillar-can" style="color: ${color.color}">${p.can}</div>
                            <div class="pillar-chi">${p.emoji} ${p.chi}</div>
                            <div class="pillar-element" style="background: ${color.bg}; color: ${color.color}">
                                ${color.icon} ${p.nguHanh}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    // Render Ngũ Hành chart
    renderElementsChart(elements) {
        const total = Object.values(elements).reduce((a, b) => a + b, 0);
        return `
            <div class="elements-chart">
                ${Object.entries(elements).map(([name, count]) => {
            const color = ELEMENT_COLORS[name];
            const percent = total > 0 ? (count / total * 100).toFixed(0) : 0;
            return `
                        <div class="element-bar">
                            <div class="element-label">
                                <span>${color.icon} ${name}</span>
                                <span>${count} (${percent}%)</span>
                            </div>
                            <div class="element-progress">
                                <div class="element-fill" style="width: ${percent}%; background: ${color.color}"></div>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    // Render numerology core numbers
    renderCoreNumbers(coreNumbers) {
        const labels = {
            lifePath: { icon: '🌟', name: 'Số Chủ Đạo' },
            soul: { icon: '💜', name: 'Số Linh Hồn' },
            expression: { icon: '✨', name: 'Số Biểu Đạt' },
            personality: { icon: '🎭', name: 'Số Nhân Cách' },
            birthday: { icon: '🎂', name: 'Số Ngày Sinh' },
            attitude: { icon: '😊', name: 'Số Thái Độ' }
        };

        return `
            <div class="numbers-grid">
                ${Object.entries(coreNumbers).map(([key, data]) => {
            const label = labels[key];
            const isMaster = [11, 22, 33].includes(data.value);
            return `
                        <div class="number-card ${isMaster ? 'master' : ''}">
                            <div class="number-icon">${label.icon}</div>
                            <div class="number-value">${data.value}</div>
                            <div class="number-name">${label.name}</div>
                            <div class="number-title">${data.meaning?.title || ''}</div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    // Render birthday grid
    renderBirthdayGrid(grid) {
        return `
            <div class="birthday-grid">
                ${[3, 6, 9, 2, 5, 8, 1, 4, 7].map(num => {
            const count = grid[num] || 0;
            return `
                        <div class="grid-cell ${count > 0 ? 'filled' : 'empty'}">
                            <span class="grid-number">${num}</span>
                            ${count > 0 ? `<span class="grid-count">${'●'.repeat(Math.min(count, 4))}</span>` : ''}
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    // Render Zodiac Sign Card
    renderZodiacSign(sign, title = 'Cung') {
        return `
            <div class="zodiac-card">
                <div class="zodiac-emoji">${sign.emoji}</div>
                <div class="zodiac-symbol">${sign.symbol}</div>
                <div class="zodiac-name">${sign.name}</div>
                <div class="zodiac-name-en">${sign.nameEn}</div>
                <div class="zodiac-meta">
                    <span class="zodiac-element">${sign.element}</span>
                    <span class="zodiac-ruler">${sign.ruler}</span>
                </div>
            </div>
        `;
    },

    // Render Chinese Zodiac
    renderChineseZodiac(animal, title = 'Con Giáp') {
        return `
            <div class="chinese-zodiac-card">
                <div class="cz-emoji">${animal.emoji}</div>
                <div class="cz-name">${animal.name} - ${animal.animal}</div>
                <div class="cz-element">${ELEMENT_COLORS[animal.element]?.icon || ''} ${animal.element}</div>
                <div class="cz-traits">${animal.traits.join(' • ')}</div>
            </div>
        `;
    },

    // Render Moon Phase
    renderMoonPhase(phase) {
        return `
            <div class="moon-phase-card">
                <div class="moon-emoji">${phase.emoji}</div>
                <div class="moon-name">${phase.name}</div>
                <div class="moon-illumination">${phase.percentIlluminated}% sáng</div>
                <div class="moon-meaning">${phase.meaning}</div>
                <div class="moon-energy">${phase.energy}</div>
            </div>
        `;
    },

    // Render compatibility tags
    renderCompatibility(compatible, type = 'good') {
        if (!compatible || !compatible.length) return '';
        const animals = ChineseZodiac?.ANIMALS || [];
        return compatible.map(chi => {
            const animal = animals.find(a => a.name === chi);
            return `<span class="compat-tag ${type}">${animal?.emoji || ''} ${chi}</span>`;
        }).join('');
    },

    // Render AI result
    renderAIResult(content, title = 'Phân Tích AI') {
        return `
            <div class="ai-result-card">
                <div class="ai-result-header">
                    <span>🤖 ${title}</span>
                    <span class="ai-badge">Gemini AI</span>
                </div>
                <div class="ai-result-content">${content}</div>
            </div>
        `;
    }
};

if (typeof module !== 'undefined') module.exports = UI;
