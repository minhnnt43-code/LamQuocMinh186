/**
 * ═══════════════════════════════════════════════════════════════
 * LÁ SỐ MODULE - Tích hợp vào LifeOS
 * Sử dụng Gemini API key từ LifeOS Settings
 * ═══════════════════════════════════════════════════════════════
 */

// Constants
const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const CHI_EMOJI = ['🐀', '🐂', '🐅', '🐇', '🐉', '🐍', '🐎', '🐐', '🐵', '🐔', '🐕', '🐷'];

const NGU_HANH = {
    'Giáp': 'Mộc', 'Ất': 'Mộc',
    'Bính': 'Hỏa', 'Đinh': 'Hỏa',
    'Mậu': 'Thổ', 'Kỷ': 'Thổ',
    'Canh': 'Kim', 'Tân': 'Kim',
    'Nhâm': 'Thủy', 'Quý': 'Thủy'
};

const ZODIAC_SIGNS = [
    { name: 'Bạch Dương', symbol: '♈', dates: '21/3 - 19/4', element: 'Hỏa' },
    { name: 'Kim Ngưu', symbol: '♉', dates: '20/4 - 20/5', element: 'Thổ' },
    { name: 'Song Tử', symbol: '♊', dates: '21/5 - 20/6', element: 'Khí' },
    { name: 'Cự Giải', symbol: '♋', dates: '21/6 - 22/7', element: 'Thủy' },
    { name: 'Sư Tử', symbol: '♌', dates: '23/7 - 22/8', element: 'Hỏa' },
    { name: 'Xử Nữ', symbol: '♍', dates: '23/8 - 22/9', element: 'Thổ' },
    { name: 'Thiên Bình', symbol: '♎', dates: '23/9 - 22/10', element: 'Khí' },
    { name: 'Bọ Cạp', symbol: '♏', dates: '23/10 - 21/11', element: 'Thủy' },
    { name: 'Nhân Mã', symbol: '♐', dates: '22/11 - 21/12', element: 'Hỏa' },
    { name: 'Ma Kết', symbol: '♑', dates: '22/12 - 19/1', element: 'Thổ' },
    { name: 'Bảo Bình', symbol: '♒', dates: '20/1 - 18/2', element: 'Khí' },
    { name: 'Song Ngư', symbol: '♓', dates: '19/2 - 20/3', element: 'Thủy' }
];

/**
 * Lá Số App Controller
 */
window.LasoApp = {
    profiles: [],
    activeProfile: null,
    currentPage: 'laso-dashboard',

    /**
     * Initialize the app
     */
    init() {
        this.loadProfiles();
        this.bindEvents();
        this.updateUI();
        console.log('🌙 LasoApp initialized');
    },

    /**
     * Bind navigation events
     */
    bindEvents() {
        // Use event delegation on document for LASO section
        document.addEventListener('click', (e) => {
            // Navigation buttons
            const navBtn = e.target.closest('#laso-section .laso-nav-btn');
            if (navBtn) {
                const page = navBtn.dataset.lasoPage;
                if (page) this.showPage(page);
                return;
            }

            // Dashboard cards
            const dashCard = e.target.closest('#laso-section .laso-dashboard-card');
            if (dashCard && dashCard.onclick) {
                // Already has onclick, let it handle
                return;
            }
        });

        // Chat send button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'laso-chat-send' || e.target.closest('#laso-chat-send')) {
                this.sendChatMessage();
            }
        });

        // Chat input enter key
        document.addEventListener('keypress', (e) => {
            if (e.target.id === 'laso-chat-input' && e.key === 'Enter') {
                this.sendChatMessage();
            }
        });

        console.log('🌙 LasoApp events bound via delegation');
    },

    /**
     * Show a page
     */
    showPage(pageName) {
        this.currentPage = pageName;

        // Update nav buttons within LASO section
        const lasoSection = document.getElementById('laso-section');
        if (!lasoSection) return;

        lasoSection.querySelectorAll('.laso-nav-btn').forEach(btn => {
            const isActive = btn.dataset.lasoPage === pageName;
            btn.classList.toggle('active', isActive);
            // Update button styles
            if (isActive) {
                btn.style.background = 'linear-gradient(135deg,#667eea,#764ba2)';
                btn.style.color = 'white';
                btn.style.border = 'none';
            } else {
                btn.style.background = '#f1f5f9';
                btn.style.color = '#1f2937';
                btn.style.border = '1px solid #e2e8f0';
            }
        });

        // Update pages - use display style
        lasoSection.querySelectorAll('.laso-page').forEach(page => {
            const isActive = page.id === pageName;
            page.classList.toggle('active', isActive);
            page.style.display = isActive ? 'block' : 'none';
        });

        // Load page content
        if (this.activeProfile) {
            this.loadPageContent(pageName);
        }

        console.log('🌙 LasoApp showing page:', pageName);
    },

    /**
     * Load profiles from localStorage
     */
    loadProfiles() {
        try {
            const saved = localStorage.getItem('laso_profiles');
            this.profiles = saved ? JSON.parse(saved) : [];

            const activeId = localStorage.getItem('laso_active_profile');
            if (activeId && this.profiles.length > 0) {
                this.activeProfile = this.profiles.find(p => p.id === activeId) || this.profiles[0];
            } else if (this.profiles.length > 0) {
                this.activeProfile = this.profiles[0];
            }
        } catch (e) {
            console.error('Error loading profiles:', e);
            this.profiles = [];
        }
    },

    /**
     * Save profiles to localStorage
     */
    saveProfiles() {
        localStorage.setItem('laso_profiles', JSON.stringify(this.profiles));
        if (this.activeProfile) {
            localStorage.setItem('laso_active_profile', this.activeProfile.id);
        }
    },

    /**
     * Update UI based on current state
     */
    updateUI() {
        const noProfile = document.getElementById('laso-no-profile');
        const dashboardCards = document.getElementById('laso-dashboard-cards');
        const userBadge = document.getElementById('laso-user-badge');

        if (this.profiles.length === 0) {
            if (noProfile) noProfile.style.display = 'block';
            if (dashboardCards) dashboardCards.style.display = 'none';
            if (userBadge) userBadge.innerHTML = '';
        } else {
            if (noProfile) noProfile.style.display = 'none';
            if (dashboardCards) dashboardCards.style.display = 'grid';
            if (userBadge && this.activeProfile) {
                userBadge.innerHTML = `👤 ${this.activeProfile.name}`;
            }
        }

        this.renderProfileList();
    },

    /**
     * Open profile modal
     */
    openProfileModal() {
        const modal = document.getElementById('laso-profile-modal');
        if (modal) modal.style.display = 'flex';
        document.getElementById('laso-profile-form')?.reset();
    },

    /**
     * Close profile modal
     */
    closeProfileModal() {
        const modal = document.getElementById('laso-profile-modal');
        if (modal) modal.style.display = 'none';
    },

    /**
     * Create a new profile
     */
    createProfile() {
        const name = document.getElementById('laso-profile-name')?.value.trim();
        const birthDate = document.getElementById('laso-profile-birthdate')?.value;
        const gender = document.getElementById('laso-profile-gender')?.value || 'male';
        const birthHour = document.getElementById('laso-profile-hour')?.value || null;

        if (!name || !birthDate) {
            this.showToast('⚠️ Vui lòng nhập đầy đủ thông tin');
            return;
        }

        const profile = {
            id: Date.now().toString(),
            name,
            birthDate,
            gender,
            birthHour: birthHour ? parseInt(birthHour) : null,
            createdAt: new Date().toISOString()
        };

        // Calculate astrology data
        profile.battu = this.calculateBattu(birthDate, birthHour);
        profile.numerology = this.calculateNumerology(birthDate, name);
        profile.zodiac = this.getZodiacSign(birthDate);
        profile.chineseZodiac = this.getChineseZodiac(birthDate);

        this.profiles.push(profile);
        this.activeProfile = profile;
        this.saveProfiles();
        this.closeProfileModal();
        this.updateUI();
        this.showPage('laso-dashboard');
        this.showToast('✨ Đã tạo hồ sơ: ' + name);
    },

    /**
     * Delete a profile
     */
    deleteProfile(profileId) {
        if (!confirm('Bạn có chắc muốn xóa hồ sơ này?')) return;

        this.profiles = this.profiles.filter(p => p.id !== profileId);

        if (this.activeProfile?.id === profileId) {
            this.activeProfile = this.profiles[0] || null;
        }

        this.saveProfiles();
        this.updateUI();
        this.showToast('Đã xóa hồ sơ');
    },

    /**
     * Switch active profile
     */
    switchProfile(profileId) {
        const profile = this.profiles.find(p => p.id === profileId);
        if (profile) {
            this.activeProfile = profile;
            this.saveProfiles();
            this.updateUI();
            this.loadPageContent(this.currentPage);
            this.showToast(`Đã chọn: ${profile.name}`);
        }
    },

    /**
     * Render profile list
     */
    renderProfileList() {
        const container = document.getElementById('laso-profile-list');
        if (!container) return;

        if (this.profiles.length === 0) {
            container.innerHTML = '<p style="color:#94a3b8; text-align:center;">Chưa có hồ sơ nào</p>';
            return;
        }

        container.innerHTML = this.profiles.map(p => `
            <div class="laso-profile-item" style="
                display:flex; justify-content:space-between; align-items:center;
                padding:15px; background:#f8fafc; border-radius:12px;
                margin-bottom:10px; border:1px solid ${p.id === this.activeProfile?.id ? '#667eea' : '#e2e8f0'};
            ">
                <div onclick="LasoApp.switchProfile('${p.id}')" style="cursor:pointer; flex:1;">
                    <div style="font-weight:600; color:#1f2937;">${p.name}</div>
                    <div style="font-size:0.85rem; color:#64748b;">
                        ${this.formatDate(p.birthDate)} • ${p.chineseZodiac?.animal || ''}
                    </div>
                </div>
                <button onclick="LasoApp.deleteProfile('${p.id}')" 
                    style="background:#ef4444; border:none; color:white; padding:8px 12px; border-radius:8px; cursor:pointer;">
                    🗑️
                </button>
            </div>
        `).join('');
    },

    /**
     * Load page content based on active profile
     */
    loadPageContent(pageName) {
        if (!this.activeProfile) return;

        switch (pageName) {
            case 'laso-battu':
                this.renderBattu();
                break;
            case 'laso-numerology':
                this.renderNumerology();
                break;
            case 'laso-zodiac':
                this.renderZodiac();
                break;
            case 'laso-congap':
                this.renderChineseZodiac();
                break;
            case 'laso-daily':
                this.renderDailyPrediction();
                break;
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CALCULATION METHODS
    // ═══════════════════════════════════════════════════════════════

    calculateBattu(birthDate, birthHour) {
        const date = new Date(birthDate);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        // Calculate Can Chi
        const canYear = CAN[(year - 4) % 10];
        const chiYear = CHI[(year - 4) % 12];
        const canMonth = CAN[(year * 12 + month + 3) % 10];
        const chiMonth = CHI[(month + 1) % 12];

        return {
            year: { can: canYear, chi: chiYear, nguHanh: NGU_HANH[canYear] },
            month: { can: canMonth, chi: chiMonth, nguHanh: NGU_HANH[canMonth] },
            day: { can: CAN[day % 10], chi: CHI[day % 12] },
            hour: birthHour ? { can: CAN[birthHour % 10], chi: CHI[Math.floor(birthHour / 2) % 12] } : null
        };
    },

    calculateNumerology(birthDate, name) {
        const date = new Date(birthDate);
        const digits = birthDate.replace(/-/g, '').split('').map(Number);

        // Life Path Number
        let sum = digits.reduce((a, b) => a + b, 0);
        while (sum > 9 && sum !== 11 && sum !== 22) {
            sum = sum.toString().split('').map(Number).reduce((a, b) => a + b, 0);
        }

        return {
            lifePathNumber: sum,
            birthDay: date.getDate(),
            birthMonth: date.getMonth() + 1,
            birthYear: date.getFullYear()
        };
    },

    getZodiacSign(birthDate) {
        const date = new Date(birthDate);
        const month = date.getMonth() + 1;
        const day = date.getDate();

        const zodiacDates = [
            [1, 20], [2, 19], [3, 21], [4, 20], [5, 21], [6, 21],
            [7, 23], [8, 23], [9, 23], [10, 23], [11, 22], [12, 22]
        ];

        let signIndex = month - 1;
        if (day < zodiacDates[month - 1][1]) {
            signIndex = (signIndex + 11) % 12;
        }

        return ZODIAC_SIGNS[signIndex];
    },

    getChineseZodiac(birthDate) {
        const year = new Date(birthDate).getFullYear();
        const index = (year - 4) % 12;
        return {
            animal: CHI[index],
            emoji: CHI_EMOJI[index],
            element: NGU_HANH[CAN[(year - 4) % 10]]
        };
    },

    // ═══════════════════════════════════════════════════════════════
    // RENDER METHODS
    // ═══════════════════════════════════════════════════════════════

    renderBattu() {
        const container = document.getElementById('laso-battu-content');
        if (!container || !this.activeProfile?.battu) return;

        const { year, month, day, hour } = this.activeProfile.battu;

        container.innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:15px;">
                <div class="laso-pillar" style="text-align:center; padding:20px; background:rgba(255,215,0,0.1); border-radius:12px;">
                    <div style="font-size:0.85rem; color:#94a3b8;">Năm</div>
                    <div style="font-size:1.5rem; color:#ffd700;">${year.can} ${year.chi}</div>
                    <div style="font-size:0.9rem; color:#10b981;">${year.nguHanh}</div>
                </div>
                <div class="laso-pillar" style="text-align:center; padding:20px; background:rgba(102,126,234,0.1); border-radius:12px;">
                    <div style="font-size:0.85rem; color:#94a3b8;">Tháng</div>
                    <div style="font-size:1.5rem; color:#667eea;">${month.can} ${month.chi}</div>
                    <div style="font-size:0.9rem; color:#10b981;">${month.nguHanh}</div>
                </div>
                <div class="laso-pillar" style="text-align:center; padding:20px; background:rgba(239,68,68,0.1); border-radius:12px;">
                    <div style="font-size:0.85rem; color:#94a3b8;">Ngày</div>
                    <div style="font-size:1.5rem; color:#ef4444;">${day.can} ${day.chi}</div>
                </div>
                ${hour ? `
                <div class="laso-pillar" style="text-align:center; padding:20px; background:rgba(16,185,129,0.1); border-radius:12px;">
                    <div style="font-size:0.85rem; color:#94a3b8;">Giờ</div>
                    <div style="font-size:1.5rem; color:#10b981;">${hour.can} ${hour.chi}</div>
                </div>
                ` : ''}
            </div>
        `;
    },

    renderNumerology() {
        const container = document.getElementById('laso-numerology-content');
        if (!container || !this.activeProfile?.numerology) return;

        const { lifePathNumber, birthDay, birthMonth, birthYear } = this.activeProfile.numerology;

        const meanings = {
            1: 'Lãnh đạo, độc lập, sáng tạo',
            2: 'Hợp tác, cân bằng, nhạy cảm',
            3: 'Sáng tạo, biểu đạt, lạc quan',
            4: 'Ổn định, kỷ luật, thực tế',
            5: 'Tự do, phiêu lưu, linh hoạt',
            6: 'Yêu thương, trách nhiệm, hài hòa',
            7: 'Tìm kiếm, trí tuệ, nội tâm',
            8: 'Quyền lực, thành công, vật chất',
            9: 'Nhân ái, lý tưởng, hoàn thiện',
            11: 'Trực giác, tâm linh, master',
            22: 'Master builder, tầm nhìn lớn'
        };

        container.innerHTML = `
            <div style="text-align:center;">
                <div style="font-size:5rem; color:#667eea; margin:20px 0;">${lifePathNumber}</div>
                <div style="font-size:1.2rem; color:#1f2937; margin-bottom:10px; font-weight:600;">Số Chủ Đạo</div>
                <div style="color:#64748b; padding:15px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
                    ${meanings[lifePathNumber] || 'Đang phân tích...'}
                </div>
            </div>
        `;
    },

    renderZodiac() {
        const container = document.getElementById('laso-zodiac-content');
        if (!container || !this.activeProfile?.zodiac) return;

        const sign = this.activeProfile.zodiac;

        container.innerHTML = `
            <div style="text-align:center;">
                <div style="font-size:5rem; margin:20px 0;">${sign.symbol}</div>
                <div style="font-size:1.5rem; color:#667eea; margin-bottom:5px; font-weight:600;">${sign.name}</div>
                <div style="color:#64748b; margin-bottom:15px;">${sign.dates}</div>
                <div style="display:inline-block; padding:8px 16px; background:#f0f4ff; border:1px solid #667eea; border-radius:20px; color:#667eea;">
                    🌟 Nguyên tố: ${sign.element}
                </div>
            </div>
        `;
    },

    renderChineseZodiac() {
        const container = document.getElementById('laso-congap-content');
        if (!container || !this.activeProfile?.chineseZodiac) return;

        const zodiac = this.activeProfile.chineseZodiac;

        container.innerHTML = `
            <div style="text-align:center;">
                <div style="font-size:5rem; margin:20px 0;">${zodiac.emoji}</div>
                <div style="font-size:1.5rem; color:#764ba2; margin-bottom:5px; font-weight:600;">${zodiac.animal}</div>
                <div style="display:inline-block; padding:8px 16px; background:#f5f0ff; border:1px solid #764ba2; border-radius:20px; color:#764ba2;">
                    ☰️ Ngũ hành: ${zodiac.element}
                </div>
            </div>
        `;
    },

    async renderDailyPrediction() {
        const container = document.getElementById('laso-daily-content');
        if (!container || !this.activeProfile) return;

        container.innerHTML = '<p style="text-align:center; color:#94a3b8;">🔮 Đang tạo dự đoán...</p>';

        const prediction = await this.getDailyPredictionAI();

        if (prediction) {
            container.innerHTML = `
                <div style="padding:25px; background:linear-gradient(135deg, #f8fafc 0%, #f0f4ff 100%); border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 4px 15px rgba(102,126,234,0.1);">
                    <div style="color:#1f2937; line-height:1.9; font-size:1rem;">${this.formatAIResponse(prediction)}</div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="text-align:center; color:#94a3b8;">
                    <p>⚠️ Không thể tạo dự đoán.</p>
                    <p style="font-size:0.85rem;">Vui lòng kiểm tra API Key Gemini trong Cài đặt.</p>
                </div>
            `;
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // AI METHODS
    // ═══════════════════════════════════════════════════════════════

    getGeminiApiKey() {
        return localStorage.getItem('ai_api_key_gemini') || '';
    },

    getGroqApiKey() {
        return localStorage.getItem('ai_api_key_groq') || '';
    },

    /**
     * Query AI with Gemini first, fallback to Groq
     */
    async queryAI(prompt) {
        // Try Gemini first
        const geminiKey = this.getGeminiApiKey();
        if (geminiKey) {
            const result = await this.callGemini(prompt, geminiKey);
            if (result) return result;
            console.log('🌙 Gemini failed, trying Groq...');
        }

        // Fallback to Groq
        const groqKey = this.getGroqApiKey();
        if (groqKey) {
            const result = await this.callGroq(prompt, groqKey);
            if (result) return result;
        }

        // No API keys available
        this.showToast('⚠️ Vui lòng cài đặt Gemini hoặc Groq API Key');
        return null;
    },

    async callGemini(prompt, apiKey) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
                })
            });

            if (!response.ok) {
                console.warn('Gemini API error:', response.status);
                return null;
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } catch (error) {
            console.error('Gemini API Error:', error);
            return null;
        }
    },

    async callGroq(prompt, apiKey) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.8,
                    max_tokens: 1024
                })
            });

            if (!response.ok) {
                console.warn('Groq API error:', response.status);
                return null;
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || null;
        } catch (error) {
            console.error('Groq API Error:', error);
            return null;
        }
    },

    async getDailyPredictionAI() {
        if (!this.activeProfile) return null;

        const profile = this.activeProfile;
        const today = new Date().toLocaleDateString('vi-VN');
        const dayOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][new Date().getDay()];

        const prompt = `Bạn là Thầy Minh Đạo, một thầy bói nổi tiếng với 40 năm kinh nghiệm về tử vi, phong thủy và xem bói. Giọng văn của thầy thân thiện, ấm áp nhưng uyên thâm.

Hôm nay là ${dayOfWeek}, ngày ${today}.

Thầy đang xem quẻ cho khách:
👤 Họ tên: ${profile.name}
📅 Sinh ngày: ${this.formatDate(profile.birthDate)}
🐲 Con giáp: ${profile.chineseZodiac?.animal || 'chưa rõ'} (${profile.chineseZodiac?.element || ''})
♈ Cung hoàng đạo: ${profile.zodiac?.name || 'chưa rõ'}
🔢 Số chủ đạo: ${profile.numerology?.lifePathNumber || 'chưa rõ'}

Hãy viết lời xem bói cho ngày hôm nay với giọng văn như thầy đang nói chuyện trực tiếp với khách. Bắt đầu bằng câu chào như "Chào con/cháu [tên]..." 

Nội dung gồm:
🌟 VẬN TRÌNH TỔNG QUÁT (2-3 câu về vận may chung)
💼 CÔNG VIỆC & TÀI LỘC (2-3 câu)  
💕 TÌNH CẢM & QUAN HỆ (2-3 câu)
🏥 SỨC KHỎE (1-2 câu)
💡 LỜI KHUYÊN CỦA THẦY (1-2 câu kết, động viên)

Viết tự nhiên, KHÔNG dùng dấu * hay markdown. Dùng emoji phù hợp. Tổng khoảng 200-250 từ.`;

        return await this.queryAI(prompt);
    },

    async sendChatMessage() {
        const input = document.getElementById('laso-chat-input');
        const messagesContainer = document.getElementById('laso-chat-messages');

        if (!input || !messagesContainer) return;

        const message = input.value.trim();
        if (!message) return;

        // Add user message
        messagesContainer.innerHTML += `
            <div class="laso-chat-msg user">${this.escapeHtml(message)}</div>
        `;
        input.value = '';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Get AI response
        const context = this.activeProfile ? `
Người dùng: ${this.activeProfile.name}
Ngày sinh: ${this.formatDate(this.activeProfile.birthDate)}
Con giáp: ${this.activeProfile.chineseZodiac?.animal || 'Không rõ'}
Cung hoàng đạo: ${this.activeProfile.zodiac?.name || 'Không rõ'}
` : 'Người dùng chưa tạo hồ sơ.';

        const prompt = `Bạn là AI tư vấn tử vi và phong thủy. Ngữ cảnh:
${context}

Câu hỏi của người dùng: ${message}

Hãy trả lời ngắn gọn, hữu ích, sử dụng emoji.`;

        messagesContainer.innerHTML += `
            <div class="laso-chat-msg ai" style="opacity:0.7;">🔮 Đang suy nghĩ...</div>
        `;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        const response = await this.queryAI(prompt);

        // Remove loading message
        const loadingMsg = messagesContainer.querySelector('.laso-chat-msg.ai:last-child');
        if (loadingMsg) loadingMsg.remove();

        // Add AI response
        messagesContainer.innerHTML += `
            <div class="laso-chat-msg ai">${response ? this.formatAIResponse(response) : '⚠️ Không thể trả lời. Vui lòng kiểm tra API Key.'}</div>
        `;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    // ═══════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatAIResponse(text) {
        return text
            // Remove markdown asterisks
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#667eea;">$1</strong>')
            .replace(/\*(.*?)\*/g, '$1')
            // Format section headers with emojis
            .replace(/(🌟|💼|💕|🏥|💡|⭐|💰|❤️|🏃|📌)\s*([A-ZÀ-Ỹ][A-ZÀ-Ỹ\s&]+):/g,
                '<div style="margin-top:15px; font-weight:600; color:#667eea; font-size:1.05rem;">$1 $2</div>')
            // Line breaks
            .replace(/\n\n/g, '</p><p style="margin:10px 0;">')
            .replace(/\n/g, '<br>');
    },

    showToast(message) {
        // Use LifeOS notification if available
        if (window.showNotification) {
            window.showNotification(message, 'info');
        } else {
            // Fallback toast
            const existing = document.querySelector('.laso-toast');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.className = 'laso-toast';
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                color: #ffd700; padding: 12px 24px; border-radius: 12px;
                border: 1px solid rgba(255,215,0,0.3);
                z-index: 99999; animation: fadeInUp 0.3s ease;
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LasoApp.init());
} else {
    LasoApp.init();
}

// Export for ES6 modules
export default LasoApp;
