// --- FILE: js/admin.js ---

// 1. IMPORT
import { db } from './firebase.js';
import { 
    collection, getDocs, deleteDoc, doc, addDoc, query, orderBy, setDoc, writeBatch, updateDoc, where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Import các hàm từ module chính
import { getAllUsers, createGlobalTemplate, getGlobalTemplates, getAppointmentRequests, getUserData, saveUserData } from './firebase.js';
import { showNotification, openModal, convertDriveLink, formatDate, generateID } from './common.js';

// 2. CẤU HÌNH
const ADMIN_EMAIL = "lqm186005@gmail.com"; // <--- Đảm bảo đúng email Admin
let currentAdminUID = null;

// Biến theo dõi trạng thái
let editingAlbumId = null;
let editingTimelineId = null;
let isAlbumManagerInit = false; // Cờ kiểm tra đã khởi tạo nút bấm chưa

// 3. KHỞI TẠO MODULE ADMIN
export const initAdminModule = async (user) => {
    if (!user || user.email !== ADMIN_EMAIL) return;

    currentAdminUID = user.uid;
    console.log("👋 Admin đã đăng nhập:", user.email);

    const sidebarMenu = document.querySelector('.nav-menu');
    if (!sidebarMenu) return;

    // A. Thêm nút Dashboard Admin
    if (!document.querySelector('.nav-item-admin')) {
        const adminLi = document.createElement('li');
        adminLi.className = 'nav-item-admin';
        adminLi.innerHTML = `<button class="nav-btn" style="color: #ffeb3b; font-weight: bold; border: 1px dashed rgba(255, 235, 59, 0.3);">👮 Dashboard Admin</button>`;
        sidebarMenu.insertBefore(adminLi, sidebarMenu.firstChild);

        adminLi.querySelector('button').addEventListener('click', () => {
            renderAnalytics();
            renderUserList();
            renderTemplateManager();
            renderMessageManager();
            openModal('admin-modal');
        });
    }

    // B. Gán sự kiện
    const btnAlbum = document.getElementById('nav-btn-albums');
    if (btnAlbum) btnAlbum.addEventListener('click', () => renderAlbumManager());

    const btnTimeline = document.getElementById('nav-btn-timeline');
    if (btnTimeline) btnTimeline.addEventListener('click', () => renderTimelineManager());

    // C. Badge & Appt
    updateAppointmentBadge();
    const btnAppt = document.querySelector('.nav-btn[data-target="appointment-requests"]');
    if (btnAppt) {
        btnAppt.addEventListener('click', () => renderAppointmentManager('pending'));
    }
    
    window.filterAppointments = (status) => {
        document.querySelectorAll('#appointment-requests .filter-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`#appointment-requests .filter-btn[onclick*="${status}"]`);
        if(activeBtn) activeBtn.classList.add('active');
        renderAppointmentManager(status);
    };
};

// ============================================================
// PHẦN QUẢN LÝ ALBUM (ĐÃ FIX LỖI LƯU/SỬA)
// ============================================================
async function renderAlbumManager() {
    if (!currentAdminUID) return;
    const container = document.getElementById('admin-album-list');
    
    // 1. CHỈ KHỞI TẠO SỰ KIỆN NÚT BẤM 1 LẦN DUY NHẤT
    if (!isAlbumManagerInit) {
        const btnSave = document.getElementById('btn-create-album');
        const btnCancel = document.getElementById('btn-cancel-album');

        if (btnSave && btnCancel) {
            // Xóa clone cũ nếu có để tránh lỗi, gán sự kiện trực tiếp
            const newBtnSave = btnSave.cloneNode(true);
            btnSave.parentNode.replaceChild(newBtnSave, btnSave);
            
            const newBtnCancel = btnCancel.cloneNode(true);
            btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

            // Sự kiện Hủy
            newBtnCancel.onclick = () => {
                editingAlbumId = null;
                resetAlbumFormInputs();
                newBtnSave.innerText = "Tạo Album Mới";
                newBtnSave.style.backgroundColor = ""; 
                newBtnCancel.style.display = 'none';
            };

            // Sự kiện Lưu
            newBtnSave.onclick = async () => {
                const title = document.getElementById('album-title').value.trim();
                const coverRaw = document.getElementById('album-cover').value.trim();
                const desc = document.getElementById('album-desc').value;
                const photosRaw = document.getElementById('album-photos').value;
                const eventDate = document.getElementById('album-date').value;
                const location = document.getElementById('album-location').value.trim();

                if (!title) return alert("Chưa nhập tên Album!");

                newBtnSave.innerText = "Đang lưu...";
                newBtnSave.disabled = true;

                try {
                    const cover = convertDriveLink(coverRaw) || coverRaw || 'https://placehold.co/600x400?text=Album';
                    const photos = photosRaw.split('\n').map(link => {
                        const url = link.trim();
                        return url ? { url: convertDriveLink(url), caption: "" } : null;
                    }).filter(p => p !== null);

                    const data = { 
                        title, cover, description: desc, photos, 
                        eventDate: eventDate || new Date().toISOString().split('T')[0], 
                        location: location || '',
                        createdAt: new Date().toISOString() 
                    };

                    if (editingAlbumId) {
                        await setDoc(doc(db, `users/${currentAdminUID}/albums`, editingAlbumId), data, { merge: true });
                        showNotification("Đã cập nhật Album!");
                    } else {
                        await addDoc(collection(db, `users/${currentAdminUID}/albums`), data);
                        showNotification("Đã tạo Album mới!");
                    }

                    // Reset form và load lại list
                    editingAlbumId = null;
                    resetAlbumFormInputs();
                    newBtnSave.innerText = "Tạo Album Mới";
                    newBtnSave.style.backgroundColor = ""; 
                    newBtnCancel.style.display = 'none';
                    
                    await loadAlbumListToUI(container); // Load lại danh sách

                } catch (e) { 
                    console.error(e);
                    alert("Lỗi: " + e.message); 
                } finally {
                    newBtnSave.disabled = false;
                    // Kiểm tra lại trạng thái để gán text đúng (trường hợp lỗi)
                    if(newBtnSave.innerText === "Đang lưu...") {
                         newBtnSave.innerText = editingAlbumId ? "Lưu Thay Đổi" : "Tạo Album Mới";
                    }
                }
            };
            isAlbumManagerInit = true; // Đánh dấu đã khởi tạo xong
        }
    }

    // 2. LOAD DANH SÁCH ALBUM
    await loadAlbumListToUI(container);
}

// Hàm phụ trợ: Reset ô input
function resetAlbumFormInputs() {
    document.getElementById('album-edit-id').value = '';
    document.getElementById('album-title').value = '';
    document.getElementById('album-cover').value = '';
    document.getElementById('album-desc').value = '';
    document.getElementById('album-photos').value = '';
    document.getElementById('album-date').value = '';
    document.getElementById('album-location').value = '';
}

// Hàm phụ trợ: Load và vẽ danh sách Album
async function loadAlbumListToUI(container) {
    if (!container) return;
    container.innerHTML = '<p style="grid-column:1/-1;">Đang tải danh sách...</p>';
    
    try {
        const snapshot = await getDocs(query(collection(db, `users/${currentAdminUID}/albums`), orderBy('eventDate', 'desc')));
        container.innerHTML = snapshot.empty ? '<p style="grid-column:1/-1; color:#999; text-align:center;">Chưa có album nào.</p>' : '';

        snapshot.forEach(docShot => {
            const album = docShot.data();
            const div = document.createElement('div');
            div.style.cssText = "background:white; border:1px solid #ddd; border-radius:8px; overflow:hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.1); display: flex; flex-direction: column;";
            
            div.innerHTML = `
                <div style="height:150px; overflow:hidden; background:#f0f0f0;">
                    <img src="${album.cover}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://placehold.co/300x200?text=No+Image'">
                </div>
                <div style="padding:15px; flex-grow:1; display:flex; flex-direction:column;">
                    <div style="font-weight:bold; font-size:1.1rem; margin-bottom:5px; color:#333;">${album.title}</div>
                    <div style="font-size:0.85rem; color:#666; margin-bottom:5px;">📅 ${album.eventDate || '???'} | 📍 ${album.location || '...'}</div>
                    <div style="font-size:0.85rem; color:#888; margin-bottom:15px;">${album.photos ? album.photos.length : 0} ảnh</div>
                    
                    <div style="margin-top:auto; display:flex; gap:10px;">
                        <button class="btn-edit" style="flex:1; background:#f1c40f; color:white; border:none; border-radius:4px; cursor:pointer; padding:8px; font-weight:bold;">✏️ Sửa</button>
                        <button class="btn-del" style="flex:1; background:#e74c3c; color:white; border:none; border-radius:4px; cursor:pointer; padding:8px; font-weight:bold;">🗑️ Xóa</button>
                    </div>
                </div>
            `;

            // Nút Sửa
            div.querySelector('.btn-edit').onclick = () => {
                editingAlbumId = docShot.id;
                document.getElementById('album-edit-id').value = docShot.id;
                document.getElementById('album-title').value = album.title;
                document.getElementById('album-cover').value = album.cover;
                document.getElementById('album-desc').value = album.description || '';
                document.getElementById('album-photos').value = (album.photos || []).map(p => p.url).join('\n');
                document.getElementById('album-date').value = album.eventDate || '';
                document.getElementById('album-location').value = album.location || '';
                
                // Cập nhật trạng thái nút Lưu
                const btnSave = document.getElementById('btn-create-album');
                const btnCancel = document.getElementById('btn-cancel-album');
                if(btnSave) {
                    btnSave.innerText = "💾 Lưu Thay Đổi";
                    btnSave.style.backgroundColor = "#005B96";
                }
                if(btnCancel) btnCancel.style.display = 'inline-block';
                
                document.querySelector('#manage-albums .form-container').scrollIntoView({ behavior: 'smooth' });
            };

            // Nút Xóa
            div.querySelector('.btn-del').onclick = async () => {
                if (confirm(`Xóa album "${album.title}"?`)) {
                    await deleteDoc(doc(db, `users/${currentAdminUID}/albums`, docShot.id));
                    await loadAlbumListToUI(container); // Reload list sau khi xóa
                }
            };
            container.appendChild(div);
        });
    } catch(e) { 
        console.error("Lỗi tải album:", e); 
        container.innerHTML = '<p style="color:red">Lỗi tải danh sách.</p>';
    }
}

// ============================================================
// PHẦN QUẢN LÝ YÊU CẦU HẸN (GIỮ NGUYÊN)
// ============================================================
async function updateAppointmentBadge() {
    if (!currentAdminUID) return;
    try {
        const requests = await getAppointmentRequests(currentAdminUID, 'pending');
        const badge = document.getElementById('appt-badge');
        if (badge) {
            badge.textContent = requests.length;
            badge.style.display = requests.length > 0 ? 'inline-block' : 'none';
        }
    } catch (e) { console.error("Lỗi cập nhật Badge:", e); }
}

async function renderAppointmentManager(status = 'pending') {
    const container = document.getElementById('appointment-list-container');
    if (!container) return;
    container.innerHTML = '<p>Đang tải...</p>';

    if (!currentAdminUID) {
        container.innerHTML = '<p class="empty-state">Chưa xác thực Admin.</p>';
        return;
    }

    try {
        const requests = await getAppointmentRequests(currentAdminUID, status);
        if (requests.length === 0) {
            container.innerHTML = `<p class="empty-state">Không có yêu cầu nào (${status}).</p>`;
            return;
        }

        container.innerHTML = '';
        requests.forEach(req => {
            const div = document.createElement('div');
            div.className = 'task-item'; 
            div.style.borderLeftColor = status === 'pending' ? 'orange' : (status === 'approved' ? 'green' : 'gray');
            const dateStr = formatDate(req.date);
            
            let actionsHtml = '';
            if (status === 'pending') {
                actionsHtml = `
                    <button class="btn-submit" style="padding:5px 10px; font-size:0.8rem; background:#28a745;" 
                        onclick="window.handleAppt('${req.id}', 'approved', '${req.title}', '${req.date}', '${req.time}', '${req.guestEmail}', '${req.guestName}')">
                        ✅ Duyệt
                    </button>
                    <button class="btn-submit" style="padding:5px 10px; font-size:0.8rem; background:#dc3545;" 
                        onclick="window.handleAppt('${req.id}', 'rejected')">
                        ❌ Từ chối
                    </button>
                `;
            } else {
                actionsHtml = `<span style="font-weight:bold; color:#666;">${status.toUpperCase()}</span>`;
            }

            div.innerHTML = `
                <div style="flex-grow:1">
                    <h3 style="margin:0; font-size:1.1rem; color:var(--primary-blue);">📅 ${req.title || 'Cuộc hẹn mới'}</h3>
                    <div style="font-size:0.9rem; color:#555; margin-top:5px;">
                        <strong>Khách:</strong> ${req.guestName} (${req.guestEmail})<br>
                        <strong>Thời gian:</strong> ${req.time} - ${dateStr}<br>
                        <strong>Lý do:</strong> ${req.reason}
                    </div>
                </div>
                <div style="display:flex; gap:5px; align-items:center;">${actionsHtml}</div>
            `;
            container.appendChild(div);
        });

    } catch (e) {
        container.innerHTML = '<p style="color:red">Lỗi tải dữ liệu.</p>';
    }
}

window.handleAppt = async (id, newStatus, title, date, time, email, guestName) => {
    if (!currentAdminUID) return alert("Vui lòng đăng nhập lại!");
    const confirmMsg = newStatus === 'approved' ? "Duyệt yêu cầu này? Hệ thống sẽ TỰ ĐỘNG thêm vào Lịch trình." : "Từ chối yêu cầu này?";
    if (!confirm(confirmMsg)) return;

    try {
        await updateDoc(doc(db, `users/${currentAdminUID}/appointment_requests`, id), { status: newStatus });

        if (newStatus === 'approved') {
            const userData = await getUserData(currentAdminUID);
            let events = userData.calendarEvents || [];
            let [hour, minute] = time.split(':').map(Number);
            let endHour = (hour + 1) % 24; 
            let endTime = `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

            const newEvent = {
                id: generateID('appt_ev'),
                title: `Hẹn gặp: ${guestName}`,
                date: date,
                startTime: time,
                endTime: endTime,
                type: 'manual',
                color: '#28a745',
                linkedTaskId: '',
                description: `Nội dung: ${title}. Email khách: ${email}`
            };
            events.push(newEvent);
            await saveUserData(currentAdminUID, { calendarEvents: events });
            showNotification("✅ Đã duyệt & Thêm vào lịch!");
        } else {
            showNotification("Đã từ chối.");
        }
        updateAppointmentBadge();
        renderAppointmentManager('pending');
    } catch (e) { showNotification("Lỗi: " + e.message, "error"); }
};

// ============================================================
// PHẦN QUẢN TRỊ KHÁC (GIỮ NGUYÊN)
// ============================================================
async function renderAnalytics() {
    try {
        const users = await getAllUsers();
        document.getElementById('admin-total-users').textContent = users.length;
        let totalTasks = 0;
        users.forEach(u => { if (u.tasks) totalTasks += u.tasks.length; });
        document.getElementById('admin-total-tasks').textContent = totalTasks;
    } catch (e) { console.error(e); }
}

async function renderUserList() {
    const tbody = document.getElementById('admin-user-list');
    if (!tbody) return;
    try {
        const users = await getAllUsers();
        tbody.innerHTML = '';
        users.forEach((u) => {
            const name = u.personalInfo?.fullName || 'Ẩn danh';
            const email = u.email || 'No Email';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${name}</td><td>${email}</td><td>${u.id}</td>`;
            tbody.appendChild(tr);
        });
    } catch (e) { tbody.innerHTML = '<tr><td colspan="3">Lỗi tải</td></tr>'; }
}

async function renderTemplateManager() {
    const container = document.getElementById('template-list-container');
    if (!container) return;
    const templates = await getGlobalTemplates();
    container.innerHTML = templates.length === 0 ? '<p style="color:#888">Trống.</p>' : '';
    templates.forEach(tpl => {
        container.innerHTML += `
            <div style="background:#f9f9f9; padding:8px; margin-bottom:5px; border:1px solid #eee; display:flex; justify-content:space-between;">
                <span>📄 <strong>${tpl.title}</strong></span>
                <span style="color:#888; font-size:0.8rem">ID: ${tpl.id.substring(0, 5)}...</span>
            </div>`;
    });
    const btn = document.getElementById('btn-create-template');
    if(!btn) return;
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', async () => {
        const name = document.getElementById('tpl-name').value.trim();
        if (!name) return alert("Nhập tên mẫu!");
        await createGlobalTemplate({ title: name, tasks: [] });
        showNotification("Tạo mẫu xong!");
        renderTemplateManager();
    });
}

async function renderMessageManager() {
    if (!currentAdminUID) return;
    const container = document.getElementById('admin-msg-list');
    if (!container) return;
    container.innerHTML = '<p>Đang tải...</p>';
    try {
        const q = query(collection(db, `users/${currentAdminUID}/public_messages`), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        container.innerHTML = snapshot.empty ? '<p>Trống.</p>' : '';
        snapshot.forEach(docShot => {
            const msg = docShot.data();
            const div = document.createElement('div');
            div.innerHTML = `<div><b>${msg.sender}</b>: ${msg.content}</div>`;
            container.appendChild(div);
        });
    } catch (e) {}
}

// ============================================================
// PHẦN 6: QUẢN LÝ TIMELINE (GIỮ NGUYÊN)
// ============================================================
async function renderTimelineManager() {
    if (!currentAdminUID) return;
    const container = document.getElementById('admin-timeline-list');
    const btnSave = document.getElementById('btn-create-timeline');
    const btnCancel = document.getElementById('btn-cancel-timeline');

    if (!container || !btnSave) return;

    const snapshot = await getDocs(query(collection(db, `users/${currentAdminUID}/timeline`), orderBy('order', 'asc')));
    container.innerHTML = snapshot.empty ? '<p style="color:#999; text-align:center;">Chưa có mốc lộ trình.</p>' : '';

    snapshot.forEach(docShot => {
        const item = docShot.data();
        let color = item.type === 'academic' ? '#3498db' : (item.type === 'work' ? '#e67e22' : '#2ecc71');

        const div = document.createElement('div');
        div.setAttribute('data-id', docShot.id);
        div.className = 'timeline-draggable-item'; 
        div.style.cssText = `border-left: 5px solid ${color}; background:white; padding:15px; margin-bottom:10px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05); cursor: grab; user-select: none;`;
        
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <strong style="font-size:1.1rem; cursor:grab">☰ ${item.time}</strong> 
                <span style="font-size:0.8rem; background:#eee; padding:3px 8px; border-radius:12px;">${item.type.toUpperCase()}</span>
            </div>
            <div style="font-size:1.2rem; color:${color}; font-weight:bold; margin-bottom:5px;">${item.title}</div>
            <div style="font-weight:600; color:#555; margin-bottom:5px;">${item.role}</div>
            <div style="margin-top:10px; display:flex; gap:10px; border-top:1px dashed #eee; padding-top:10px;">
                <button class="btn-edit-tl" style="font-size:0.9rem; cursor:pointer; border:none; background:none; color:#f39c12; font-weight:bold;">✏️ Sửa</button>
                <button class="btn-del-tl" style="font-size:0.9rem; cursor:pointer; border:none; background:none; color:#e74c3c; font-weight:bold;">🗑️ Xóa</button>
            </div>
        `;

        div.querySelector('.btn-edit-tl').onclick = () => {
            editingTimelineId = docShot.id;
            document.getElementById('tl-edit-id').value = docShot.id;
            document.getElementById('tl-time').value = item.time;
            document.getElementById('tl-title').value = item.title;
            document.getElementById('tl-role').value = item.role;
            document.getElementById('tl-type').value = item.type;
            document.getElementById('tl-logo').value = item.logo || '';
            document.getElementById('tl-desc').value = item.description || '';
            btnSave.innerText = "💾 Lưu Thay Đổi";
            btnSave.style.backgroundColor = "#005B96";
            btnCancel.style.display = 'inline-block';
            document.querySelector('#manage-timeline .form-container').scrollIntoView({ behavior: 'smooth' });
        };
        
        div.querySelector('.btn-del-tl').onclick = async () => {
            if (confirm("Xóa mốc này?")) {
                await deleteDoc(doc(db, `users/${currentAdminUID}/timeline`, docShot.id));
                renderTimelineManager();
            }
        };
        container.appendChild(div);
    });

    if (typeof Sortable !== 'undefined') {
        new Sortable(container, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: async function (evt) {
                const items = container.querySelectorAll('.timeline-draggable-item');
                const batch = writeBatch(db);
                items.forEach((item, index) => {
                    const id = item.getAttribute('data-id');
                    const ref = doc(db, `users/${currentAdminUID}/timeline`, id);
                    batch.update(ref, { order: index }); 
                });
                try { await batch.commit(); showNotification("Đã cập nhật thứ tự!", "success"); } catch (e) {}
            }
        });
    }

    const resetTimelineForm = () => {
        editingTimelineId = null;
        document.getElementById('tl-edit-id').value = '';
        document.getElementById('tl-time').value = '';
        document.getElementById('tl-title').value = '';
        document.getElementById('tl-role').value = '';
        document.getElementById('tl-logo').value = '';
        document.getElementById('tl-desc').value = '';
        btnSave.innerText = "Thêm Mốc Lộ Trình";
        btnSave.style.backgroundColor = ""; 
        btnCancel.style.display = 'none';
    };

    const newBtnSave = btnSave.cloneNode(true);
    btnSave.parentNode.replaceChild(newBtnSave, btnSave);
    const newBtnCancel = btnCancel.cloneNode(true);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
    
    newBtnCancel.onclick = resetTimelineForm;

    newBtnSave.onclick = async () => {
        const time = document.getElementById('tl-time').value.trim();
        const title = document.getElementById('tl-title').value.trim();
        const role = document.getElementById('tl-role').value;
        const type = document.getElementById('tl-type').value;
        const logo = document.getElementById('tl-logo').value;
        const desc = document.getElementById('tl-desc').value;

        if (!time || !title) return alert("Vui lòng nhập Thời gian và Tiêu đề!");
        newBtnSave.innerText = "Đang xử lý...";
        newBtnSave.disabled = true;

        const data = { 
            time, title, role, type, description: desc, 
            logo: convertDriveLink(logo), 
            createdAt: new Date().toISOString()
        };

        try {
            if (editingTimelineId) {
                await setDoc(doc(db, `users/${currentAdminUID}/timeline`, editingTimelineId), data, { merge: true });
                showNotification("Đã cập nhật Lộ trình!");
            } else {
                data.order = Date.now(); 
                await addDoc(collection(db, `users/${currentAdminUID}/timeline`), data);
                showNotification("Đã thêm Mốc mới!");
            }
            resetTimelineForm();
            renderTimelineManager();
        } catch (e) { alert("Lỗi: " + e.message); } 
        finally { 
            newBtnSave.innerText = editingTimelineId ? "Lưu Thay Đổi" : "Thêm Mốc Lộ Trình";
            newBtnSave.disabled = false; 
        }
    };
}