// ============================================================
// FILE: js/time_tracker.js
// Mục đích: Time tracking cho tasks với stopwatch và analytics
// ============================================================

import { saveUserData, auth } from './firebase.js';
import { showNotification } from './common.js';

export class TimeTracker {
    constructor(taskId, initialTime = 0) {
        this.taskId = taskId;
        this.startTime = null;
        this.elapsedTime = initialTime; // milliseconds
        this.isRunning = false;
        this.interval = null;
        this.displayElement = null;
    }

    /**
     * Bắt đầu đếm giờ
     */
    start() {
        if (this.isRunning) return;

        this.startTime = Date.now();
        this.isRunning = true;

        this.interval = setInterval(() => {
            this.updateDisplay();
        }, 1000); // Update mỗi giây

        this.saveToLocalStorage();
        console.log(`⏱️ Started timer for task ${this.taskId}`);
    }

    /**
     * Tạm dừng
     */
    pause() {
        if (!this.isRunning) return;

        this.elapsedTime += Date.now() - this.startTime;
        this.isRunning = false;

        clearInterval(this.interval);
        this.saveToLocalStorage();
        this.updateDisplay();

        console.log(`⏸️ Paused timer for task ${this.taskId}`);
    }

    /**
     * Dừng hẳn và lưu Firebase
     */
    async stop() {
        if (this.isRunning) {
            this.pause();
        }

        await this.saveToFirebase();
        this.clearLocalStorage();

        showNotification(`⏹️ Đã lưu thời gian: ${this.getFormattedTime()}`);
        console.log(`⏹️ Stopped timer for task ${this.taskId}`);
    }

    /**
     * Reset về 0
     */
    reset() {
        this.pause();
        this.elapsedTime = 0;
        this.startTime = null;
        this.updateDisplay();
        this.clearLocalStorage();
    }

    /**
     * Lấy tổng thời gian (milliseconds)
     */
    getTotalTime() {
        if (this.isRunning) {
            return this.elapsedTime + (Date.now() - this.startTime);
        }
        return this.elapsedTime;
    }

    /**
     * Format thời gian: HH:MM:SS
     */
    getFormattedTime() {
        const total = this.getTotalTime();
        const hours = Math.floor(total / 3600000);
        const minutes = Math.floor((total % 3600000) / 60000);
        const seconds = Math.floor((total % 60000) / 1000);

        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    /**
     * Gắn element hiển thị
     */
    attachDisplay(elementId) {
        this.displayElement = document.getElementById(elementId);
        this.updateDisplay();
    }

    /**
     * Cập nhật hiển thị
     */
    updateDisplay() {
        if (this.displayElement) {
            this.displayElement.textContent = this.getFormattedTime();

            // Thêm class khi running
            if (this.isRunning) {
                this.displayElement.classList.add('running');
            } else {
                this.displayElement.classList.remove('running');
            }
        }
    }

    /**
     * Lưu vào localStorage (backup khi reload)
     */
    saveToLocalStorage() {
        const data = {
            taskId: this.taskId,
            elapsedTime: this.elapsedTime,
            isRunning: this.isRunning,
            startTime: this.startTime
        };
        localStorage.setItem(`timer_${this.taskId}`, JSON.stringify(data));
    }

    /**
     * Xóa localStorage
     */
    clearLocalStorage() {
        localStorage.removeItem(`timer_${this.taskId}`);
    }

    /**
     * Khôi phục từ localStorage
     */
    static restore(taskId) {
        const data = localStorage.getItem(`timer_${taskId}`);
        if (!data) return null;

        try {
            const parsed = JSON.parse(data);
            const tracker = new TimeTracker(taskId, parsed.elapsedTime);

            if (parsed.isRunning && parsed.startTime) {
                // Tính thêm thời gian đã qua khi offline
                const offlineTime = Date.now() - parsed.startTime;
                tracker.elapsedTime += offlineTime;
                tracker.start();
            }

            return tracker;
        } catch (error) {
            console.error('Error restoring timer:', error);
            return null;
        }
    }

    /**
     * Lưu vào Firebase
     * Lưu ý: Lưu trực tiếp timeSpent vào data riêng để không cần load tasks
     */
    async saveToFirebase() {
        try {
            const user = auth.currentUser;
            if (!user) return;

            // Lưu time tracking data riêng biệt
            const timeData = {
                [`taskTime_${this.taskId}`]: {
                    timeSpent: Math.floor(this.getTotalTime() / 1000),
                    lastTracked: new Date().toISOString()
                }
            };

            await saveUserData(user.uid, timeData);
            console.log(`✅ Saved time for task ${this.taskId}`);
        } catch (error) {
            console.error('Error saving time to Firebase:', error);
        }
    }
}

/**
 * Manager quản lý nhiều trackers
 */
export class TimeTrackerManager {
    constructor() {
        this.trackers = new Map();
    }

    /**
     * Lấy hoặc tạo tracker cho task
     */
    getTracker(taskId, initialTime = 0) {
        if (!this.trackers.has(taskId)) {
            // Try restore from localStorage first
            let tracker = TimeTracker.restore(taskId);
            if (!tracker) {
                tracker = new TimeTracker(taskId, initialTime * 1000); // seconds to ms
            }
            this.trackers.set(taskId, tracker);
        }
        return this.trackers.get(taskId);
    }

    /**
     * Start track
     */
    start(taskId) {
        const tracker = this.getTracker(taskId);
        tracker.start();
        return tracker;
    }

    /**
     * Pause track
     */
    pause(taskId) {
        const tracker = this.trackers.get(taskId);
        if (tracker) {
            tracker.pause();
        }
    }

    /**
     * Stop và save
     */
    async stop(taskId) {
        const tracker = this.trackers.get(taskId);
        if (tracker) {
            await tracker.stop();
            this.trackers.delete(taskId);
        }
    }

    /**
     * Stop tất cả trackers
     */
    async stopAll() {
        for (const [taskId, tracker] of this.trackers) {
            if (tracker.isRunning) {
                await tracker.stop();
            }
        }
        this.trackers.clear();
    }

    /**
     * Render UI controls
     */
    renderControls(taskId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const tracker = this.getTracker(taskId);

        const html = `
            <div class="time-tracker-controls">
                <div class="timer-display" id="timer-${taskId}">
                    ${tracker.getFormattedTime()}
                </div>
                <div class="timer-buttons">
                    <button class="btn-timer btn-start" data-task="${taskId}" ${tracker.isRunning ? 'disabled' : ''}>
                        ▶️ Start
                    </button>
                    <button class="btn-timer btn-pause" data-task="${taskId}" ${!tracker.isRunning ? 'disabled' : ''}>
                        ⏸️ Pause
                    </button>
                    <button class="btn-timer btn-stop" data-task="${taskId}">
                        ⏹️ Stop
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;
        tracker.attachDisplay(`timer-${taskId}`);

        this.attachEventListeners(taskId);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners(taskId) {
        const startBtn = document.querySelector(`.btn-start[data-task="${taskId}"]`);
        const pauseBtn = document.querySelector(`.btn-pause[data-task="${taskId}"]`);
        const stopBtn = document.querySelector(`.btn-stop[data-task="${taskId}"]`);

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.start(taskId);
                startBtn.disabled = true;
                pauseBtn.disabled = false;
            });
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.pause(taskId);
                startBtn.disabled = false;
                pauseBtn.disabled = true;
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', async () => {
                await this.stop(taskId);
                showNotification('✅ Đã lưu thời gian làm việc!');
            });
        }
    }
}

/**
 * Analytics - Tổng hợp thời gian
 */
export class TimeAnalytics {
    /**
     * Tính tổng thời gian của tất cả tasks
     */
    static getTotalTime(tasks) {
        return tasks.reduce((total, task) => total + (task.timeSpent || 0), 0);
    }

    /**
     * Group theo ngày
     */
    static getTimeByDate(tasks) {
        const byDate = {};

        tasks.forEach(task => {
            if (task.lastTracked) {
                const date = new Date(task.lastTracked).toLocaleDateString('vi-VN');
                byDate[date] = (byDate[date] || 0) + (task.timeSpent || 0);
            }
        });

        return byDate;
    }

    /**
     * Group theo project
     */
    static getTimeByProject(tasks) {
        const byProject = {};

        tasks.forEach(task => {
            const project = task.project || 'Không có';
            byProject[project] = (byProject[project] || 0) + (task.timeSpent || 0);
        });

        return byProject;
    }

    /**
     * Top tasks theo thời gian
     */
    static getTopTasks(tasks, limit = 5) {
        return tasks
            .filter(t => t.timeSpent > 0)
            .sort((a, b) => b.timeSpent - a.timeSpent)
            .slice(0, limit);
    }

    /**
     * Export to CSV
     */
    static exportToCSV(tasks) {
        const headers = ['Task', 'Project', 'Time Spent (hours)', 'Last Tracked'];
        const rows = tasks.map(task => [
            task.title,
            task.project || '-',
            (task.timeSpent / 3600).toFixed(2),
            task.lastTracked ? new Date(task.lastTracked).toLocaleString('vi-VN') : '-'
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `time_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();

        showNotification('📊 Đã export báo cáo thời gian!');
    }
}

/**
 * Helper: Pad số với 0
 */
function pad(num) {
    return String(num).padStart(2, '0');
}

// Global instance
export const trackerManager = new TimeTrackerManager();
