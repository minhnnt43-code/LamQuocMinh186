// --- FILE: js/firebase.js ---

// 1. IMPORT THƯ VIỆN TỪ CDN
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
    addDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// 2. CẤU HÌNH FIREBASE (CONFIG)
const firebaseConfig = {
  apiKey: "AIzaSyBcmFqZahUIqeCcqszwRB641nBQySydF6c",
  authDomain: "websitecualqm.firebaseapp.com",
  projectId: "websitecualqm",
  storageBucket: "websitecualqm.firebasestorage.app",
  messagingSenderId: "55037681358",
  appId: "1:55037681358:web:ab13413fdb63bf2f8dba9f",
  measurementId: "G-F34WEDPYW5"
};

// 3. KHỞI TẠO APP & EXPORT CÔNG CỤ
// (Đây là phần quan trọng nhất để các file khác kết nối được)
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');

// ============================================================
// A. CÁC HÀM XÁC THỰC (AUTH)
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
// B. CÁC HÀM DỮ LIỆU NGƯỜI DÙNG (FIRESTORE)
// ============================================================

// Lấy dữ liệu full của 1 user
export const getUserData = async (uid) => {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        throw error;
    }
};

// Lưu/Cập nhật dữ liệu user
export const saveUserData = async (uid, data) => {
    try {
        const docRef = doc(db, "users", uid);
        // merge: true giúp giữ lại các trường cũ không bị thay đổi
        await setDoc(docRef, { ...data, lastUpdated: new Date().toISOString() }, { merge: true });
    } catch (error) {
        console.error("Lỗi lưu dữ liệu:", error);
        throw error;
    }
};

// Lấy danh sách tất cả User (Dùng cho Admin Dashboard)
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
        console.error("Lỗi lấy danh sách User:", error);
        throw error;
    }
};

// ============================================================
// C. CÁC HÀM XỬ LÝ FILE (STORAGE)
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
// D. CÁC HÀM KHO MẪU (TEMPLATES)
// ============================================================

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

export const createGlobalTemplate = async (templateData) => {
    try {
        await addDoc(collection(db, "global_templates"), { 
            ...templateData, 
            createdAt: new Date().toISOString() 
        });
    } catch (error) {
        console.error("Lỗi tạo mẫu:", error);
        throw error;
    }
};

export const deleteGlobalTemplate = async (id) => {
    try {
        await deleteDoc(doc(db, "global_templates", id));
    } catch (error) {
        console.error("Lỗi xóa mẫu:", error);
        throw error;
    }
};
