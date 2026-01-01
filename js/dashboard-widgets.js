// --- FILE: js/dashboard-widgets.js ---
// Dashboard Widgets: Lịch Vạn Niên, AI Quote, Weather, Week at Glance, Upcoming Deadlines

import { getLunarCalendarInfo } from './lunar-calendar.js';
import { aiService } from './ai-service.js';
import { showNotification, toLocalISOString } from './common.js';
import { saveUserData, getUserData } from './api.js';

let globalData = {};
let currentUser = null;

// ============================================================
// KHỞI TẠO DASHBOARD WIDGETS
// ============================================================
export const initDashboardWidgets = (data, user) => {
    globalData = data;
    currentUser = user;

    // Initialize horoscope settings
    if (!globalData.horoscopeSettings) {
        globalData.horoscopeSettings = {
            birthDate: '',
            birthDateLunar: false,
            zodiacSign: '',
            gender: ''
        };
    }

    // Render all widgets
    renderLunarCalendar();
    renderAIQuote();
    renderWeather();
    renderWeekAtGlance();
    renderUpcomingDeadlines();
    setupHoroscopeSettings();

    console.log('✅ Dashboard Widgets initialized');
};

// ============================================================
// 1. LỊCH VẠN NIÊN - WITH NÊN/KHÔNG NÊN
// ============================================================
const renderLunarCalendar = () => {
    const container = document.getElementById('lunar-calendar-widget');
    if (!container) return;

    const info = getLunarCalendarInfo(new Date());
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    container.innerHTML = `
        <!-- Phần lịch đỏ -->
        <div style="background: linear-gradient(145deg, #dc2626, #991b1b); padding: 20px; border-radius: 16px 16px 0 0; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div>
                    <div style="font-size: 0.85rem; opacity: 0.8;">${dayNames[info.solar.dayOfWeek]}, Tháng ${info.solar.month}</div>
                    <div style="font-size: 3rem; font-weight: 800; line-height: 1;">${info.solar.day}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.8rem;">${info.canChi.emoji}</div>
                    <div style="font-size: 0.85rem; opacity: 0.9;">${info.lunar.text}</div>
                    <div style="font-size: 0.75rem; opacity: 0.8;">Năm ${info.canChi.nam}</div>
                </div>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; font-size: 0.75rem;">
                <span style="background: rgba(255,255,255,0.2); padding: 3px 8px; border-radius: 12px;">🌿 ${info.tietKhi}</span>
                <span style="background: ${info.ngayTotXau.type === 'tot' ? 'rgba(34,197,94,0.4)' : info.ngayTotXau.type === 'xau' ? 'rgba(239,68,68,0.4)' : 'rgba(234,179,8,0.4)'}; padding: 3px 8px; border-radius: 12px;">${info.ngayTotXau.text}</span>
                <span style="background: rgba(255,255,255,0.2); padding: 3px 8px; border-radius: 12px;">⏰ ${info.gioHoangDao.slice(0, 2).map(g => g.chi).join(', ')}</span>
            </div>
        </div>
        
        <!-- Phần nên/không nên trắng -->
        <div style="background: var(--card-bg); padding: 15px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.8rem;">
                <div>
                    <div style="font-weight: 600; color: #16a34a; margin-bottom: 6px;">✅ Nên làm</div>
                    <div style="color: #166534; line-height: 1.5;">${info.nenKhongNen.nen.slice(0, 3).join(', ')}</div>
                </div>
                <div>
                    <div style="font-weight: 600; color: #dc2626; margin-bottom: 6px;">❌ Không nên</div>
                    <div style="color: #991b1b; line-height: 1.5;">${info.nenKhongNen.khongNen.slice(0, 2).join(', ')}</div>
                </div>
            </div>
        </div>
    `;
};

// ============================================================
// 2. AI QUOTE + TỬ VI
// ============================================================
let todayQuote = null;

const renderAIQuote = async () => {
    const container = document.getElementById('ai-quote-widget');
    if (!container) return;

    // Check cache
    const cacheKey = 'dailyQuote_' + toLocalISOString(new Date());
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
        todayQuote = JSON.parse(cached);
        displayQuote(container, todayQuote);
        return;
    }

    // Loading state
    container.innerHTML = `
        <div style="padding: 25px; text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 10px;">💬</div>
            <p style="color: #64748b;">Đang tạo lời động viên cho bạn...</p>
        </div>
    `;

    try {
        const horoscope = globalData.horoscopeSettings || {};
        const zodiacContext = horoscope.zodiacSign ? `cho người cung ${horoscope.zodiacSign}` : '';

        const prompt = `Tạo một câu châm ngôn động lực ngắn gọn (1-2 câu) ${zodiacContext} cho ngày hôm nay. Trả lời bằng tiếng Việt, không cần đề cập đến cung hoàng đạo trong câu trả lời.`;

        const quote = await aiService.ask(prompt);
        todayQuote = { quote, date: new Date().toISOString() };
        localStorage.setItem(cacheKey, JSON.stringify(todayQuote));
        displayQuote(container, todayQuote);
    } catch (error) {
        container.innerHTML = `
            <div style="padding: 25px; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 10px;">💫</div>
                <p style="font-style: italic; color: #334155;">"Mỗi ngày là một cơ hội mới để trở nên tốt hơn."</p>
            </div>
        `;
    }
};

const displayQuote = (container, data) => {
    container.innerHTML = `
        <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; border-radius: 16px; color: white;">
            <p style="font-size: 1rem; font-style: italic; line-height: 1.5; margin: 0 0 12px 0;">"${data.quote}"</p>
            <button onclick="window.regenerateQuote()" style="background: rgba(255,255,255,0.2); border: none; padding: 6px 12px; border-radius: 6px; color: white; cursor: pointer; font-size: 0.8rem;">
                🔄 Mới
            </button>
        </div>
    `;
};

window.regenerateQuote = async () => {
    const cacheKey = 'dailyQuote_' + toLocalISOString(new Date());
    localStorage.removeItem(cacheKey);
    await renderAIQuote();
};
// ============================================================
// 3. WEATHER WIDGET - AI BASED
// ============================================================
const renderWeather = async () => {
    const container = document.getElementById('weather-widget');
    if (!container) return;

    // Check cache (refresh every 3 hours)
    const cacheKey = 'weatherCache';
    const cacheTimeKey = 'weatherCacheTime';
    const cached = localStorage.getItem(cacheKey);
    const cacheTime = parseInt(localStorage.getItem(cacheTimeKey) || '0');
    const threeHours = 3 * 60 * 60 * 1000;

    if (cached && (Date.now() - cacheTime) < threeHours) {
        displayWeather(container, JSON.parse(cached));
        return;
    }

    // Loading state
    container.innerHTML = `
        <div style="background: linear-gradient(135deg, #0ea5e9, #06b6d4); padding: 20px; border-radius: 16px; color: white; text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 8px;">🌤️</div>
            <div style="font-size: 0.9rem; opacity: 0.9;">Đang lấy thời tiết...</div>
        </div>
    `;

    try {
        const now = new Date();
        const prompt = `Cho biết thời tiết TP.HCM ngày ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}. 
Trả lời CHÍNH XÁC theo format JSON sau (không có text khác):
{"temp": "28", "desc": "Nắng nhẹ", "humidity": "70", "icon": "sunny"}
Trong đó icon chỉ là 1 trong: sunny, cloudy, rainy, storm, hot, cool`;

        const response = await aiService.ask(prompt);

        // Parse JSON từ response
        let weatherData;
        try {
            // Tìm JSON trong response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                weatherData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found');
            }
        } catch (e) {
            // Fallback nếu parse lỗi
            weatherData = { temp: "28", desc: "Trời đẹp", humidity: "70", icon: "sunny" };
        }

        localStorage.setItem(cacheKey, JSON.stringify(weatherData));
        localStorage.setItem(cacheTimeKey, Date.now().toString());
        displayWeather(container, weatherData);

    } catch (error) {
        container.innerHTML = `
            <div style="background: linear-gradient(135deg, #0ea5e9, #06b6d4); padding: 20px; border-radius: 16px; color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 2.5rem;">☀️</div>
                        <div style="font-size: 1.5rem; font-weight: 700;">28°C</div>
                    </div>
                    <div style="text-align: right; font-size: 0.85rem;">
                        <div>📍 TP.HCM</div>
                        <div style="opacity: 0.9;">Nắng đẹp</div>
                    </div>
                </div>
            </div>
        `;
    }
};

const displayWeather = (container, data) => {
    const iconMap = {
        'sunny': '☀️', 'cloudy': '☁️', 'rainy': '🌧️',
        'storm': '⛈️', 'hot': '🔥', 'cool': '❄️'
    };
    const icon = iconMap[data.icon] || '🌤️';

    container.innerHTML = `
        <div style="background: linear-gradient(135deg, #0ea5e9, #06b6d4); padding: 20px; border-radius: 16px; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 2.5rem;">${icon}</div>
                    <div style="font-size: 1.8rem; font-weight: 700;">${data.temp}°C</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.9rem; font-weight: 600;">📍 TP.HCM</div>
                    <div style="font-size: 0.85rem; opacity: 0.9; margin-top: 4px;">${data.desc}</div>
                    <div style="font-size: 0.8rem; opacity: 0.8;">💧 ${data.humidity}%</div>
                </div>
            </div>
        </div>
    `;
};

// ============================================================
// 4. WEEK AT GLANCE
// ============================================================
const renderWeekAtGlance = () => {
    const container = document.getElementById('week-glance-widget');
    if (!container) return;

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    // Calculate stats
    const tasks = globalData.tasks || [];
    const habits = globalData.habits || [];
    const journal = globalData.journal || [];

    const completedTasks = tasks.filter(t => t.status === 'Hoàn thành').length;
    const pendingTasks = tasks.filter(t => t.status !== 'Hoàn thành').length;

    const todayStr = toLocalISOString(today);
    const habitsToday = habits.filter(h => h.completedDates?.includes(todayStr)).length;
    const totalHabits = habits.length;

    const recentMoods = journal.slice(0, 7).map(j => j.mood);
    const moodEmoji = { happy: '😊', excited: '🤩', neutral: '😐', sad: '😢', angry: '😡', tired: '😴' };

    container.innerHTML = `
        <div style="background: var(--card-bg); padding: 20px; border-radius: 16px;">
            <h3 style="margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                📊 Tuần này
            </h3>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                <div style="background: linear-gradient(135deg, #dcfce7, #bbf7d0); padding: 15px; border-radius: 12px;">
                    <div style="font-size: 1.8rem; font-weight: 700; color: #16a34a;">${completedTasks}</div>
                    <div style="color: #166534; font-size: 0.9rem;">Tasks hoàn thành</div>
                </div>
                <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 15px; border-radius: 12px;">
                    <div style="font-size: 1.8rem; font-weight: 700; color: #ca8a04;">${pendingTasks}</div>
                    <div style="color: #92400e; font-size: 0.9rem;">Đang chờ</div>
                </div>
                <div style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); padding: 15px; border-radius: 12px;">
                    <div style="font-size: 1.8rem; font-weight: 700; color: #2563eb;">${habitsToday}/${totalHabits}</div>
                    <div style="color: #1e40af; font-size: 0.9rem;">Thói quen hôm nay</div>
                </div>
                <div style="background: linear-gradient(135deg, #f3e8ff, #e9d5ff); padding: 15px; border-radius: 12px;">
                    <div style="font-size: 1.5rem;">${recentMoods.slice(0, 5).map(m => moodEmoji[m] || '😐').join(' ')}</div>
                    <div style="color: #7e22ce; font-size: 0.9rem;">Mood 5 ngày</div>
                </div>
            </div>
        </div>
    `;
};

// ============================================================
// 5. UPCOMING DEADLINES
// ============================================================
const renderUpcomingDeadlines = () => {
    const container = document.getElementById('upcoming-deadlines-widget');
    if (!container) return;

    const tasks = globalData.tasks || [];
    const events = globalData.calendarEvents || [];
    const today = new Date();

    // Get upcoming tasks with due dates
    const upcomingTasks = tasks
        .filter(t => t.dueDate && t.status !== 'Hoàn thành' && new Date(t.dueDate) >= today)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);

    // Get upcoming events
    const upcomingEvents = events
        .filter(e => new Date(e.start || e.date) >= today)
        .sort((a, b) => new Date(a.start || a.date) - new Date(b.start || b.date))
        .slice(0, 3);

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'Hôm nay';
        if (diff === 1) return 'Ngày mai';
        if (diff < 7) return `${diff} ngày nữa`;
        return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'Cao': return '#ef4444';
            case 'Trung bình': return '#f59e0b';
            default: return '#10b981';
        }
    };

    container.innerHTML = `
        <div style="background: var(--card-bg); padding: 20px; border-radius: 16px;">
            <h3 style="margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                🔔 Sắp đến hạn
            </h3>
            
            ${upcomingTasks.length === 0 && upcomingEvents.length === 0 ? `
                <p style="color: #64748b; text-align: center; padding: 20px;">
                    🎉 Không có deadline nào sắp tới!
                </p>
            ` : `
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${upcomingTasks.map(t => `
                        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 10px; border-left: 4px solid ${getPriorityColor(t.priority)};">
                            <div style="flex: 1;">
                                <div style="font-weight: 500;">${t.name || t.title}</div>
                                <div style="font-size: 0.85rem; color: #64748b;">${formatDate(t.dueDate)}</div>
                            </div>
                            <span style="font-size: 0.8rem; padding: 4px 8px; border-radius: 6px; background: ${getPriorityColor(t.priority)}20; color: ${getPriorityColor(t.priority)};">
                                ${t.priority || 'Thấp'}
                            </span>
                        </div>
                    `).join('')}
                    
                    ${upcomingEvents.map(e => `
                        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f0f9ff; border-radius: 10px; border-left: 4px solid #0ea5e9;">
                            <div style="flex: 1;">
                                <div style="font-weight: 500;">📅 ${e.title}</div>
                                <div style="font-size: 0.85rem; color: #0369a1;">${formatDate(e.start || e.date)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
};

// ============================================================
// 6. HOROSCOPE SETTINGS
// ============================================================
const setupHoroscopeSettings = () => {
    const form = document.getElementById('horoscope-settings-form');
    if (!form) return;

    const settings = globalData.horoscopeSettings || {};

    // Fill existing values
    if (settings.birthDate) {
        const input = document.getElementById('horoscope-birthdate');
        if (input) input.value = settings.birthDate;
    }
    if (settings.zodiacSign) {
        const select = document.getElementById('horoscope-zodiac');
        if (select) select.value = settings.zodiacSign;
    }
    if (settings.gender) {
        const select = document.getElementById('horoscope-gender');
        if (select) select.value = settings.gender;
    }

    // Save handler
    document.getElementById('btn-save-horoscope')?.addEventListener('click', async () => {
        const birthDate = document.getElementById('horoscope-birthdate')?.value;
        const zodiacSign = document.getElementById('horoscope-zodiac')?.value;
        const gender = document.getElementById('horoscope-gender')?.value;

        globalData.horoscopeSettings = { birthDate, zodiacSign, gender };
        await saveUserData(currentUser.uid, { horoscopeSettings: globalData.horoscopeSettings });

        showNotification('✅ Đã lưu cài đặt tử vi!');

        // Refresh quote to apply new settings
        localStorage.removeItem('dailyQuote_' + toLocalISOString(new Date()));
        renderAIQuote();
    });
};

// ============================================================
// REFRESH ALL WIDGETS
// ============================================================
export const refreshDashboardWidgets = () => {
    renderLunarCalendar();
    renderWeekAtGlance();
    renderUpcomingDeadlines();
};

export { renderLunarCalendar, renderAIQuote, renderWeather, renderWeekAtGlance, renderUpcomingDeadlines };
