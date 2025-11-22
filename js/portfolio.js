// --- FILE: js/portfolio.js (FULL UPDATED VERSION - FEATURED & LIMIT 5) ---

// 1. IMPORT ĐẦY ĐỦ CÁC HÀM TỪ FIRESTORE
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
// 3. CHÌA KHÓA CHỦ NHÂN (UID CỦA BẠN)
// ==================================================================
const OWNER_UID = "5a6YielwJJYFwB2DyFfUB9DVQXR2"; 

// --- CÁC HÀM HỖ TRỢ NGÀY THÁNG ---
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
        const docRef = doc(db, "users", OWNER_UID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Render các phần giao diện
            renderHeader(data);
            renderProjects(data.projects || []);
            renderAchievements(data.achievements || []);
            
            // Render Lịch chi tiết
            renderSchedule(data.tasks || [], data.calendarEvents || []);
        } else {
            document.querySelector('.hero-title').innerText = "Không tìm thấy dữ liệu.";
        }
    } catch (error) {
        console.error("Lỗi tải Portfolio:", error);
    }
}

// --- CÁC HÀM RENDER ---

function renderHeader(data) {
    const info = data.personalInfo || {};
    const settings = data.settings || {};

    document.getElementById('pf-name').textContent = info.fullName || "Người dùng";
    document.getElementById('pf-email').textContent = info.email || "Chưa cập nhật email";
    
    if (info.occupation) {
        document.querySelector('.hero-subtitle').textContent = 
            `Chào mừng đến với không gian làm việc số của tôi. Hiện tôi đang là ${info.occupation}.`;
    }

    if (settings.customAvatarUrl) {
        document.getElementById('pf-avatar').src = settings.customAvatarUrl;
    }

    const chipsContainer = document.querySelector('.info-chips');
    if (chipsContainer) {
        let chipsHTML = '';
        if (info.school) chipsHTML += `<span class="chip-item">🎓 ${info.school}</span>`;
        if (info.award)  chipsHTML += `<span class="chip-item">⭐ ${info.award}</span>`;
        if (info.role)   chipsHTML += `<span class="chip-item">💼 ${info.role}</span>`;
        if (info.location) chipsHTML += `<span class="chip-item">📍 ${info.location}</span>`;

        if (chipsHTML === '') {
            chipsHTML = `<span class="chip-item">🎓 Chưa cập nhật thông tin</span>`;
        }
        chipsContainer.innerHTML = chipsHTML;
    }
}

function renderProjects(projects) {
    const container = document.getElementById('pf-projects');
    container.innerHTML = '';

    if (!projects || projects.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%; color:#999">Chưa có dự án nào.</p>';
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
                            📅 ${p.endDate ? 'Deadline: ' + p.endDate : 'Đang làm'}
                        </span>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// ============================================================
// [MỚI] LOGIC RENDER THÀNH TÍCH (SẮP XẾP NỔI BẬT + LIMIT 5)
// ============================================================

let allAchievementsData = []; 

function renderAchievements(achievements) {
    if (achievements) {
        allAchievementsData = achievements;
    }
    filterAchievements('all');
}

window.filterAchievements = (type) => {
    const container = document.getElementById('pf-achievements');
    if(!container) return;
    container.innerHTML = '';

    // A. Active nút
    document.querySelectorAll('.ach-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('onclick').includes(`'${type}'`)) {
            btn.classList.add('active');
        }
    });

    // B. Lọc dữ liệu
    let filtered = [];
    if (type === 'all') {
        filtered = allAchievementsData;
    } else {
        filtered = allAchievementsData.filter(a => a.category === type);
    }

    if (!filtered || filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; width:100%; padding: 20px;">Chưa có mục nào.</p>';
        return;
    }

    // C. SẮP XẾP: Nổi bật (Featured) lên trước -> Sau đó mới đến Ngày tháng
    filtered.sort((a, b) => {
        // 1. So sánh Nổi bật (true > false)
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        
        // 2. Nếu cùng trạng thái nổi bật thì so sánh Ngày (Mới > Cũ)
        return new Date(b.date) - new Date(a.date);
    });

    // D. Gom nhóm theo NĂM
    const groups = {};
    filtered.forEach(ach => {
        const year = ach.date ? ach.date.split('-')[0] : 'Khác';
        if (!groups[year]) groups[year] = [];
        groups[year].push(ach);
    });

    // E. Render ra HTML
    const years = Object.keys(groups).sort((a, b) => b - a); 

    years.forEach(year => {
        // Tiêu đề Năm
        const yearBlock = document.createElement('div');
        yearBlock.innerHTML = `<div class="ach-year-label">Năm ${year}</div>`;
        container.appendChild(yearBlock);

        const items = groups[year];
        const limitCount = 5; // GIỚI HẠN HIỂN THỊ 5 MỤC
        const hiddenItems = [];

        // Wrapper chứa danh sách
        const listWrapper = document.createElement('div');
        listWrapper.className = 'ach-year-list';

        items.forEach((ach, index) => {
            let tagLabel = 'Khác', tagClass = 'other';
            if(ach.category === 'academic') { tagLabel = 'Học thuật'; tagClass = 'academic'; }
            else if(ach.category === 'social') { tagLabel = 'Đoàn - Hội'; tagClass = 'social'; }
            else if(ach.category === 'award') { tagLabel = 'Khen thưởng'; tagClass = 'award'; }

            // Icon Ghim nếu là Nổi bật
            const pinIcon = ach.isFeatured ? '<span style="margin-left:5px; font-size:0.9rem;" title="Nổi bật">📌</span>' : '';

            const itemDiv = document.createElement('div');
            itemDiv.className = 'ach-item';
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

            // LOGIC ẨN NẾU VƯỢT QUÁ GIỚI HẠN
            if (index >= limitCount) {
                itemDiv.style.display = 'none'; // Ẩn đi
                hiddenItems.push(itemDiv);
            }
            
            listWrapper.appendChild(itemDiv);
        });

        container.appendChild(listWrapper);

        // NÚT XEM THÊM (Chỉ hiện nếu có item bị ẩn)
        if (hiddenItems.length > 0) {
            const moreBtn = document.createElement('button');
            moreBtn.className = 'ach-show-more-btn';
            moreBtn.innerHTML = `Xem thêm ${hiddenItems.length} hoạt động khác trong năm ${year} ↓`;
            
            moreBtn.onclick = () => {
                hiddenItems.forEach(el => {
                    el.style.display = 'flex'; // Hiện lại (flex vì css ach-item là flex)
                    el.style.animation = 'fadeIn 0.5s';
                });
                moreBtn.style.display = 'none'; // Ẩn nút sau khi bấm
            };
            container.appendChild(moreBtn);
        }
    });
};

// ============================================================

function renderSchedule(tasks, events) {
    const container = document.getElementById('pf-calendar');
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
                    <div style="font-size: 0.8rem; color: #666;">${date.getDate()}/${date.getMonth()+1}</div>
                </div>
                <div style="flex-grow: 1;">${detailsHTML}</div>
            </div>
        `;
        container.innerHTML += html;
    }
}

// --- TÍNH NĂNG MỚI: GALLERY & MESSAGES ---

async function renderGalleryLogic() {
    const container = document.getElementById('pf-gallery');
    try {
        const q = query(collection(db, `users/${OWNER_UID}/gallery`), limit(6));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            container.innerHTML = '';
            snapshot.forEach(doc => {
                const img = doc.data();
                container.innerHTML += `
                    <div class="gallery-item">
                        <img src="${img.url}" alt="Activity">
                        <div class="gallery-caption">${img.caption || 'Hoạt động'}</div>
                    </div>
                `;
            });
        }
    } catch (e) {
        console.log("Chưa có gallery data, dùng ảnh mẫu.");
    }
}

function initMessageBoard() {
    const container = document.getElementById('message-wall');
    const btnSend = document.getElementById('btn-send-msg');

    const q = query(collection(db, `users/${OWNER_UID}/public_messages`), orderBy('timestamp', 'desc'), limit(10));
    
    onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:#999">Chưa có lời nhắn nào. Hãy là người đầu tiên!</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const msg = doc.data();
            const date = msg.timestamp ? new Date(msg.timestamp) : new Date();
            const timeStr = `${date.getHours()}:${date.getMinutes()} - ${date.getDate()}/${date.getMonth()+1}`;
            
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
            alert("Lỗi: Không gửi được tin. (Kiểm tra Firebase Rules)");
        } finally {
            btnSend.innerText = originalText;
            btnSend.disabled = false;
        }
    });
}

window.toggleQR = (show) => {
    const overlay = document.getElementById('qr-overlay');
    overlay.style.display = show ? 'flex' : 'none';
}

// --- KHỞI CHẠY TOÀN BỘ ---
loadOwnerPortfolio();
renderGalleryLogic();
initMessageBoard();
// --- [TÍNH NĂNG 2: LOGIC NÚT SCROLL TO TOP] ---
const scrollBtn = document.getElementById('btn-scroll-top');

if (scrollBtn) {
    // Hiện nút khi cuộn xuống quá 300px
    window.addEventListener('scroll', () => {
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });

    // Bấm là bay lên đầu
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
