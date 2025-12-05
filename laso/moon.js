/* ═══════════════════════════════════════════════════════════════
   MOON PHASE MODULE - Pha Trăng
   Lá Số Lâm Quốc Minh
   ═══════════════════════════════════════════════════════════════ */

const MoonPhase = {
    // 8 Pha Trăng chính
    PHASES: [
        { name: 'Trăng Mới', nameEn: 'New Moon', emoji: '🌑', meaning: 'Khởi đầu mới, gieo hạt ý tưởng', energy: 'Nội tâm, suy tư' },
        { name: 'Trăng Lưỡi Liềm Đầu', nameEn: 'Waxing Crescent', emoji: '🌒', meaning: 'Hy vọng, quyết tâm', energy: 'Xây dựng, phát triển' },
        { name: 'Trăng Bán Nguyệt Đầu', nameEn: 'First Quarter', emoji: '🌓', meaning: 'Hành động, quyết định', energy: 'Đối mặt thử thách' },
        { name: 'Trăng Khuyết Đầu', nameEn: 'Waxing Gibbous', emoji: '🌔', meaning: 'Hoàn thiện, điều chỉnh', energy: 'Kiên nhẫn, tinh chỉnh' },
        { name: 'Trăng Tròn', nameEn: 'Full Moon', emoji: '🌕', meaning: 'Thành tựu, giác ngộ', energy: 'Cảm xúc mạnh, trực giác' },
        { name: 'Trăng Khuyết Cuối', nameEn: 'Waning Gibbous', emoji: '🌖', meaning: 'Tri ân, chia sẻ', energy: 'Cho đi, dạy dỗ' },
        { name: 'Trăng Bán Nguyệt Cuối', nameEn: 'Last Quarter', emoji: '🌗', meaning: 'Buông bỏ, tha thứ', energy: 'Giải phóng, chữa lành' },
        { name: 'Trăng Lưỡi Liềm Cuối', nameEn: 'Waning Crescent', emoji: '🌘', meaning: 'Nghỉ ngơi, chuẩn bị', energy: 'Tĩnh lặng, thiền định' }
    ],

    // Tính pha trăng từ ngày
    getPhase(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();

        // Tính số ngày từ một trăng mới biết trước (Jan 6, 2000)
        const knownNewMoon = new Date(2000, 0, 6, 18, 14);
        const lunarCycle = 29.53058867; // Chu kỳ mặt trăng (ngày)

        const daysSinceKnown = (d - knownNewMoon) / (1000 * 60 * 60 * 24);
        const currentCycleDay = daysSinceKnown % lunarCycle;

        // Xác định pha (8 pha, mỗi pha ~3.69 ngày)
        const phaseLength = lunarCycle / 8;
        const phaseIndex = Math.floor(currentCycleDay / phaseLength) % 8;

        return {
            ...this.PHASES[phaseIndex],
            dayInCycle: Math.floor(currentCycleDay),
            percentIlluminated: this.getIllumination(currentCycleDay, lunarCycle)
        };
    },

    // Tính % sáng của mặt trăng
    getIllumination(dayInCycle, lunarCycle) {
        const angle = (dayInCycle / lunarCycle) * 360;
        const radians = angle * (Math.PI / 180);
        return Math.round((1 - Math.cos(radians)) / 2 * 100);
    },

    // Lấy pha trăng hôm nay
    getTodayPhase() {
        return this.getPhase(new Date());
    },

    // Lấy pha trăng ngày sinh
    getBirthMoonPhase(birthDate) {
        const phase = this.getPhase(birthDate);

        // Ý nghĩa tính cách theo pha trăng sinh
        const personalities = {
            'Trăng Mới': 'Bạn là người tiên phong, thích khởi đầu mới. Trực giác mạnh, bí ẩn.',
            'Trăng Lưỡi Liềm Đầu': 'Bạn quyết tâm và lạc quan. Luôn tìm cách vượt qua giới hạn.',
            'Trăng Bán Nguyệt Đầu': 'Bạn mạnh mẽ, quyết đoán. Giỏi giải quyết vấn đề.',
            'Trăng Khuyết Đầu': 'Bạn kiên nhẫn, cầu toàn. Luôn muốn hoàn thiện bản thân.',
            'Trăng Tròn': 'Bạn cảm xúc sâu sắc, trực giác mạnh. Có sức hút tự nhiên.',
            'Trăng Khuyết Cuối': 'Bạn thông thái, thích chia sẻ. Có năng lực dạy dỗ.',
            'Trăng Bán Nguyệt Cuối': 'Bạn sâu sắc, hay suy tư. Giỏi nhìn nhận bản chất.',
            'Trăng Lưỡi Liềm Cuối': 'Bạn nhạy cảm, tâm linh. Có khả năng chữa lành.'
        };

        return {
            ...phase,
            personality: personalities[phase.name]
        };
    },

    // Lấy lịch trăng tháng
    getMonthCalendar(year, month) {
        const calendar = [];
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const phase = this.getPhase(date);
            calendar.push({
                date: day,
                phase: phase.name,
                emoji: phase.emoji,
                illumination: phase.percentIlluminated
            });
        }

        return calendar;
    },

    // Tìm ngày Trăng Mới / Trăng Tròn tiếp theo
    getNextSpecialMoon(fromDate = new Date()) {
        const d = new Date(fromDate);
        let nextNewMoon = null;
        let nextFullMoon = null;

        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(d.getTime() + i * 24 * 60 * 60 * 1000);
            const phase = this.getPhase(checkDate);

            if (!nextNewMoon && phase.name === 'Trăng Mới') {
                nextNewMoon = { date: checkDate, phase };
            }
            if (!nextFullMoon && phase.name === 'Trăng Tròn') {
                nextFullMoon = { date: checkDate, phase };
            }

            if (nextNewMoon && nextFullMoon) break;
        }

        return { nextNewMoon, nextFullMoon };
    },

    // Lời khuyên theo pha trăng hôm nay
    getTodayAdvice() {
        const phase = this.getTodayPhase();

        const advices = {
            'Trăng Mới': ['Đặt mục tiêu mới', 'Bắt đầu dự án', 'Thiền định'],
            'Trăng Lưỡi Liềm Đầu': ['Lập kế hoạch', 'Tìm kiếm nguồn lực', 'Gặp gỡ người mới'],
            'Trăng Bán Nguyệt Đầu': ['Hành động quyết liệt', 'Giải quyết vấn đề', 'Tập thể dục'],
            'Trăng Khuyết Đầu': ['Điều chỉnh kế hoạch', 'Học hỏi thêm', 'Kiên nhẫn chờ đợi'],
            'Trăng Tròn': ['Reflect & celebrate', 'Biểu lộ cảm xúc', 'Quyết định quan trọng'],
            'Trăng Khuyết Cuối': ['Chia sẻ kiến thức', 'Giúp đỡ người khác', 'Tri ân'],
            'Trăng Bán Nguyệt Cuối': ['Dọn dẹp', 'Buông bỏ', 'Kết thúc việc cũ'],
            'Trăng Lưỡi Liềm Cuối': ['Nghỉ ngơi', 'Thiền định sâu', 'Chuẩn bị chu kỳ mới']
        };

        return {
            phase,
            advice: advices[phase.name] || [],
            shouldDo: advices[phase.name]?.[0] || 'Sống chánh niệm',
            avoid: phase.name.includes('Cuối') ? 'Bắt đầu việc mới lớn' : 'Quá vội vàng'
        };
    }
};

if (typeof module !== 'undefined') module.exports = MoonPhase;
