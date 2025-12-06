/* ═══════════════════════════════════════════════════════════════
   CONSTANTS - Astrology Data
   Lá Số Lâm Quốc Minh
   ═══════════════════════════════════════════════════════════════ */

// Thiên Can (10 Heavenly Stems)
const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];

// Địa Chi (12 Earthly Branches)
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const CHI_EMOJI = ['🐀', '🐂', '🐅', '🐇', '🐉', '🐍', '🐎', '🐐', '🐵', '🐔', '🐕', '🐷'];

// Ngũ Hành của Can
const NGU_HANH_CAN = {
    'Giáp': 'Mộc', 'Ất': 'Mộc',
    'Bính': 'Hỏa', 'Đinh': 'Hỏa',
    'Mậu': 'Thổ', 'Kỷ': 'Thổ',
    'Canh': 'Kim', 'Tân': 'Kim',
    'Nhâm': 'Thủy', 'Quý': 'Thủy'
};

// Ngũ Hành của Chi
const NGU_HANH_CHI = {
    'Tý': 'Thủy', 'Sửu': 'Thổ', 'Dần': 'Mộc', 'Mão': 'Mộc',
    'Thìn': 'Thổ', 'Tỵ': 'Hỏa', 'Ngọ': 'Hỏa', 'Mùi': 'Thổ',
    'Thân': 'Kim', 'Dậu': 'Kim', 'Tuất': 'Thổ', 'Hợi': 'Thủy'
};

// Màu sắc Ngũ Hành
const ELEMENT_COLORS = {
    'Kim': { name: 'Kim', color: '#ffd700', bg: 'rgba(255, 215, 0, 0.15)', icon: '🥇' },
    'Mộc': { name: 'Mộc', color: '#228b22', bg: 'rgba(34, 139, 34, 0.15)', icon: '🌳' },
    'Thủy': { name: 'Thủy', color: '#1e90ff', bg: 'rgba(30, 144, 255, 0.15)', icon: '💧' },
    'Hỏa': { name: 'Hỏa', color: '#ff4500', bg: 'rgba(255, 69, 0, 0.15)', icon: '🔥' },
    'Thổ': { name: 'Thổ', color: '#daa520', bg: 'rgba(218, 165, 32, 0.15)', icon: '🏔️' }
};

// Ngũ Hành tương sinh tương khắc
const NGU_HANH_RELATIONS = {
    sinh: { 'Kim': 'Thủy', 'Thủy': 'Mộc', 'Mộc': 'Hỏa', 'Hỏa': 'Thổ', 'Thổ': 'Kim' },
    khac: { 'Kim': 'Mộc', 'Mộc': 'Thổ', 'Thổ': 'Thủy', 'Thủy': 'Hỏa', 'Hỏa': 'Kim' },
    duocSinh: { 'Kim': 'Thổ', 'Thủy': 'Kim', 'Mộc': 'Thủy', 'Hỏa': 'Mộc', 'Thổ': 'Hỏa' },
    biKhac: { 'Kim': 'Hỏa', 'Mộc': 'Kim', 'Thổ': 'Mộc', 'Thủy': 'Thổ', 'Hỏa': 'Thủy' }
};

// Thập Thần (10 Gods/Spirits)
const THAP_THAN = {
    'Tỷ Kiên': { shortName: 'TK', desc: 'Anh em, bạn bè, cạnh tranh', element: 'same' },
    'Kiếp Tài': { shortName: 'KT', desc: 'Tranh đoạt, mạo hiểm', element: 'same-yin' },
    'Thực Thần': { shortName: 'TT', desc: 'Tài năng, sáng tạo, hưởng thụ', element: 'sinh' },
    'Thương Quan': { shortName: 'TQ', desc: 'Phản kháng, tự do, nghệ thuật', element: 'sinh-yin' },
    'Thiên Tài': { shortName: 'ThT', desc: 'Tiền bạc bất ngờ, đầu cơ', element: 'khac' },
    'Chính Tài': { shortName: 'CT', desc: 'Thu nhập ổn định, tài sản', element: 'khac-yin' },
    'Thất Sát': { shortName: 'TS', desc: 'Quyền lực, áp lực, đối thủ', element: 'bi-khac' },
    'Chính Quan': { shortName: 'CQ', desc: 'Sự nghiệp, danh tiếng, kỷ luật', element: 'bi-khac-yin' },
    'Thiên Ấn': { shortName: 'ThA', desc: 'Học vấn, trí tuệ, bảo hộ', element: 'duoc-sinh' },
    'Chính Ấn': { shortName: 'CA', desc: 'Mẹ, học vấn chính thống', element: 'duoc-sinh-yin' }
};

// Thần Sát quan trọng
const THAN_SAT = {
    good: [
        { name: 'Thiên Ất Quý Nhân', desc: 'Quý nhân phù trợ, may mắn' },
        { name: 'Văn Xương', desc: 'Thông minh, học giỏi' },
        { name: 'Thiên Đức', desc: 'Đức độ, được phúc' },
        { name: 'Nguyệt Đức', desc: 'Nhân hậu, tốt bụng' },
        { name: 'Lộc Thần', desc: 'May mắn về tài lộc' }
    ],
    bad: [
        { name: 'Kiếp Sát', desc: 'Tai nạn, mất mát' },
        { name: 'Đào Hoa', desc: 'Lãng mạn nhưng dễ sa ngã' },
        { name: 'Vong Thần', desc: 'Hay quên, mất trí nhớ' },
        { name: 'Không Vong', desc: 'Hư không, không thành' }
    ]
};

// Ý nghĩa Thần Số Học
const NUMEROLOGY_MEANINGS = {
    1: { title: 'Người Tiên Phong', traits: 'Độc lập, lãnh đạo, sáng tạo', career: 'CEO, Doanh nhân, Nhà phát minh' },
    2: { title: 'Người Hòa Giải', traits: 'Nhạy cảm, hợp tác, ngoại giao', career: 'Tư vấn, Trung gian hòa giải, Nghệ sĩ' },
    3: { title: 'Người Sáng Tạo', traits: 'Lạc quan, biểu cảm, nghệ thuật', career: 'Nghệ sĩ, Nhà văn, MC, Giáo viên' },
    4: { title: 'Người Xây Dựng', traits: 'Thực tế, có tổ chức, đáng tin', career: 'Kỹ sư, Kiến trúc sư, Quản lý' },
    5: { title: 'Người Tự Do', traits: 'Linh hoạt, mạo hiểm, đa tài', career: 'Du lịch, Marketing, Báo chí' },
    6: { title: 'Người Chăm Sóc', traits: 'Yêu thương, trách nhiệm, gia đình', career: 'Y tế, Giáo dục, Tình nguyện' },
    7: { title: 'Người Tìm Kiếm', traits: 'Phân tích, trực giác, tâm linh', career: 'Nghiên cứu, Triết học, Tâm lý' },
    8: { title: 'Người Thành Đạt', traits: 'Tham vọng, quyền lực, thành công', career: 'Tài chính, Quản lý cấp cao, Luật sư' },
    9: { title: 'Người Nhân Đạo', traits: 'Bao dung, lý tưởng, phục vụ', career: 'Từ thiện, Nghệ thuật, Chữa lành' },
    11: { title: 'Số Chủ: Giác Ngộ', traits: 'Trực giác mạnh, truyền cảm hứng', career: 'Tâm linh, Cố vấn, Nghệ sĩ' },
    22: { title: 'Số Chủ: Kiến Tạo', traits: 'Tầm nhìn lớn, thực hiện ý tưởng', career: 'Kiến trúc sư, Chính trị, Doanh nghiệp lớn' },
    33: { title: 'Số Chủ: Thầy Dạy', traits: 'Phụng sự vô điều kiện', career: 'Giáo viên tâm linh, Chữa lành' }
};

// Bảng chữ cái -> số (Pythagorean)
const LETTER_VALUES = {
    'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5, 'f': 6, 'g': 7, 'h': 8, 'i': 9,
    'j': 1, 'k': 2, 'l': 3, 'm': 4, 'n': 5, 'o': 6, 'p': 7, 'q': 8, 'r': 9,
    's': 1, 't': 2, 'u': 3, 'v': 4, 'w': 5, 'x': 6, 'y': 7, 'z': 8,
    'đ': 4
};

// Vietnamese character mapping
const VN_TO_BASE = {
    'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
    'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
    'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
    'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y'
};

const VOWELS = 'aeiouáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ';

if (typeof module !== 'undefined') {
    module.exports = {
        CAN, CHI, CHI_EMOJI, NGU_HANH_CAN, NGU_HANH_CHI, ELEMENT_COLORS,
        NGU_HANH_RELATIONS, THAP_THAN, THAN_SAT, NUMEROLOGY_MEANINGS,
        LETTER_VALUES, VN_TO_BASE, VOWELS
    };
}
