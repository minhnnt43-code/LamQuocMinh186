// --- FILE: js/portfolio.js ---

// 1. IMPORT TỪ MODULE CHÍNH
import { db } from './firebase.js';
import {
    doc, getDoc, collection, addDoc, getDocs,
    query, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { convertDriveLink } from './common.js';

// 2. BIẾN TOÀN CỤC
const urlParams = new URLSearchParams(window.location.search);

// --- [QUAN TRỌNG] THAY UID CỦA BẠN VÀO DÒNG DƯỚI ĐÂY ---
const DEFAULT_UID = "5a6YielwJJYFwB2DyFfUB9DVQXR2";
// -------------------------------------------------------

const OWNER_UID = urlParams.get('uid') || DEFAULT_UID;

// --- [BẮT BUỘC PHẢI CÓ 2 DÒNG NÀY Ở ĐÂY] ---
let currentLightboxPhotos = [];
let currentLightboxIndex = 0;
// -------------------------------------------

let publicData = {
    projects: [],
    tasks: [],
    events: [],
    achievements: [],
    timeline: [],
    albums: []
};

let currentCalendarMonth = new Date();
// Fix: Lấy ngày hôm nay theo múi giờ địa phương
const todayLocal = new Date();
const offset = todayLocal.getTimezoneOffset() * 60000;
let selectedDateStr = (new Date(todayLocal - offset)).toISOString().split('T')[0];

console.log("🚀 Đang tải Portfolio của:", OWNER_UID);

function formatDateVN(dateString) {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
}

// ==================================================================
// 3. MAIN LOAD FUNCTION
// ==================================================================
async function loadOwnerPortfolio() {
    try {
        const docRef = doc(db, "users", OWNER_UID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            renderHeader(data);

            publicData.projects = data.projects || [];
            publicData.tasks = data.tasks || [];
            publicData.events = data.calendarEvents || [];
            publicData.achievements = data.achievements || [];
            console.log("🏆 Dữ liệu thành tích tải về:", publicData.achievements); // [DEBUG]

            renderProjects(publicData.projects);
            renderAchievements(publicData.achievements);

            // Render lịch và chọn ngày hôm nay mặc định
            renderPublicCalendar(currentCalendarMonth);

            // Gọi selectDate để cập nhật cột bên trái ngay khi load
            setTimeout(() => {
                if (document.getElementById('focus-list')) window.selectDate(selectedDateStr);
            }, 100);

        } else {
            const title = document.querySelector('.hero-title');
            if (title) title.innerText = "Người dùng không tồn tại.";
            const sub = document.querySelector('.hero-subtitle');
            if (sub) sub.style.display = "none";
        }

        loadSubCollections();

    } catch (error) {
        console.error("❌ Lỗi tải Portfolio:", error);
    }
}

async function loadSubCollections() {
    try {
        const albumQ = query(collection(db, `users/${OWNER_UID}/albums`), orderBy('eventDate', 'desc'));
        const albumSnap = await getDocs(albumQ);
        publicData.albums = albumSnap.docs.map(doc => doc.data());
        renderAlbums(publicData.albums);

        const timelineQ = query(collection(db, `users/${OWNER_UID}/timeline`), orderBy('order', 'asc'));
        const timelineSnap = await getDocs(timelineQ);
        publicData.timeline = timelineSnap.docs.map(doc => doc.data());
        renderTimeline(publicData.timeline);
    } catch (e) { console.error(e); }
}

function renderHeader(data) {
    const info = data.personalInfo || {};
    const settings = data.settings || {};

    const nameEl = document.getElementById('pf-name');
    if (nameEl) nameEl.textContent = info.fullName || "Người dùng";

    const emailEl = document.getElementById('pf-email');
    if (emailEl) emailEl.textContent = info.email || "";

    // Đã xoá phần hiển thị "Xin chào, tôi là..."
    if (settings.customAvatarUrl) {
        const ava = document.getElementById('pf-avatar');
        if (ava) ava.src = settings.customAvatarUrl;
    }

    // Hỗ trợ cả layout cũ (.info-chips) và Split Layout mới (.info-chips-horizontal)
    const chipsContainer = document.querySelector('.info-chips-horizontal') || document.querySelector('.info-chips');
    if (chipsContainer) {
        let chipsHTML = '';
        if (info.school) chipsHTML += `<span class="chip-item">🎓 ${info.school}</span>`;
        if (info.award) chipsHTML += `<span class="chip-item">⭐ ${info.award}</span>`;
        chipsContainer.innerHTML = chipsHTML;
    }
}

// ==================================================================
// 4. RENDER DỰ ÁN - BENTO GRID LAYOUT
// ==================================================================
function renderProjects(projects) {
    const container = document.getElementById('pf-projects');
    if (!container) return;
    container.innerHTML = '';

    if (projects.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999;">Chưa cập nhật dự án.</p>';
        return;
    }

    // Bento Grid sizes pattern
    const bentoSizes = ['large', '', 'wide', '', 'tall', ''];

    const groups = {};
    projects.forEach(p => {
        let year = p.endDate ? p.endDate.split('-')[0] : (p.startDate ? p.startDate.split('-')[0] : 'Khác');
        if (!groups[year]) groups[year] = [];
        groups[year].push(p);
    });

    Object.keys(groups).sort().reverse().forEach(year => {
        container.innerHTML += `<h3 class="pf-year-label">Năm ${year}</h3>`;

        // BENTO GRID
        const grid = document.createElement('div');
        grid.className = 'bento-grid';
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:180px;gap:15px;';

        groups[year].forEach((p, index) => {
            const stt = String(index + 1).padStart(2, '0');
            const isDone = !!p.endDate;
            const statusText = isDone ? '✅ Hoàn thành' : '🔄 Đang thực hiện';
            const bentoClass = bentoSizes[index % bentoSizes.length];

            // Tech stack badges
            const techStack = p.techStack || ['Web'];
            const techHtml = techStack.map(t => `<span style="background:rgba(255,255,255,0.2);padding:3px 8px;border-radius:15px;font-size:0.7rem;">${t}</span>`).join('');

            const div = document.createElement('div');
            div.className = `bento-item ${bentoClass}`;
            div.style.cssText = `
                background:linear-gradient(135deg,rgba(0,91,150,0.9),rgba(255,122,0,0.8)),url('${p.image || 'https://placehold.co/400x300?text=Project'}');
                background-size:cover;background-position:center;
                border-radius:20px;cursor:pointer;position:relative;overflow:hidden;
                display:flex;flex-direction:column;justify-content:flex-end;padding:20px;color:white;
                transition:all .4s cubic-bezier(.175,.885,.32,1.275);
            `;

            div.onmouseenter = () => { div.style.transform = 'translateY(-8px) scale(1.02)'; div.style.boxShadow = '0 20px 40px rgba(0,0,0,.2)'; };
            div.onmouseleave = () => { div.style.transform = ''; div.style.boxShadow = ''; };
            div.onclick = () => window.openProjectDetails(p);

            div.innerHTML = `
                <div style="position:absolute;top:15px;left:15px;background:rgba(0,0,0,0.3);padding:5px 12px;border-radius:20px;font-size:0.75rem;">${statusText}</div>
                <div style="position:absolute;top:15px;right:15px;font-size:2.5rem;font-weight:900;opacity:0.3;">${stt}</div>
                <h3 style="margin:0 0 8px;font-size:1.2rem;font-weight:700;color:white!important;">${p.name}</h3>
                <p style="margin:0 0 10px;font-size:0.85rem;opacity:0.9;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${p.description || ''}</p>
                <div style="display:flex;gap:5px;flex-wrap:wrap;">${techHtml}</div>
            `;
            grid.appendChild(div);
        });
        container.appendChild(grid);
    });

    // Add responsive CSS
    if (!document.getElementById('bento-responsive')) {
        const style = document.createElement('style');
        style.id = 'bento-responsive';
        style.textContent = `
            .bento-item.large { grid-column:span 2; grid-row:span 2; }
            .bento-item.wide { grid-column:span 2; }
            .bento-item.tall { grid-row:span 2; }
            @media(max-width:1024px) { .bento-grid { grid-template-columns:repeat(2,1fr)!important; } .bento-item.large { grid-column:span 2; } }
            @media(max-width:600px) { .bento-grid { grid-template-columns:1fr!important; } .bento-item.large,.bento-item.wide,.bento-item.tall { grid-column:span 1;grid-row:span 1; } }
        `;
        document.head.appendChild(style);
    }
}

// --- HÀM MỞ POPUP CHI TIẾT DỰ ÁN ---
window.openProjectDetails = (project) => {
    // 1. Tạo Modal HTML nếu chưa có
    let modal = document.getElementById('project-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'project-detail-modal';
        modal.className = 'appt-modal-overlay'; // Tận dụng class overlay có sẵn
        modal.onclick = () => { modal.style.display = 'none'; }; // Click ngoài thì đóng
        document.body.appendChild(modal);
    }

    // 2. Lọc danh sách công việc thuộc dự án này
    // Giả định trường 'project' trong Task lưu ID của Project
    const projectTasks = publicData.tasks.filter(t => t.project === project.id);

    // 3. Tạo nội dung HTML cho Modal
    let tasksHTML = '';
    if (projectTasks.length > 0) {
        tasksHTML = `<ul style="list-style:none; padding:0; margin-top:15px;">`;
        projectTasks.forEach(t => {
            const isTaskDone = t.status === 'Hoàn thành';
            const icon = isTaskDone ? '✅' : '🔸';
            const style = isTaskDone ? 'text-decoration:line-through; color:#999;' : 'color:#333; font-weight:500;';

            tasksHTML += `
                <li style="padding:10px 0; border-bottom:1px dashed #eee; display:flex; gap:10px;">
                    <span>${icon}</span>
                    <span style="${style}">${t.name}</span>
                </li>`;
        });
        tasksHTML += `</ul>`;
    } else {
        tasksHTML = `<p style="color:#999; font-style:italic; margin-top:15px;">Chưa có công việc chi tiết được cập nhật.</p>`;
    }

    const statusLabel = project.endDate ? 'Đã hoàn thành' : 'Đang thực hiện';
    const statusColor = project.endDate ? '#2e7d32' : '#1565c0';

    modal.innerHTML = `
        <div class="appt-modal" onclick="event.stopPropagation()" style="max-height:80vh; overflow-y:auto;">
            <button class="appt-close" onclick="document.getElementById('project-detail-modal').style.display='none'">&times;</button>
            
            <div style="background: linear-gradient(135deg, #005B96 0%, #FF7A00 100%); padding:20px; border-radius:12px 12px 0 0; margin:-30px -30px 20px -30px;">
                <h2 style="color:white; margin:0; font-size:1.5rem;">${project.name}</h2>
                <span style="background:rgba(255,255,255,0.2); color:white; padding:3px 10px; border-radius:15px; font-size:0.8rem; margin-top:5px; display:inline-block;">
                    ${statusLabel}
                </span>
            </div>

            <div style="margin-bottom:20px;">
                <h4 style="color:#005B96; margin-bottom:5px;">Mô tả:</h4>
                <p style="color:#555; line-height:1.6;">${project.description || 'Không có mô tả.'}</p>
                <p style="font-size:0.9rem; color:#777;">
                    <strong>Thời gian:</strong> ${formatDateVN(project.startDate)} - ${project.endDate ? formatDateVN(project.endDate) : 'Nay'}
                </p>
            </div>

            <div>
                <h4 style="color:#005B96; border-bottom:2px solid #FF7A00; display:inline-block; padding-bottom:5px;">Danh sách công việc</h4>
                ${tasksHTML}
            </div>
        </div>
    `;

    // 4. Hiển thị Modal
    modal.style.display = 'flex';
};

// ==================================================================
// 5. CÁC HÀM RENDER KHÁC (THÀNH TÍCH, LỘ TRÌNH, ALBUM...)
// ==================================================================

function renderAchievements(achievements) {
    window.allAchievementsData = achievements;
    window.filterAchievements('all');
}

window.filterAchievements = (type) => {
    const container = document.getElementById('pf-achievements');
    if (!container) return;
    container.innerHTML = '';

    document.querySelectorAll('.ach-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(type)) btn.classList.add('active');
    });

    let filtered = (type === 'all') ? window.allAchievementsData : window.allAchievementsData.filter(a => a.category === type);

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:#999">Chưa có dữ liệu.</p>';
        return;
    }

    // Màu gradient thống nhất (không phân loại tier nữa)
    const cardColor = 'linear-gradient(135deg, #005B96, #0088CC)';
    const badgeIcon = '🏆';

    // Stats counter đơn giản
    container.innerHTML = `
        <div style="display:flex;justify-content:center;gap:30px;margin-bottom:25px;flex-wrap:wrap;">
            <div style="text-align:center;"><div style="font-size:2rem;font-weight:900;color:var(--blue);">${filtered.length}</div><div style="font-size:0.8rem;color:#666;">Thành tích</div></div>
        </div>
    `;

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;';

    filtered.forEach(ach => {
        // Chuyển đổi link Google Drive thành direct URL (chỉ hoạt động với ảnh, không phải PDF)
        const imageUrl = convertDriveLink(ach.imageUrl);

        // Tạo unique ID để xử lý onerror
        const cardId = 'ach-img-' + Math.random().toString(36).substr(2, 9);

        const imgHtml = imageUrl
            ? `<div id="${cardId}" class="ach-img-container" style="height:150px;overflow:hidden;position:relative;background:${cardColor};display:flex;align-items:center;justify-content:center;">
                <img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;" loading="lazy" 
                     onload="this.style.opacity='1'" 
                     onerror="this.style.display='none'; this.parentElement.querySelector('.ach-fallback').style.display='flex'">
                <div class="ach-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:2.5rem;">📄</div>
                <div style="position:absolute;top:10px;right:10px;background:${cardColor};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;box-shadow:0 4px 12px rgba(0,0,0,.3);z-index:2;">${badgeIcon}</div>
               </div>`
            : `<div style="height:70px;background:${cardColor};display:flex;align-items:center;justify-content:center;font-size:2rem;">${badgeIcon}</div>`;

        // Nếu là link Google Drive, mở link gốc thay vì lightbox (vì có thể là PDF)
        const isGoogleDrive = ach.imageUrl && (ach.imageUrl.includes('drive.google.com') || ach.imageUrl.includes('googleusercontent.com'));
        const clickAction = isGoogleDrive
            ? `window.open('${ach.imageUrl}', '_blank')`
            : `window.openLightbox([{url:'${imageUrl}', caption:'${ach.name}'}], 0)`;

        grid.innerHTML += `
            <div class="pf-card" style="padding:0;overflow:hidden;cursor:pointer;transition:all .3s;" 
                 onmouseenter="this.style.transform='translateY(-6px)';this.style.boxShadow='0 12px 30px rgba(0,0,0,.12)'" 
                 onmouseleave="this.style.transform='';this.style.boxShadow=''"
                 onclick="${clickAction}">
                ${imgHtml}
                <div style="padding:18px;">
                    <h3 style="font-size:1.05rem;margin:0 0 4px;color:#005B96;">${ach.name}</h3>
                    <p style="font-size:0.8rem;color:#666;margin:0;">${formatDateVN(ach.date)}</p>
                </div>
            </div>`;
    });
    container.appendChild(grid);
};

function renderTimeline(timeline) {
    const container = document.getElementById('pf-timeline');
    if (!container) return;
    container.innerHTML = '';

    if (!timeline || timeline.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999;">Chưa cập nhật lộ trình.</p>';
        return;
    }

    timeline.forEach((item, index) => {
        const pos = index % 2 === 0 ? 'left' : 'right';

        const logoHtml = item.logo ? `<img src="${item.logo}" class="tl-logo" alt="Logo" onerror="this.style.display='none'">` : '';

        let tagClass = 'academic';
        let tagLabel = 'Học tập';
        if (item.type === 'work') { tagClass = 'work'; tagLabel = 'Công việc'; }
        if (item.type === 'activity') { tagClass = 'activity'; tagLabel = 'Hoạt động'; }

        container.innerHTML += `
            <div class="timeline-node ${pos}">
                <div class="timeline-content">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        ${logoHtml}
                        <span class="tl-tag ${tagClass}">${tagLabel}</span>
                    </div>
                    
                    <span style="font-size:0.85rem; font-weight:bold; color:#999; display:block; margin-bottom:5px;">${item.time}</span>
                    
                    <h3 style="margin:5px 0; color:#005B96;">${item.title}</h3>
                    <h4 style="margin:0 0 10px; color:#333; font-size:1rem;">${item.role}</h4>
                    <p style="font-size:0.9rem; color:#555; line-height:1.5;">${item.description || ''}</p>
                </div>
            </div>
        `;
    });
}

// --- [REPLACE] HÀM RENDER ALBUM THEO NĂM (TIMELINE) ---
function renderAlbums(albums) {
    // Lưu ý: ID trong HTML mới là 'pf-album-container'
    const container = document.getElementById('pf-album-container');
    if (!container) return;
    container.innerHTML = '';

    // Thêm thông báo đang cập nhật
    const notice = document.createElement('div');
    notice.className = 'album-update-notice';
    notice.style.cssText = 'text-align:center; padding:15px 20px; margin-bottom:25px; background:linear-gradient(135deg, rgba(0,91,150,0.08), rgba(255,122,0,0.05)); border-radius:12px; border:1px dashed rgba(0,91,150,0.3); color:#555; font-size:0.9rem; font-style:italic;';
    notice.innerHTML = '✨ <span style="color:#005B96;">Hiện tại chuyên mục này vẫn đang được cập nhật thêm hình ảnh và thiết kế của mình, cảm ơn bạn đã quan tâm và theo dõi...</span>';
    container.appendChild(notice);

    if (!albums || albums.length === 0) {
        container.innerHTML += '<p style="text-align:center; color:#999; padding:20px;">Chưa có album nào.</p>';
        return;
    }

    // 1. Sắp xếp: Mới nhất lên đầu
    albums.sort((a, b) => {
        const d1 = new Date(a.eventDate || a.createdAt);
        const d2 = new Date(b.eventDate || b.createdAt);
        return d2 - d1;
    });

    // 2. Gom nhóm theo Năm
    const groups = {};
    albums.forEach(album => {
        // Nếu không có ngày diễn ra thì lấy ngày tạo
        const dateObj = new Date(album.eventDate || album.createdAt);
        const year = dateObj.getFullYear();
        if (!groups[year]) groups[year] = [];
        groups[year].push(album);
    });

    // 3. Vẽ HTML ra màn hình
    Object.keys(groups).sort((a, b) => b - a).forEach(year => {
        // A. Vẽ số Năm to đùng
        const yearHeader = document.createElement('div');
        yearHeader.className = 'album-timeline-year';
        yearHeader.setAttribute('data-year', year);
        yearHeader.innerText = year; // Fallback text
        container.appendChild(yearHeader);

        // B. Vẽ cái lưới chứa ảnh
        const grid = document.createElement('div');
        grid.className = 'album-shelf';

        groups[year].forEach(album => {
            const div = document.createElement('div');
            div.className = 'album-card';

            // Format ngày và địa điểm
            const displayDate = album.eventDate ? formatDateVN(album.eventDate) : '...';
            const locationHtml = album.location
                ? `<div class="album-location-tag">📍 ${album.location}</div>`
                : '';

            div.innerHTML = `
                <div class="album-cover-wrapper">
                    <img src="${album.cover}" class="album-cover" onerror="this.src='https://placehold.co/600x400'">
                    ${locationHtml}
                </div>
                <div class="album-info">
                    <div class="album-title">${album.title}</div>
                    <div class="album-desc-short">${album.description || 'Chưa có mô tả.'}</div>
                    <div class="album-meta-date">📅 ${displayDate} • 📸 ${album.photos ? album.photos.length : 0} ảnh</div>
                </div>
            `;

            // KHI CLICK -> GỌI HÀM MỞ STORY (Bước 3 sẽ thêm hàm này)
            div.onclick = () => openStoryModal(album);
            grid.appendChild(div);
        });
        container.appendChild(grid);
    });
}

// ==================================================================
// 6. CALENDAR (LỊCH)
// ==================================================================

function renderMonthSelector() {
    const container = document.getElementById('month-selector');
    if (!container) return;
    container.innerHTML = '';

    const today = new Date();
    for (let i = -3; i <= 8; i++) {
        const tempDate = new Date(today.getFullYear(), today.getMonth() + i, 1);

        const isSelected = tempDate.getMonth() === currentCalendarMonth.getMonth() &&
            tempDate.getFullYear() === currentCalendarMonth.getFullYear();

        const btn = document.createElement('button');
        btn.className = `month-btn ${isSelected ? 'active' : ''}`;

        const monthStr = String(tempDate.getMonth() + 1).padStart(2, '0');
        const yearStr = String(tempDate.getFullYear()).slice(-2);
        btn.textContent = `Thg ${monthStr}/${yearStr}`;

        btn.onclick = () => {
            currentCalendarMonth = new Date(tempDate);
            renderPublicCalendar(currentCalendarMonth);
        };
        container.appendChild(btn);
    }
}

function renderPublicCalendar(date) {
    renderMonthSelector();

    const year = date.getFullYear();
    const month = date.getMonth();

    const titleEl = document.getElementById('calendar-month-title');
    if (titleEl) titleEl.textContent = `Tháng ${month + 1}/${year}`;

    const monthStartStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    const eventsInMonth = publicData.events.filter(e => e.date && e.date.startsWith(monthStartStr));
    const tasksInMonth = publicData.tasks.filter(t => t.dueDate && t.dueDate.startsWith(monthStartStr));

    const grid = document.getElementById('pf-calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';

    ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].forEach(d => {
        grid.innerHTML += `<div style="font-weight:bold; color:#999; padding:5px;">${d}</div>`;
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const currentDayObj = new Date(year, month, day);
        const isPast = currentDayObj < today;

        const hasEvent = eventsInMonth.some(e => e.date === dateStr);
        const hasTask = tasksInMonth.some(t => t.dueDate === dateStr);

        let dotHtml = '';
        if (hasEvent) dotHtml += `<span style="display:inline-block; width:6px; height:6px; background:#2980b9; border-radius:50%; margin:1px;"></span>`;
        if (hasTask) dotHtml += `<span style="display:inline-block; width:6px; height:6px; background:#d35400; border-radius:50%; margin:1px;"></span>`;

        // Fix so sánh chuỗi ngày hôm nay chính xác theo Local Time
        const todayStr = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const isTodayStr = todayStr === dateStr;
        const isSelected = dateStr === selectedDateStr;

        const bgStyle = isSelected ? '#fff5eb' : (isTodayStr ? '#fffbeb' : (isPast ? '#f9f9f9' : '#fff'));
        const textStyle = isPast ? '#ccc' : (isTodayStr ? '#d35400' : '#333');
        const borderStyle = isSelected ? '1px solid #FF7A00' : '1px solid #f0f0f0';

        grid.innerHTML += `
            <div style="height:60px; border:${borderStyle}; padding:5px; background:${bgStyle}; cursor:pointer; border-radius:4px;" 
                 onclick="window.selectDate('${dateStr}')">
                <span style="font-weight:${isTodayStr ? 'bold' : 'normal'}; color:${textStyle};">${day}</span>
                <div style="display:flex; justify-content:center; margin-top:5px;">${dotHtml}</div>
            </div>
        `;
    }
}

function calculateBusyPercentage(dateStr) {
    const dayEvents = publicData.events.filter(e => e.date === dateStr);
    let totalBusyMinutes = 0;

    dayEvents.forEach(e => {
        if (e.startTime && e.endTime) {
            const start = e.startTime.split(':').map(Number);
            const end = e.endTime.split(':').map(Number);
            const startMin = start[0] * 60 + start[1];
            const endMin = end[0] * 60 + end[1];
            let duration = endMin - startMin;
            if (duration < 0) duration = 0;
            totalBusyMinutes += duration;
        } else {
            totalBusyMinutes += 60;
        }
    });

    const WORK_DAY_MINUTES = 600;
    let percentage = (totalBusyMinutes / WORK_DAY_MINUTES) * 100;
    return percentage;
}

window.selectDate = (dateStr) => {
    selectedDateStr = dateStr;

    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // So sánh time để chính xác hơn là so sánh ngày
    const isPast = selectedDate.getTime() < today.getTime();

    const busyPercent = calculateBusyPercentage(dateStr);
    const isOverloaded = busyPercent >= 80;

    // Render lại lịch để update trạng thái active
    renderPublicCalendar(currentCalendarMonth);

    const focusList = document.getElementById('focus-list');
    if (!focusList) return;
    focusList.innerHTML = '';

    const events = publicData.events.filter(e => e.date === dateStr);
    const tasks = publicData.tasks.filter(t => t.dueDate === dateStr);
    const [y, m, d] = dateStr.split('-');
    const displayDate = `${d}/${m}/${y}`;

    let statusHtml = '';
    if (isOverloaded) statusHtml = `<span style="font-size:0.8rem; color:red; background:#ffe6e6; padding:2px 8px; border-radius:4px; margin-left:5px;">🔥 Rất bận (${Math.round(busyPercent)}%)</span>`;

    focusList.innerHTML = `<h4 style="margin:0 0 10px 0; color:#333;">📅 Lịch ngày ${displayDate}: ${statusHtml}</h4>`;

    if (events.length === 0 && tasks.length === 0) {
        if (isPast) {
            focusList.innerHTML += '<p style="color:#999; font-style:italic;">Ngày này đã trôi qua.</p>';
        } else {
            focusList.innerHTML += '<p style="color:#28a745; font-style:italic;">✅ Ngày này đang trống. Rất thích hợp để hẹn!</p>';
        }
    } else {
        events.forEach(e => {
            focusList.innerHTML += `
                <div class="focus-item" style="border-left:3px solid #2980b9; padding-left:10px;">
                    <div style="font-weight:bold;">${e.startTime || 'Cả ngày'} - ${e.endTime || ''}</div>
                    <div style="color:#666;">${e.title}</div>
                </div>`;
        });
        tasks.forEach(t => {
            focusList.innerHTML += `
                <div class="focus-item" style="border-left:3px solid #d35400; padding-left:10px;">
                    <div style="font-weight:bold; color:#d35400;">Deadline quan trọng</div>
                    <div style="color:#666;">${t.name}</div>
                </div>`;
        });
    }

    // --- XỬ LÝ NÚT ĐẶT HẸN ---
    const btnAppt = document.querySelector('.focus-panel .btn-submit');
    if (btnAppt) {
        if (isPast) {
            btnAppt.innerHTML = `⛔ Ngày đã qua`;
            btnAppt.disabled = true;
            btnAppt.style.opacity = '0.6';
            btnAppt.style.cursor = 'not-allowed';
            btnAppt.style.background = '#666';
            btnAppt.onclick = null;
        }
        else if (isOverloaded) {
            btnAppt.innerHTML = `⚠️ Lịch đã kín (${Math.round(busyPercent)}%) - Không nhận hẹn`;
            btnAppt.disabled = true;
            btnAppt.style.opacity = '0.8';
            btnAppt.style.cursor = 'not-allowed';
            btnAppt.style.background = '#e74c3c';
            btnAppt.onclick = () => alert("Ngày này tôi đã quá bận, vui lòng chọn ngày khác!");
        }
        else {
            btnAppt.innerHTML = `📅 Đặt hẹn vào ngày ${displayDate}`;
            btnAppt.disabled = false;
            btnAppt.removeAttribute('disabled');
            btnAppt.style.opacity = '1';
            btnAppt.style.cursor = 'pointer';
            btnAppt.style.background = '#28a745';
            btnAppt.onclick = () => window.openApptModal(dateStr);
        }
    }
}

// ==================================================================
// 7. UTILS & INIT
// ==================================================================

window.openApptModal = (dateStr) => {
    if (dateStr) document.getElementById('appt-date').value = dateStr;
    document.getElementById('appt-modal').style.display = 'flex';
}
window.closeApptModal = () => {
    document.getElementById('appt-modal').style.display = 'none';
}

window.handleBookAppointment = async () => {
    const name = document.getElementById('appt-name').value.trim();
    const email = document.getElementById('appt-email').value.trim();
    const date = document.getElementById('appt-date').value;
    const time = document.getElementById('appt-time').value;
    const reason = document.getElementById('appt-reason').value.trim();

    if (!name || !email || !date || !time) return alert("Vui lòng nhập đủ thông tin!");

    const btn = document.getElementById('btn-submit-appt');
    btn.textContent = "Đang gửi...";
    btn.disabled = true;

    try {
        await addDoc(collection(db, `users/${OWNER_UID}/appointment_requests`), {
            guestName: name, guestEmail: email, date, time, reason,
            status: 'pending', title: `Hẹn gặp: ${name}`,
            createdAt: new Date().toISOString()
        });
        alert("✅ Đã gửi yêu cầu! Vui lòng chờ phản hồi qua email.");
        window.closeApptModal();
        document.getElementById('appt-name').value = '';
        document.getElementById('appt-email').value = '';
        document.getElementById('appt-reason').value = '';
    } catch (e) {
        console.error(e);
        if (e.code === 'permission-denied') {
            alert("❌ Lỗi: Hệ thống chưa mở quyền nhận tin nhắn từ khách. Vui lòng liên hệ trực tiếp qua Email!");
        } else {
            alert("Lỗi không xác định: " + e.message);
        }
    } finally {
        btn.textContent = "Gửi yêu cầu";
        btn.disabled = false;
    }
}

window.switchTab = (tabId) => {
    document.querySelectorAll('.pf-tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.pf-tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    const btns = document.querySelectorAll('.pf-tab-btn');
    btns.forEach(btn => {
        if (btn.getAttribute('onclick').includes(tabId)) btn.classList.add('active');
    });

    if (window.scrollY > 300) document.querySelector('.pf-tabs').scrollIntoView({ behavior: 'smooth' });
}

function initMessageBoard() {
    const container = document.getElementById('message-wall');
    const btnSend = document.getElementById('btn-send-msg');

    // Nếu không tìm thấy element thì thoát
    if (!container || !btnSend) return;

    // Lắng nghe dữ liệu Real-time
    try {
        const q = query(collection(db, `users/${OWNER_UID}/public_messages`), orderBy('timestamp', 'desc'), limit(10));
        onSnapshot(q, (snapshot) => {
            container.innerHTML = '';
            if (snapshot.empty) {
                container.innerHTML = '<p style="color:#999; text-align:center;">Chưa có lời nhắn nào. Hãy là người đầu tiên!</p>';
                return;
            }

            snapshot.forEach(doc => {
                const msg = doc.data();
                // Sử dụng class .msg-bubble từ pf-effects.js
                container.innerHTML += `
                    <div class="msg-bubble">
                        <div style="font-weight:bold; color:#005B96; margin-bottom:5px;">${msg.sender || 'Ẩn danh'}</div>
                        <div style="color:#333;">${msg.content}</div>
                        <div style="font-size:0.75rem; color:#999; text-align:right; margin-top:5px;">${formatDateVN(msg.timestamp?.split('T')[0])}</div>
                    </div>`;
            });
        }, (error) => {
            console.error("Lỗi đồng bộ tin nhắn:", error);
            container.innerHTML = `<p style="color:red; text-align:center;">Mất kết nối với hộp thư: ${error.message}</p>`;
        });
    } catch (err) {
        console.error("Lỗi khởi tạo Guestbook:", err);
    }

    // Xử lý gửi tin nhắn
    btnSend.addEventListener('click', async () => {
        const nameInp = document.getElementById('guest-name');
        const msgInp = document.getElementById('guest-msg');

        const name = nameInp.value.trim() || 'Ẩn danh';
        const content = msgInp.value.trim();

        if (!content) return alert("Bạn chưa nhập nội dung nhắn gửi!");

        btnSend.disabled = true;
        btnSend.textContent = "Đang gửi...";

        try {
            await addDoc(collection(db, `users/${OWNER_UID}/public_messages`), {
                sender: name,
                content,
                timestamp: new Date().toISOString()
            });

            msgInp.value = '';
            if (window.showToast) window.showToast("Đã gửi lời nhắn thành công!", "success");

            // Nếu là tin nhắn đầu tiên, onSnapshot sẽ tự cập nhật UI

        } catch (e) {
            console.error("Lỗi gửi tin nhắn:", e);
            alert("Không thể gửi tin nhắn. Có thể do lỗi quyền truy cập (Permission Denied).");
        } finally {
            btnSend.disabled = false;
            btnSend.textContent = "Gửi đi 🚀";
        }
    });
}

window.toggleQR = (show) => {
    const overlay = document.getElementById('qr-overlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

// --- LIGHTBOX ĐÃ ĐƯỢC CHUYỂN SANG PF-EFFECTS.JS (Phiên bản Pro) ---
// Giữ lại các hàm này dưới dạng alias để tương thích ngược nếu cần
// window.openLightbox = ... (Đã xử lý bên pf-effects.js)
// window.closeLightbox = ...
// window.changeLightboxSlide = ...

// --- [REPLACE] HÀM MỞ MODAL CHI TIẾT ALBUM (CÓ NÚT DOWNLOAD) ---
// --- HÀM MỞ MODAL CHI TIẾT ALBUM (STORY MODE) ---
window.openStoryModal = (album) => {
    const modal = document.getElementById('story-modal');
    const content = document.getElementById('story-content-wrapper');
    if (!modal || !content) return;

    // 1. Lưu danh sách ảnh vào biến toàn cục để Lightbox sử dụng
    // Chuyển đổi format sang object {url, caption} cho Lightbox Pro
    window.currentStoryPhotos = (album.photos || []).map(p => {
        if (typeof p === 'string') return { url: p, caption: album.title };
        return { url: p.url, caption: p.caption || album.title };
    });

    const displayDate = album.eventDate ? formatDateVN(album.eventDate) : '';
    const locationText = album.location ? `tại <strong>${album.location}</strong>` : '';

    // 2. Render danh sách ảnh
    let galleryHtml = '';
    if (window.currentStoryPhotos.length > 0) {
        window.currentStoryPhotos.forEach((p, index) => {
            galleryHtml += `
                <div class="story-img-item" onclick="window.openLightbox(window.currentStoryPhotos, ${index})">
                    <img src="${p.url}" loading="lazy" alt="Khoảnh khắc">
                    <button class="btn-download-img" title="Tải ảnh gốc" 
                        onclick="event.stopPropagation(); window.open('${p.url}', '_blank');">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>
                </div>`;
        });
    } else {
        galleryHtml = '<p style="text-align:center; color:#999; width:100%;">Album này chưa có ảnh chi tiết.</p>';
    }

    content.innerHTML = `
        <div class="story-header">
            <h2 class="story-title">${album.title}</h2>
            <div class="story-meta">Diễn ra ngày ${displayDate} ${locationText}</div>
            ${album.description ? `<div class="story-intro">"${album.description}"</div>` : ''}
        </div>
        <div class="story-gallery">
            ${galleryHtml}
        </div>
        <button onclick="document.getElementById('story-modal').style.display='none'" 
            style="position:absolute; top:10px; right:15px; background:none; border:none; font-size:2rem; cursor:pointer; color:#333;">&times;</button>
    `;

    modal.style.display = 'flex';
};

// --- [NEW] HÀM TRUNG GIAN ĐỂ MỞ LIGHTBOX TỪ STORY ---
// Đã xóa hàm trùng lặp

// Hỗ trợ bàn phím (Mũi tên trái/phải)
document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('lightbox-modal');
    // Chỉ chạy khi Lightbox đang mở (đang hiển thị)
    if (lightbox && lightbox.style.display === 'flex') {
        if (e.key === 'ArrowLeft') {
            window.changeLightboxSlide(-1); // Qua trái
        } else if (e.key === 'ArrowRight') {
            window.changeLightboxSlide(1);  // Qua phải
        } else if (e.key === 'Escape') {
            window.closeLightbox();         // Nhấn Esc để thoát
        }
    }
});
// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('qr-overlay')) document.getElementById('qr-overlay').style.display = 'none';
    if (document.getElementById('lightbox-modal')) document.getElementById('lightbox-modal').style.display = 'none';
    if (document.getElementById('appt-modal')) document.getElementById('appt-modal').style.display = 'none';

    loadOwnerPortfolio();
    initMessageBoard();

    const btnSubmit = document.getElementById('btn-submit-appt');
    if (btnSubmit) {
        const newBtn = btnSubmit.cloneNode(true);
        btnSubmit.parentNode.replaceChild(newBtn, btnSubmit);
        newBtn.addEventListener('click', handleBookAppointment);
    }

    const scrollBtn = document.getElementById('btn-scroll-top');
    if (scrollBtn) {
        window.addEventListener('scroll', () => {
            scrollBtn.classList.toggle('visible', window.scrollY > 300);
            scrollBtn.style.display = window.scrollY > 300 ? 'flex' : 'none';
        });
    }
});