// ============================================================
// FILE: js/smart-focus.js
// Các tính năng thông minh cho Focus Mode (8 nâng cấp)
// ============================================================

import { showNotification, toLocalISOString } from './common.js';
import { saveUserData } from './firebase.js';

// ============================================================
// #32 FOCUS SOUNDS
// ============================================================
const FOCUS_SOUNDS = {
    lofi: {
        name: 'Lo-fi Beats',
        emoji: '🎵',
        url: 'https://cdn.pixabay.com/audio/2024/02/28/audio_0c3e2a2d9d.mp3' // Example URL
    },
    rain: {
        name: 'Rain Sounds',
        emoji: '🌧️',
        url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_5f6f9e8a0e.mp3'
    },
    cafe: {
        name: 'Cafe Ambience',
        emoji: '☕',
        url: 'https://cdn.pixabay.com/audio/2023/03/08/audio_4e85b7d4c0.mp3'
    },
    nature: {
        name: 'Nature Sounds',
        emoji: '🌳',
        url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3'
    },
    whitenoise: {
        name: 'White Noise',
        emoji: '📻',
        url: null // Generate programmatically
    }
};

class FocusSoundPlayer {
    constructor() {
        this.audioContext = null;
        this.currentAudio = null;
        this.isPlaying = false;
        this.currentSound = null;
        this.volume = 0.5;
    }

    async play(soundId) {
        this.stop();

        const sound = FOCUS_SOUNDS[soundId];
        if (!sound) return;

        this.currentSound = soundId;

        if (soundId === 'whitenoise') {
            this.playWhiteNoise();
        } else if (sound.url) {
            this.currentAudio = new Audio(sound.url);
            this.currentAudio.loop = true;
            this.currentAudio.volume = this.volume;
            await this.currentAudio.play();
        }

        this.isPlaying = true;
        this.updateUI();
    }

    playWhiteNoise() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.audioContext.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = this.volume * 0.3;

        whiteNoise.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        whiteNoise.start();

        this.currentAudio = whiteNoise;
    }

    stop() {
        if (this.currentAudio) {
            if (this.currentAudio.stop) {
                this.currentAudio.stop();
            } else if (this.currentAudio.pause) {
                this.currentAudio.pause();
            }
            this.currentAudio = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.isPlaying = false;
        this.currentSound = null;
        this.updateUI();
    }

    setVolume(vol) {
        this.volume = vol;
        if (this.currentAudio && this.currentAudio.volume !== undefined) {
            this.currentAudio.volume = vol;
        }
    }

    updateUI() {
        const buttons = document.querySelectorAll('.focus-sound-btn');
        buttons.forEach(btn => {
            if (btn.dataset.sound === this.currentSound && this.isPlaying) {
                btn.classList.add('active');
                btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            } else {
                btn.classList.remove('active');
                btn.style.background = 'rgba(255,255,255,0.1)';
            }
        });
    }

    render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="focus-sounds-widget" style="
                background: linear-gradient(135deg, #1f2937, #111827);
                border-radius: 12px;
                padding: 20px;
                color: white;
            ">
                <h4 style="margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                    🎧 Focus Sounds
                </h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
                    ${Object.entries(FOCUS_SOUNDS).map(([id, sound]) => `
                        <button class="focus-sound-btn" data-sound="${id}" style="
                            background: rgba(255,255,255,0.1);
                            border: none;
                            color: white;
                            padding: 10px 16px;
                            border-radius: 20px;
                            cursor: pointer;
                            font-size: 0.9rem;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            transition: all 0.2s;
                        ">
                            ${sound.emoji} ${sound.name}
                        </button>
                    `).join('')}
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span>🔊</span>
                    <input type="range" id="focus-volume" min="0" max="100" value="50" style="
                        flex: 1;
                        height: 5px;
                        -webkit-appearance: none;
                        background: rgba(255,255,255,0.2);
                        border-radius: 5px;
                    ">
                    <button id="focus-sound-stop" style="
                        background: #ef4444;
                        border: none;
                        color: white;
                        padding: 8px 16px;
                        border-radius: 8px;
                        cursor: pointer;
                    ">⏹ Stop</button>
                </div>
            </div>
        `;

        // Event listeners
        container.querySelectorAll('.focus-sound-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const soundId = btn.dataset.sound;
                if (this.currentSound === soundId && this.isPlaying) {
                    this.stop();
                } else {
                    this.play(soundId);
                    showNotification(`🎵 Playing: ${FOCUS_SOUNDS[soundId].name}`, 'success');
                }
            });
        });

        document.getElementById('focus-volume')?.addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });

        document.getElementById('focus-sound-stop')?.addEventListener('click', () => {
            this.stop();
            showNotification('🔇 Sound stopped', 'info');
        });
    }
}

// ============================================================
// #34 FOCUS STATS
// ============================================================
class FocusStats {
    constructor() {
        this.storageKey = 'focus_stats';
        this.stats = this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : this.getDefaultStats();
        } catch (e) {
            return this.getDefaultStats();
        }
    }

    getDefaultStats() {
        return {
            totalMinutes: 0,
            sessionsToday: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: null,
            weeklyData: [0, 0, 0, 0, 0, 0, 0], // Sun-Sat
            history: []
        };
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.stats));
    }

    addSession(minutes) {
        const today = toLocalISOString(new Date());
        const dayOfWeek = new Date().getDay();

        this.stats.totalMinutes += minutes;
        this.stats.sessionsToday++;
        this.stats.weeklyData[dayOfWeek] += minutes;

        // Update streak
        if (this.stats.lastActiveDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = toLocalISOString(yesterday);

            if (this.stats.lastActiveDate === yesterdayStr) {
                this.stats.currentStreak++;
            } else if (this.stats.lastActiveDate !== today) {
                this.stats.currentStreak = 1;
            }

            this.stats.longestStreak = Math.max(this.stats.longestStreak, this.stats.currentStreak);
            this.stats.lastActiveDate = today;
        }

        // Add to history
        this.stats.history.push({
            date: today,
            minutes,
            timestamp: new Date().toISOString()
        });

        // Keep last 100 sessions
        if (this.stats.history.length > 100) {
            this.stats.history = this.stats.history.slice(-100);
        }

        this.save();
    }

    getTodayMinutes() {
        const today = toLocalISOString(new Date());
        return this.stats.history
            .filter(h => h.date === today)
            .reduce((sum, h) => sum + h.minutes, 0);
    }

    getWeekTotal() {
        return this.stats.weeklyData.reduce((sum, m) => sum + m, 0);
    }

    render(container) {
        if (!container) return;

        const todayMinutes = this.getTodayMinutes();
        const weekTotal = this.getWeekTotal();
        const totalHours = Math.floor(this.stats.totalMinutes / 60);

        container.innerHTML = `
            <div class="focus-stats-widget" style="
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            ">
                <h4 style="margin: 0 0 20px 0;">📊 Focus Statistics</h4>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div style="text-align: center; padding: 15px; background: #eff6ff; border-radius: 10px;">
                        <div style="font-size: 2rem; font-weight: 700; color: #3b82f6;">${todayMinutes}</div>
                        <div style="font-size: 0.85rem; color: #6b7280;">phút hôm nay</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #fef3c7; border-radius: 10px;">
                        <div style="font-size: 2rem; font-weight: 700; color: #f59e0b;">${this.stats.currentStreak}</div>
                        <div style="font-size: 0.85rem; color: #6b7280;">ngày streak</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #dcfce7; border-radius: 10px;">
                        <div style="font-size: 2rem; font-weight: 700; color: #10b981;">${Math.round(weekTotal / 60)}</div>
                        <div style="font-size: 0.85rem; color: #6b7280;">giờ tuần này</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #fce7f3; border-radius: 10px;">
                        <div style="font-size: 2rem; font-weight: 700; color: #ec4899;">${totalHours}</div>
                        <div style="font-size: 0.85rem; color: #6b7280;">giờ tổng cộng</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 10px; font-weight: 600; font-size: 0.9rem;">📈 Tuần này:</div>
                <div style="display: flex; justify-content: space-between; height: 100px; align-items: flex-end; gap: 5px;">
                    ${['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, i) => {
            const minutes = this.stats.weeklyData[i];
            const maxMin = Math.max(...this.stats.weeklyData, 60);
            const height = Math.max((minutes / maxMin) * 80, 5);
            const isToday = i === new Date().getDay();
            return `
                            <div style="flex: 1; text-align: center;">
                                <div style="
                                    height: ${height}px;
                                    background: ${isToday ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e5e7eb'};
                                    border-radius: 4px;
                                    margin-bottom: 5px;
                                "></div>
                                <div style="font-size: 0.75rem; color: ${isToday ? '#667eea' : '#6b7280'};">${day}</div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }
}

// ============================================================
// #35 DEEP WORK MODE
// ============================================================
class DeepWorkMode {
    constructor() {
        this.isActive = false;
        this.currentTask = null;
        this.overlay = null;
    }

    start(task) {
        this.isActive = true;
        this.currentTask = task;
        this.createOverlay();
        showNotification('🧘 Deep Work Mode activated', 'success');
    }

    stop() {
        this.isActive = false;
        this.currentTask = null;
        this.removeOverlay();
        showNotification('Deep Work Mode deactivated', 'info');
    }

    createOverlay() {
        this.removeOverlay();

        this.overlay = document.createElement('div');
        this.overlay.id = 'deep-work-overlay';
        this.overlay.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
            ">
                <div style="text-align: center; max-width: 600px; padding: 40px;">
                    <div style="font-size: 4rem; margin-bottom: 20px;">🎯</div>
                    <h1 style="font-size: 2.5rem; margin-bottom: 10px;">Deep Work Mode</h1>
                    ${this.currentTask ? `
                        <div style="
                            background: rgba(255,255,255,0.1);
                            border-radius: 12px;
                            padding: 20px;
                            margin: 20px 0;
                        ">
                            <div style="font-size: 0.9rem; opacity: 0.7; margin-bottom: 5px;">Đang tập trung vào:</div>
                            <div style="font-size: 1.5rem; font-weight: 600;">${this.currentTask.name}</div>
                        </div>
                    ` : ''}
                    <div id="deep-work-timer" style="font-size: 5rem; font-weight: 700; font-family: 'Montserrat', monospace; margin: 30px 0;">
                        00:00:00
                    </div>
                    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px;">
                        <button id="deep-work-pause" style="
                            background: rgba(255,255,255,0.2);
                            border: none;
                            color: white;
                            padding: 15px 40px;
                            border-radius: 12px;
                            cursor: pointer;
                            font-size: 1.1rem;
                            font-weight: 600;
                        ">⏸ Tạm dừng</button>
                        <button id="deep-work-complete" style="
                            background: linear-gradient(135deg, #10b981, #059669);
                            border: none;
                            color: white;
                            padding: 15px 40px;
                            border-radius: 12px;
                            cursor: pointer;
                            font-size: 1.1rem;
                            font-weight: 600;
                        ">✅ Hoàn thành</button>
                        <button id="deep-work-exit" style="
                            background: rgba(239, 68, 68, 0.8);
                            border: none;
                            color: white;
                            padding: 15px 40px;
                            border-radius: 12px;
                            cursor: pointer;
                            font-size: 1.1rem;
                            font-weight: 600;
                        ">✕ Thoát</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Start timer
        const timerEl = document.getElementById('deep-work-timer');
        let seconds = 0;
        this.timerInterval = setInterval(() => {
            seconds++;
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            timerEl.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }, 1000);

        // Event listeners
        document.getElementById('deep-work-exit')?.addEventListener('click', () => this.stop());
        document.getElementById('deep-work-complete')?.addEventListener('click', () => {
            if (this.currentTask) {
                window.dispatchEvent(new CustomEvent('complete-task', { detail: { taskId: this.currentTask.id } }));
            }
            this.stop();
        });
    }

    removeOverlay() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        const overlay = document.getElementById('deep-work-overlay');
        if (overlay) overlay.remove();
    }
}

// ============================================================
// #36 BREAK SUGGESTIONS
// ============================================================
const BREAK_ACTIVITIES = [
    { emoji: '🚶', activity: 'Đi bộ 5 phút', duration: 5 },
    { emoji: '💧', activity: 'Uống nước', duration: 1 },
    { emoji: '👀', activity: 'Nhìn xa 20 giây (20-20-20 rule)', duration: 1 },
    { emoji: '🧘', activity: 'Hít thở sâu 10 lần', duration: 2 },
    { emoji: '🤸', activity: 'Vươn vai, xoay cổ', duration: 3 },
    { emoji: '☕', activity: 'Pha coffee/trà', duration: 5 },
    { emoji: '🎵', activity: 'Nghe 1 bài nhạc yêu thích', duration: 4 },
    { emoji: '📱', activity: 'Scroll meme 2 phút', duration: 2 }
];

export function getBreakSuggestion(focusMinutes) {
    // Short breaks for under 60 minutes of focus
    const shortBreaks = BREAK_ACTIVITIES.filter(a => a.duration <= 3);
    const longBreaks = BREAK_ACTIVITIES.filter(a => a.duration > 3);

    const activities = focusMinutes >= 60 ? longBreaks : shortBreaks;
    const random = activities[Math.floor(Math.random() * activities.length)];

    return {
        ...random,
        message: focusMinutes >= 90
            ? `⚠️ Đã ${focusMinutes} phút! Nghỉ ngơi ngay!`
            : `💡 Gợi ý: ${random.activity}`
    };
}

// ============================================================
// #37 FOCUS CHALLENGES
// ============================================================
const FOCUS_CHALLENGES = [
    { id: 'c1', name: 'Starter', target: 30, unit: 'phút', reward: '🌟', description: 'Focus 30 phút không ngắt' },
    { id: 'c2', name: 'Marathon', target: 120, unit: 'phút', reward: '🏆', description: 'Focus 2 tiếng trong ngày' },
    { id: 'c3', name: 'Early Bird', target: 60, unit: 'phút trước 9h', reward: '🐦', description: 'Focus 1 tiếng trước 9h sáng' },
    { id: 'c4', name: 'Streak Master', target: 7, unit: 'ngày', reward: '🔥', description: 'Giữ streak 7 ngày liên tiếp' },
    { id: 'c5', name: 'Night Owl', target: 60, unit: 'phút sau 20h', reward: '🦉', description: 'Focus 1 tiếng sau 8h tối' }
];

export function checkChallengeProgress(stats, challengeId) {
    const challenge = FOCUS_CHALLENGES.find(c => c.id === challengeId);
    if (!challenge) return null;

    let progress = 0;
    let completed = false;

    switch (challengeId) {
        case 'c1':
            // Check if any single session >= 30 min
            const longestSession = Math.max(...(stats.history.map(h => h.minutes) || [0]));
            progress = Math.min(longestSession, challenge.target);
            completed = longestSession >= 30;
            break;
        case 'c2':
            progress = stats.getTodayMinutes();
            completed = progress >= 120;
            break;
        case 'c4':
            progress = stats.stats.currentStreak;
            completed = progress >= 7;
            break;
        default:
            progress = 0;
    }

    return {
        challenge,
        progress,
        target: challenge.target,
        percent: Math.min(Math.round((progress / challenge.target) * 100), 100),
        completed
    };
}

export function renderFocusChallenges(container, stats) {
    if (!container) return;

    container.innerHTML = `
        <div class="focus-challenges" style="
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        ">
            <h4 style="margin: 0 0 15px 0;">🏆 Focus Challenges</h4>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${FOCUS_CHALLENGES.map(c => {
        const result = checkChallengeProgress(stats, c.id);
        return `
                        <div style="
                            padding: 12px;
                            background: ${result.completed ? '#dcfce7' : '#f9fafb'};
                            border-radius: 8px;
                            border: 1px solid ${result.completed ? '#86efac' : '#e5e7eb'};
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-weight: 600;">
                                    ${c.reward} ${c.name}
                                    ${result.completed ? '✅' : ''}
                                </span>
                                <span style="font-size: 0.85rem; color: #6b7280;">${result.progress}/${c.target} ${c.unit}</span>
                            </div>
                            <div style="height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;">
                                <div style="
                                    height: 100%;
                                    width: ${result.percent}%;
                                    background: ${result.completed ? '#10b981' : 'linear-gradient(90deg, #667eea, #764ba2)'};
                                    border-radius: 3px;
                                "></div>
                            </div>
                            <div style="font-size: 0.8rem; color: #6b7280; margin-top: 5px;">${c.description}</div>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
}

// ============================================================
// #38 SESSION NOTES
// ============================================================
class SessionNotes {
    constructor() {
        this.storageKey = 'focus_session_notes';
        this.notes = this.load();
    }

    load() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || [];
        } catch (e) {
            return [];
        }
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.notes));
    }

    addNote(taskId, content) {
        this.notes.push({
            id: Date.now().toString(),
            taskId,
            content,
            createdAt: new Date().toISOString()
        });
        this.save();
    }

    getNotesForTask(taskId) {
        return this.notes.filter(n => n.taskId === taskId);
    }

    render(container, taskId) {
        if (!container) return;

        const taskNotes = this.getNotesForTask(taskId);

        container.innerHTML = `
            <div class="session-notes" style="
                background: #fffbeb;
                border-radius: 12px;
                padding: 15px;
                border: 1px solid #fde68a;
            ">
                <h4 style="margin: 0 0 10px 0; font-size: 0.9rem; color: #92400e;">📝 Quick Notes</h4>
                <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                    <input type="text" id="session-note-input" placeholder="Ghi chú nhanh..." style="
                        flex: 1;
                        padding: 8px 12px;
                        border: 1px solid #fde68a;
                        border-radius: 8px;
                        font-size: 0.9rem;
                    ">
                    <button id="add-session-note" style="
                        background: #f59e0b;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 8px;
                        cursor: pointer;
                    ">+</button>
                </div>
                ${taskNotes.length > 0 ? `
                    <div style="max-height: 150px; overflow-y: auto; font-size: 0.85rem;">
                        ${taskNotes.map(n => `
                            <div style="padding: 5px 0; border-bottom: 1px solid #fde68a;">
                                <span style="color: #92400e;">${n.content}</span>
                                <span style="color: #ca8a04; font-size: 0.75rem; margin-left: 8px;">
                                    ${new Date(n.createdAt).toLocaleTimeString('vi-VN')}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p style="color: #92400e; font-size: 0.85rem; margin: 0;">Chưa có ghi chú</p>'}
            </div>
        `;

        document.getElementById('add-session-note')?.addEventListener('click', () => {
            const input = document.getElementById('session-note-input');
            if (input?.value.trim()) {
                this.addNote(taskId, input.value.trim());
                this.render(container, taskId);
                showNotification('📝 Đã lưu ghi chú', 'success');
            }
        });

        document.getElementById('session-note-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('add-session-note')?.click();
            }
        });
    }
}

// ============================================================
// EXPORT SINGLETONS
// ============================================================
export const focusSoundPlayer = new FocusSoundPlayer();
export const focusStats = new FocusStats();
export const deepWorkMode = new DeepWorkMode();
export const sessionNotes = new SessionNotes();

// ============================================================
// INIT FUNCTION
// ============================================================
export function initSmartFocus(userData, user) {
    console.log('✅ Smart Focus initialized');

    // Render focus sounds
    const soundsContainer = document.getElementById('focus-sounds-widget');
    if (soundsContainer) {
        focusSoundPlayer.render(soundsContainer);
    }

    // Render focus stats
    const statsContainer = document.getElementById('focus-stats-widget');
    if (statsContainer) {
        focusStats.render(statsContainer);
    }

    // Render challenges
    const challengesContainer = document.getElementById('focus-challenges-widget');
    if (challengesContainer) {
        renderFocusChallenges(challengesContainer, focusStats);
    }

    // Listen for pomodoro completion
    window.addEventListener('pomodoro-session-complete', (e) => {
        const minutes = e.detail?.minutes || 25;
        focusStats.addSession(minutes);
        focusStats.render(document.getElementById('focus-stats-widget'));
    });
}
