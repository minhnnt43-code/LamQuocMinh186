/* ═══════════════════════════════════════════════════════════════
   WESTERN ZODIAC MODULE - 12 Cung Hoàng Đạo
   Lá Số Lâm Quốc Minh
   ═══════════════════════════════════════════════════════════════ */

const WesternZodiac = {
    // 12 Cung Hoàng Đạo
    SIGNS: [
        { name: 'Bạch Dương', nameEn: 'Aries', symbol: '♈', emoji: '🐏', element: 'Hỏa', quality: 'Cardinal', ruler: 'Sao Hỏa', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19 },
        { name: 'Kim Ngưu', nameEn: 'Taurus', symbol: '♉', emoji: '🐂', element: 'Thổ', quality: 'Fixed', ruler: 'Sao Kim', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },
        { name: 'Song Tử', nameEn: 'Gemini', symbol: '♊', emoji: '👯', element: 'Khí', quality: 'Mutable', ruler: 'Sao Thủy', startMonth: 5, startDay: 21, endMonth: 6, endDay: 20 },
        { name: 'Cự Giải', nameEn: 'Cancer', symbol: '♋', emoji: '🦀', element: 'Thủy', quality: 'Cardinal', ruler: 'Mặt Trăng', startMonth: 6, startDay: 21, endMonth: 7, endDay: 22 },
        { name: 'Sư Tử', nameEn: 'Leo', symbol: '♌', emoji: '🦁', element: 'Hỏa', quality: 'Fixed', ruler: 'Mặt Trời', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22 },
        { name: 'Xử Nữ', nameEn: 'Virgo', symbol: '♍', emoji: '👧', element: 'Thổ', quality: 'Mutable', ruler: 'Sao Thủy', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22 },
        { name: 'Thiên Bình', nameEn: 'Libra', symbol: '♎', emoji: '⚖️', element: 'Khí', quality: 'Cardinal', ruler: 'Sao Kim', startMonth: 9, startDay: 23, endMonth: 10, endDay: 22 },
        { name: 'Bọ Cạp', nameEn: 'Scorpio', symbol: '♏', emoji: '🦂', element: 'Thủy', quality: 'Fixed', ruler: 'Sao Diêm Vương', startMonth: 10, startDay: 23, endMonth: 11, endDay: 21 },
        { name: 'Nhân Mã', nameEn: 'Sagittarius', symbol: '♐', emoji: '🏹', element: 'Hỏa', quality: 'Mutable', ruler: 'Sao Mộc', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21 },
        { name: 'Ma Kết', nameEn: 'Capricorn', symbol: '♑', emoji: '🐐', element: 'Thổ', quality: 'Cardinal', ruler: 'Sao Thổ', startMonth: 12, startDay: 22, endMonth: 1, endDay: 19 },
        { name: 'Bảo Bình', nameEn: 'Aquarius', symbol: '♒', emoji: '🏺', element: 'Khí', quality: 'Fixed', ruler: 'Sao Thiên Vương', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18 },
        { name: 'Song Ngư', nameEn: 'Pisces', symbol: '♓', emoji: '🐟', element: 'Thủy', quality: 'Mutable', ruler: 'Sao Hải Vương', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20 }
    ],

    // Đặc điểm tính cách
    TRAITS: {
        'Bạch Dương': { strengths: ['Dũng cảm', 'Nhiệt huyết', 'Tự tin', 'Quyết đoán'], weaknesses: ['Nóng nảy', 'Thiếu kiên nhẫn', 'Bốc đồng'] },
        'Kim Ngưu': { strengths: ['Đáng tin cậy', 'Kiên nhẫn', 'Thực tế', 'Tận tụy'], weaknesses: ['Cứng đầu', 'Sở hữu', 'Không thỏa hiệp'] },
        'Song Tử': { strengths: ['Linh hoạt', 'Hướng ngoại', 'Thông minh', 'Hài hước'], weaknesses: ['Hay thay đổi', 'Hời hợt', 'Do dự'] },
        'Cự Giải': { strengths: ['Trực giác', 'Tình cảm', 'Bảo vệ', 'Trung thành'], weaknesses: ['Nhạy cảm quá', 'Hay buồn', 'Thất thường'] },
        'Sư Tử': { strengths: ['Sáng tạo', 'Đam mê', 'Hào phóng', 'Vui vẻ'], weaknesses: ['Kiêu ngạo', 'Cứng đầu', 'Tự cao'] },
        'Xử Nữ': { strengths: ['Phân tích', 'Cần cù', 'Thực tế', 'Đáng tin'], weaknesses: ['Cầu toàn', 'Hay lo', 'Khắt khe'] },
        'Thiên Bình': { strengths: ['Công bằng', 'Hòa nhã', 'Xã giao', 'Thẩm mỹ'], weaknesses: ['Do dự', 'Tránh xung đột', 'Hay phiền'] },
        'Bọ Cạp': { strengths: ['Quyết tâm', 'Dũng cảm', 'Trung thành', 'Thẳng thắn'], weaknesses: ['Ghen tuông', 'Bí ẩn', 'Bạo lực'] },
        'Nhân Mã': { strengths: ['Hào phóng', 'Lý tưởng', 'Hài hước', 'Phiêu lưu'], weaknesses: ['Hứa suông', 'Thiếu kiên nhẫn', 'Thẳng thắn quá'] },
        'Ma Kết': { strengths: ['Có trách nhiệm', 'Kỷ luật', 'Tự chủ', 'Quản lý tốt'], weaknesses: ['Cứng nhắc', 'Bi quan', 'Keo kiệt'] },
        'Bảo Bình': { strengths: ['Tiến bộ', 'Độc lập', 'Nhân đạo', 'Sáng tạo'], weaknesses: ['Xa cách', 'Không cam kết', 'Nổi loạn'] },
        'Song Ngư': { strengths: ['Từ bi', 'Nghệ sĩ', 'Trực giác', 'Dịu dàng'], weaknesses: ['Sợ hãi', 'Quá tin', 'Hay buồn'] }
    },

    // Tương hợp cung
    COMPATIBILITY: {
        'Hỏa': { best: ['Hỏa', 'Khí'], good: ['Thổ'], avoid: ['Thủy'] },
        'Thổ': { best: ['Thổ', 'Thủy'], good: ['Hỏa'], avoid: ['Khí'] },
        'Khí': { best: ['Khí', 'Hỏa'], good: ['Thủy'], avoid: ['Thổ'] },
        'Thủy': { best: ['Thủy', 'Thổ'], good: ['Khí'], avoid: ['Hỏa'] }
    },

    // Lấy cung Mặt Trời (Sun Sign)
    getSunSign(birthDate) {
        const date = new Date(birthDate);
        const month = date.getMonth() + 1;
        const day = date.getDate();

        for (const sign of this.SIGNS) {
            if (sign.startMonth === sign.endMonth) {
                if (month === sign.startMonth && day >= sign.startDay && day <= sign.endDay) {
                    return sign;
                }
            } else if (sign.startMonth > sign.endMonth) {
                // Ma Kết spans Dec-Jan
                if ((month === sign.startMonth && day >= sign.startDay) ||
                    (month === sign.endMonth && day <= sign.endDay)) {
                    return sign;
                }
            } else {
                if ((month === sign.startMonth && day >= sign.startDay) ||
                    (month === sign.endMonth && day <= sign.endDay)) {
                    return sign;
                }
            }
        }

        // Fallback
        return this.SIGNS.find(s =>
            (month === s.startMonth && day >= s.startDay) ||
            (month === s.endMonth && day <= s.endDay) ||
            (month > s.startMonth && month < s.endMonth)
        ) || this.SIGNS[0];
    },

    // Lấy cung Mặt Trăng (Moon Sign) - Approximate
    getMoonSign(birthDate) {
        const date = new Date(birthDate);
        const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        const moonCycle = 27.3; // days
        const moonIndex = Math.floor((dayOfYear % (moonCycle * 12)) / moonCycle) % 12;
        return this.SIGNS[moonIndex];
    },

    // Lấy cung Mọc (Rising Sign) - Cần giờ sinh
    getRisingSign(birthDate, birthHour) {
        if (birthHour === null || birthHour === undefined) return null;

        const sunSign = this.getSunSign(birthDate);
        const sunIndex = this.SIGNS.indexOf(sunSign);
        const hourShift = Math.floor(birthHour / 2);
        const risingIndex = (sunIndex + hourShift) % 12;
        return this.SIGNS[risingIndex];
    },

    // Tính toán đầy đủ
    calculate(birthDate, birthHour = null) {
        const sunSign = this.getSunSign(birthDate);
        const moonSign = this.getMoonSign(birthDate);
        const risingSign = this.getRisingSign(birthDate, birthHour);
        const traits = this.TRAITS[sunSign.name];
        const compatibility = this.COMPATIBILITY[sunSign.element];

        return {
            sunSign,
            moonSign,
            risingSign,
            traits,
            compatibility,
            element: sunSign.element,
            quality: sunSign.quality,
            ruler: sunSign.ruler
        };
    }
};

if (typeof module !== 'undefined') module.exports = WesternZodiac;
