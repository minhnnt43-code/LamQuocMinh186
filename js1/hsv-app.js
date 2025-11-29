/**
 * HSV App - Main JavaScript
 * Core logic cho ứng dụng
 */

// ==================== DROPDOWN TOGGLE ====================
document.addEventListener('DOMContentLoaded', function () {
    // User avatar dropdown
    const userAvatarBtn = document.getElementById('userAvatarBtn');
    const userDropdown = document.getElementById('userDropdown');

    if (userAvatarBtn && userDropdown) {
        userAvatarBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function () {
            userDropdown.classList.remove('active');
        });

        userDropdown.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    }

    // ==================== REAL-TIME COUNTER (DEMO) ====================
    const checkinCountEl = document.getElementById('checkinCount');
    if (checkinCountEl) {
        let count = 245;
        setInterval(() => {
            // Simulate real-time updates
            if (Math.random() > 0.7) {
                count++;
                checkinCountEl.textContent = count;

                // Add animation
                checkinCountEl.style.transform = 'scale(1.2)';
                checkinCountEl.style.color = 'var(--color-success)';
                setTimeout(() => {
                    checkinCountEl.style.transform = 'scale(1)';
                    checkinCountEl.style.color = '';
                }, 300);
            }
        }, 5000);
    }

    // ==================== CALENDAR NAVIGATION ====================
    const calendarNavBtns = document.querySelectorAll('.calendar-nav-btn');
    calendarNavBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            console.log('Calendar navigation clicked');
            // TODO: Implement month navigation
        });
    });

    // ==================== CALENDAR DAY CLICK ====================
    const calendarDays = document.querySelectorAll('.calendar-day:not(.inactive)');
    calendarDays.forEach(day => {
        day.addEventListener('click', function () {
            if (this.classList.contains('has-event')) {
                showEventModal(this);
            }
        });
    });

    // ==================== NEWS ITEM CLICK ====================
    const newsItems = document.querySelectorAll('.news-item');
    newsItems.forEach(item => {
        item.addEventListener('click', function () {
            const title = this.querySelector('.news-item-title').textContent;
            alert(`📰 ${title}\n\nTính năng xem chi tiết đang được phát triển...`);
        });
    });
});

// ==================== SHOW EVENT MODAL ====================
function showEventModal(dayElement) {
    const eventInfo = getEventInfo(dayElement);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">Chi tiết Sự kiện</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    &times;
                </button>
            </div>
            <div class="modal-body">
                <h4 style="color: var(--color-primary); margin-bottom: var(--spacing-md);">
                    ${eventInfo.title}
                </h4>
                <p><strong>📅 Ngày:</strong> ${eventInfo.date}</p>
                <p><strong>⏰ Thời gian:</strong> ${eventInfo.time}</p>
                <p><strong>📍 Địa điểm:</strong> ${eventInfo.location}</p>
                <p>
                    <strong>Trạng thái:</strong>
                    <span class="badge ${eventInfo.statusClass}">
                        ${eventInfo.status}
                    </span>
                </p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                    Đóng
                </button>
                <button class="btn btn-accent">
                    <i class="fas fa-bell"></i>
                    Đặt nhắc nhở
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close on overlay click
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// ==================== GET EVENT INFO (DEMO DATA) ====================
function getEventInfo(dayElement) {
    const day = dayElement.textContent;

    if (dayElement.classList.contains('event-ongoing')) {
        return {
            title: 'Ngày Hội Tình nguyện',
            date: `21/11/2024`,
            time: '08:00 - 17:00',
            location: 'Sân trường',
            status: 'Đang diễn ra',
            statusClass: 'badge-approved'
        };
    } else {
        return {
            title: 'Họp Ban Chấp hành',
            date: `${day}/11/2024`,
            time: '14:00 - 16:00',
            location: 'Phòng họp A',
            status: 'Sắp diễn ra',
            statusClass: 'badge-pending'
        };
    }
}

// ==================== UTILITY FUNCTIONS ====================
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'};
        color: white;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-xl);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
