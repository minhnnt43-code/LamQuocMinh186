// ============================================================
// FILE: js/booking.js
// Mục đích: Tạo và quản lý Booking Links cá nhân
// ============================================================

import { saveUserData, auth, getAppointmentRequests, updateSubCollectionDoc } from './firebase.js';
import { showNotification } from './common.js';

/**
 * Class quản lý Booking
 */
export class BookingManager {
    constructor() {
        this.settings = {
            enabled: true,
            workHours: { start: 9, end: 18 },
            workDays: [1, 2, 3, 4, 5], // Mon-Fri
            slotDuration: 30, // minutes
            bufferTime: 15, // minutes between slots
            maxAdvanceDays: 30
        };
        this.baseBookings = []; // Local/Legacy bookings array
        this.externalRequests = []; // Requests from Portfolio
        this.blockedSlots = [];
    }

    /**
     * Getter combines both sources
     */
    get bookings() {
        return [...this.baseBookings, ...this.externalRequests].sort((a, b) => {
            return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
        });
    }

    // Setter for backward compatibility when loading from saveUserData
    set bookings(val) {
        this.baseBookings = val || [];
    }

    /**
     * Load external requests from Firestore (Portfolio)
     */
    async syncRequests() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const requests = await getAppointmentRequests(user.uid);

            // Map fields to match Admin UI structure
            this.externalRequests = requests.map(req => ({
                id: req.id,
                isExternal: true, // Flag to identify source
                clientName: req.guestName,
                clientEmail: req.guestEmail,
                date: req.date,
                startTime: req.time,
                endTime: this.calculateEndTime(req.time),
                status: req.status || 'pending',
                note: req.reason,
                createdAt: req.createdAt,
                ...req
            }));

            console.log("Đã đồng bộ yêu cầu hẹn:", this.externalRequests.length);
        } catch (error) {
            console.error("Lỗi đồng bộ yêu cầu:", error);
        }
    }

    calculateEndTime(startTime) {
        if (!startTime) return '';
        const [h, m] = startTime.split(':').map(Number);
        const date = new Date();
        date.setHours(h, m + (this.settings.slotDuration || 30));
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Generate unique booking link
     */
    generateBookingLink() {
        const user = auth.currentUser;
        if (!user) return null;

        const baseUrl = window.location.origin;
        const encodedId = btoa(user.uid).replace(/=/g, '');

        return `${baseUrl}/book.html?u=${encodedId}`;
    }

    /**
     * Lấy các slot trống trong ngày
     */
    getAvailableSlots(date, existingEvents = []) {
        const slots = [];
        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getDay();

        // Check if workday
        if (!this.settings.workDays.includes(dayOfWeek)) {
            return []; // Not a workday
        }

        const { start, end } = this.settings.workHours;
        const duration = this.settings.slotDuration;
        const buffer = this.settings.bufferTime;

        for (let hour = start; hour < end; hour++) {
            for (let min = 0; min < 60; min += duration) {
                const slotStart = new Date(targetDate);
                slotStart.setHours(hour, min, 0, 0);

                const slotEnd = new Date(slotStart);
                slotEnd.setMinutes(slotEnd.getMinutes() + duration);

                // Check if slot is in the past
                if (slotStart < new Date()) continue;

                // Check conflicts with existing events
                const hasConflict = existingEvents.some(event => {
                    const eventStart = new Date(event.start);
                    const eventEnd = new Date(event.end || event.start);
                    eventEnd.setMinutes(eventEnd.getMinutes() + buffer);

                    return (slotStart < eventEnd && slotEnd > eventStart);
                });

                // Check blocked slots
                const isBlocked = this.blockedSlots.some(blocked => {
                    const blockedStart = new Date(blocked.start);
                    const blockedEnd = new Date(blocked.end);
                    return (slotStart < blockedEnd && slotEnd > blockedStart);
                });

                if (!hasConflict && !isBlocked) {
                    slots.push({
                        start: slotStart.toISOString(),
                        end: slotEnd.toISOString(),
                        display: this.formatTimeSlot(slotStart, slotEnd)
                    });
                }
            }
        }

        return slots;
    }

    /**
     * Đặt lịch
     */
    async createBooking(bookingData) {
        const booking = {
            id: 'booking-' + Date.now(),
            ...bookingData,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        this.baseBookings.push(booking);
        await this.save();

        // Create calendar event
        const event = {
            title: `📅 Hẹn: ${bookingData.guestName}`,
            start: bookingData.slot.start,
            end: bookingData.slot.end,
            description: `Người đặt: ${bookingData.guestName}\nEmail: ${bookingData.guestEmail}\nGhi chú: ${bookingData.note || 'Không có'}`,
            type: 'booking'
        };

        showNotification('✅ Đã đặt lịch thành công!');
        return { booking, event };
    }

    /**
     * Xác nhận booking
     */
    async confirmBooking(bookingId) {
        // Tìm trong external requests trước
        const extBooking = this.externalRequests.find(b => b.id === bookingId);
        if (extBooking) {
            try {
                const user = auth.currentUser;
                await updateSubCollectionDoc(user.uid, 'appointment_requests', bookingId, {
                    status: 'confirmed',
                    confirmedAt: new Date().toISOString()
                });
                extBooking.status = 'confirmed'; // Update local state
                showNotification('✅ Đã xác nhận lịch hẹn (Khách)!');
                return extBooking;
            } catch (e) {
                console.error(e);
                showNotification('❌ Lỗi xác nhận', 'error');
            }
        }

        // Tìm trong local baseBookings
        const booking = this.baseBookings.find(b => b.id === bookingId);
        if (booking) {
            booking.status = 'confirmed';
            booking.confirmedAt = new Date().toISOString();
            await this.save();
            showNotification('✅ Đã xác nhận lịch hẹn');
        }
        return booking;
    }

    /**
     * Hủy booking
     */
    async cancelBooking(bookingId, reason = '') {
        // External
        const extBooking = this.externalRequests.find(b => b.id === bookingId);
        if (extBooking) {
            try {
                const user = auth.currentUser;
                await updateSubCollectionDoc(user.uid, 'appointment_requests', bookingId, {
                    status: 'cancelled',
                    cancelReason: reason,
                    cancelledAt: new Date().toISOString()
                });
                extBooking.status = 'cancelled';
                showNotification('❌ Đã từ chối lịch hẹn (Khách)');
                return extBooking;
            } catch (e) { console.error(e); }
        }

        // Local
        const booking = this.baseBookings.find(b => b.id === bookingId);
        if (booking) {
            booking.status = 'cancelled';
            booking.cancelReason = reason;
            booking.cancelledAt = new Date().toISOString();
            await this.save();
            showNotification('❌ Đã hủy lịch hẹn');
        }
        return booking;
    }

    /**
     * Block time slot
     */
    async blockSlot(start, end, reason = '') {
        this.blockedSlots.push({
            id: 'block-' + Date.now(),
            start,
            end,
            reason,
            createdAt: new Date().toISOString()
        });
        await this.save();
    }

    /**
     * Update settings
     */
    async updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        await this.save();
        showNotification('✅ Đã cập nhật cài đặt');
    }

    /**
     * Save to Firebase
     */
    async save() {
        try {
            const user = auth.currentUser;
            if (!user) return;

            await saveUserData(user.uid, {
                bookingSettings: this.settings,
                bookings: this.baseBookings, // Chỉ lưu local bookings vào main doc
                blockedSlots: this.blockedSlots
            });
        } catch (error) {
            console.error('Error saving booking data:', error);
        }
    }

    // Helpers
    formatTimeSlot(start, end) {
        const startStr = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const endStr = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        return `${startStr} - ${endStr}`;
    }
}

/**
 * Render Booking Form (Public Page)
 */
export function renderBookingForm(containerId, slots, onSubmit) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
        <div class="booking-form">
            <h2>📅 Đặt lịch hẹn</h2>
            
            <div class="form-group">
                <label>Họ tên *</label>
                <input type="text" id="booking-name" required placeholder="Nguyễn Văn A">
            </div>
            
            <div class="form-group">
                <label>Email *</label>
                <input type="email" id="booking-email" required placeholder="email@example.com">
            </div>
            
            <div class="form-group">
                <label>Số điện thoại</label>
                <input type="tel" id="booking-phone" placeholder="0901234567">
            </div>
            
            <div class="form-group">
                <label>Chọn thời gian *</label>
                <div class="slot-grid">
                    ${slots.map((slot, i) => `
                        <button type="button" class="slot-btn" data-index="${i}" data-slot='${JSON.stringify(slot)}'>
                            ${slot.display}
                        </button>
                    `).join('')}
                </div>
                <input type="hidden" id="booking-slot">
            </div>
            
            <div class="form-group">
                <label>Ghi chú</label>
                <textarea id="booking-note" placeholder="Nội dung muốn trao đổi..."></textarea>
            </div>
            
            <button type="submit" class="btn-book" id="btn-submit-booking">
                ✅ Xác nhận đặt lịch
            </button>
        </div>
    `;

    container.innerHTML = html;

    // Slot selection
    container.querySelectorAll('.slot-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('booking-slot').value = btn.getAttribute('data-slot');
        });
    });

    // Submit
    document.getElementById('btn-submit-booking')?.addEventListener('click', () => {
        const name = document.getElementById('booking-name').value.trim();
        const email = document.getElementById('booking-email').value.trim();
        const phone = document.getElementById('booking-phone').value.trim();
        const slotData = document.getElementById('booking-slot').value;
        const note = document.getElementById('booking-note').value.trim();

        if (!name || !email || !slotData) {
            showNotification('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }

        onSubmit({
            guestName: name,
            guestEmail: email,
            guestPhone: phone,
            slot: JSON.parse(slotData),
            note
        });
    });
}

/**
 * Render Settings Form
 */
export function renderBookingSettings(containerId, settings, onSave) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    const html = `
        <div class="booking-settings">
            <h3>⚙️ Cài đặt Booking</h3>
            
            <div class="setting-row">
                <label>Giờ làm việc:</label>
                <input type="number" id="work-start" value="${settings.workHours.start}" min="0" max="23"> giờ
                đến
                <input type="number" id="work-end" value="${settings.workHours.end}" min="0" max="23"> giờ
            </div>
            
            <div class="setting-row">
                <label>Ngày làm việc:</label>
                <div class="day-checkboxes">
                    ${dayNames.map((name, i) => `
                        <label class="day-checkbox">
                            <input type="checkbox" value="${i}" ${settings.workDays.includes(i) ? 'checked' : ''}>
                            ${name}
                        </label>
                    `).join('')}
                </div>
            </div>
            
            <div class="setting-row">
                <label>Thời lượng slot:</label>
                <select id="slot-duration">
                    <option value="15" ${settings.slotDuration === 15 ? 'selected' : ''}>15 phút</option>
                    <option value="30" ${settings.slotDuration === 30 ? 'selected' : ''}>30 phút</option>
                    <option value="45" ${settings.slotDuration === 45 ? 'selected' : ''}>45 phút</option>
                    <option value="60" ${settings.slotDuration === 60 ? 'selected' : ''}>60 phút</option>
                </select>
            </div>
            
            <button class="btn-save-settings" id="btn-save-booking-settings">💾 Lưu cài đặt</button>
        </div>
    `;

    container.innerHTML = html;

    document.getElementById('btn-save-booking-settings')?.addEventListener('click', () => {
        const workDays = [];
        container.querySelectorAll('.day-checkbox input:checked').forEach(cb => {
            workDays.push(parseInt(cb.value));
        });

        onSave({
            workHours: {
                start: parseInt(document.getElementById('work-start').value),
                end: parseInt(document.getElementById('work-end').value)
            },
            workDays,
            slotDuration: parseInt(document.getElementById('slot-duration').value)
        });
    });
}

/**
 * Render Booking Requests List (Admin)
 */
export function renderBookingRequests(containerId, bookings, filterStatus = 'all') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Filter bookings
    let filteredBookings = bookings;
    if (filterStatus !== 'all') {
        filteredBookings = bookings.filter(b => b.status === filterStatus);
    }

    if (!filteredBookings || filteredBookings.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 2rem; color: #888;">
                <p>📅 Không có yêu cầu nào (${filterStatus === 'all' ? 'Tất cả' : filterStatus})</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredBookings.map(b => {
        const statusColors = {
            pending: '#f39c12',
            confirmed: '#27ae60', // Changed from approved to match data
            approved: '#27ae60',   // Fallback
            rejected: '#e74c3c',
            cancelled: '#e74c3c'
        };
        const statusText = {
            pending: 'Chờ duyệt',
            confirmed: 'Đã duyệt',
            approved: 'Đã duyệt',
            rejected: 'Từ chối',
            cancelled: 'Đã hủy'
        };

        return `
            <div class="booking-card" style="border-left: 4px solid ${statusColors[b.status] || '#ccc'}; padding:1rem; margin-bottom:1rem; background:#fff; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                    <strong>${b.clientName}</strong>
                    <span style="font-size:0.8rem; background:${statusColors[b.status] || '#eee'}; color:#fff; padding:2px 8px; border-radius:12px;">
                        ${statusText[b.status] || b.status}
                    </span>
                </div>
                <div style="font-size:0.9rem; color:#555; margin-bottom:0.5rem;">
                    <div>📧 ${b.clientEmail}</div>
                    <div>🕒 ${new Date(b.date).toLocaleDateString('vi-VN')} | ${b.startTime} - ${b.endTime}</div>
                </div>
                ${b.note ? `<div style="font-style:italic; font-size:0.9rem; color:#666; background:#f9f9f9; padding:0.5rem; border-radius:4px;">"${b.note}"</div>` : ''}
                
                ${b.status === 'pending' ? `
                    <div style="margin-top:1rem; display:flex; gap:0.5rem;">
                        <button onclick="approveBooking('${b.id}')" style="flex:1; background:#27ae60; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">✅ Duyệt</button>
                        <button onclick="rejectBooking('${b.id}')" style="flex:1; background:#e74c3c; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">❌ Từ chối</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Setup Booking Filters
 */
export function setupBookingFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn[data-filter]');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');

            // Get filter value
            const filter = btn.getAttribute('data-filter');

            // Re-render
            renderBookingRequests('booking-list-container', bookingManager.bookings, filter);
        });
    });
}

// Export singleton
export const bookingManager = new BookingManager();

// [FIX] Expose functions to window for onclick events
window.approveBooking = async (id) => {
    if (confirm('Duyệt yêu cầu hẹn này?')) {
        await bookingManager.confirmBooking(id);
        renderBookingRequests('booking-list-container', bookingManager.bookings);
    }
};

window.rejectBooking = async (id) => {
    // Create custom modal instead of prompt()
    const modal = document.createElement('div');
    modal.id = 'reject-modal';
    modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.7);
        display: flex; align-items: center; justify-content: center; z-index: 10000;
    `;

    modal.innerHTML = `
        <div style="background: #fff; padding: 25px; border-radius: 12px; max-width: 400px; width: 90%;">
            <h3 style="margin: 0 0 15px; color: #333;">❌ Từ chối yêu cầu hẹn</h3>
            <textarea id="reject-reason" placeholder="Nhập lý do từ chối..." rows="3"
                style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; color: #333; background: #f9f9f9; resize: none; box-sizing: border-box;">Lịch trình không phù hợp</textarea>
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 15px;">
                <button onclick="document.getElementById('reject-modal').remove()" 
                    style="padding: 10px 20px; border: none; border-radius: 8px; background: #e0e0e0; cursor: pointer;">Hủy</button>
                <button id="btn-confirm-reject"
                    style="padding: 10px 20px; border: none; border-radius: 8px; background: #dc2626; color: white; cursor: pointer;">❌ Từ chối</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('reject-reason').focus();
    document.getElementById('reject-reason').select();

    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    document.getElementById('btn-confirm-reject').addEventListener('click', async () => {
        const reason = document.getElementById('reject-reason').value.trim() || 'Lịch trình không phù hợp';
        await bookingManager.cancelBooking(id, reason);
        renderBookingRequests('booking-list-container', bookingManager.bookings);
        modal.remove();
    });
};
