// --- FILE: js/firebase.js ---

// 1. Import các thư viện cần thiết từ CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    getDocs,
    addDoc,    // <--- MỚI: Để thêm mẫu mới tự động sinh ID
    deleteDoc  // <--- MỚI: Để xóa mẫu khỏi Database
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// 2. Cấu hình Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBcmFqZahUIqeCcqszwRB641nBQySydF6c",
  authDomain: "websitecualqm.firebaseapp.com",
  projectId: "websitecualqm",
  storageBucket: "websitecualqm.firebasestorage.app",
  messagingSenderId: "55037681358",
  appId: "1:55037681358:web:ab13413fdb63bf2f8dba9f",
  measurementId: "G-F34WEDPYW5"
};

// 3. Khởi tạo dịch vụ
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// Thêm quyền truy cập Lịch Google
provider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');

// ============================================================
// A. XỬ LÝ XÁC THỰC (AUTHENTICATION)
// ============================================================

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Lỗi đăng xuất:", error);
    }
};

export const subscribeToAuthChanges = (callback) => {
    onAuthStateChanged(auth, (user) => {
        callback(user);
    });
};

// ============================================================
// B. XỬ LÝ DỮ LIỆU (FIRESTORE DATABASE)
// ============================================================

// 1. Lấy dữ liệu của MỘT user
export const getUserData = async (uid) => {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return null;
        }
    } catch (error) {
        console.error("Lỗi tải dữ liệu cá nhân:", error);
        throw error;
    }
};

// 2. Lưu dữ liệu của user
export const saveUserData = async (uid, data) => {
    try {
        const docRef = doc(db, "users", uid);
        await setDoc(docRef, { ...data, lastUpdated: new Date().toISOString() }, { merge: true });
    } catch (error) {
        console.error("Lỗi lưu dữ liệu:", error);
        throw error;
    }
};

// 3. [ADMIN] Lấy danh sách TOÀN BỘ user
export const getAllUsers = async () => {
    try {
        const usersCollection = collection(db, "users");
        const snapshot = await getDocs(usersCollection);
        const usersList = [];
        
        snapshot.forEach((doc) => {
            usersList.push({ id: doc.id, ...doc.data() });
        });
        
        return usersList;
    } catch (error) {
        console.error("Lỗi lấy danh sách Admin (Kiểm tra Rules):", error);
        throw error;
    }
};

// ============================================================
// C. XỬ LÝ FILE (STORAGE)
// ============================================================

export const uploadFileToStorage = async (file, path) => {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return {
            name: file.name,
            type: file.type,
            size: file.size,
            url: downloadURL,
            fullPath: snapshot.ref.fullPath
        };
    } catch (error) {
        console.error("Lỗi upload file:", error);
        throw error;
    }
};

export const deleteFileFromStorage = async (path) => {
    try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
    } catch (error) {
        console.warn("File không tồn tại hoặc đã bị xóa:", error);
    }
};

// ============================================================
// D. TÍNH NĂNG ADMIN TEMPLATE (KHO MẪU)
// ============================================================

// 1. Lấy danh sách mẫu
export const getGlobalTemplates = async () => {
    try {
        const snapshot = await getDocs(collection(db, "global_templates"));
        const templates = [];
        snapshot.forEach(doc => templates.push({ id: doc.id, ...doc.data() }));
        return templates;
    } catch (error) {
        console.error("Lỗi lấy mẫu:", error);
        return [];
    }
};

// 2. Tạo mẫu mới
export const createGlobalTemplate = async (templateData) => {
    try {
        // Dùng addDoc để Firestore tự sinh ID
        await addDoc(collection(db, "global_templates"), { 
            ...templateData, 
            createdAt: new Date().toISOString() 
        });
    } catch (error) {
        console.error("Lỗi tạo mẫu:", error);
        throw error;
    }
};

// 3. Xóa mẫu
export const deleteGlobalTemplate = async (id) => {
    try {
        // Dùng deleteDoc (Firestore) chứ không phải deleteObject (Storage)
        await deleteDoc(doc(db, "global_templates", id));
    } catch (error) {
        console.error("Lỗi xóa mẫu:", error);
        throw error;
    }
};
