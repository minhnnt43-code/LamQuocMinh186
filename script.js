// 1. KẾT NỐI FIREBASE (Dùng đúng mã dự án websitecualqm của bạn)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBcmFqZahUIqeCcqszwRB641nBQySydF6c",
  authDomain: "websitecualqm.firebaseapp.com",
  projectId: "websitecualqm",
  storageBucket: "websitecualqm.firebasestorage.app",
  messagingSenderId: "55037681358",
  appId: "1:55037681358:web:ab13413fdb63bf2f8dba9f",
  measurementId: "G-F34WEDPYW5"
};

// Khởi tạo
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Biến toàn cục
let currentUser = null;
let todos = []; 
let currentFilter = 'all';

console.log("✅ Đã kết nối Firebase! Sẵn sàng test.");

// --- 2. XỬ LÝ ĐĂNG NHẬP / ĐĂNG XUẤT ---

// Hàm đăng nhập
window.handleLogin = async function() {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        alert("Lỗi đăng nhập: " + error.message);
    }
};

// Hàm đăng xuất
window.handleLogout = async function() {
    if (confirm("Bạn muốn đăng xuất?")) {
        await signOut(auth);
        location.reload();
    }
};

// Lắng nghe trạng thái (Chạy ngay khi web tải xong)
onAuthStateChanged(auth, async (user) => {
    const loginDiv = document.getElementById('login-container');
    const appDiv = document.getElementById('app-container');
    const loadingDiv = document.getElementById('loading');

    if (user) {
        // Đã đăng nhập
        currentUser = user;
        console.log("User:", user.displayName);
        
        // Hiển thị info user
        document.getElementById('user-name').textContent = user.displayName;
        document.getElementById('user-avatar').src = user.photoURL;

        // Chuyển màn hình
        loginDiv.style.display = 'none';
        loadingDiv.style.display = 'flex';

        // Tải dữ liệu Todo từ Cloud về
        await loadTodosFromCloud();

        loadingDiv.style.display = 'none';
        appDiv.style.display = 'flex';
    } else {
        // Chưa đăng nhập
        currentUser = null;
        loginDiv.style.display = 'flex';
        appDiv.style.display = 'none';
    }
});

// --- 3. XỬ LÝ DỮ LIỆU (FIRESTORE) ---

// Tải dữ liệu về
async function loadTodosFromCloud() {
    if (!currentUser) return;
    try {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Chỉ lấy mảng todos, nếu không có thì để rỗng
            todos = data.todos || [];
            console.log("Đã tải dữ liệu:", todos);
        } else {
            console.log("Tài khoản mới, chưa có dữ liệu.");
            todos = [];
        }
        renderApp();
    } catch (error) {
        console.error("Lỗi tải:", error);
        alert("Không tải được dữ liệu!");
    }
}

// Lưu dữ liệu lên
async function saveTodosToCloud() {
    if (!currentUser) return;
    try {
        // Lưu đè mảng todos lên Firestore
        await setDoc(doc(db, "users", currentUser.uid), { 
            todos: todos,
            lastUpdated: new Date().toISOString()
        }, { merge: true }); // merge: true để không làm mất các dữ liệu khác (nếu sau này có)
        console.log("Đã lưu lên Cloud thành công!");
    } catch (error) {
        console.error("Lỗi lưu:", error);
    }
}

// --- 4. LOGIC CHỨC NĂNG (TO-DO LIST) ---

// Vẽ giao diện
function renderApp() {
    const container = document.getElementById('todo-list-container');
    container.innerHTML = '';

    // Lọc danh sách
    let listToShow = todos;
    if (currentFilter === 'incomplete') listToShow = todos.filter(t => !t.completed);
    if (currentFilter === 'completed') listToShow = todos.filter(t => t.completed);

    if (listToShow.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:gray;">Trống trơn!</p>';
        return;
    }

    // Tạo HTML cho từng item
    listToShow.forEach(t => {
        const div = document.createElement('div');
        div.className = `todo-item ${t.completed ? 'completed' : ''}`;
        div.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTodo('${t.id}')">
            <label class="todo-label" style="flex-grow:1; margin-left:10px; text-decoration: ${t.completed ? 'line-through' : 'none'}">${escapeHTML(t.text)}</label>
            <button class="delete-todo-btn" onclick="deleteTodo('${t.id}')" style="background:none; border:none; color:red; font-size:1.2rem; cursor:pointer;">×</button>
        `;
        container.appendChild(div);
    });
}

// Thêm việc mới
window.addTodo = async function() {
    const input = document.getElementById('todo-input');
    const text = input.value.trim();
    if (!text) return;

    const newTodo = {
        id: Date.now().toString(), // Dùng timestamp làm ID cho đơn giản
        text: text,
        completed: false
    };

    todos.push(newTodo);
    renderApp(); // Vẽ lại ngay cho mượt
    input.value = '';
    
    await saveTodosToCloud(); // Lưu lên mây
};

// Đổi trạng thái (Xong / Chưa xong)
window.toggleTodo = async function(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        renderApp();
        await saveTodosToCloud();
    }
};

// Xóa việc
window.deleteTodo = async function(id) {
    if (confirm("Xóa việc này nha?")) {
        todos = todos.filter(t => t.id !== id);
        renderApp();
        await saveTodosToCloud();
    }
};

// Bộ lọc
window.filterTodo = function(type) {
    currentFilter = type;
    // Update nút active
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderApp();
};

// Hỗ trợ Enter để thêm
document.getElementById('todo-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') window.addTodo();
});

// Hàm tiện ích chống lỗi XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag]));
}
