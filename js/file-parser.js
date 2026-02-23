/**
 * ============================================================
 * FILE PARSER - LifeOS 2026
 * ============================================================
 * Parse nội dung từ các file: TXT, PDF, DOCX
 * Sử dụng trong Chatbot Lập kế hoạch Tuần
 * ============================================================
 */

/**
 * Parse file dựa vào extension
 * @param {File} file - File object từ input
 * @returns {Promise<string>} - Nội dung text của file
 */
export async function parseFile(file) {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.txt')) {
        return await parseTxtFile(file);
    } else if (fileName.endsWith('.pdf')) {
        return await parsePdfFile(file);
    } else if (fileName.endsWith('.docx')) {
        return await parseDocxFile(file);
    } else if (fileName.endsWith('.doc')) {
        throw new Error('File .doc không được hỗ trợ. Vui lòng dùng .docx');
    } else {
        throw new Error(`Định dạng file không được hỗ trợ: ${fileName}`);
    }
}

/**
 * Parse file TXT (Native)
 */
async function parseTxtFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Lỗi đọc file TXT'));
        reader.readAsText(file, 'UTF-8');
    });
}

/**
 * Parse file PDF (sử dụng pdf.js CDN)
 */
async function parsePdfFile(file) {
    // Check if pdf.js is loaded
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('Thư viện PDF.js chưa được tải. Vui lòng thử lại.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return fullText.trim();
}

/**
 * Parse file DOCX (sử dụng mammoth.js CDN)
 */
async function parseDocxFile(file) {
    // Check if mammoth is loaded
    if (typeof mammoth === 'undefined') {
        throw new Error('Thư viện Mammoth.js chưa được tải. Vui lòng thử lại.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });

    return result.value.trim();
}

/**
 * Validate file trước khi parse
 */
export function validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['.txt', '.pdf', '.docx'];

    if (file.size > maxSize) {
        return { valid: false, error: 'File quá lớn (tối đa 10MB)' };
    }

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(ext)) {
        return { valid: false, error: `Chỉ hỗ trợ: ${allowedTypes.join(', ')}` };
    }

    return { valid: true };
}

/**
 * Get file icon based on extension
 */
export function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
        'txt': '📄',
        'pdf': '📕',
        'docx': '📘',
        'doc': '📘'
    };
    return icons[ext] || '📎';
}

// Export cho window object
if (typeof window !== 'undefined') {
    window.FileParser = {
        parseFile,
        validateFile,
        getFileIcon
    };
}
