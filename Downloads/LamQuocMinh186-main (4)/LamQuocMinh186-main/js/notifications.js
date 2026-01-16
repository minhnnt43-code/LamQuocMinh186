// ============================================================
// FILE: js/notifications.js
// Mục đích: Enhanced Notification Center với AI categorization
// ============================================================

import { showNotification } from './common.js';

/**
 * Notification Categories
 */
const CATEGORIES = {
    URGENT: { label: 'Khẩn cấp', color: '#e74c3c', icon: '🔴', priority: 1 },
    TASK: { label: 'Công việc', color: '#3498db', icon: '📋', priority: 2 },
    EVENT: { label: 'Sự kiện', color: '#9b59b6', icon: '📅', priority: 3 },
    BOOKING: { label: 'Đặt lịch', color: '#1abc9c', icon: '📞', priority: 4 },
    SYSTEM: { label: 'Hệ thống', color: '#95a5a6', icon: '⚙️', priority: 5 },
    INFO: { label: 'Thông tin', color: '#34495e', icon: 'ℹ️', priority: 6 }
};

/**
 * Notification Manager
 */
export class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.listeners = [];
    }

    /**
     * Add notification
     */
    add(notification) {
        const noti = {
            id: 'noti-' + Date.now(),
            ...notification,
            category: notification.category || this.autoDetectCategory(notification),
            isRead: false,
            createdAt: new Date().toISOString()
        };

        // Insert based on priority
        const categoryInfo = CATEGORIES[noti.category] || CATEGORIES.INFO;
        noti.priority = categoryInfo.priority;

        this.notifications.unshift(noti);
        this.unreadCount++;

        this.notifyListeners();
        this.showBrowserNotification(noti);

        return noti;
    }

    /**
     * Auto-detect category based on keywords
     */
    autoDetectCategory(notification) {
        const text = (notification.title + ' ' + (notification.message || '')).toLowerCase();

        const rules = {
            URGENT: ['gấp', 'urgent', 'khẩn', 'ngay lập tức', 'deadline', 'quá hạn'],
            TASK: ['task', 'công việc', 'nhiệm vụ', 'hoàn thành', 'todo'],
            EVENT: ['sự kiện', 'event', 'họp', 'meeting', 'buổi'],
            BOOKING: ['đặt lịch', 'booking', 'hẹn', 'appointment'],
            SYSTEM: ['hệ thống', 'system', 'cập nhật', 'update', 'lỗi', 'error']
        };

        for (const [category, keywords] of Object.entries(rules)) {
            if (keywords.some(kw => text.includes(kw))) {
                return category;
            }
        }

        return 'INFO';
    }

    /**
     * Mark as read
     */
    markAsRead(notificationId) {
        const noti = this.notifications.find(n => n.id === notificationId);
        if (noti && !noti.isRead) {
            noti.isRead = true;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.notifyListeners();
        }
    }

    /**
     * Mark all as read
     */
    markAllAsRead() {
        this.notifications.forEach(n => n.isRead = true);
        this.unreadCount = 0;
        this.notifyListeners();
        showNotification('✅ Đã đọc tất cả thông báo');
    }

    /**
     * Delete notification
     */
    delete(notificationId) {
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index > -1) {
            const noti = this.notifications[index];
            if (!noti.isRead) {
                this.unreadCount = Math.max(0, this.unreadCount - 1);
            }
            this.notifications.splice(index, 1);
            this.notifyListeners();
        }
    }

    /**
     * Clear all
     */
    clearAll() {
        this.notifications = [];
        this.unreadCount = 0;
        this.notifyListeners();
    }

    /**
     * Filter by category
     */
    getByCategory(category) {
        return this.notifications.filter(n => n.category === category);
    }

    /**
     * Get unread
     */
    getUnread() {
        return this.notifications.filter(n => !n.isRead);
    }

    /**
     * Subscribe to changes
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify listeners
     */
    notifyListeners() {
        this.listeners.forEach(listener => listener(this.notifications, this.unreadCount));
    }

    /**
     * Browser notification
     */
    async showBrowserNotification(noti) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }

        if (Notification.permission === 'granted') {
            const categoryInfo = CATEGORIES[noti.category];
            new Notification(noti.title, {
                body: noti.message,
                icon: categoryInfo?.icon || '🔔',
                tag: noti.id
            });
        }
    }
}

/**
 * Render Notification Center
 */
export function renderNotificationCenter(containerId, notifications, manager) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Group by date
    const grouped = groupByDate(notifications);

    const html = `
        <div class="notification-center">
            <div class="noti-header">
                <h3>🔔 Thông báo</h3>
                <div class="noti-actions">
                    <button class="btn-mark-all" id="btn-mark-all-read">✓ Đọc tất cả</button>
                    <button class="btn-clear-all" id="btn-clear-all-noti">🗑️ Xóa tất cả</button>
                </div>
            </div>
            
            <div class="noti-filters">
                <button class="filter-btn active" data-filter="all">Tất cả</button>
                ${Object.entries(CATEGORIES).map(([key, cat]) => `
                    <button class="filter-btn" data-filter="${key}">${cat.icon} ${cat.label}</button>
                `).join('')}
            </div>
            
            <div class="noti-list" id="noti-list">
                ${Object.entries(grouped).map(([date, notis]) => `
                    <div class="noti-group">
                        <div class="noti-date">${date}</div>
                        ${notis.map(n => renderNotificationItem(n)).join('')}
                    </div>
                `).join('')}
                ${notifications.length === 0 ? '<p class="no-noti">Không có thông báo</p>' : ''}
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Event handlers
    document.getElementById('btn-mark-all-read')?.addEventListener('click', () => {
        manager.markAllAsRead();
    });

    document.getElementById('btn-clear-all-noti')?.addEventListener('click', () => {
        if (confirm('Xóa tất cả thông báo?')) {
            manager.clearAll();
        }
    });

    // Filter buttons
    container.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');
            const filtered = filter === 'all' ? notifications : manager.getByCategory(filter);
            renderNotificationList(filtered, manager);
        });
    });

    // Click to mark as read
    container.querySelectorAll('.noti-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            manager.markAsRead(id);
            item.classList.remove('unread');
        });
    });

    // Delete buttons
    container.querySelectorAll('.btn-delete-noti').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.closest('.noti-item').getAttribute('data-id');
            manager.delete(id);
        });
    });
}

function renderNotificationItem(noti) {
    const cat = CATEGORIES[noti.category] || CATEGORIES.INFO;
    return `
        <div class="noti-item ${noti.isRead ? '' : 'unread'}" data-id="${noti.id}">
            <div class="noti-icon" style="background: ${cat.color}">${cat.icon}</div>
            <div class="noti-content">
                <div class="noti-title">${noti.title}</div>
                ${noti.message ? `<div class="noti-message">${noti.message}</div>` : ''}
                <div class="noti-time">${formatTime(noti.createdAt)}</div>
            </div>
            <button class="btn-delete-noti">×</button>
        </div>
    `;
}

function renderNotificationList(notifications, manager) {
    const listEl = document.getElementById('noti-list');
    if (!listEl) return;

    const grouped = groupByDate(notifications);
    listEl.innerHTML = Object.entries(grouped).map(([date, notis]) => `
        <div class="noti-group">
            <div class="noti-date">${date}</div>
            ${notis.map(n => renderNotificationItem(n)).join('')}
        </div>
    `).join('') || '<p class="no-noti">Không có thông báo</p>';
}

function groupByDate(notifications) {
    const groups = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    notifications.forEach(n => {
        const date = new Date(n.createdAt).toDateString();
        let label;

        if (date === today) label = 'Hôm nay';
        else if (date === yesterday) label = 'Hôm qua';
        else label = new Date(n.createdAt).toLocaleDateString('vi-VN');

        if (!groups[label]) groups[label] = [];
        groups[label].push(n);
    });

    return groups;
}

function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Render notification badge
 */
export function renderNotificationBadge(containerId, unreadCount) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (unreadCount > 0) {
        container.innerHTML = `<span class="noti-badge">${unreadCount > 99 ? '99+' : unreadCount}</span>`;
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

// Export singleton
export const notificationManager = new NotificationManager();
export { CATEGORIES };
