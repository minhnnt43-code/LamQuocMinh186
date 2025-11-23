// --- FILE: js/portfolio.js ---

// 1. IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore, doc, getDoc, collection, addDoc, getDocs,
    query, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. CONFIG FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBcmFqZahUIqeCcqszwRB641nBQySydF6c",
    authDomain: "websitecualqm.firebaseapp.com",
    projectId: "websitecualqm",
    storageBucket: "websitecualqm.firebasestorage.app",
    messagingSenderId: "55037681358",
    appId: "1:55037681358:web:ab13413fdb63bf2f8dba9f",
    measurementId: "G-F34WEDPYW5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 3. BIẾN TOÀN CỤC
const urlParams = new URLSearchParams(window.location.search);

// --- [QUAN TRỌNG] THAY UID CỦA BẠN VÀO DÒNG DƯỚI ĐÂY ---
const DEFAULT_UID = "5a6YielwJJYFwB2DyFfUB9DVQXR2"; 
// -------------------------------------------------------

const OWNER_UID = urlParams.get('uid') || DEFAULT_UID;

let publicData = {
    projects: [],
    tasks: [],
    events: [],
    achievements: [],
    timeline: [],
    albums: []
};

let currentCalendarMonth = new Date();
let selectedDateStr = new Date().toISOString().split('T')[0]; // Ngày đang chọn (Mặc định hôm nay)
let currentLightboxPhotos = [];
let currentLightboxIndex = 0;

console.log("🚀 Đang tải Portfolio của:", OWNER_UID);

function formatDateVN(dateString) {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
}

// ==================================================================
// 4. MAIN LOAD FUNCTION
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

            renderProjects(publicData.projects);
            renderAchievements(publicData.achievements);
            
            // Render lịch và chọn ngày hôm nay mặc định
            renderPublicCalendar(currentCalendarMonth);
            
            // Gọi selectDate để cập nhật cột bên trái ngay khi load
            // (Cần đợi DOM render xong lịch một chút nên dùng setTimeout 0 hoặc gọi thẳng)
            setTimeout(() => {
                 window.selectDate(selectedDateStr); 
            }, 100);

        } else {
            document.querySelector('.hero-title').innerText = "Người dùng không tồn tại.";
            // Ẩn các phần khác nếu không tìm thấy user
            document.querySelector('.hero-subtitle').style.display = "none";
        }

        loadSubCollections();

    } catch (error) {
        console.error("❌ Lỗi tải Portfolio:", error);
    }
}

async function loadSubCollections() {
    try {
        const albumQ = query(collection(db, `users/${OWNER_UID}/albums`), orderBy('createdAt', 'desc'));
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

    document.getElementById('pf-name').textContent = info.fullName || "Người dùng";
    document.getElementById('pf-email').textContent = info.email || "";
    
    if (info.occupation) {
        document.querySelector('.hero-subtitle').textContent = `Xin chào, tôi là ${info.fullName}. Hiện đang là ${info.occupation}.`;
    }
    if (settings.customAvatarUrl) {
        document.getElementById('pf-avatar').src = settings.customAvatarUrl;
    }

    const chipsContainer = document.querySelector('.info-chips');
    if (chipsContainer) {
        let chipsHTML = '';
        if (info.school) chipsHTML += `<span class="chip-item">🎓 ${info.school}</span>`;
        if (info.award) chipsHTML += `<span class="chip-item">⭐ ${info.award}</span>`;
        chipsContainer.innerHTML = chipsHTML;
    }
}

// ==================================================================
// 5. RENDER CÁC TAB CƠ BẢN
// ==================================================================
function renderProjects(projects) {
    const container = document.getElementById('pf-projects');
    if (!container) return;
    container.innerHTML = '';

    if (projects.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999;">Chưa cập nhật dự án.</p>';
        return;
    }

    const groups = {};
    projects.forEach(p => {
        let year = p.endDate ? p.endDate.split('-')[0] : (p.startDate ? p.startDate.split('-')[0] : 'Khác');
        if (!groups[year]) groups[year] = [];
        groups[year].push(p);
    });

    Object.keys(groups).sort().reverse().forEach(year => {
        container.innerHTML += `<h3 class="pf-year-label">Năm ${year}</h3>`;
        const grid = document.createElement('div');
        grid.className = 'pf-year-grid';
        groups[year].forEach(p => {
            grid.innerHTML += `
                <div class="pf-card">
                    <h3 style="margin-top:0; color:#005B96;">${p.name}</h3>
                    <p style="color:#666; font-size:0.95rem; flex-grow:1;">${p.description || ''}</p>
                    <div class="pf-card-footer"><span style="font-size:0.8rem; background:#e3f2fd; color:#005B96; padding:4px 10px; border-radius:12px;">${p.endDate ? 'Hoàn thành' : 'Đang thực hiện'}</span></div>
                </div>`;
        });
        container.appendChild(grid);
    });
}

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

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;';
    filtered.forEach(ach => {
        const imgHtml = ach.imageUrl ? `<div style="height:150px; overflow:hidden;"><img src="${ach.imageUrl}" style="width:100%; height:100%; object-fit:cover;"></div>` : '';
        grid.innerHTML += `
            <div class="pf-card" style="padding:0; overflow:hidden; cursor:pointer;" onclick="window.openLightbox([{url:'${ach.imageUrl}', caption:'${ach.name}'}], 0)">
                ${imgHtml}
                <div style="padding:20px;">
                    <h3 style="font-size:1.1rem; margin-top:0; color:#005B96;">${ach.name}</h3>
                    <p style="font-size:0.9rem; color:#666;">${formatDateVN(ach.date)}</p>
                </div>
            </div>`;
    });
    container.appendChild(grid);
};

function renderTimeline(timeline) {
    const container = document.getElementById('pf-timeline');
    if (!container) return;
    container.innerHTML = '';

    if(!timeline || timeline.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999;">Chưa cập nhật lộ trình.</p>';
        return;
    }

    timeline.forEach((item, index) => {
        const pos = index % 2 === 0 ? 'left' : 'right';
        
        // 1. Xử lý Logo
        const logoHtml = item.logo ? `<img src="${item.logo}" class="tl-logo" alt="Logo" onerror="this.style.display='none'">` : '';

        // 2. Xử lý Màu sắc & Nhãn (Tag) - ĐÃ THÊM LẠI
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

function renderAlbums(albums) {
    const container = document.getElementById('pf-album-shelf');
    if (!container) return;
    container.innerHTML = '';
    albums.forEach(album => {
        const div = document.createElement('div');
        div.className = 'album-card';
        div.innerHTML = `
            <div style="height:200px; overflow:hidden;"><img src="${album.cover}" class="album-cover" onerror="this.src='https://placehold.co/600x400'"></div>
            <div class="album-info"><div class="album-title">${album.title}</div></div>`;
        div.onclick = () => { if (album.photos?.length) window.openLightbox(album.photos, 0); };
        container.appendChild(div);
    });
}

// ==================================================================
// 6. CALENDAR (LOGIC MỚI: CHỌN NGÀY -> XEM CHI TIẾT -> ĐẶT HẸN)
// ==================================================================

// --- Render danh sách tháng (3 tháng trước -> 8 tháng sau) ---
function renderMonthSelector() {
    const container = document.getElementById('month-selector');
    if (!container) return;
    container.innerHTML = '';

    const today = new Date();
    // Vòng lặp từ -3 (3 tháng trước) đến +8 (8 tháng sau)
    for (let i = -3; i <= 8; i++) {
        const tempDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        
        const btn = document.createElement('button');
        
        const isSelected = tempDate.getMonth() === currentCalendarMonth.getMonth() && 
                           tempDate.getFullYear() === currentCalendarMonth.getFullYear();

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

// --- Render Lịch Chính ---
function renderPublicCalendar(date) {
    renderMonthSelector(); 

    const year = date.getFullYear();
    const month = date.getMonth();
    
    document.getElementById('calendar-month-title').textContent = `Tháng ${month + 1}/${year}`;

    const monthStartStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    const eventsInMonth = publicData.events.filter(e => e.date.startsWith(monthStartStr));
    const tasksInMonth = publicData.tasks.filter(t => t.dueDate && t.dueDate.startsWith(monthStartStr));

    // Render Grid Lịch
    const grid = document.getElementById('pf-calendar-grid');
    grid.innerHTML = '';
    ['CN','T2','T3','T4','T5','T6','T7'].forEach(d => {
        grid.innerHTML += `<div style="font-weight:bold; color:#999; padding:5px;">${d}</div>`;
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const today = new Date();
    today.setHours(0,0,0,0);

    for(let i=0; i<firstDay; i++) grid.innerHTML += `<div></div>`;

    for(let day=1; day<=daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const currentDayObj = new Date(year, month, day);
        const isPast = currentDayObj < today;

        const hasEvent = eventsInMonth.some(e => e.date === dateStr);
        const hasTask = tasksInMonth.some(t => t.dueDate === dateStr);
        
        let dotHtml = '';
        if (hasEvent) dotHtml += `<span style="display:inline-block; width:6px; height:6px; background:#2980b9; border-radius:50%; margin:1px;"></span>`;
        if (hasTask) dotHtml += `<span style="display:inline-block; width:6px; height:6px; background:#d35400; border-radius:50%; margin:1px;"></span>`;

        const isTodayStr = today.toISOString().split('T')[0] === dateStr;
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
// --- HÀM TÍNH TOÁN MỨC ĐỘ BẬN RỘN ---
function calculateBusyPercentage(dateStr) {
    // Lọc các sự kiện trong ngày
    const dayEvents = publicData.events.filter(e => e.date === dateStr);
    
    let totalBusyMinutes = 0;

    dayEvents.forEach(e => {
        if (e.startTime && e.endTime) {
            const start = e.startTime.split(':').map(Number);
            const end = e.endTime.split(':').map(Number);
            
            // Đổi ra phút (Giờ * 60 + Phút)
            const startMin = start[0] * 60 + start[1];
            const endMin = end[0] * 60 + end[1];
            
            let duration = endMin - startMin;
            if (duration < 0) duration = 0; // Tránh lỗi âm
            
            totalBusyMinutes += duration;
        } else {
            // Nếu sự kiện không có giờ cụ thể, mặc định tính là 60 phút (1 tiếng)
            totalBusyMinutes += 60;
        }
    });

    // GIẢ ĐỊNH: Một ngày làm việc tiêu chuẩn là 10 TIẾNG (600 phút)
    const WORK_DAY_MINUTES = 600; 
    
    // Tính phần trăm
    let percentage = (totalBusyMinutes / WORK_DAY_MINUTES) * 100;
    
    return percentage; // Trả về số % (ví dụ: 85)
}
// --- HÀM CHỌN NGÀY & KIỂM TRA QUÁ KHỨ/BẬN RỘN ---
window.selectDate = (dateStr) => {
    selectedDateStr = dateStr;
    
    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const isPast = selectedDate.getTime() < today.getTime();

    // Tính độ bận rộn
    const busyPercent = calculateBusyPercentage(dateStr);
    const isOverloaded = busyPercent >= 80; // Ngưỡng 80%

    renderPublicCalendar(currentCalendarMonth); 

    const focusList = document.getElementById('focus-list');
    focusList.innerHTML = '';

    const events = publicData.events.filter(e => e.date === dateStr);
    const tasks = publicData.tasks.filter(t => t.dueDate === dateStr);
    const [y, m, d] = dateStr.split('-');
    const displayDate = `${d}/${m}/${y}`;

    // Tiêu đề + Badge cảnh báo nếu bận
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
    if(btnAppt) {
        // Trường hợp 1: Ngày quá khứ
        if (isPast) {
            btnAppt.innerHTML = `⛔ Ngày đã qua`;
            btnAppt.disabled = true;
            btnAppt.style.opacity = '0.6';
            btnAppt.style.cursor = 'not-allowed';
            btnAppt.style.background = '#666';
            btnAppt.onclick = null;
        } 
        // Trường hợp 2: Quá tải (>80%)
        else if (isOverloaded) {
            btnAppt.innerHTML = `⚠️ Lịch đã kín (${Math.round(busyPercent)}%) - Không nhận hẹn`;
            btnAppt.disabled = true;
            btnAppt.style.opacity = '0.8';
            btnAppt.style.cursor = 'not-allowed';
            btnAppt.style.background = '#e74c3c'; // Màu đỏ cảnh báo
            btnAppt.onclick = () => alert("Ngày này tôi đã quá bận, vui lòng chọn ngày khác!");
        }
        // Trường hợp 3: Trống lịch -> Cho phép
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
// 7. BOOKING SYSTEM & UTILS
// ==================================================================

window.openApptModal = (dateStr) => {
    if(dateStr) document.getElementById('appt-date').value = dateStr;
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
        alert("Lỗi: " + e.message);
    } finally {
        btn.textContent = "Gửi yêu cầu";
        btn.disabled = false;
    }
}

// Tab Switching
window.switchTab = (tabId) => {
    document.querySelectorAll('.pf-tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.pf-tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    const btns = document.querySelectorAll('.pf-tab-btn');
    btns.forEach(btn => {
        if(btn.getAttribute('onclick').includes(tabId)) btn.classList.add('active');
    });
    
    if(window.scrollY > 300) document.querySelector('.pf-tabs').scrollIntoView({behavior: 'smooth'});
}

// Guestbook
function initMessageBoard() {
    const container = document.getElementById('message-wall');
    const btnSend = document.getElementById('btn-send-msg');
    if (!container || !btnSend) return;

    const q = query(collection(db, `users/${OWNER_UID}/public_messages`), orderBy('timestamp', 'desc'), limit(10));
    onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p style="color:#999; text-align:center;">Chưa có lời nhắn.</p>';
            return;
        }
        snapshot.forEach(doc => {
            const msg = doc.data();
            container.innerHTML += `
                <div style="background:#fff; padding:15px; border-radius:8px; border:1px solid #eee;">
                    <div style="font-weight:bold; color:#005B96; margin-bottom:5px;">${msg.sender || 'Ẩn danh'}</div>
                    <div style="color:#555;">"${msg.content}"</div>
                </div>`;
        });
    });

    btnSend.addEventListener('click', async () => {
        const name = document.getElementById('guest-name').value.trim() || 'Ẩn danh';
        const content = document.getElementById('guest-msg').value.trim();
        if (!content) return alert("Nhập nội dung!");
        await addDoc(collection(db, `users/${OWNER_UID}/public_messages`), { sender: name, content, timestamp: new Date().toISOString() });
        document.getElementById('guest-msg').value = '';
    });
}

// Lightbox & QR
window.toggleQR = (show) => {
    const overlay = document.getElementById('qr-overlay');
    if(overlay) overlay.style.display = show ? 'flex' : 'none';
}

window.openLightbox = (photos, index) => {
    currentLightboxPhotos = photos;
    currentLightboxIndex = index;
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    const caption = document.getElementById('lightbox-caption');
    
    if(!modal || !img) return;
    
    const p = currentLightboxPhotos[currentLightboxIndex];
    const url = typeof p === 'string' ? p : p.url;
    const text = typeof p === 'string' ? '' : p.caption;

    img.src = url;
    if(caption) caption.textContent = text || `Ảnh ${currentLightboxIndex + 1}`;
    modal.style.display = 'flex';
}
window.closeLightbox = () => document.getElementById('lightbox-modal').style.display = 'none';
window.changeLightboxSlide = (n) => {
    currentLightboxIndex = (currentLightboxIndex + n + currentLightboxPhotos.length) % currentLightboxPhotos.length;
    window.openLightbox(currentLightboxPhotos, currentLightboxIndex);
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    // Ẩn các modal mặc định
    if(document.getElementById('qr-overlay')) document.getElementById('qr-overlay').style.display = 'none';
    if(document.getElementById('lightbox-modal')) document.getElementById('lightbox-modal').style.display = 'none';
    if(document.getElementById('appt-modal')) document.getElementById('appt-modal').style.display = 'none';

    loadOwnerPortfolio();
    initMessageBoard();
    
    const btnSubmit = document.getElementById('btn-submit-appt');
    if(btnSubmit) {
        const newBtn = btnSubmit.cloneNode(true);
        btnSubmit.parentNode.replaceChild(newBtn, btnSubmit);
        newBtn.addEventListener('click', handleBookAppointment);
    }

    const scrollBtn = document.getElementById('btn-scroll-top');
    if(scrollBtn) {
        window.addEventListener('scroll', () => {
            scrollBtn.style.display = window.scrollY > 300 ? 'flex' : 'none';
        });
    }
});