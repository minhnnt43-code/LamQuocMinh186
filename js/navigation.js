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
            sections.forEach(sec => sec.classList.remove('active'));
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('active');

            // Tự động đóng menu mobile sau khi chọn
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('mobile-open');
                const overlay = document.getElementById('mobile-menu-overlay');
                if (overlay) overlay.classList.remove('active');
            }
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
            if(overlay) overlay.classList.toggle('active');
        });

        // Bấm overlay thì đóng sidebar
        if(overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('active');
            });
        }
    }
}
