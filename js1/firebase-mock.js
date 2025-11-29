/**
 * HSV Firebase Mock
 * Giả lập Backend Database & Real-time updates
 */

const MockDB = {
    // Dữ liệu sự kiện
    events: {
        "evt_2024_11_29": {
            id: "evt_2024_11_29",
            name: "Họp Chi Đoàn Tháng 11",
            location: "Phòng A205",
            startTime: new Date().setHours(8, 0, 0, 0),
            endTime: new Date().setHours(11, 0, 0, 0),
            secret: "HSV_SECRET_KEY_2024", // Secret key để sinh mã TOTP
            status: "ongoing", // upcoming, ongoing, finished
            attendees: [] // Danh sách user đã điểm danh
        },
        "evt_2024_12_01": {
            id: "evt_2024_12_01",
            name: "Tập huấn Cán bộ Đoàn",
            location: "Hội trường lớn",
            startTime: new Date("2024-12-01T07:30:00").getTime(),
            endTime: new Date("2024-12-01T17:00:00").getTime(),
            secret: "HSV_TRAINING_KEY",
            status: "upcoming",
            attendees: []
        }
    },

    // Dữ liệu người dùng
    users: {
        "user_001": {
            id: "user_001",
            name: "Nguyễn Văn A",
            studentId: "2024001",
            role: "member"
        }
    },

    // Hàm giả lập lấy dữ liệu (Async)
    async getEvent(eventId) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(this.events[eventId]);
            }, 300); // Delay giả lập mạng
        });
    },

    // Hàm giả lập điểm danh
    async checkIn(eventId, userId, code, timestamp) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const event = this.events[eventId];
                if (!event) return reject("Sự kiện không tồn tại");

                // Validate Code (Giả lập logic server-side)
                // Trong thực tế server sẽ tự tính toán code dựa trên secret và timestamp gửi lên
                // Ở đây ta chấp nhận code nếu nó khớp với logic client (để demo)

                // Kiểm tra trùng lặp
                if (event.attendees.includes(userId)) {
                    return reject("Bạn đã điểm danh rồi!");
                }

                event.attendees.push(userId);
                resolve({ success: true, message: "Điểm danh thành công!", time: new Date() });
            }, 500);
        });
    }
};

// Export global
window.MockDB = MockDB;
