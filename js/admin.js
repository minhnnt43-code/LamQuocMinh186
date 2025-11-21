// --- FILE: js/admin.js ---

import { getAllUsers, createGlobalTemplate, getGlobalTemplates } from './firebase.js';
import { showNotification, openModal, formatDate } from './common.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, deleteDoc, doc, addDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. CẤU HÌNH FIREBASE (Để dùng các hàm admin chuyên sâu)
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

// 2. THÔNG TIN ADMIN
const ADMIN_EMAIL = "lqm186005@gmail.com"; // <--- EMAIL CỦA BẠN
let currentAdminUID = null;

// 3. KHỞI TẠO MODULE
export const initAdminModule = async (user) => {
    if (!user || user.email !== ADMIN_EMAIL) return;
    
    currentAdminUID = user.uid;
    console.log("👋 Admin đã đăng nhập:", user.email);

    // Thêm nút Admin vào Sidebar nếu chưa có
    const sidebarMenu = document.querySelector('.nav-menu');
    if (!document.querySelector('.nav-item-admin')) {
        const adminLi = document.createElement('li');
        adminLi.className = 'nav-item-admin';
        adminLi.innerHTML = `<button class="nav-btn" style="color: #ffeb3b; font-weight: bold; border: 1px dashed rgba(255, 235, 59, 0.3);">👮 Quản trị hệ thống</button>`;
        
        // Chèn lên đầu menu
        sidebarMenu.insertBefore(adminLi, sidebarMenu.firstChild);

        // Sự kiện click
        adminLi.querySelector('button').addEventListener('click', () => {
            renderAdminDashboard();
            openModal('admin-modal');
        });
    }
};

// 4. HÀM RENDER TỔNG (GỌI CÁC HÀM CON)
const renderAdminDashboard = async () => {
    renderAnalytics();       // 1. Thống kê
    renderUserList();        // 2. Danh sách User
    renderTemplateManager(); // 3. Kho mẫu
    renderMessageManager();  // 4. Tin nhắn (Mới)
    renderGalleryManager();  // 5. Ảnh Drive (Mới)
};

// --- PHẦN 1: THỐNG KÊ & DANH SÁCH USER ---
async function renderAnalytics() {
    try {
        const users = await getAllUsers();
        document.getElementById('admin-total-users').textContent = users.length;
        
        // Tính tổng task & user online
        let totalTasks = 0;
        let activeCount = 0;
        const now = new Date();
        
        users.forEach(u => {
            if(u.tasks) totalTasks += u.tasks.length;
            if(u.lastUpdated) {
                const diff = Math.abs(now - new Date(u.lastUpdated));
                const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                if(days <= 7) activeCount++;
            }
        });
        
        document.getElementById('admin-total-tasks').textContent = totalTasks;
        document.getElementById('admin-active-users').textContent = activeCount;
        
        return users; // Trả về để hàm renderUserList dùng
    } catch (e) { console.error(e); }
}

async function renderUserList() {
    const tbody = document.getElementById('admin-user-list');
    tbody.innerHTML = '<tr><td colspan="3">Đang tải...</td></tr>';
    
    const users = await getAllUsers();
    tbody.innerHTML = '';
    
    users.forEach((u, index) => {
        const name = u.personalInfo?.fullName || 'Ẩn danh';
        const email = u.personalInfo?.email || 'No Email';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${u.settings?.customAvatarUrl || 'https://placehold.co/30'}" width="30"> <b>${name}</b></td>
            <td>${email}</td>
            <td><button class="btn-submit" style="padding:5px 10px; font-size:0.8rem" onclick="alert('ID: ${u.id}')">Xem ID</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- PHẦN 3: QUẢN LÝ MẪU (TEMPLATES) ---
async function renderTemplateManager() {
    const container = document.getElementById('template-list-container');
    const templates = await getGlobalTemplates();
    
    container.innerHTML = '';
    if(templates.length === 0) container.innerHTML = '<p style="color:#888">Chưa có mẫu nào.</p>';
    
    templates.forEach(tpl => {
        container.innerHTML += `
            <div style="background:#f9f9f9; padding:8px; margin-bottom:5px; display:flex; justify-content:space-between;">
                <span>📄 ${tpl.title}</span>
                <span style="color:#888; font-size:0.8rem">ID: ${tpl.id.substr(0,5)}...</span>
            </div>`;
    });

    // Sự kiện tạo mẫu
    const btn = document.getElementById('btn-create-template');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', async () => {
        const name = document.getElementById('tpl-name').value;
        if(!name) return alert("Nhập tên mẫu!");
        await createGlobalTemplate({ title: name, tasks: [] });
        alert("Tạo thành công!");
        renderTemplateManager();
    });
}

// --- PHẦN 4: QUẢN LÝ TIN NHẮN (GUESTBOOK) ---
async function renderMessageManager() {
    const container = document.getElementById('admin-msg-list');
    container.innerHTML = '<p>Đang tải...</p>';
    
    try {
        const q = query(collection(db, `users/${currentAdminUID}/public_messages`), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        
        container.innerHTML = '';
        if(snapshot.empty) {
            container.innerHTML = '<p style="text-align:center; color:#999">Hộp thư trống.</p>';
            return;
        }

        snapshot.forEach(docShot => {
            const msg = docShot.data();
            const div = document.createElement('div');
            // Style đã có trong CSS bổ sung
            div.innerHTML = `
                <div style="flex:1">
                    <b style="color:#005B96">${msg.sender || 'Ẩn danh'}</b>: 
                    <span style="color:#333">${msg.content}</span>
                    <div style="font-size:0.7rem; color:#999">${msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}</div>
                </div>
                <button class="btn-del-msg" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">XÓA</button>
            `;
            
            // Nút Xóa
            div.querySelector('.btn-del-msg').onclick = async () => {
                if(confirm("Xóa tin nhắn này?")) {
                    await deleteDoc(doc(db, `users/${currentAdminUID}/public_messages`, docShot.id));
                    renderMessageManager(); // Reload lại list
                }
            };
            container.appendChild(div);
        });
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="color:red">Lỗi tải tin nhắn.</p>';
    }
}

// --- PHẦN 5: QUẢN LÝ ẢNH (LINK GOOGLE DRIVE) ---

// Hàm chuyển link Drive -> Link ảnh trực tiếp
function convertDriveLink(url) {
    try {
        // Tìm ID trong link (đoạn mã dài ngoằng)
        const idMatch = url.match(/[-\w]{25,}/);
        if (!idMatch) return null;
        // Link CDN của Google cho phép load ảnh nhanh
        return `https://lh3.googleusercontent.com/d/${idMatch[0]}`;
    } catch (e) { return null; }
}

async function renderGalleryManager() {
    const container = document.getElementById('admin-gallery-list');
    const btnSave = document.getElementById('btn-save-drive-img');
    
    // Load ảnh
    const snapshot = await getDocs(collection(db, `users/${currentAdminUID}/gallery`));
    container.innerHTML = '';
    
    snapshot.forEach(docShot => {
        const img = docShot.data();
        const div = document.createElement('div');
        // Style đã có trong CSS
        div.innerHTML = `
            <img src="${img.url}" style="width:100%; height:100px; object-fit:cover; border-radius:4px;">
            <button class="btn-del-img">X</button>
        `;
        
        // Xóa ảnh
        div.querySelector('.btn-del-img').onclick = async () => {
            if(confirm("Xóa ảnh này?")) {
                await deleteDoc(doc(db, `users/${currentAdminUID}/gallery`, docShot.id));
                renderGalleryManager();
            }
        };
        container.appendChild(div);
    });

    // Lưu ảnh mới
    const newBtn = btnSave.cloneNode(true);
    btnSave.parentNode.replaceChild(newBtn, btnSave);
    
    newBtn.addEventListener('click', async () => {
        const rawLink = document.getElementById('admin-gallery-link').value;
        const caption = document.getElementById('admin-gallery-caption').value;
        
        if(!rawLink) return alert("Chưa nhập link!");
        
        const directLink = convertDriveLink(rawLink);
        if(!directLink) return alert("Link Drive không hợp lệ! Hãy dùng link 'Chia sẻ công khai'.");
        
        newBtn.innerText = "Đang lưu...";
        newBtn.disabled = true;
        
        try {
            await addDoc(collection(db, `users/${currentAdminUID}/gallery`), {
                url: directLink,
                caption: caption || "Hoạt động",
                createdAt: new Date().toISOString()
            });
            
            alert("Đã thêm ảnh!");
            document.getElementById('admin-gallery-link').value = '';
            renderGalleryManager();
        } catch (e) {
            alert("Lỗi: " + e.message);
        } finally {
            newBtn.innerText = "Lưu Ảnh";
            newBtn.disabled = false;
        }
    });
}