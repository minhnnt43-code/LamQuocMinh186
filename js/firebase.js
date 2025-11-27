// --- FILE: js/firebase.js ---

// 1. IMPORT THƯ VIỆN TỪ CDN (GIỮ NGUYÊN ĐỂ CHẠY TRÊN TRÌNH DUYỆT)
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
    deleteDoc,
    updateDoc,
    query,
    orderBy,
    where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// 2. CẤU HÌNH FIREBASE (ĐÃ CẬP NHẬT SANG DỰ ÁN MỚI: lamquocminhidvn)
const firebaseConfig = {
  apiKey: "AIzaSyBcmFqZahUIqeCcqszwRB641nBQySydF6c",
  authDomain: "websitecualqm.firebaseapp.com",
  projectId: "websitecualqm",
  storageBucket: "websitecualqm.firebasestorage.app",
  messagingSenderId: "55037681358",
  appId: "1:55037681358:web:ab13413fdb63bf2f8dba9f",
  measurementId: "G-F34WEDPYW5"
};

// 3. KHỞI TẠO APP
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// --- CẤU HÌNH QUYỀN TRUY CẬP GOOGLE ---
export const provider = new GoogleAuthProvider();

// Quyền 1: Để xem Lịch (cho module Lịch biểu)
provider.addScope('https://www.googleapis.com/auth/calendar.events.readonly'); 

// Quyền 2: Để xem file và dung lượng Google Drive (cho module Drive)
// QUAN TRỌNG: Bạn phải bật API này trên Google Cloud của dự án "lamquocminhidvn"
provider.addScope('https://www.googleapis.com/auth/drive.readonly'); 

// ============================================================
// A. CÁC HÀM XÁC THỰC (AUTH)
// ============================================================

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        // Lấy Google Access Token để gọi API
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential.accessToken;
        
        // Lưu token vào localStorage để dùng cho drive.js và calendar
        if (token) localStorage.setItem('google_access_token', token);
        
        return result.user;
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        await signOut(auth);
        // Xóa token khi đăng xuất để bảo mật
        localStorage.removeItem('google_access_token');
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
// B. FIRESTORE: QUẢN LÝ DỮ LIỆU USER CHÍNH
// ============================================================

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

export const saveUserData = async (uid, data) => {
    try {
        const docRef = doc(db, "users", uid);
        await setDoc(docRef, { ...data, lastUpdated: new Date().toISOString() }, { merge: true });
    } catch (error) {
        console.error("Lỗi lưu dữ liệu:", error);
        throw error;
    }
};

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
// C. FIRESTORE: SUB-COLLECTIONS
// ============================================================

export const addSubCollectionDoc = async (uid, subColName, data) => {
    try {
        const colRef = collection(db, `users/${uid}/${subColName}`);
        if (data.id) {
            await setDoc(doc(colRef, data.id), data);
        } else {
            await addDoc(colRef, data);
        }
    } catch (error) {
        console.error(`Lỗi thêm vào ${subColName}:`, error);
        throw error;
    }
};

export const getSubCollectionDocs = async (uid, subColName, orderField = null) => {
    try {
        let q = collection(db, `users/${uid}/${subColName}`);
        if (orderField) {
            q = query(q, orderBy(orderField));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`Lỗi lấy ${subColName}:`, error);
        return [];
    }
};

export const updateSubCollectionDoc = async (uid, subColName, docId, data) => {
    try {
        const docRef = doc(db, `users/${uid}/${subColName}`, docId);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error(`Lỗi update ${subColName}:`, error);
        throw error;
    }
};

export const deleteSubCollectionDoc = async (uid, subColName, docId) => {
    try {
        await deleteDoc(doc(db, `users/${uid}/${subColName}`, docId));
    } catch (error) {
        console.error(`Lỗi xóa ${subColName}:`, error);
        throw error;
    }
};

export const getAppointmentRequests = async (uid, status = 'all') => {
    try {
        const colRef = collection(db, `users/${uid}/appointment_requests`);
        let q = query(colRef, orderBy('createdAt', 'desc'));
        
        if (status !== 'all') {
            q = query(colRef, where('status', '==', status), orderBy('createdAt', 'desc'));
        }
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Lỗi lấy danh sách hẹn:", error);
        return [];
    }
};

// ============================================================
// D. STORAGE (FILE)
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
// E. GLOBAL TEMPLATES
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