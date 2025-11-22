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

// ==================================================================
// 3. XÁC ĐỊNH CHỦ NHÂN (UID)
// ==================================================================
// Ưu tiên lấy UID từ URL (?uid=...), nếu không có thì dùng UID mặc định để test
const urlParams = new URLSearchParams(window.location.search);
const DEFAULT_UID = "5a6YielwJJYFwB2DyFfUB9DVQXR2"; // Thay bằng UID chính của bạn
const OWNER_UID = urlParams.get('uid') || DEFAULT_UID;

console.log("Đang tải Portfolio của:", OWNER_UID);

// --- CÁC HÀM HỖ TRỢ ---
function getMonday(d) {
    d = new Date(d);
    var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateVN(dateString) {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
}

// 4. HÀM TẢI DỮ LIỆU CHÍNH (MAIN LOAD)
async function loadOwnerPortfolio() {
    try {
        // 1. Lấy thông tin User (Profile, Settings, Projects, Tasks)
        const docRef = doc(db, "users", OWNER_UID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            renderHeader(data);
            renderProjects(data.projects || []);
            renderAchievements(data.achievements || []); // Logic Filter & Limit 5
            renderSchedule(data.tasks || [], data.calendarEvents || []);
        } else {
            document.querySelector('.hero-title').innerText = "Người dùng không tồn tại.";
            document.querySelector('.hero-subtitle').style.display = "none";
        }

        // 2. Lấy dữ liệu Collection con (Albums, Timeline)
        renderAlbums();
        renderTimeline();

    } catch (error) {
        console.error("Lỗi tải Portfolio:", error);
    }
}

// --- RENDER HEADER (INFO) ---
function renderHeader(data) {
    const info = data.personalInfo || {};
    const settings = data.settings || {};

    document.getElementById('pf-name').textContent = info.fullName || "Người dùng";
    document.getElementById('pf-email').textContent = info.email || "Chưa cập nhật";
    
    // Link email ở footer
    const emailLink = document.querySelector('a[title="Email"]');
    if(emailLink) emailLink.href = `mailto:${info.email}`;

    if (info.occupation) {
        document.querySelector('.hero-subtitle').textContent =
            `Chào mừng đến với không gian làm việc số của tôi. Hiện tôi đang là ${info.occupation}.`;
    }

    if (settings.customAvatarUrl) {
        document.getElementById('pf-avatar').src = settings.customAvatarUrl;
    }

    // Render Chips (Thẻ định danh)
    const chipsContainer = document.querySelector('.info-chips');
    if (chipsContainer) {
        let chipsHTML = '';
        if (info.school) chipsHTML += `<span class="chip-item">🎓 ${info.school}</span>`;
        if (info.award) chipsHTML += `<span class="chip-item">⭐ ${info.award}</span>`;
        if (info.role) chipsHTML += `<span class="chip-item">💼 ${info.role}</span>`;
        if (info.location) chipsHTML += `<span class="chip-item">📍 ${info.location}</span>`;

        if (chipsHTML === '') chipsHTML = `<span class="chip-item">🎓 Hello World!</span>`;
        chipsContainer.innerHTML = chipsHTML;
    }
}

// --- RENDER PROJECTS ---
function renderProjects(projects) {
    const container = document.getElementById('pf-projects');
    if (!container) return;
    container.innerHTML = '';

    if (!projects || projects.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%; color:#999">Chưa có dự án công khai.</p>';
        return;
    }

    projects.forEach(p => {
        const html = `
            <div class="pf-card">
                <div class="pf-card-body">
                    <h3 style="color: #005B96;">${p.name}</h3>
                    <p style="color: #555; font-size: 0.9rem; margin: 10px 0;">${p.description || '...'}</p>
                    <div style="margin-top:15px">
                        <span class="pf-tag" style="background:#e3f2fd; color:#005B96">
                            📅 ${p.endDate ? 'Kết thúc: ' + formatDateVN(p.endDate) : 'Đang thực hiện'}
                        </span>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// --- RENDER SCHEDULE (LỊCH) ---
function renderSchedule(tasks, events) {
    const container = document.getElementById('pf-calendar');
    if (!container) return;
    container.innerHTML = '';

    const startOfWeek = getMonday(new Date());
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateStr = getLocalDateString(date);

        const dayTasks = tasks.filter(t => t.dueDate === dateStr && t.status !== 'Hoàn thành');
        const dayEvents = events.filter(e => e.date === dateStr);
        const hasItems = dayTasks.length > 0 || dayEvents.length > 0;

        let detailsHTML = '';
        if (hasItems) {
            detailsHTML += `<div style="text-align: left; font-size: 0.85rem; margin-top: 10px; max-height: 150px; overflow-y: auto;">`;
            dayEvents.forEach(e => {
                detailsHTML += `<div style="margin-bottom: 6px; color: #005B96; font-weight: 600; border-bottom: 1px dashed #eee; padding-bottom: 2px;">• ${e.title} <span style="font-size: 0.75rem;">(${e.startTime})</span></div>`;
            });
            dayTasks.forEach(t => {
                detailsHTML += `<div style="margin-bottom: 4px; color: #333;">- ${t.name}</div>`;
            });
            detailsHTML += `</div>`;
        } else {
            detailsHTML = `<div style="color: #999; font-size: 0.8rem; margin-top: 20px; font-style: italic;">(Trống)</div>`;
        }

        const bg = hasItems ? '#fff' : '#f8f9fa';
        const border = hasItems ? '2px solid #FF7A00' : '1px solid #e0e0e0';
        const isToday = dateStr === getLocalDateString(new Date());
        const todayStyle = isToday ? 'box-shadow: 0 0 15px rgba(0, 91, 150, 0.2); border-color: #005B96;' : '';

        const html = `
            <div class="day-slot" style="min-width: 160px; background: ${bg}; border: ${border}; border-radius: 12px; padding: 15px; display: flex; flex-direction: column; ${todayStyle}">
                <div style="border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 5px;">
                    <div style="font-weight: bold; color: #005B96;">${days[date.getDay()]}</div>
                    <div style="font-size: 0.8rem; color: #666;">${date.getDate()}/${date.getMonth() + 1}</div>
                </div>
                <div style="flex-grow: 1;">${detailsHTML}</div>
            </div>
        `;
        container.innerHTML += html;
    }
}

// ============================================================
// [MỚI] RENDER THÀNH TÍCH (FILTER & LIMIT 5)
// ============================================================
let allAchievementsData = [];

function renderAchievements(achievements) {
    if (achievements) allAchievementsData = achievements;
    filterAchievements('all');
}

window.filterAchievements = (type) => {
    const container = document.getElementById('pf-achievements');
    if (!container) return;
    container.innerHTML = '';

    // Active button style
    document.querySelectorAll('.ach-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${type}'`)) {
            btn.classList.add('active');
        }
    });

    // Filter Logic
    let filtered = (type === 'all') ? allAchievementsData : allAchievementsData.filter(a => a.category === type);

    if (!filtered || filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; width:100%; padding: 20px;">Chưa có mục nào.</p>';
        return;
    }

    // Sort: Featured first -> Date Desc
    filtered.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return new Date(b.date) - new Date(a.date);
    });

    // Group by Year
    const groups = {};
    filtered.forEach(ach => {
        const year = ach.date ? ach.date.split('-')[0] : 'Khác';
        if (!groups[year]) groups[year] = [];
        groups[year].push(ach);
    });

    const years = Object.keys(groups).sort((a, b) => b - a);

    years.forEach(year => {
        // Tiêu đề Năm
        const yearBlock = document.createElement('div');
        yearBlock.innerHTML = `<div class="ach-year-label">Năm ${year}</div>`;
        container.appendChild(yearBlock);

        const items = groups[year];
        const limitCount = 5; // LIMIT 5
        const hiddenItems = [];

        const listWrapper = document.createElement('div');
        listWrapper.className = 'ach-year-list';

        items.forEach((ach, index) => {
            let tagLabel = 'Khác', tagClass = 'other';
            if (ach.category === 'academic') { tagLabel = 'Học thuật'; tagClass = 'academic'; }
            else if (ach.category === 'social') { tagLabel = 'Đoàn - Hội'; tagClass = 'social'; }
            else if (ach.category === 'award') { tagLabel = 'Khen thưởng'; tagClass = 'award'; }

            const pinIcon = ach.isFeatured ? '<span style="margin-left:5px; font-size:0.9rem;" title="Nổi bật">📌</span>' : '';

            const itemDiv = document.createElement('div');
            itemDiv.className = 'ach-item';
            // Thêm sự kiện click để xem ảnh nếu có
            if (ach.imageUrl) {
                itemDiv.style.cursor = "pointer";
                itemDiv.onclick = () => openLightbox([{ url: ach.imageUrl, caption: ach.name }], 0);
            }

            itemDiv.innerHTML = `
                <div class="ach-image">
                    ${ach.imageUrl ? `<img src="${ach.imageUrl}" loading="lazy">` : '<span>🏆</span>'}
                </div>
                <div class="ach-info">
                    <div class="ach-meta">
                        <span class="ach-tag ${tagClass}">${tagLabel}</span>
                        <span class="ach-date">${formatDateVN(ach.date)}</span>
                        ${pinIcon}
                    </div>
                    <h3 class="ach-name">${ach.name}</h3>
                    <p class="ach-desc">${ach.description || ''}</p>
                </div>
            `;

            if (index >= limitCount) {
                itemDiv.style.display = 'none';
                hiddenItems.push(itemDiv);
            }
            listWrapper.appendChild(itemDiv);
        });

        container.appendChild(listWrapper);

        // Nút Xem thêm
        if (hiddenItems.length > 0) {
            const moreBtn = document.createElement('button');
            moreBtn.className = 'ach-show-more-btn';
            moreBtn.innerHTML = `Xem thêm ${hiddenItems.length} hoạt động khác trong năm ${year} ↓`;
            moreBtn.onclick = () => {
                hiddenItems.forEach(el => { el.style.display = 'flex'; el.style.animation = 'fadeIn 0.5s'; });
                moreBtn.style.display = 'none';
            };
            container.appendChild(moreBtn);
        }
    });
};

// ============================================================
// [CẬP NHẬT] RENDER ALBUM (HIỆN ẢNH BÌA ĐẸP)
// ============================================================
async function renderAlbums() {
    const container = document.getElementById('pf-album-shelf');
    if (!container) return;

    try {
        const q = query(collection(db, `users/${OWNER_UID}/albums`), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#999">Chưa có album ảnh nào.</p>';
            return;
        }

        snapshot.forEach(docShot => {
            const album = docShot.data();
            const photos = album.photos || [];
            
            // Nếu không có ảnh bìa thì dùng ảnh mặc định
            const coverUrl = album.cover || 'https://placehold.co/600x400?text=Album';

            const div = document.createElement('div');
            div.className = 'album-card';
            
            // Style Card có ảnh bìa
            div.style.cssText = `
                background: #fff; 
                border-radius: 12px; 
                box-shadow: 0 4px 10px rgba(0,0,0,0.1); 
                cursor: pointer; 
                transition: 0.3s; 
                overflow: hidden; /* Để bo tròn ảnh */
                border: 1px solid #eee;
                display: flex;
                flex-direction: column;
            `;

            div.innerHTML = `
                <div style="height: 200px; overflow: hidden; background: #f0f0f0; position: relative;">
                    <img src="${coverUrl}" 
                         style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s;"
                         onerror="this.src='https://placehold.co/600x400?text=No+Image'" 
                         alt="${album.title}">
                </div>
                <div style="padding: 15px;">
                    <div style="font-weight: bold; color: #005B96; font-size: 1.1rem; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${album.title}
                    </div>
                    <div style="font-size: 0.85rem; color: #666; display: flex; justify-content: space-between;">
                        <span>📸 ${photos.length} ảnh</span>
                        <span style="color: #FF7A00;">Xem ngay ➜</span>
                    </div>
                </div>
            `;
            
            // Hiệu ứng Hover: Phóng to ảnh nhẹ
            div.onmouseover = () => { 
                div.style.transform = "translateY(-5px)"; 
                div.style.boxShadow = "0 10px 20px rgba(0,0,0,0.15)";
                div.querySelector('img').style.transform = "scale(1.1)";
            };
            div.onmouseout = () => { 
                div.style.transform = "translateY(0)"; 
                div.style.boxShadow = "0 4px 10px rgba(0,0,0,0.1)";
                div.querySelector('img').style.transform = "scale(1)";
            };

            // Click để mở Lightbox
            div.onclick = () => {
                if (photos.length > 0) openLightbox(photos, 0);
                else alert("Album này chưa có ảnh!");
            };
            container.appendChild(div);
        });
    } catch (e) {
        console.log("Lỗi tải album:", e);
    }
}

// ============================================================
// [CẬP NHẬT] RENDER TIMELINE (THEO THỨ TỰ KÉO THẢ ADMIN)
// ============================================================
async function renderTimeline() {
    const container = document.getElementById('pf-timeline');
    if (!container) return;

    try {
        // Lấy dữ liệu và sắp xếp theo trường 'order' tăng dần (0, 1, 2...)
        // Nghĩa là cái nào bạn xếp trên cùng ở Admin (số 0) sẽ hiện đầu tiên.
        const q = query(collection(db, `users/${OWNER_UID}/timeline`), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);

        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">Lộ trình đang được cập nhật...</p>';
            return;
        }

        let index = 0;
        snapshot.forEach(docShot => {
            const item = docShot.data();
            
            // Vị trí Zíc-zắc
            const positionClass = index % 2 === 0 ? 'left' : 'right';
            
            let tagClass = 'academic';
            let tagLabel = 'Học tập';
            if (item.type === 'work') { tagClass = 'work'; tagLabel = 'Công việc'; }
            if (item.type === 'activity') { tagClass = 'activity'; tagLabel = 'Hoạt động'; }

            const div = document.createElement('div');
            div.className = `timeline-node ${positionClass}`;
            
            const logoHtml = item.logo ? `<img src="${item.logo}" class="tl-logo" alt="Logo">` : '';

            div.innerHTML = `
                <div class="timeline-content">
                    <span class="tl-time">${item.time}</span>
                    <span class="tl-tag ${tagClass}">${tagLabel}</span>
                    ${logoHtml}
                    <h3 class="tl-title">${item.title}</h3>
                    <h4 class="tl-role">${item.role}</h4>
                    <p class="tl-desc">${item.description}</p>
                </div>
            `;
            container.appendChild(div);
            index++;
        });

    } catch (e) {
        console.error("Lỗi tải Timeline:", e);
    }
}

// ============================================================
// [MỚI] LIGHTBOX LOGIC (XEM ẢNH)
// ============================================================
let currentLightboxPhotos = [];
let currentLightboxIndex = 0;

function openLightbox(photos, index) {
    currentLightboxPhotos = photos;
    currentLightboxIndex = index;
    
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    const caption = document.getElementById('lightbox-caption');

    if(!modal || !img) return;

    // Reset
    img.src = "";
    
    updateLightboxContent();
    modal.style.display = 'flex';
}

function updateLightboxContent() {
    const img = document.getElementById('lightbox-img');
    const caption = document.getElementById('lightbox-caption');
    
    const photo = currentLightboxPhotos[currentLightboxIndex];
    // photo có thể là string url hoặc object {url, caption}
    const url = typeof photo === 'string' ? photo : photo.url;
    const text = typeof photo === 'string' ? '' : photo.caption;

    img.src = url;
    if (caption) caption.textContent = text || `Ảnh ${currentLightboxIndex + 1} / ${currentLightboxPhotos.length}`;
}

window.changeLightboxSlide = (offset) => {
    let newIndex = currentLightboxIndex + offset;
    if (newIndex < 0) newIndex = currentLightboxPhotos.length - 1;
    if (newIndex >= currentLightboxPhotos.length) newIndex = 0;
    
    currentLightboxIndex = newIndex;
    updateLightboxContent();
};

window.closeLightbox = () => {
    document.getElementById('lightbox-modal').style.display = 'none';
};

// Đóng khi bấm ra ngoài ảnh
document.getElementById('lightbox-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'lightbox-modal') window.closeLightbox();
});


// ============================================================
// MESSAGE BOARD (GUESTBOOK)
// ============================================================
function initMessageBoard() {
    const container = document.getElementById('message-wall');
    const btnSend = document.getElementById('btn-send-msg');
    if (!container || !btnSend) return;

    const q = query(collection(db, `users/${OWNER_UID}/public_messages`), orderBy('timestamp', 'desc'), limit(10));

    onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:#999">Chưa có lời nhắn nào.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const msg = doc.data();
            const date = msg.timestamp ? new Date(msg.timestamp) : new Date();
            const timeStr = `${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')} - ${date.getDate()}/${date.getMonth() + 1}`;

            container.innerHTML += `
                <div class="msg-card">
                    <div class="msg-header">
                        <strong>${msg.sender || 'Ẩn danh'}</strong>
                        <span class="msg-time">${timeStr}</span>
                    </div>
                    <div class="msg-body">"${msg.content}"</div>
                </div>
            `;
        });
    });

    btnSend.addEventListener('click', async () => {
        const nameInput = document.getElementById('guest-name');
        const msgInput = document.getElementById('guest-msg');
        const name = nameInput.value.trim() || 'Người bí ẩn';
        const content = msgInput.value.trim();

        if (!content) {
            alert("Bạn chưa nhập lời nhắn!");
            return;
        }

        const originalText = btnSend.innerText;
        btnSend.innerText = "Đang gửi...";
        btnSend.disabled = true;

        try {
            await addDoc(collection(db, `users/${OWNER_UID}/public_messages`), {
                sender: name,
                content: content,
                timestamp: new Date().toISOString()
            });

            alert("Đã gửi lời nhắn thành công!");
            msgInput.value = '';
        } catch (error) {
            console.error("Lỗi gửi tin:", error);
            alert("Lỗi: Không thể gửi tin nhắn.");
        } finally {
            btnSend.innerText = originalText;
            btnSend.disabled = false;
        }
    });
}

// ============================================================
// UTILS: QR & SCROLL
// ============================================================
window.toggleQR = (show) => {
    const overlay = document.getElementById('qr-overlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

const scrollBtn = document.getElementById('btn-scroll-top');
if (scrollBtn) {
    window.addEventListener('scroll', () => {
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// --- KHỞI CHẠY ---
loadOwnerPortfolio();
initMessageBoard();
