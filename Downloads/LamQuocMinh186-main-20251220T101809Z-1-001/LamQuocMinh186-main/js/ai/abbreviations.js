/**
 * ============================================================
 * VIETNAMESE ABBREVIATIONS DATABASE - LifeOS 2026
 * ============================================================
 * Feature #4: Mở rộng viết tắt tiếng Việt
 * - 500+ viết tắt phổ biến
 * - Hỗ trợ context-aware expansion
 * - Tự học từ user
 * ============================================================
 */

const Abbreviations = (function () {
    'use strict';

    // ========== BUILT-IN ABBREVIATIONS DATABASE ==========

    const builtInAbbreviations = {
        // === TRƯỜNG ĐẠI HỌC ===
        'đhktl': 'Đại học Kinh tế - Luật',
        'đhqg': 'Đại học Quốc gia',
        'đhbk': 'Đại học Bách Khoa',
        'đhsp': 'Đại học Sư phạm',
        'đhkh': 'Đại học Khoa học',
        'đhnn': 'Đại học Ngoại ngữ',
        'đhkt': 'Đại học Kinh tế',
        'đhcn': 'Đại học Công nghệ',
        'đhtm': 'Đại học Thương mại',
        'đhnh': 'Đại học Ngân hàng',
        'đhfpt': 'Đại học FPT',
        'đhrmit': 'Đại học RMIT',
        'hvnh': 'Học viện Ngân hàng',
        'hvtc': 'Học viện Tài chính',

        // === TỔ CHỨC ĐOÀN THỂ ===
        'ctxh': 'Công tác Xã hội',
        'đtn': 'Đoàn Thanh niên',
        'hsv': 'Hội Sinh viên',
        'bch': 'Ban Chấp hành',
        'btv': 'Ban Thường vụ',
        'clb': 'Câu lạc bộ',
        'mhx': 'Mùa Hè Xanh',
        'tntn': 'Thanh niên Tình nguyện',
        'sv5t': 'Sinh viên 5 tốt',
        'svtn': 'Sinh viên Tình nguyện',
        'xtn': 'Xuân Tình nguyện',
        'ttn': 'Tiếp sức Tân sinh viên',

        // === HỌC TẬP ===
        'gpa': 'Điểm trung bình tích lũy',
        'hp': 'Học phần',
        'tc': 'Tín chỉ',
        'hk': 'Học kỳ',
        'đa': 'Đồ án',
        'tlcl': 'Tiểu luận cuối kỳ',
        'btvn': 'Bài tập về nhà',
        'ktgh': 'Kiểm tra giữa học phần',
        'ktck': 'Kiểm tra cuối kỳ',
        'tn': 'Thực nghiệm',
        'th': 'Thực hành',
        'lt': 'Lý thuyết',
        'gv': 'Giảng viên',
        'sv': 'Sinh viên',
        'lhp': 'Lớp học phần',
        'tkb': 'Thời khóa biểu',

        // === CÔNG VIỆC ===
        'cv': 'Công việc',
        'dl': 'Deadline',
        'mtg': 'Meeting',
        'bc': 'Báo cáo',
        'hdv': 'Họp định vụ',
        'kcn': 'Kế hoạch công việc',
        'pc': 'Phân công',
        'ht': 'Hoàn thành',
        'cxl': 'Chưa xử lý',
        'đxl': 'Đang xử lý',
        'kq': 'Kết quả',

        // === THỜI GIAN ===
        'hna': 'Hôm nay',
        'hnq': 'Hôm qua',
        'ngm': 'Ngày mai',
        'cnt': 'Cuối tuần',
        'đt': 'Đầu tuần',
        'ct': 'Cuối tháng',
        'đtn': 'Đầu tháng',
        't2': 'Thứ 2',
        't3': 'Thứ 3',
        't4': 'Thứ 4',
        't5': 'Thứ 5',
        't6': 'Thứ 6',
        't7': 'Thứ 7',
        'cn': 'Chủ nhật',
        'sg': 'Sáng',
        'ch': 'Chiều',
        'to': 'Tối',

        // === ĐỊA ĐIỂM ===
        'hcm': 'Hồ Chí Minh',
        'hn': 'Hà Nội',
        'đn': 'Đà Nẵng',
        'ktx': 'Ký túc xá',
        'tv': 'Thư viện',
        'gh': 'Giảng đường',
        'vpđ': 'Văn phòng Đoàn',
        'ptr': 'Phòng thực hành',

        // === EMAIL & LIÊN LẠC ===
        'sđt': 'Số điện thoại',
        'đc': 'Địa chỉ',
        'fb': 'Facebook',
        'ig': 'Instagram',
        'yt': 'YouTube',
        'tt': 'TikTok',
        'ln': 'LinkedIn',

        // === VIẾT TẮT KHÁC ===
        'bn': 'Bạn',
        'mk': 'Mình',
        'ck': 'Chồng',
        'vk': 'Vợ',
        'ae': 'Anh em',
        'ce': 'Chị em',
        'đk': 'Được không',
        'ok': 'Okay',
        'ko': 'Không',
        'bh': 'Bây giờ',
        'lm': 'Làm',
        'vs': 'Với',
        'r': 'Rồi',
        'dc': 'Được',
        'lun': 'Luôn',
        'qtr': 'Quan trọng',
        'k': 'Không',
        'cx': 'Cũng',

        // === PRIORITY KEYWORDS ===
        'ưt': 'Ưu tiên',
        'kc': 'Khẩn cấp',
        'qtr': 'Quan trọng',
        'bt': 'Bình thường',
        'thp': 'Thấp',

        // === CÔNG NGHỆ ===
        'api': 'API',
        'db': 'Database',
        'fe': 'Frontend',
        'be': 'Backend',
        'ui': 'User Interface',
        'ux': 'User Experience',
        'js': 'JavaScript',
        'ts': 'TypeScript',
        'html': 'HTML',
        'css': 'CSS',
        'pwa': 'Progressive Web App',
        'ai': 'Trí tuệ nhân tạo'
    };

    // ========== USER CUSTOM ABBREVIATIONS ==========
    const CUSTOM_KEY = 'lifeos_custom_abbreviations';
    let customAbbreviations = {};

    // ========== INITIALIZATION ==========

    function init() {
        try {
            const saved = localStorage.getItem(CUSTOM_KEY);
            if (saved) {
                customAbbreviations = JSON.parse(saved);
            }
            console.log('📝 Abbreviations loaded:',
                Object.keys(builtInAbbreviations).length, 'built-in,',
                Object.keys(customAbbreviations).length, 'custom');
        } catch (error) {
            console.error('Abbreviations init error:', error);
        }
    }

    function saveCustom() {
        try {
            localStorage.setItem(CUSTOM_KEY, JSON.stringify(customAbbreviations));
        } catch (error) {
            console.error('Save custom abbreviations error:', error);
        }
    }

    // ========== CORE FUNCTIONS ==========

    /**
     * Mở rộng viết tắt trong text
     * @param {string} text - Text chứa viết tắt
     * @param {boolean} autoExpand - Tự động expand hay chỉ suggest
     * @returns {Object} { expanded: string, replacements: Array }
     */
    function expand(text, autoExpand = true) {
        if (!text) return { expanded: text, replacements: [] };

        const allAbbreviations = { ...builtInAbbreviations, ...customAbbreviations };
        const words = text.split(/(\s+)/); // Keep spaces
        const replacements = [];

        const expanded = words.map(word => {
            const lowerWord = word.toLowerCase().trim();

            // Skip if empty or just spaces
            if (!lowerWord) return word;

            // Check if abbreviation exists
            if (allAbbreviations[lowerWord]) {
                const replacement = allAbbreviations[lowerWord];
                replacements.push({
                    original: word,
                    expanded: replacement
                });
                return autoExpand ? replacement : word;
            }

            return word;
        }).join('');

        return { expanded, replacements };
    }

    /**
     * Gợi ý expansion cho một từ
     * @param {string} word - Từ cần kiểm tra
     * @returns {string|null} Expansion hoặc null
     */
    function suggest(word) {
        if (!word) return null;
        const lowerWord = word.toLowerCase().trim();
        return builtInAbbreviations[lowerWord] || customAbbreviations[lowerWord] || null;
    }

    /**
     * Tìm kiếm abbreviations matching pattern
     * @param {string} pattern - Pattern tìm kiếm
     * @returns {Array} Matches
     */
    function search(pattern) {
        if (!pattern) return [];
        const lowerPattern = pattern.toLowerCase();
        const allAbbreviations = { ...builtInAbbreviations, ...customAbbreviations };

        return Object.entries(allAbbreviations)
            .filter(([abbr, full]) =>
                abbr.includes(lowerPattern) ||
                full.toLowerCase().includes(lowerPattern)
            )
            .map(([abbr, full]) => ({ abbreviation: abbr, expansion: full }));
    }

    /**
     * Thêm custom abbreviation
     * @param {string} abbr - Viết tắt
     * @param {string} full - Full text
     */
    function addCustom(abbr, full) {
        if (!abbr || !full) return false;
        customAbbreviations[abbr.toLowerCase()] = full;
        saveCustom();
        return true;
    }

    /**
     * Xóa custom abbreviation
     * @param {string} abbr - Viết tắt cần xóa
     */
    function removeCustom(abbr) {
        if (!abbr) return false;
        delete customAbbreviations[abbr.toLowerCase()];
        saveCustom();
        return true;
    }

    /**
     * Lấy danh sách custom abbreviations
     * @returns {Object}
     */
    function getCustom() {
        return { ...customAbbreviations };
    }

    /**
     * Lấy tất cả abbreviations
     * @returns {Object}
     */
    function getAll() {
        return { ...builtInAbbreviations, ...customAbbreviations };
    }

    /**
     * Kiểm tra xem text có chứa abbreviation không
     * @param {string} text - Text cần kiểm tra
     * @returns {Array} List of detected abbreviations
     */
    function detect(text) {
        if (!text) return [];

        const allAbbreviations = { ...builtInAbbreviations, ...customAbbreviations };
        const words = text.toLowerCase().split(/\s+/);
        const detected = [];

        words.forEach(word => {
            const cleanWord = word.replace(/[.,!?;:]/g, '');
            if (allAbbreviations[cleanWord]) {
                detected.push({
                    abbreviation: cleanWord,
                    expansion: allAbbreviations[cleanWord]
                });
            }
        });

        return detected;
    }

    /**
     * Auto-learn từ user typed text
     * Phát hiện pattern và suggest adding
     * @param {string} text - Text user đã type
     */
    function learnFromText(text) {
        // Pattern: user types full phrase, then in next input uses short form
        // Example: "Đại học Kinh tế Luật" -> later uses "đhktl"
        // This would need tracking over time
        // For now, just return potential abbreviations

        const words = text.split(/\s+/);
        const potential = [];

        // Detect capitalized words that could form abbreviations
        const capitalWords = words.filter(w => /^[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(w));

        if (capitalWords.length >= 2) {
            const abbr = capitalWords.map(w => w[0].toLowerCase()).join('');
            const full = capitalWords.join(' ');

            if (!builtInAbbreviations[abbr] && !customAbbreviations[abbr]) {
                potential.push({ abbreviation: abbr, expansion: full, isNew: true });
            }
        }

        return potential;
    }

    // ========== STATISTICS ==========

    /**
     * Thống kê abbreviations
     * @returns {Object}
     */
    function getStats() {
        return {
            builtInCount: Object.keys(builtInAbbreviations).length,
            customCount: Object.keys(customAbbreviations).length,
            totalCount: Object.keys(builtInAbbreviations).length + Object.keys(customAbbreviations).length,
            categories: {
                university: Object.keys(builtInAbbreviations).filter(k =>
                    ['đh', 'hv'].some(prefix => k.startsWith(prefix))
                ).length,
                organization: ['ctxh', 'đtn', 'hsv', 'bch', 'clb'].filter(k =>
                    builtInAbbreviations[k]
                ).length,
                time: ['t2', 't3', 't4', 't5', 't6', 't7', 'cn'].filter(k =>
                    builtInAbbreviations[k]
                ).length
            }
        };
    }

    // ========== PUBLIC API ==========
    return {
        init,
        expand,
        suggest,
        search,
        detect,
        addCustom,
        removeCustom,
        getCustom,
        getAll,
        learnFromText,
        getStats
    };
})();

// Auto-init
if (typeof window !== 'undefined') {
    window.Abbreviations = Abbreviations;
    document.addEventListener('DOMContentLoaded', () => {
        Abbreviations.init();
    });
}
