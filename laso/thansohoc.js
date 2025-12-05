/* ═══════════════════════════════════════════════════════════════
   THẦN SỐ HỌC MODULE - Numerology Calculator
   Lá Số Lâm Quốc Minh
   ═══════════════════════════════════════════════════════════════ */

const ThanSoHoc = {
    // Rút gọn số về 1-9 hoặc Master Numbers (11, 22, 33)
    reduceNumber(num, keepMaster = true) {
        while (num > 9) {
            if (keepMaster && (num === 11 || num === 22 || num === 33)) {
                return num;
            }
            num = String(num).split('').reduce((acc, d) => acc + parseInt(d), 0);
        }
        return num;
    },

    // Lấy giá trị số của chữ cái
    getLetterValue(char) {
        const c = char.toLowerCase();

        // Check Vietnamese mapping first
        if (VN_TO_BASE[c]) {
            return LETTER_VALUES[VN_TO_BASE[c]] || 0;
        }

        // Check đ separately
        if (c === 'đ') return 4;

        return LETTER_VALUES[c] || 0;
    },

    // Tính Số Chủ Đạo (Life Path Number)
    calculateLifePath(birthDate) {
        const date = new Date(birthDate);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        const daySum = this.reduceNumber(day, false);
        const monthSum = this.reduceNumber(month, false);
        const yearSum = this.reduceNumber(year, false);

        return this.reduceNumber(daySum + monthSum + yearSum, true);
    },

    // Tính Số Linh Hồn (Soul Urge / Heart's Desire)
    calculateSoulNumber(name) {
        let sum = 0;
        const normalized = name.toLowerCase();

        for (const char of normalized) {
            if (VOWELS.includes(char)) {
                sum += this.getLetterValue(char);
            }
        }

        return this.reduceNumber(sum, true);
    },

    // Tính Số Biểu Đạt (Expression / Destiny Number)
    calculateExpressionNumber(name) {
        let sum = 0;
        const normalized = name.toLowerCase();

        for (const char of normalized) {
            sum += this.getLetterValue(char);
        }

        return this.reduceNumber(sum, true);
    },

    // Tính Số Nhân Cách (Personality Number) - Consonants only
    calculatePersonalityNumber(name) {
        let sum = 0;
        const normalized = name.toLowerCase();

        for (const char of normalized) {
            if (!VOWELS.includes(char) && /[a-zđ]/.test(char)) {
                sum += this.getLetterValue(char);
            }
        }

        return this.reduceNumber(sum, true);
    },

    // Tính Số Ngày Sinh (Birthday Number)
    calculateBirthdayNumber(birthDate) {
        const day = new Date(birthDate).getDate();
        return this.reduceNumber(day, true);
    },

    // Tính Số Thái Độ (Attitude Number)
    calculateAttitudeNumber(birthDate) {
        const date = new Date(birthDate);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        return this.reduceNumber(day + month, false);
    },

    // Tính Năm Cá Nhân (Personal Year)
    calculatePersonalYear(birthDate, forYear = null) {
        const date = new Date(birthDate);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = forYear || new Date().getFullYear();

        return this.reduceNumber(day + month + year, false);
    },

    // Tính Tháng Cá Nhân
    calculatePersonalMonth(birthDate, forYear = null, forMonth = null) {
        const personalYear = this.calculatePersonalYear(birthDate, forYear);
        const month = forMonth || (new Date().getMonth() + 1);
        return this.reduceNumber(personalYear + month, false);
    },

    // Tính Ngày Cá Nhân
    calculatePersonalDay(birthDate) {
        const personalMonth = this.calculatePersonalMonth(birthDate);
        const today = new Date().getDate();
        return this.reduceNumber(personalMonth + today, false);
    },

    // Kiểm tra Số Nợ Nghiệp (Karmic Debt)
    checkKarmicDebt(lifePath) {
        const karmicNumbers = [13, 14, 16, 19];
        // Need to check the un-reduced sum
        return karmicNumbers.includes(lifePath) ? lifePath : null;
    },

    // Tính Biểu đồ Ngày Sinh (Birthday Grid / Lo Shu Grid)
    calculateBirthdayGrid(birthDate) {
        const dateStr = birthDate.replace(/-/g, '');
        const grid = {
            1: 0, 2: 0, 3: 0,
            4: 0, 5: 0, 6: 0,
            7: 0, 8: 0, 9: 0
        };

        for (const digit of dateStr) {
            const num = parseInt(digit);
            if (num >= 1 && num <= 9) {
                grid[num]++;
            }
        }

        return grid;
    },

    // Phân tích mũi tên trong biểu đồ
    analyzeArrows(grid) {
        const arrows = [];

        // Mũi tên trống (thiếu số)
        const emptyArrows = {
            'Thiếu Quyết Đoán': grid[1] === 0 && grid[5] === 0 && grid[9] === 0,
            'Thiếu Cảm Xúc': grid[2] === 0 && grid[5] === 0 && grid[8] === 0,
            'Thiếu Hoạt Động': grid[3] === 0 && grid[5] === 0 && grid[7] === 0,
            'Thiếu Kế Hoạch': grid[1] === 0 && grid[2] === 0 && grid[3] === 0,
            'Thiếu Ý Chí': grid[4] === 0 && grid[5] === 0 && grid[6] === 0,
            'Thiếu Thực Tế': grid[7] === 0 && grid[8] === 0 && grid[9] === 0
        };

        // Mũi tên đầy (có số)
        const fullArrows = {
            'Quyết Đoán': grid[1] > 0 && grid[5] > 0 && grid[9] > 0,
            'Cảm Xúc': grid[2] > 0 && grid[5] > 0 && grid[8] > 0,
            'Hoạt Động': grid[3] > 0 && grid[5] > 0 && grid[7] > 0,
            'Kế Hoạch': grid[1] > 0 && grid[2] > 0 && grid[3] > 0,
            'Ý Chí': grid[4] > 0 && grid[5] > 0 && grid[6] > 0,
            'Thực Tế': grid[7] > 0 && grid[8] > 0 && grid[9] > 0
        };

        for (const [name, hasArrow] of Object.entries(emptyArrows)) {
            if (hasArrow) arrows.push({ name, type: 'empty', desc: 'Cần khắc phục' });
        }

        for (const [name, hasArrow] of Object.entries(fullArrows)) {
            if (hasArrow) arrows.push({ name, type: 'full', desc: 'Điểm mạnh' });
        }

        return arrows;
    },

    // Tính toàn bộ Thần Số Học
    calculate(name, birthDate) {
        const lifePath = this.calculateLifePath(birthDate);
        const soul = this.calculateSoulNumber(name);
        const expression = this.calculateExpressionNumber(name);
        const personality = this.calculatePersonalityNumber(name);
        const birthday = this.calculateBirthdayNumber(birthDate);
        const attitude = this.calculateAttitudeNumber(birthDate);
        const personalYear = this.calculatePersonalYear(birthDate);
        const personalMonth = this.calculatePersonalMonth(birthDate);
        const personalDay = this.calculatePersonalDay(birthDate);
        const grid = this.calculateBirthdayGrid(birthDate);
        const arrows = this.analyzeArrows(grid);

        return {
            coreNumbers: {
                lifePath: { value: lifePath, meaning: NUMEROLOGY_MEANINGS[lifePath] || NUMEROLOGY_MEANINGS[9] },
                soul: { value: soul, meaning: NUMEROLOGY_MEANINGS[soul] || NUMEROLOGY_MEANINGS[9] },
                expression: { value: expression, meaning: NUMEROLOGY_MEANINGS[expression] || NUMEROLOGY_MEANINGS[9] },
                personality: { value: personality, meaning: NUMEROLOGY_MEANINGS[personality] || NUMEROLOGY_MEANINGS[9] },
                birthday: { value: birthday, meaning: NUMEROLOGY_MEANINGS[birthday] || NUMEROLOGY_MEANINGS[9] },
                attitude: { value: attitude, meaning: NUMEROLOGY_MEANINGS[attitude] || NUMEROLOGY_MEANINGS[9] }
            },
            cycles: {
                personalYear,
                personalMonth,
                personalDay
            },
            grid,
            arrows,
            isMasterNumber: [11, 22, 33].includes(lifePath)
        };
    }
};

if (typeof module !== 'undefined') module.exports = ThanSoHoc;
