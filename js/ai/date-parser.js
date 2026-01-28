/**
 * ============================================================
 * VIETNAMESE DATE & TIME PARSER - LifeOS 2026
 * ============================================================
 * Feature #16: Parse ngày giờ từ ngôn ngữ tự nhiên tiếng Việt
 * - "thứ 5 tuần sau"
 * - "cuối tháng"
 * - "trước Tết"
 * - "2h chiều ngày mai"
 * ============================================================
 */

const DateParser = (function () {
    'use strict';

    // ========== CONSTANTS ==========

    const WEEKDAYS = {
        'thứ 2': 1, 'thứ hai': 1, 't2': 1, 'hai': 1,
        'thứ 3': 2, 'thứ ba': 2, 't3': 2, 'ba': 2,
        'thứ 4': 3, 'thứ tư': 3, 't4': 3, 'tư': 3,
        'thứ 5': 4, 'thứ năm': 4, 't5': 4, 'năm': 4,
        'thứ 6': 5, 'thứ sáu': 5, 't6': 5, 'sáu': 5,
        'thứ 7': 6, 'thứ bảy': 6, 't7': 6, 'bảy': 6,
        'chủ nhật': 0, 'cn': 0, 'chúa nhật': 0
    };

    const RELATIVE_DAYS = {
        'hôm nay': 0,
        'hna': 0,
        'today': 0,
        'hôm qua': -1,
        'hnq': -1,
        'yesterday': -1,
        'ngày mai': 1,
        'ngm': 1,
        'mai': 1,
        'tomorrow': 1,
        'ngày kia': 2,
        'ngày mốt': 2,
        'mốt': 2,
        'hôm kia': -2
    };

    const TIME_OF_DAY = {
        'sáng': { start: 6, default: 9 },
        'trưa': { start: 11, default: 12 },
        'chiều': { start: 13, default: 14 },
        'tối': { start: 18, default: 19 },
        'đêm': { start: 21, default: 22 },
        'khuya': { start: 23, default: 0 }
    };

    const MONTHS = {
        'tháng 1': 0, 'tháng một': 0, 'tháng giêng': 0, 't1': 0, 'jan': 0,
        'tháng 2': 1, 'tháng hai': 1, 't2': 1, 'feb': 1,
        'tháng 3': 2, 'tháng ba': 2, 't3': 2, 'mar': 2,
        'tháng 4': 3, 'tháng tư': 3, 't4': 3, 'apr': 3,
        'tháng 5': 4, 'tháng năm': 4, 't5': 4, 'may': 4,
        'tháng 6': 5, 'tháng sáu': 5, 't6': 5, 'jun': 5,
        'tháng 7': 6, 'tháng bảy': 6, 't7': 6, 'jul': 6,
        'tháng 8': 7, 'tháng tám': 7, 't8': 7, 'aug': 7,
        'tháng 9': 8, 'tháng chín': 8, 't9': 8, 'sep': 8,
        'tháng 10': 9, 'tháng mười': 9, 't10': 9, 'oct': 9,
        'tháng 11': 10, 'tháng mười một': 10, 't11': 10, 'nov': 10,
        'tháng 12': 11, 'tháng mười hai': 11, 't12': 11, 'dec': 11
    };

    // ========== MAIN PARSER ==========

    /**
     * Parse datetime từ text tiếng Việt
     * @param {string} text - Text chứa thông tin ngày giờ
     * @returns {Object} { date: Date, confidence: number, detected: string }
     */
    function parse(text) {
        if (!text) return null;

        const lowerText = text.toLowerCase().trim();
        let result = {
            date: null,
            time: null,
            confidence: 0,
            detected: '',
            original: text
        };

        // Try different parsing strategies
        result = parseRelativeDay(lowerText) ||
            parseWeekday(lowerText) ||
            parseRelativeWeek(lowerText) ||
            parseMonthReference(lowerText) ||
            parseExactDate(lowerText) ||
            parseSpecialEvents(lowerText) ||
            result;

        // Also try to parse time
        const timeResult = parseTime(lowerText);
        if (timeResult) {
            result.time = timeResult.time;
            result.detected += (result.detected ? ' ' : '') + timeResult.detected;
            result.confidence = Math.max(result.confidence, timeResult.confidence);
        }

        // Combine date and time if both exist
        if (result.date && result.time) {
            result.date.setHours(result.time.hours, result.time.minutes, 0, 0);
        }

        return result.date ? result : null;
    }

    // ========== PARSING STRATEGIES ==========

    /**
     * Parse relative days: hôm nay, ngày mai, etc.
     */
    function parseRelativeDay(text) {
        for (const [keyword, offset] of Object.entries(RELATIVE_DAYS)) {
            if (text.includes(keyword)) {
                const date = new Date();
                date.setDate(date.getDate() + offset);
                return {
                    date,
                    time: null,
                    confidence: 0.95,
                    detected: keyword
                };
            }
        }
        return null;
    }

    /**
     * Parse weekday: thứ 5, thứ hai, cn, etc.
     */
    function parseWeekday(text) {
        // Check for "tuần này" or "tuần sau"
        const isNextWeek = text.includes('tuần sau') || text.includes('tuần tới');
        const isLastWeek = text.includes('tuần trước');

        for (const [keyword, dayNum] of Object.entries(WEEKDAYS)) {
            if (text.includes(keyword)) {
                const date = new Date();
                const currentDay = date.getDay();
                let daysToAdd = dayNum - currentDay;

                if (isNextWeek) {
                    daysToAdd += 7;
                } else if (isLastWeek) {
                    daysToAdd -= 7;
                } else if (daysToAdd <= 0) {
                    // Default: next occurrence
                    daysToAdd += 7;
                }

                date.setDate(date.getDate() + daysToAdd);
                return {
                    date,
                    time: null,
                    confidence: 0.9,
                    detected: keyword + (isNextWeek ? ' tuần sau' : isLastWeek ? ' tuần trước' : '')
                };
            }
        }
        return null;
    }

    /**
     * Parse relative week references
     */
    function parseRelativeWeek(text) {
        const date = new Date();

        if (text.includes('cuối tuần') || text.includes('weekend')) {
            // Next Saturday
            const daysUntilSat = (6 - date.getDay() + 7) % 7 || 7;
            date.setDate(date.getDate() + daysUntilSat);
            return {
                date,
                time: null,
                confidence: 0.85,
                detected: 'cuối tuần'
            };
        }

        if (text.includes('đầu tuần')) {
            // Next Monday
            const daysUntilMon = (1 - date.getDay() + 7) % 7 || 7;
            date.setDate(date.getDate() + daysUntilMon);
            return {
                date,
                time: null,
                confidence: 0.85,
                detected: 'đầu tuần'
            };
        }

        if (text.includes('giữa tuần')) {
            // Wednesday
            const daysUntilWed = (3 - date.getDay() + 7) % 7 || 7;
            date.setDate(date.getDate() + daysUntilWed);
            return {
                date,
                time: null,
                confidence: 0.8,
                detected: 'giữa tuần'
            };
        }

        return null;
    }

    /**
     * Parse month references: cuối tháng, đầu tháng, etc.
     */
    function parseMonthReference(text) {
        const date = new Date();

        if (text.includes('cuối tháng') || text.includes('cuối tháng này')) {
            // Last day of current month
            date.setMonth(date.getMonth() + 1, 0);
            return {
                date,
                time: null,
                confidence: 0.85,
                detected: 'cuối tháng'
            };
        }

        if (text.includes('đầu tháng sau') || text.includes('đầu tháng tới')) {
            // 1st of next month
            date.setMonth(date.getMonth() + 1, 1);
            return {
                date,
                time: null,
                confidence: 0.85,
                detected: 'đầu tháng sau'
            };
        }

        if (text.includes('cuối tháng sau') || text.includes('cuối tháng tới')) {
            // Last day of next month
            date.setMonth(date.getMonth() + 2, 0);
            return {
                date,
                time: null,
                confidence: 0.85,
                detected: 'cuối tháng sau'
            };
        }

        // Parse specific month names
        for (const [monthKey, monthNum] of Object.entries(MONTHS)) {
            if (text.includes(monthKey)) {
                // Check for day number
                const dayMatch = text.match(/ngày\s*(\d{1,2})/);
                const day = dayMatch ? parseInt(dayMatch[1]) : 15; // Default to 15th

                date.setMonth(monthNum, day);

                // If date is in the past, assume next year
                if (date < new Date()) {
                    date.setFullYear(date.getFullYear() + 1);
                }

                return {
                    date,
                    time: null,
                    confidence: 0.8,
                    detected: monthKey + (dayMatch ? ` ngày ${day}` : '')
                };
            }
        }

        return null;
    }

    /**
     * Parse exact date formats: 15/12, 15/12/2026, 15-12-2026
     */
    function parseExactDate(text) {
        // Format: DD/MM or DD/MM/YYYY
        const dateMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);

        if (dateMatch) {
            const day = parseInt(dateMatch[1]);
            const month = parseInt(dateMatch[2]) - 1; // 0-indexed
            let year = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();

            // Handle 2-digit year
            if (year < 100) {
                year += 2000;
            }

            const date = new Date(year, month, day);

            // Validate date
            if (date.getDate() === day && date.getMonth() === month) {
                return {
                    date,
                    time: null,
                    confidence: 0.95,
                    detected: dateMatch[0]
                };
            }
        }

        // Format: "ngày 15" (current month)
        const dayOnlyMatch = text.match(/ngày\s*(\d{1,2})/);
        if (dayOnlyMatch) {
            const day = parseInt(dayOnlyMatch[1]);
            const date = new Date();
            date.setDate(day);

            // If day has passed, assume next month
            if (date < new Date()) {
                date.setMonth(date.getMonth() + 1);
            }

            return {
                date,
                time: null,
                confidence: 0.75,
                detected: dayOnlyMatch[0]
            };
        }

        return null;
    }

    /**
     * Parse special events: Tết, Giáng sinh, etc.
     */
    function parseSpecialEvents(text) {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;

        // Tết Nguyên Đán (usually late Jan - mid Feb)
        if (text.includes('tết') || text.includes('tết nguyên đán')) {
            // Approximate - would need lunar calendar library for exact date
            const tetDate = new Date(nextYear, 0, 29); // Approximate

            if (text.includes('trước tết')) {
                tetDate.setDate(tetDate.getDate() - 7);
            } else if (text.includes('sau tết')) {
                tetDate.setDate(tetDate.getDate() + 7);
            }

            return {
                date: tetDate,
                time: null,
                confidence: 0.7,
                detected: text.includes('trước') ? 'trước tết' : text.includes('sau') ? 'sau tết' : 'tết'
            };
        }

        // Giáng sinh
        if (text.includes('giáng sinh') || text.includes('noel') || text.includes('christmas')) {
            let christmasYear = currentYear;
            const christmas = new Date(christmasYear, 11, 25);

            if (christmas < new Date()) {
                christmas.setFullYear(nextYear);
            }

            return {
                date: christmas,
                time: null,
                confidence: 0.9,
                detected: 'giáng sinh'
            };
        }

        // Năm mới
        if (text.includes('năm mới') || text.includes('giao thừa')) {
            return {
                date: new Date(nextYear, 0, 1),
                time: null,
                confidence: 0.9,
                detected: 'năm mới'
            };
        }

        return null;
    }

    /**
     * Parse time from text
     */
    function parseTime(text) {
        // Format: Xh, Xhxx, X:xx, X giờ xx phút
        const timePatterns = [
            /(\d{1,2})\s*[h:]\s*(\d{2})/i,           // 14h30, 14:30
            /(\d{1,2})\s*giờ\s*(\d{1,2})?\s*phút?/i, // 2 giờ 30 phút
            /(\d{1,2})\s*h\b/i,                       // 2h
            /(\d{1,2})\s*giờ\b/i                      // 2 giờ
        ];

        for (const pattern of timePatterns) {
            const match = text.match(pattern);
            if (match) {
                let hours = parseInt(match[1]);
                const minutes = match[2] ? parseInt(match[2]) : 0;

                // Adjust for time of day
                for (const [period, range] of Object.entries(TIME_OF_DAY)) {
                    if (text.includes(period) && hours < 12) {
                        if (period === 'chiều' || period === 'tối') {
                            hours += 12;
                        }
                    }
                }

                // Validate
                if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                    return {
                        time: { hours, minutes },
                        confidence: 0.9,
                        detected: match[0]
                    };
                }
            }
        }

        // Check for time of day only (without specific hour)
        for (const [period, range] of Object.entries(TIME_OF_DAY)) {
            if (text.includes(period)) {
                return {
                    time: { hours: range.default, minutes: 0 },
                    confidence: 0.6,
                    detected: period
                };
            }
        }

        return null;
    }

    // ========== UTILITIES ==========

    /**
     * Format date theo định dạng Việt Nam
     * @param {Date} date 
     * @returns {string}
     */
    function formatVietnamese(date) {
        if (!date) return '';

        const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const day = days[date.getDay()];
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();

        return `${day}, ${dd}/${mm}/${yyyy}`;
    }

    /**
     * Format time
     * @param {Date} date 
     * @returns {string}
     */
    function formatTime(date) {
        if (!date) return '';
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    /**
     * Get relative description
     * @param {Date} date 
     * @returns {string}
     */
    function getRelativeDescription(date) {
        if (!date) return '';

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hôm nay';
        if (diffDays === 1) return 'Ngày mai';
        if (diffDays === 2) return 'Ngày kia';
        if (diffDays === -1) return 'Hôm qua';
        if (diffDays > 0 && diffDays <= 7) return `${diffDays} ngày nữa`;
        if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} ngày trước`;

        return formatVietnamese(date);
    }

    /**
     * Check if date string is parseable
     * @param {string} text 
     * @returns {boolean}
     */
    function canParse(text) {
        return parse(text) !== null;
    }

    // ========== PUBLIC API ==========
    return {
        parse,
        parseTime,
        formatVietnamese,
        formatTime,
        getRelativeDescription,
        canParse,

        // Expose constants for external use
        WEEKDAYS,
        RELATIVE_DAYS,
        TIME_OF_DAY,
        MONTHS
    };
})();

// Export
if (typeof window !== 'undefined') {
    window.DateParser = DateParser;
}
