/* ═══════════════════════════════════════════════════════════════
   BÁT TỰ (TỨ TRỤ) MODULE - Four Pillars Calculator
   Lá Số Lâm Quốc Minh
   ═══════════════════════════════════════════════════════════════ */

const BatTu = {
    // Tính Trụ Năm
    getYearPillar(year) {
        const canIndex = (year - 4) % 10;
        const chiIndex = (year - 4) % 12;
        return {
            can: CAN[canIndex],
            chi: CHI[chiIndex],
            emoji: CHI_EMOJI[chiIndex],
            nguHanh: NGU_HANH_CAN[CAN[canIndex]]
        };
    },

    // Tính Trụ Tháng
    getMonthPillar(year, month) {
        const yearCan = CAN[(year - 4) % 10];
        const monthCanStart = {
            'Giáp': 2, 'Kỷ': 2,
            'Ất': 4, 'Canh': 4,
            'Bính': 6, 'Tân': 6,
            'Đinh': 8, 'Nhâm': 8,
            'Mậu': 0, 'Quý': 0
        };
        const canIndex = (monthCanStart[yearCan] + month - 1) % 10;
        const chiIndex = (month + 1) % 12;
        return {
            can: CAN[canIndex],
            chi: CHI[chiIndex],
            emoji: CHI_EMOJI[chiIndex],
            nguHanh: NGU_HANH_CAN[CAN[canIndex]]
        };
    },

    // Tính Trụ Ngày
    getDayPillar(year, month, day) {
        // Using simplified formula
        const baseDate = new Date(1900, 0, 1);
        const targetDate = new Date(year, month - 1, day);
        const daysDiff = Math.floor((targetDate - baseDate) / (1000 * 60 * 60 * 24));

        const canIndex = (daysDiff + 10) % 10;
        const chiIndex = (daysDiff) % 12;
        return {
            can: CAN[canIndex],
            chi: CHI[chiIndex],
            emoji: CHI_EMOJI[chiIndex],
            nguHanh: NGU_HANH_CAN[CAN[canIndex]]
        };
    },

    // Tính Trụ Giờ
    getHourPillar(dayCan, hour) {
        let chiIndex = 0;
        if (hour >= 23 || hour < 1) chiIndex = 0;
        else if (hour >= 1 && hour < 3) chiIndex = 1;
        else if (hour >= 3 && hour < 5) chiIndex = 2;
        else if (hour >= 5 && hour < 7) chiIndex = 3;
        else if (hour >= 7 && hour < 9) chiIndex = 4;
        else if (hour >= 9 && hour < 11) chiIndex = 5;
        else if (hour >= 11 && hour < 13) chiIndex = 6;
        else if (hour >= 13 && hour < 15) chiIndex = 7;
        else if (hour >= 15 && hour < 17) chiIndex = 8;
        else if (hour >= 17 && hour < 19) chiIndex = 9;
        else if (hour >= 19 && hour < 21) chiIndex = 10;
        else chiIndex = 11;

        const dayCanIndex = CAN.indexOf(dayCan);
        const hourCanStart = (dayCanIndex % 5) * 2;
        const canIndex = (hourCanStart + chiIndex) % 10;

        return {
            can: CAN[canIndex],
            chi: CHI[chiIndex],
            emoji: CHI_EMOJI[chiIndex],
            nguHanh: NGU_HANH_CAN[CAN[canIndex]]
        };
    },

    // Tính toàn bộ Tứ Trụ
    calculate(birthDate, birthHour = 12) {
        const date = new Date(birthDate);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        const yearPillar = this.getYearPillar(year);
        const monthPillar = this.getMonthPillar(year, month);
        const dayPillar = this.getDayPillar(year, month, day);
        const hourPillar = this.getHourPillar(dayPillar.can, birthHour);

        // Tính Ngũ Hành
        const elements = this.calculateElements([yearPillar, monthPillar, dayPillar, hourPillar]);

        // Nhật Chủ (Day Master)
        const dayMaster = dayPillar.nguHanh;

        // Đánh giá vượng/nhược
        const strength = this.evaluateStrength(elements, dayMaster);

        return {
            pillars: {
                year: yearPillar,
                month: monthPillar,
                day: dayPillar,
                hour: hourPillar
            },
            elements,
            dayMaster,
            strength,
            analysis: this.generateAnalysis(dayMaster, elements, strength)
        };
    },

    // Tính Ngũ Hành
    calculateElements(pillars) {
        const elements = { 'Kim': 0, 'Mộc': 0, 'Thủy': 0, 'Hỏa': 0, 'Thổ': 0 };

        pillars.forEach(pillar => {
            elements[NGU_HANH_CAN[pillar.can]]++;
            elements[NGU_HANH_CHI[pillar.chi]]++;
        });

        return elements;
    },

    // Đánh giá vượng/nhược
    evaluateStrength(elements, dayMaster) {
        const dmCount = elements[dayMaster];
        const sinhMe = NGU_HANH_RELATIONS.duocSinh[dayMaster];
        const total = dmCount + (elements[sinhMe] || 0);

        if (total >= 4) return { level: 'vượng', desc: 'Bản mệnh vượng, có sức mạnh nội tại mạnh mẽ' };
        if (total >= 2) return { level: 'trung bình', desc: 'Bản mệnh cân bằng, ổn định' };
        return { level: 'nhược', desc: 'Bản mệnh nhược, cần bổ sung các yếu tố hỗ trợ' };
    },

    // Tạo phân tích
    generateAnalysis(dayMaster, elements, strength) {
        const sorted = Object.entries(elements).sort((a, b) => b[1] - a[1]);
        const strongest = sorted[0];
        const weakest = sorted[sorted.length - 1];

        const luckyElements = [dayMaster, NGU_HANH_RELATIONS.duocSinh[dayMaster]];
        const avoidElements = [NGU_HANH_RELATIONS.biKhac[dayMaster]];

        return {
            summary: `Mệnh ${dayMaster} - ${strength.desc}`,
            strongest: { element: strongest[0], count: strongest[1] },
            weakest: { element: weakest[0], count: weakest[1] },
            luckyElements,
            avoidElements,
            luckyColors: luckyElements.map(e => ELEMENT_COLORS[e]),
            avoidColors: avoidElements.map(e => ELEMENT_COLORS[e])
        };
    },

    // Tính Đại Vận (10-year luck cycles)
    calculateDaiVan(birthDate, gender) {
        const year = new Date(birthDate).getFullYear();
        const yearCan = CAN[(year - 4) % 10];

        // Dương nam, Âm nữ: thuận
        // Âm nam, Dương nữ: nghịch
        const isYangCan = ['Giáp', 'Bính', 'Mậu', 'Canh', 'Nhâm'].includes(yearCan);
        const isMale = gender === 'male';
        const isForward = (isYangCan && isMale) || (!isYangCan && !isMale);

        const daiVans = [];
        const monthPillar = this.getMonthPillar(year, new Date(birthDate).getMonth() + 1);
        let canIndex = CAN.indexOf(monthPillar.can);
        let chiIndex = CHI.indexOf(monthPillar.chi);

        for (let i = 0; i < 8; i++) {
            if (isForward) {
                canIndex = (canIndex + 1) % 10;
                chiIndex = (chiIndex + 1) % 12;
            } else {
                canIndex = (canIndex - 1 + 10) % 10;
                chiIndex = (chiIndex - 1 + 12) % 12;
            }

            const startAge = (i + 1) * 10;
            daiVans.push({
                can: CAN[canIndex],
                chi: CHI[chiIndex],
                nguHanh: NGU_HANH_CAN[CAN[canIndex]],
                ageRange: `${startAge} - ${startAge + 9}`,
                startAge
            });
        }

        return daiVans;
    }
};

if (typeof module !== 'undefined') module.exports = BatTu;
