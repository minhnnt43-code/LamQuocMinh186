/**
 * HSV Profile - Activity Portfolio & Certificate Generator
 */

// Export individual certificate
function exportCertificate(eventName) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Background
    doc.setFillColor(248, 249, 250);
    doc.rect(0, 0, 297, 210, 'F');

    // Border
    doc.setDrawColor(0, 86, 179);
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);

    // Title
    doc.setFontSize(32);
    doc.setTextColor(0, 86, 179);
    doc.setFont(undefined, 'bold');
    doc.text('GIẤY CHỨNG NHẬN', 148.5, 40, { align: 'center' });

    // Subtitle
    doc.setFontSize(14);
    doc.setTextColor(108, 117, 125);
    doc.setFont(undefined, 'normal');
    doc.text('Ban Thanh niên - Hội Sinh viên', 148.5, 52, { align: 'center' });

    // Content
    doc.setFontSize(16);
    doc.setTextColor(33, 37, 41);
    doc.text('Chứng nhận', 148.5, 75, { align: 'center' });

    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('NGUYỄN VĂN A', 148.5, 90, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont(undefined, 'normal');
    doc.text('Đã tham gia', 148.5, 105, { align: 'center' });

    doc.setFontSize(18);
    doc.setTextColor(0, 86, 179);
    doc.setFont(undefined, 'bold');
    doc.text(eventName, 148.5, 120, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(108, 117, 125);
    doc.setFont(undefined, 'normal');
    doc.text('với tinh thần tích cực và trách nhiệm cao', 148.5, 130, { align: 'center' });

    // Date
    doc.setFontSize(11);
    const today = new Date().toLocaleDateString('vi-VN');
    doc.text(`Ngày cấp: ${today}`, 148.5, 160, { align: 'center' });

    // Signature
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('BÍ THƯ ĐOÀN TRƯỜNG', 220, 175, { align: 'center' });

    // Logo placeholder
    doc.setFontSize(10);
    doc.setTextColor(255, 107, 0);
    doc.text('🏫', 30, 180);

    // Download
    doc.save(`Chung-nhan-${eventName}-${Date.now()}.pdf`);

    showNotification('✅ Đã xuất giấy chứng nhận thành công!');
}

// Export full activity report
function exportFullReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Title page
    doc.setFontSize(24);
    doc.setTextColor(0, 86, 179);
    doc.setFont(undefined, 'bold');
    doc.text('LÝ LỊCH TRÍCH NGANG', 105, 50, { align: 'center' });

    doc.setFontSize(18);
    doc.text('HOẠT ĐỘNG ĐOÀN - HỘI', 105, 65, { align: 'center' });

    // Personal info
    doc.setFontSize(14);
    doc.setTextColor(33, 37, 41);
    doc.setFont(undefined, 'normal');

    let y = 90;
    doc.text('Họ và tên: NGUYỄN VĂN A', 30, y);
    y += 10;
    doc.text('MSSV: 2018600123', 30, y);
    y += 10;
    doc.text('Lớp: CNTT K18', 30, y);
    y += 10;
    doc.text('Tổng hoạt động: 24 sự kiện', 30, y);
    y += 10;
    doc.text('Tổng giờ hoạt động: 120 giờ', 30, y);
    y += 15;

    // Activities list
    doc.setFont(undefined, 'bold');
    doc.text('DANH SÁCH HOẠT ĐỘNG:', 30, y);
    y += 10;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);

    const activities = [
        '21/11/2024 - Ngày Hội Tình nguyện (8h)',
        '08/11/2024 - Hội thảo Kỹ năng mềm (3h)',
        '25/10/2024 - Chiến dịch Mùa Hè Xanh (56h)',
        '15/10/2024 - Hiến máu Nhân đạo (4h)',
        '01/09/2024 - Chào đón Tân SV (12h)'
    ];

    activities.forEach(activity => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        doc.text(`• ${activity}`, 35, y);
        y += 8;
    });

    // Signature
    y += 20;
    if (y > 250) {
        doc.addPage();
        y = 20;
    }

    const today = new Date().toLocaleDateString('vi-VN');
    doc.setFontSize(11);
    doc.text(`Ngày cấp: ${today}`, 105, y, { align: 'center' });

    y += 15;
    doc.setFont(undefined, 'bold');
    doc.text('BÍ THƯ ĐOÀN TRƯỜNG', 140, y);

    // Download
    doc.save(`Ly-lich-trich-ngang-${Date.now()}.pdf`);

    showNotification('✅ Đã xuất lý lịch trích ngang thành công!');
}

// Notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'};
        color: white;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-xl);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
