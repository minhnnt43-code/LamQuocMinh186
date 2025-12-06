/* ═══════════════════════════════════════════════════════════════
   CHINESE ZODIAC MODULE - 12 Con Giáp
   Lá Số Lâm Quốc Minh
   ═══════════════════════════════════════════════════════════════ */

const ChineseZodiac = {
    // 12 Con Giáp
    ANIMALS: [
        { name: 'Tý', animal: 'Chuột', emoji: '🐀', element: 'Thủy', yin: true, hours: '23:00-01:00', traits: ['Thông minh', 'Nhanh nhẹn', 'Tiết kiệm'] },
        { name: 'Sửu', animal: 'Trâu', emoji: '🐂', element: 'Thổ', yin: false, hours: '01:00-03:00', traits: ['Chăm chỉ', 'Đáng tin', 'Kiên nhẫn'] },
        { name: 'Dần', animal: 'Hổ', emoji: '🐅', element: 'Mộc', yin: true, hours: '03:00-05:00', traits: ['Dũng cảm', 'Tự tin', 'Cạnh tranh'] },
        { name: 'Mão', animal: 'Mèo', emoji: '🐇', element: 'Mộc', yin: false, hours: '05:00-07:00', traits: ['Dịu dàng', 'Lịch sự', 'Nhạy cảm'] },
        { name: 'Thìn', animal: 'Rồng', emoji: '🐉', element: 'Thổ', yin: true, hours: '07:00-09:00', traits: ['Mạnh mẽ', 'May mắn', 'Tham vọng'] },
        { name: 'Tỵ', animal: 'Rắn', emoji: '🐍', element: 'Hỏa', yin: false, hours: '09:00-11:00', traits: ['Khôn ngoan', 'Bí ẩn', 'Quyến rũ'] },
        { name: 'Ngọ', animal: 'Ngựa', emoji: '🐎', element: 'Hỏa', yin: true, hours: '11:00-13:00', traits: ['Nhiệt huyết', 'Tự do', 'Phiêu lưu'] },
        { name: 'Mùi', animal: 'Dê', emoji: '🐐', element: 'Thổ', yin: false, hours: '13:00-15:00', traits: ['Hiền lành', 'Nghệ sĩ', 'Đồng cảm'] },
        { name: 'Thân', animal: 'Khỉ', emoji: '🐵', element: 'Kim', yin: true, hours: '15:00-17:00', traits: ['Lanh lợi', 'Sáng tạo', 'Xã giao'] },
        { name: 'Dậu', animal: 'Gà', emoji: '🐔', element: 'Kim', yin: false, hours: '17:00-19:00', traits: ['Siêng năng', 'Thẳng thắn', 'Tự tin'] },
        { name: 'Tuất', animal: 'Chó', emoji: '🐕', element: 'Thổ', yin: true, hours: '19:00-21:00', traits: ['Trung thành', 'Trung thực', 'Thận trọng'] },
        { name: 'Hợi', animal: 'Heo', emoji: '🐷', element: 'Thủy', yin: false, hours: '21:00-23:00', traits: ['Tốt bụng', 'Hào phóng', 'Thật thà'] }
    ],

    // Tam Hợp (3 tuổi hợp nhau)
    TAM_HOP: [
        ['Thân', 'Tý', 'Thìn'], // Thủy cục
        ['Tỵ', 'Dậu', 'Sửu'],  // Kim cục
        ['Dần', 'Ngọ', 'Tuất'], // Hỏa cục
        ['Hợi', 'Mão', 'Mùi']   // Mộc cục
    ],

    // Lục Hợp (2 tuổi hợp nhau)
    LUC_HOP: [
        ['Tý', 'Sửu'],
        ['Dần', 'Hợi'],
        ['Mão', 'Tuất'],
        ['Thìn', 'Dậu'],
        ['Tỵ', 'Thân'],
        ['Ngọ', 'Mùi']
    ],

    // Tứ Hành Xung (4 tuổi xung nhau)
    TU_HANH_XUNG: [
        ['Tý', 'Ngọ', 'Mão', 'Dậu'],
        ['Dần', 'Thân', 'Tỵ', 'Hợi'],
        ['Thìn', 'Tuất', 'Sửu', 'Mùi']
    ],

    // Lục Xung (2 tuổi xung nhau)
    LUC_XUNG: [
        ['Tý', 'Ngọ'],
        ['Sửu', 'Mùi'],
        ['Dần', 'Thân'],
        ['Mão', 'Dậu'],
        ['Thìn', 'Tuất'],
        ['Tỵ', 'Hợi']
    ],

    // Lấy con giáp năm
    getYearAnimal(year) {
        const index = (year - 4) % 12;
        return this.ANIMALS[index];
    },

    // Lấy con giáp tháng
    getMonthAnimal(month) {
        // Tháng 1 = Dần, Tháng 2 = Mão, ...
        const index = (month + 1) % 12;
        return this.ANIMALS[index];
    },

    // Lấy con giáp giờ
    getHourAnimal(hour) {
        let index = 0;
        if (hour >= 23 || hour < 1) index = 0;
        else if (hour >= 1 && hour < 3) index = 1;
        else if (hour >= 3 && hour < 5) index = 2;
        else if (hour >= 5 && hour < 7) index = 3;
        else if (hour >= 7 && hour < 9) index = 4;
        else if (hour >= 9 && hour < 11) index = 5;
        else if (hour >= 11 && hour < 13) index = 6;
        else if (hour >= 13 && hour < 15) index = 7;
        else if (hour >= 15 && hour < 17) index = 8;
        else if (hour >= 17 && hour < 19) index = 9;
        else if (hour >= 19 && hour < 21) index = 10;
        else index = 11;

        return this.ANIMALS[index];
    },

    // Kiểm tra Tam Hợp
    checkTamHop(chi) {
        for (const group of this.TAM_HOP) {
            if (group.includes(chi)) {
                return { compatible: group.filter(c => c !== chi), type: 'Tam Hợp' };
            }
        }
        return null;
    },

    // Kiểm tra Lục Hợp
    checkLucHop(chi) {
        for (const pair of this.LUC_HOP) {
            if (pair.includes(chi)) {
                return { compatible: pair.filter(c => c !== chi), type: 'Lục Hợp' };
            }
        }
        return null;
    },

    // Kiểm tra Lục Xung
    checkLucXung(chi) {
        for (const pair of this.LUC_XUNG) {
            if (pair.includes(chi)) {
                return { conflict: pair.filter(c => c !== chi), type: 'Lục Xung' };
            }
        }
        return null;
    },

    // Kiểm tra Phạm Thái Tuế
    checkTaiSui(yearOfBirth, currentYear) {
        const birthAnimal = this.getYearAnimal(yearOfBirth);
        const currentAnimal = this.getYearAnimal(currentYear);

        const phamTaiTue = birthAnimal.name === currentAnimal.name;
        const xungTaiTue = this.LUC_XUNG.some(pair =>
            pair.includes(birthAnimal.name) && pair.includes(currentAnimal.name)
        );

        return {
            phamTaiTue,
            xungTaiTue,
            warning: phamTaiTue ? 'Phạm Thái Tuế - Cần cẩn thận' : (xungTaiTue ? 'Xung Thái Tuế - Có biến động' : null)
        };
    },

    // Tính toán đầy đủ
    calculate(birthDate, birthHour = null) {
        const date = new Date(birthDate);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const yearAnimal = this.getYearAnimal(year);
        const monthAnimal = this.getMonthAnimal(month);
        const hourAnimal = birthHour !== null ? this.getHourAnimal(parseInt(birthHour)) : null;

        const tamHop = this.checkTamHop(yearAnimal.name);
        const lucHop = this.checkLucHop(yearAnimal.name);
        const lucXung = this.checkLucXung(yearAnimal.name);
        const taiSui = this.checkTaiSui(year, currentYear);

        return {
            yearAnimal,
            monthAnimal,
            hourAnimal,
            tamHop,
            lucHop,
            lucXung,
            taiSui,
            element: yearAnimal.element,
            traits: yearAnimal.traits
        };
    },

    // Dự đoán năm con giáp
    getYearForecast(birthYear, targetYear) {
        const birthAnimal = this.getYearAnimal(birthYear);
        const targetAnimal = this.getYearAnimal(targetYear);

        // Check relationships
        const tamHop = this.TAM_HOP.some(group =>
            group.includes(birthAnimal.name) && group.includes(targetAnimal.name)
        );
        const lucHop = this.LUC_HOP.some(pair =>
            pair.includes(birthAnimal.name) && pair.includes(targetAnimal.name)
        );
        const lucXung = this.LUC_XUNG.some(pair =>
            pair.includes(birthAnimal.name) && pair.includes(targetAnimal.name)
        );

        let luck = 50;
        let summary = '';

        if (tamHop) { luck += 30; summary = 'Năm Tam Hợp - Rất thuận lợi'; }
        else if (lucHop) { luck += 20; summary = 'Năm Lục Hợp - Thuận lợi'; }
        else if (lucXung) { luck -= 20; summary = 'Năm Lục Xung - Cần cẩn thận'; }
        else { summary = 'Năm bình thường'; }

        if (birthAnimal.name === targetAnimal.name) {
            luck -= 10;
            summary = 'Năm Bản Mệnh - Phạm Thái Tuế, cần hóa giải';
        }

        return { luck: Math.max(0, Math.min(100, luck)), summary, targetAnimal };
    }
};

if (typeof module !== 'undefined') module.exports = ChineseZodiac;
