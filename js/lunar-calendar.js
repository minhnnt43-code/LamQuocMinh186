// --- FILE: js/lunar-calendar.js ---
// Thư viện tính toán Âm lịch, Can Chi, Tiết khí, Giờ hoàng đạo

// Bảng Can Chi
const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const CHI_EMOJI = ['🐀', '🐂', '🐅', '🐇', '🐉', '🐍', '🐴', '🐐', '🐵', '🐔', '🐕', '🐷'];

// 24 Tiết khí
const TIET_KHI = [
    'Tiểu hàn', 'Đại hàn', 'Lập xuân', 'Vũ thủy', 'Kinh trập', 'Xuân phân',
    'Thanh minh', 'Cốc vũ', 'Lập hạ', 'Tiểu mãn', 'Mang chủng', 'Hạ chí',
    'Tiểu thử', 'Đại thử', 'Lập thu', 'Xử thử', 'Bạch lộ', 'Thu phân',
    'Hàn lộ', 'Sương giáng', 'Lập đông', 'Tiểu tuyết', 'Đại tuyết', 'Đông chí'
];

// Ngày tốt xấu theo thứ trong tháng
const NGAY_TOT_XAU = {
    tot: [1, 2, 4, 5, 8, 10, 14, 16, 17, 20, 22, 26, 28],
    xau: [3, 7, 13, 18, 22, 27]
};

// Giờ hoàng đạo theo ngày trong tuần
const GIO_HOANG_DAO = {
    0: ['Tý', 'Sửu', 'Mão', 'Ngọ', 'Thân', 'Dậu'], // Chủ nhật
    1: ['Dần', 'Mão', 'Tỵ', 'Thân', 'Tuất', 'Hợi'], // Thứ 2
    2: ['Tý', 'Sửu', 'Thìn', 'Tỵ', 'Mùi', 'Tuất'], // Thứ 3
    3: ['Tý', 'Dần', 'Mão', 'Ngọ', 'Mùi', 'Dậu'], // Thứ 4
    4: ['Sửu', 'Thìn', 'Tỵ', 'Mùi', 'Thân', 'Hợi'], // Thứ 5
    5: ['Dần', 'Thìn', 'Tỵ', 'Thân', 'Dậu', 'Hợi'], // Thứ 6
    6: ['Tý', 'Sửu', 'Mão', 'Ngọ', 'Mùi', 'Dậu']  // Thứ 7
};

// Giờ theo Chi
const GIO_CHI = {
    'Tý': '23:00 - 01:00',
    'Sửu': '01:00 - 03:00',
    'Dần': '03:00 - 05:00',
    'Mão': '05:00 - 07:00',
    'Thìn': '07:00 - 09:00',
    'Tỵ': '09:00 - 11:00',
    'Ngọ': '11:00 - 13:00',
    'Mùi': '13:00 - 15:00',
    'Thân': '15:00 - 17:00',
    'Dậu': '17:00 - 19:00',
    'Tuất': '19:00 - 21:00',
    'Hợi': '21:00 - 23:00'
};

// Điều nên làm
const NEN_LAM = [
    'Cầu tài', 'Xuất hành', 'Khai trương', 'Ký hợp đồng', 'Giao dịch',
    'Nhập trạch', 'Cưới hỏi', 'Động thổ', 'Khởi công', 'Học hành',
    'Cầu phúc', 'Cúng tế', 'Hội họp', 'Ký kết', 'Ra mắt'
];

const KHONG_NEN = [
    'Kiện tụng', 'Tranh chấp', 'Mở cửa hàng', 'Vay mượn', 'Cho vay',
    'Xuất hành xa', 'Khởi sự lớn', 'Đầu tư lớn', 'Phẫu thuật'
];

// ============================================================
// TÍNH ÂM LỊCH
// ============================================================

// Thuật toán tính âm lịch (Ho Ngoc Duc algorithm)
const PI = Math.PI;

function INT(d) { return Math.floor(d); }

function jdFromDate(dd, mm, yy) {
    let a = INT((14 - mm) / 12);
    let y = yy + 4800 - a;
    let m = mm + 12 * a - 3;
    let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
    if (jd < 2299161) {
        jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
    }
    return jd;
}

function NewMoon(k) {
    let T = k / 1236.85;
    let T2 = T * T;
    let T3 = T2 * T;
    let dr = PI / 180;
    let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    let M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    let Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    let F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    let deltat;
    if (T < -11) {
        deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
    } else {
        deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
    }
    return Jd1 + C1 - deltat;
}

function SunLongitude(jdn) {
    let T = (jdn - 2451545.0) / 36525;
    let T2 = T * T;
    let dr = PI / 180;
    let M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    let L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
    let L = L0 + DL;
    L = L - 360 * INT(L / 360);
    return L;
}

function getSunLongitude(dayNumber, timeZone) {
    return INT(SunLongitude(dayNumber - 0.5 - timeZone / 24.0) / 30);
}

function getNewMoonDay(k, timeZone) {
    return INT(NewMoon(k) + 0.5 + timeZone / 24.0);
}

function getLunarMonth11(yy, timeZone) {
    let off = jdFromDate(31, 12, yy) - 2415021;
    let k = INT(off / 29.530588853);
    let nm = getNewMoonDay(k, timeZone);
    let sunLong = getSunLongitude(nm, timeZone);
    if (sunLong >= 9) {
        nm = getNewMoonDay(k - 1, timeZone);
    }
    return nm;
}

function getLeapMonthOffset(a11, timeZone) {
    let k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last = 0;
    let i = 1;
    let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    do {
        last = arc;
        i++;
        arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    } while (arc !== last && i < 14);
    return i - 1;
}

function convertSolar2Lunar(dd, mm, yy, timeZone) {
    let dayNumber = jdFromDate(dd, mm, yy);
    let k = INT((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = getNewMoonDay(k + 1, timeZone);
    if (monthStart > dayNumber) {
        monthStart = getNewMoonDay(k, timeZone);
    }
    let a11 = getLunarMonth11(yy, timeZone);
    let b11 = a11;
    let lunarYear;
    if (a11 >= monthStart) {
        lunarYear = yy;
        a11 = getLunarMonth11(yy - 1, timeZone);
    } else {
        lunarYear = yy + 1;
        b11 = getLunarMonth11(yy + 1, timeZone);
    }
    let lunarDay = dayNumber - monthStart + 1;
    let diff = INT((monthStart - a11) / 29);
    let lunarLeap = 0;
    let lunarMonth = diff + 11;
    if (b11 - a11 > 365) {
        let leapMonthDiff = getLeapMonthOffset(a11, timeZone);
        if (diff >= leapMonthDiff) {
            lunarMonth = diff + 10;
            if (diff === leapMonthDiff) {
                lunarLeap = 1;
            }
        }
    }
    if (lunarMonth > 12) {
        lunarMonth = lunarMonth - 12;
    }
    if (lunarMonth >= 11 && diff < 4) {
        lunarYear -= 1;
    }
    return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap };
}

// ============================================================
// CAN CHI
// ============================================================

function getCanNam(year) {
    return CAN[(year + 6) % 10];
}

function getChiNam(year) {
    return CHI[(year + 8) % 12];
}

function getChiNamEmoji(year) {
    return CHI_EMOJI[(year + 8) % 12];
}

function getCanChiNam(year) {
    return getCanNam(year) + ' ' + getChiNam(year);
}

function getCanChiThang(month, year) {
    let can = CAN[(year * 12 + month + 3) % 10];
    let chi = CHI[(month + 1) % 12];
    return can + ' ' + chi;
}

function getCanChiNgay(jd) {
    let can = CAN[(jd + 9) % 10];
    let chi = CHI[(jd + 1) % 12];
    return can + ' ' + chi;
}

// ============================================================
// TIẾT KHÍ
// ============================================================

function getTietKhi(dd, mm) {
    // Ước tính tiết khí theo ngày trong năm
    const tietKhiDates = [
        [1, 6], [1, 20], [2, 4], [2, 19], [3, 6], [3, 21],
        [4, 5], [4, 20], [5, 6], [5, 21], [6, 6], [6, 21],
        [7, 7], [7, 23], [8, 7], [8, 23], [9, 8], [9, 23],
        [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22]
    ];

    for (let i = tietKhiDates.length - 1; i >= 0; i--) {
        let [m, d] = tietKhiDates[i];
        if (mm > m || (mm === m && dd >= d)) {
            return TIET_KHI[i];
        }
    }
    return TIET_KHI[23]; // Đông chí
}

// ============================================================
// NGÀY TỐT XẤU
// ============================================================

function getNgayTotXau(lunarDay) {
    if (NGAY_TOT_XAU.tot.includes(lunarDay)) {
        return { type: 'tot', text: '🟢 Ngày Tốt', desc: 'Cát nhật - thuận lợi làm việc lớn' };
    } else if (NGAY_TOT_XAU.xau.includes(lunarDay)) {
        return { type: 'xau', text: '🔴 Ngày Xấu', desc: 'Hung nhật - nên cẩn thận' };
    }
    return { type: 'binh_thuong', text: '🟡 Bình thường', desc: 'Có thể làm việc bình thường' };
}

// ============================================================
// GIỜ HOÀNG ĐẠO
// ============================================================

function getGioHoangDao(dayOfWeek) {
    const hours = GIO_HOANG_DAO[dayOfWeek];
    return hours.map(chi => ({
        chi: chi,
        time: GIO_CHI[chi]
    }));
}

// ============================================================
// ĐIỀU NÊN / KHÔNG NÊN
// ============================================================

function getNenKhongNen(lunarDay) {
    // Random nhưng consistent theo ngày
    const seed = lunarDay * 7;
    const nenCount = 3 + (seed % 3);
    const khongNenCount = 2 + (seed % 2);

    const nen = [];
    const khongNen = [];

    for (let i = 0; i < nenCount; i++) {
        nen.push(NEN_LAM[(seed + i * 3) % NEN_LAM.length]);
    }

    for (let i = 0; i < khongNenCount; i++) {
        khongNen.push(KHONG_NEN[(seed + i * 2) % KHONG_NEN.length]);
    }

    return { nen, khongNen };
}

// ============================================================
// MAIN EXPORT
// ============================================================

export function getLunarCalendarInfo(date = new Date()) {
    const dd = date.getDate();
    const mm = date.getMonth() + 1;
    const yy = date.getFullYear();
    const dayOfWeek = date.getDay();
    const timeZone = 7; // Vietnam timezone

    // Âm lịch
    const lunar = convertSolar2Lunar(dd, mm, yy, timeZone);

    // JD cho can chi ngày
    const jd = jdFromDate(dd, mm, yy);

    return {
        // Dương lịch
        solar: { day: dd, month: mm, year: yy, dayOfWeek },

        // Âm lịch
        lunar: {
            day: lunar.day,
            month: lunar.month,
            year: lunar.year,
            leap: lunar.leap,
            text: `${lunar.day}/${lunar.month}${lunar.leap ? ' (nhuận)' : ''}`
        },

        // Can Chi
        canChi: {
            nam: getCanChiNam(lunar.year),
            thang: getCanChiThang(lunar.month, lunar.year),
            ngay: getCanChiNgay(jd),
            emoji: getChiNamEmoji(lunar.year)
        },

        // Tiết khí
        tietKhi: getTietKhi(dd, mm),

        // Ngày tốt xấu
        ngayTotXau: getNgayTotXau(lunar.day),

        // Giờ hoàng đạo
        gioHoangDao: getGioHoangDao(dayOfWeek),

        // Nên / Không nên
        nenKhongNen: getNenKhongNen(lunar.day)
    };
}

export { CAN, CHI, CHI_EMOJI, TIET_KHI };
