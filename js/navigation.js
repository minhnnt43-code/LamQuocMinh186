// --- FILE: js/navigation.js ---

export function setupNavigation() {
    const buttons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.content-section');

    // 1. Xử lý chuyển Tab
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Nếu nút này không có data-target (ví dụ nút Admin Dashboard) thì bỏ qua
            const targetId = btn.getAttribute('data-target');
            if (!targetId) return;

            // Active button
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show Section
            sections.forEach(sec => {
                sec.classList.remove('active');
                sec.style.display = ''; // [FIX] Xóa inline style cũ (nếu có)
            });
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                // Không cần set display block vì CSS class .active đã làm việc đó
                // Trừ khi có inline style display:none thì dòng trên đã xóa rồi
            }

            // Tự động đóng menu mobile sau khi chọn
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('mobile-open');
                const overlay = document.getElementById('mobile-menu-overlay');
                if (overlay) overlay.classList.remove('active');
            }

            // [MỚI] Lưu trạng thái vào localStorage
            localStorage.setItem('active-section', targetId);
        });
    });

    // 2. Xử lý Menu đa cấp (Accordion)
    const groupToggles = document.querySelectorAll('.nav-group-toggle');
    groupToggles.forEach(toggle => {
        const newToggle = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(newToggle, toggle);

        newToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const parentGroup = newToggle.parentElement;
            parentGroup.classList.toggle('open');
        });
    });

    // 3. Xử lý Hamburger Menu (Mobile)
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-menu-overlay');

    if (btnToggle && sidebar) {
        const newBtnToggle = btnToggle.cloneNode(true);
        btnToggle.parentNode.replaceChild(newBtnToggle, btnToggle);

        newBtnToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('mobile-open');
            // Toggle Class 'active' cho sidebar thay vì mobile-open nếu CSS dùng .active
            sidebar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
        });

        // Bấm overlay thì đóng sidebar
        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('active');
            });
        }
    }

    // [MỚI] Khôi phục trạng thái active từ localStorage
    const savedSectionId = localStorage.getItem('active-section');
    if (savedSectionId) {
        const targetBtn = document.querySelector(`.nav-btn[data-target="${savedSectionId}"]`);
        if (targetBtn) {
            // Xóa active mặc định
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));

            // Active mới
            targetBtn.classList.add('active');
            const targetSec = document.getElementById(savedSectionId);
            if (targetSec) targetSec.classList.add('active');

            // Mở menu cha nếu có
            const parentGroup = targetBtn.closest('.nav-group');
            if (parentGroup) {
                parentGroup.classList.add('open');
            }
        }
    } else {
        // [QUAN TRỌNG] Nếu không có trạng thái lưu (User mới), mặc định vào Dashboard
        const defaultBtn = document.querySelector('.nav-btn[data-target="dashboard"]');
        if (defaultBtn) {
            defaultBtn.click(); // Trigger click thật để chạy full logic
        }
    }

    // [FAILSAFE] Cuối cùng, kiểm tra xem có section nào active chưa. Nếu chưa -> Force Dashboard
    // Điều này đảm bảo dù localStorage lỗi hay code trên ko chạy, user vẫn thấy Dashboard
    setTimeout(() => {
        const activeSection = document.querySelector('.content-section.active');
        if (!activeSection || activeSection.style.display === 'none') {
            console.warn("DEBUG: Không thấy section active nào -> Force Dashboard");
            const dashboardBtn = document.querySelector('.nav-btn[data-target="dashboard"]');
            const dashboardSec = document.getElementById('dashboard');

            // Reset all first
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

            if (dashboardBtn) dashboardBtn.classList.add('active');
            if (dashboardSec) {
                dashboardSec.classList.add('active');
                dashboardSec.style.display = 'block'; // Force CSS override
            }
        }
    }, 100); // Delay nhẹ để đợi các script khác
}
