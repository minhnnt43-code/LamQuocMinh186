// ============================================================
// FILE: js/firebase-sync.js
// Tự động đồng bộ localStorage với Firebase Firestore
// ============================================================

import { db, auth } from './firebase.js';
import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Firebase Sync Service
 * - Tự động backup localStorage lên Firestore
 * - Tự động restore khi đăng nhập thiết bị mới
 * - Real-time sync giữa các thiết bị
 */
class FirebaseSyncService {
    constructor() {
        this.syncEnabled = true;
        this.lastSyncTime = null;
        this.syncQueue = [];
        this.isSyncing = false;
        this.unsubscribe = null;

        // Danh sách các keys cần đồng bộ
        this.syncKeys = [
            // AI & Productivity
            'productivity_data',
            'ai_chat_memory',
            'ai_user_profile',
            'ai_token_stats',
            'ai_core_memory',

            // AI API Keys & Config
            'ai_api_key_openai',
            'ai_api_key_gemini',
            'ai_api_key_claude',
            'ai_api_key_groq',
            'ai_api_key_deepseek',
            'ai_api_key_openrouter',
            'ai_provider',
            'ai_enable_fallback',
            'ai_power_hub_keys',    // AI Power Hub keys (multi-provider)
            'ai_power_hub_usage',   // AI Power Hub usage tracking

            // Automation
            'automation_rules',
            'recurring_tasks',
            'workflows',
            'auto_reminders',

            // Communication
            'communication_history',
            'follow_up_reminders',

            // LifeOS
            'lifeos_milestones',
            'lifeos_time_capsules',
            'lifeos_ideas',
            'lifeos_feedback_requests',
            'lifeos_innovation_score',
            'lifeos_creative_peaks',

            // UI Preferences
            'app-theme',
            'dark-mode',
            'dark-mode-auto',
            'sidebar-collapsed',
            'custom-css',
            'calendar-view',
            'taskViewPreference',

            // Lá Số (LASO)
            'laso_profiles',
            'laso_active_profile'
        ];

        this.init();
    }

    /**
     * Khởi tạo sync service
     */
    init() {
        // Lắng nghe auth state
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('🔄 Firebase Sync: User logged in, starting sync...');
                this.startSync(user.uid);
            } else {
                console.log('⏸️ Firebase Sync: User logged out, stopping sync...');
                this.stopSync();
            }
        });

        // Override localStorage.setItem để auto-sync
        this.overrideLocalStorage();
    }

    /**
     * Override localStorage để tự động sync khi thay đổi
     */
    overrideLocalStorage() {
        const originalSetItem = localStorage.setItem.bind(localStorage);
        const self = this;

        localStorage.setItem = function (key, value) {
            originalSetItem(key, value);

            // Nếu key cần sync, thêm vào queue
            if (self.syncKeys.includes(key) && self.syncEnabled) {
                self.queueSync(key, value);
            }
        };
    }

    /**
     * Thêm vào hàng đợi sync
     */
    queueSync(key, value) {
        // Debounce: chờ 2 giây trước khi sync
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }

        this.syncQueue.push({ key, value, timestamp: Date.now() });

        this.syncTimeout = setTimeout(() => {
            this.processSyncQueue();
        }, 2000);
    }

    /**
     * Xử lý hàng đợi sync
     */
    async processSyncQueue() {
        if (this.isSyncing || !auth.currentUser) return;

        this.isSyncing = true;
        const userId = auth.currentUser.uid;

        try {
            // Gộp tất cả changes thành 1 document
            const changes = {};
            this.syncQueue.forEach(item => {
                changes[item.key] = item.value;
            });

            if (Object.keys(changes).length > 0) {
                const docRef = doc(db, 'users', userId, 'sync_data', 'localStorage');
                const existing = await getDoc(docRef);
                const existingData = existing.exists() ? existing.data() : {};

                await setDoc(docRef, {
                    ...existingData,
                    ...changes,
                    lastUpdated: new Date().toISOString(),
                    device: navigator.userAgent.substring(0, 100)
                }, { merge: true });

                console.log(`✅ Synced ${Object.keys(changes).length} items to Firebase`);
                this.showSyncNotification('success', `Đã đồng bộ ${Object.keys(changes).length} mục`);
            }

            this.syncQueue = [];
            this.lastSyncTime = Date.now();
        } catch (error) {
            console.error('❌ Sync error:', error);
            this.showSyncNotification('error', 'Lỗi đồng bộ dữ liệu');
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Bắt đầu đồng bộ cho user
     */
    async startSync(userId) {
        // 0. Khởi tạo documents nếu chưa có
        await this.initializeUserDocuments(userId);

        // 1. Restore data từ Firebase
        await this.restoreFromFirebase(userId);

        // 2. Lắng nghe real-time updates
        this.listenForUpdates(userId);

        // 3. Backup initial data
        await this.backupToFirebase(userId);
    }

    /**
     * [MỚI] Khởi tạo các documents cần thiết cho user
     */
    async initializeUserDocuments(userId) {
        try {
            // 1. Document chứa localStorage sync
            const syncDocRef = doc(db, 'users', userId, 'sync_data', 'localStorage');
            const syncDoc = await getDoc(syncDocRef);

            if (!syncDoc.exists()) {
                await setDoc(syncDocRef, {
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    device: navigator.userAgent.substring(0, 100)
                });
                console.log('📁 Created sync_data/localStorage document');
            }

            // 2. Document chứa AI config
            const aiConfigRef = doc(db, 'users', userId, 'sync_data', 'ai_config');
            const aiConfigDoc = await getDoc(aiConfigRef);

            if (!aiConfigDoc.exists()) {
                await setDoc(aiConfigRef, {
                    createdAt: new Date().toISOString(),
                    provider: 'gemini',
                    enableFallback: true,
                    apiKeys: {
                        openai: '',
                        gemini: '',
                        claude: '',
                        groq: '',
                        deepseek: ''
                    }
                });
                console.log('📁 Created sync_data/ai_config document');
            }

            // 3. Document chứa app settings
            const settingsRef = doc(db, 'users', userId, 'sync_data', 'settings');
            const settingsDoc = await getDoc(settingsRef);

            if (!settingsDoc.exists()) {
                await setDoc(settingsRef, {
                    createdAt: new Date().toISOString(),
                    theme: 'light',
                    darkModeAuto: true,
                    sidebarCollapsed: false,
                    language: 'vi'
                });
                console.log('📁 Created sync_data/settings document');
            }

            // 4. Document chứa analytics
            const analyticsRef = doc(db, 'users', userId, 'sync_data', 'analytics');
            const analyticsDoc = await getDoc(analyticsRef);

            if (!analyticsDoc.exists()) {
                await setDoc(analyticsRef, {
                    createdAt: new Date().toISOString(),
                    totalTasksCompleted: 0,
                    totalFocusHours: 0,
                    currentStreak: 0,
                    longestStreak: 0
                });
                console.log('📁 Created sync_data/analytics document');
            }

            console.log('✅ All user documents initialized');

        } catch (error) {
            console.error('❌ Error initializing documents:', error);
        }
    }

    /**
     * Dừng đồng bộ
     */
    stopSync() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    /**
     * Khôi phục data từ Firebase
     */
    async restoreFromFirebase(userId) {
        try {
            const docRef = doc(db, 'users', userId, 'sync_data', 'localStorage');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                let restoredCount = 0;

                this.syncKeys.forEach(key => {
                    if (data[key] !== undefined) {
                        // Chỉ restore nếu localStorage không có hoặc Firebase mới hơn
                        const localValue = localStorage.getItem(key);
                        if (!localValue) {
                            localStorage.setItem(key, data[key]);
                            restoredCount++;
                        }
                    }
                });

                if (restoredCount > 0) {
                    console.log(`📥 Restored ${restoredCount} items from Firebase`);
                    this.showSyncNotification('info', `Đã khôi phục ${restoredCount} mục từ đám mây`);
                }
            }
        } catch (error) {
            console.error('❌ Restore error:', error);
        }
    }

    /**
     * Backup tất cả data lên Firebase
     */
    async backupToFirebase(userId) {
        try {
            const dataToBackup = {};

            this.syncKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) {
                    dataToBackup[key] = value;
                }
            });

            if (Object.keys(dataToBackup).length > 0) {
                const docRef = doc(db, 'users', userId, 'sync_data', 'localStorage');
                await setDoc(docRef, {
                    ...dataToBackup,
                    lastUpdated: new Date().toISOString(),
                    device: navigator.userAgent.substring(0, 100)
                }, { merge: true });

                console.log(`☁️ Backed up ${Object.keys(dataToBackup).length} items to Firebase`);
            }
        } catch (error) {
            console.error('❌ Backup error:', error);
        }
    }

    /**
     * Lắng nghe real-time updates từ Firebase
     */
    listenForUpdates(userId) {
        const docRef = doc(db, 'users', userId, 'sync_data', 'localStorage');

        this.unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const remoteTime = data.lastUpdated ? new Date(data.lastUpdated).getTime() : 0;

                // Chỉ sync nếu remote mới hơn
                if (remoteTime > (this.lastSyncTime || 0)) {
                    this.syncKeys.forEach(key => {
                        if (data[key] !== undefined) {
                            const localValue = localStorage.getItem(key);
                            if (localValue !== data[key]) {
                                // Tạm disable sync để tránh loop
                                this.syncEnabled = false;
                                localStorage.setItem(key, data[key]);
                                this.syncEnabled = true;
                            }
                        }
                    });
                    console.log('🔄 Real-time sync from another device');
                }
            }
        }, (error) => {
            console.error('❌ Real-time sync error:', error);
        });
    }

    /**
     * Hiển thị thông báo sync
     */
    showSyncNotification(type, message) {
        // Tạo toast notification
        const toast = document.createElement('div');
        toast.className = `sync-toast sync-toast-${type}`;
        toast.innerHTML = `
            <span class="sync-toast-icon">${type === 'success' ? '☁️' : type === 'error' ? '❌' : '📥'}</span>
            <span class="sync-toast-message">${message}</span>
        `;

        // Add styles nếu chưa có
        if (!document.getElementById('sync-toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'sync-toast-styles';
            styles.textContent = `
                .sync-toast {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    border-radius: 10px;
                    background: white;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.15);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 0.9rem;
                    z-index: 10001;
                    animation: slideInRight 0.3s ease;
                }
                .sync-toast-success { border-left: 4px solid #10b981; }
                .sync-toast-error { border-left: 4px solid #ef4444; }
                .sync-toast-info { border-left: 4px solid #3b82f6; }
                .sync-toast-icon { font-size: 1.2rem; }
                .sync-toast-message { color: #374151; }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(toast);

        // Tự động xóa sau 3 giây
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Force sync tất cả data
     */
    async forceSync() {
        if (!auth.currentUser) {
            alert('Vui lòng đăng nhập để đồng bộ dữ liệu!');
            return;
        }

        this.showSyncNotification('info', 'Đang đồng bộ...');
        await this.backupToFirebase(auth.currentUser.uid);
        this.showSyncNotification('success', 'Đã đồng bộ tất cả dữ liệu!');
    }

    /**
     * [MỚI] Tạo backup snapshot với timestamp
     * Lưu vào: users/{userId}/backups/{timestamp}
     */
    async createBackupSnapshot(description = '') {
        if (!auth.currentUser) {
            alert('Vui lòng đăng nhập để tạo backup!');
            return;
        }

        const userId = auth.currentUser.uid;
        const timestamp = new Date().toISOString();
        const backupId = timestamp.replace(/[:.]/g, '-');

        try {
            this.showSyncNotification('info', 'Đang tạo backup...');

            // Thu thập tất cả data
            const dataToBackup = {};
            this.syncKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) {
                    dataToBackup[key] = value;
                }
            });

            // Lưu backup
            const backupRef = doc(db, 'users', userId, 'backups', backupId);
            await setDoc(backupRef, {
                data: dataToBackup,
                createdAt: timestamp,
                description: description || `Backup ${new Date().toLocaleString('vi-VN')}`,
                device: navigator.userAgent.substring(0, 100),
                keysCount: Object.keys(dataToBackup).length
            });

            console.log(`📦 Created backup: ${backupId}`);
            this.showSyncNotification('success', `Đã tạo backup: ${description || backupId}`);

            return backupId;
        } catch (error) {
            console.error('❌ Backup error:', error);
            this.showSyncNotification('error', 'Lỗi tạo backup!');
            throw error;
        }
    }

    /**
     * [MỚI] Lấy danh sách backup
     */
    async getBackupList() {
        if (!auth.currentUser) return [];

        const userId = auth.currentUser.uid;

        try {
            const { collection, getDocs, query, orderBy, limit } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const backupsRef = collection(db, 'users', userId, 'backups');
            const q = query(backupsRef, orderBy('createdAt', 'desc'), limit(20));
            const snapshot = await getDocs(q);

            const backups = [];
            snapshot.forEach(doc => {
                backups.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return backups;
        } catch (error) {
            console.error('❌ Error getting backups:', error);
            return [];
        }
    }

    /**
     * [MỚI] Khôi phục từ một backup cụ thể
     */
    async restoreFromBackup(backupId) {
        if (!auth.currentUser) {
            alert('Vui lòng đăng nhập!');
            return;
        }

        const userId = auth.currentUser.uid;

        try {
            this.showSyncNotification('info', 'Đang khôi phục...');

            const backupRef = doc(db, 'users', userId, 'backups', backupId);
            const backupSnap = await getDoc(backupRef);

            if (!backupSnap.exists()) {
                this.showSyncNotification('error', 'Không tìm thấy backup!');
                return;
            }

            const backupData = backupSnap.data();

            // Tạo backup hiện tại trước khi restore
            await this.createBackupSnapshot('Auto-backup trước khi restore');

            // Restore data
            this.syncEnabled = false;
            Object.keys(backupData.data).forEach(key => {
                localStorage.setItem(key, backupData.data[key]);
            });
            this.syncEnabled = true;

            console.log(`✅ Restored from backup: ${backupId}`);
            this.showSyncNotification('success', 'Đã khôi phục thành công! Đang reload...');

            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            console.error('❌ Restore error:', error);
            this.showSyncNotification('error', 'Lỗi khôi phục!');
        }
    }

    /**
     * [MỚI] Xóa một backup
     */
    async deleteBackup(backupId) {
        if (!auth.currentUser) return;

        const userId = auth.currentUser.uid;

        try {
            const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const backupRef = doc(db, 'users', userId, 'backups', backupId);
            await deleteDoc(backupRef);

            this.showSyncNotification('success', 'Đã xóa backup!');
        } catch (error) {
            console.error('❌ Delete error:', error);
            this.showSyncNotification('error', 'Lỗi xóa backup!');
        }
    }

    /**
     * [MỚI] Hiển thị UI quản lý backup
     */
    async showBackupManager() {
        const backups = await this.getBackupList();

        const modal = document.createElement('div');
        modal.id = 'backup-manager-modal';
        modal.innerHTML = `
            <div class="bm-overlay" onclick="document.getElementById('backup-manager-modal').remove()"></div>
            <div class="bm-content">
                <div class="bm-header">
                    <h3>📦 Quản lý Backup</h3>
                    <button class="bm-close" onclick="document.getElementById('backup-manager-modal').remove()">×</button>
                </div>
                <div class="bm-body">
                    <div class="bm-actions">
                        <button class="bm-btn-primary" onclick="window.firebaseSync.createBackupSnapshot(prompt('Mô tả backup (tuỳ chọn):'))">
                            ➕ Tạo Backup Mới
                        </button>
                    </div>
                    <div class="bm-list">
                        ${backups.length === 0 ? '<p style="text-align:center;color:#64748b;">Chưa có backup nào</p>' : ''}
                        ${backups.map(b => `
                            <div class="bm-item">
                                <div class="bm-item-info">
                                    <div class="bm-item-title">${b.description || b.id}</div>
                                    <div class="bm-item-meta">
                                        📅 ${new Date(b.createdAt).toLocaleString('vi-VN')} • 
                                        📦 ${b.keysCount || '?'} mục
                                    </div>
                                </div>
                                <div class="bm-item-actions">
                                    <button onclick="window.firebaseSync.restoreFromBackup('${b.id}')" title="Khôi phục">♻️</button>
                                    <button onclick="if(confirm('Xóa backup này?')) window.firebaseSync.deleteBackup('${b.id}')" title="Xóa">🗑️</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <style>
                #backup-manager-modal { position:fixed; top:0; left:0; right:0; bottom:0; z-index:10000; display:flex; align-items:center; justify-content:center; }
                .bm-overlay { position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); }
                .bm-content { position:relative; background:white; border-radius:16px; width:90%; max-width:500px; max-height:80vh; overflow:hidden; }
                .bm-header { background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; padding:20px; display:flex; justify-content:space-between; align-items:center; }
                .bm-header h3 { margin:0; }
                .bm-close { background:rgba(255,255,255,0.2); border:none; color:white; width:32px; height:32px; border-radius:50%; font-size:1.2rem; cursor:pointer; }
                .bm-body { padding:20px; max-height:60vh; overflow-y:auto; }
                .bm-actions { margin-bottom:20px; }
                .bm-btn-primary { background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; border:none; padding:12px 24px; border-radius:10px; font-weight:600; cursor:pointer; width:100%; }
                .bm-list { display:flex; flex-direction:column; gap:10px; }
                .bm-item { background:#f8fafc; border-radius:10px; padding:15px; display:flex; justify-content:space-between; align-items:center; }
                .bm-item-title { font-weight:600; color:#1f2937; }
                .bm-item-meta { font-size:0.8rem; color:#64748b; margin-top:4px; }
                .bm-item-actions { display:flex; gap:8px; }
                .bm-item-actions button { background:#e2e8f0; border:none; width:32px; height:32px; border-radius:8px; cursor:pointer; }
                .bm-item-actions button:hover { background:#cbd5e1; }
            </style>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Export tất cả data ra JSON (backup thủ công)
     */
    exportData() {
        const data = {};
        this.syncKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                data[key] = value;
            }
        });

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Import data từ JSON
     */
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                Object.keys(data).forEach(key => {
                    localStorage.setItem(key, data[key]);
                });
                this.showSyncNotification('success', 'Đã nhập dữ liệu thành công!');
                setTimeout(() => location.reload(), 1000);
            } catch (error) {
                this.showSyncNotification('error', 'Lỗi đọc file backup!');
            }
        };
        reader.readAsText(file);
    }
}

// Khởi tạo service
const firebaseSync = new FirebaseSyncService();

// Export cho sử dụng global
window.firebaseSync = firebaseSync;
export default firebaseSync;
