/**
 * Admin CV - Portfolio Management
 * JavaScript for Admin Page
 */

// ========================================
// CONSTANTS
// ========================================
const ADMIN_PASSWORD = 'admin123'; // Change this!
const STORAGE_KEYS = {
    PROFILE: 'cv_profile',
    ALBUMS: 'cv_albums',
    ACHIEVEMENTS: 'cv_achievements',
    AUTH: 'cv_admin_auth'
};

// Default Data
const DEFAULT_PROFILE = {
    fullName: 'Lâm Quốc Minh',
    school: 'Sinh viên Khoa Luật, ĐH Kinh tế - Luật',
    position: 'UV BCH - Phó Bộ phận TT-KT HSV Trường',
    bio: 'Đam mê truyền thông, yêu thích hoạt động xã hội.',
    avatarUrl: 'https://i.imgur.com/8Km9tLL.png'
};

// ========================================
// UTILITY FUNCTIONS
// ========================================
function getData(key, defaultValue) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function getTierEmoji(tier) {
    const emojis = { gold: '🥇', silver: '🥈', bronze: '🥉' };
    return emojis[tier] || '🏅';
}

// ========================================
// AUTH
// ========================================
function checkAuth() {
    const auth = sessionStorage.getItem(STORAGE_KEYS.AUTH);
    if (auth === 'true') {
        showAdmin();
    }
}

function login(password) {
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem(STORAGE_KEYS.AUTH, 'true');
        showAdmin();
        return true;
    }
    return false;
}

function logout() {
    sessionStorage.removeItem(STORAGE_KEYS.AUTH);
    location.reload();
}

function showAdmin() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminWrapper').classList.remove('hidden');
    loadProfileForm();
    loadAlbumsList();
    loadAchievementsList();
}

// ========================================
// TABS
// ========================================
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            panes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === targetId) pane.classList.add('active');
            });
        });
    });
}

// ========================================
// PROFILE
// ========================================
function loadProfileForm() {
    const profile = getData(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
    document.getElementById('inputName').value = profile.fullName || '';
    document.getElementById('inputSchool').value = profile.school || '';
    document.getElementById('inputPosition').value = profile.position || '';
    document.getElementById('inputBio').value = profile.bio || '';
    document.getElementById('inputAvatar').value = profile.avatarUrl || '';
    document.getElementById('avatarPreview').src = profile.avatarUrl || 'https://placehold.co/120';
}

function saveProfile(e) {
    e.preventDefault();
    const profile = {
        fullName: document.getElementById('inputName').value,
        school: document.getElementById('inputSchool').value,
        position: document.getElementById('inputPosition').value,
        bio: document.getElementById('inputBio').value,
        avatarUrl: document.getElementById('inputAvatar').value || 'https://placehold.co/150'
    };
    saveData(STORAGE_KEYS.PROFILE, profile);
    alert('Đã lưu thông tin! ✅');
}

function updateAvatar() {
    const url = document.getElementById('inputAvatar').value;
    if (url) {
        document.getElementById('avatarPreview').src = url;
        const profile = getData(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
        profile.avatarUrl = url;
        saveData(STORAGE_KEYS.PROFILE, profile);
        alert('Đã cập nhật avatar! ✅');
    }
}

// ========================================
// ALBUMS
// ========================================
let currentPhotos = [];

function loadAlbumsList() {
    const albums = getData(STORAGE_KEYS.ALBUMS, []);
    const list = document.getElementById('albumsList');
    const empty = document.getElementById('emptyAlbums');

    if (albums.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.innerHTML = albums.map(album => `
    <div class="item-card">
      <img class="item-image" src="${album.cover || 'https://placehold.co/80'}" alt="">
      <div class="item-info">
        <div class="item-title">${album.title}</div>
        <div class="item-meta">📍 ${album.location || 'Chưa có'} • ${album.photos?.length || 0} ảnh</div>
        <div class="item-meta">${formatDate(album.date)}</div>
        <div class="item-actions">
          <button class="item-btn item-btn-edit" onclick="editAlbum('${album.id}')">
            <i class="fas fa-edit"></i> Sửa
          </button>
          <button class="item-btn item-btn-delete" onclick="deleteAlbum('${album.id}')">
            <i class="fas fa-trash"></i> Xóa
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function openAlbumModal(album = null) {
    document.getElementById('albumModalTitle').textContent = album ? 'Sửa Album' : 'Thêm Album';
    document.getElementById('albumId').value = album?.id || '';
    document.getElementById('albumTitle').value = album?.title || '';
    document.getElementById('albumDate').value = album?.date || '';
    document.getElementById('albumLocation').value = album?.location || '';
    document.getElementById('albumDescription').value = album?.description || '';
    document.getElementById('albumCover').value = album?.cover || '';
    currentPhotos = album?.photos || [];
    renderPhotosPreview();
    document.getElementById('albumModal').classList.add('active');
}

function closeAlbumModal() {
    document.getElementById('albumModal').classList.remove('active');
    document.getElementById('albumForm').reset();
    currentPhotos = [];
}

function renderPhotosPreview() {
    const container = document.getElementById('photosListPreview');
    container.innerHTML = currentPhotos.map((url, i) => `
    <div class="photo-item">
      <img src="${url}" alt="">
      <span class="photo-remove" onclick="removePhoto(${i})">✕</span>
    </div>
  `).join('');
}

function addPhoto() {
    const url = document.getElementById('newPhotoUrl').value.trim();
    if (url) {
        currentPhotos.push(url);
        renderPhotosPreview();
        document.getElementById('newPhotoUrl').value = '';
    }
}

function removePhoto(index) {
    currentPhotos.splice(index, 1);
    renderPhotosPreview();
}

function saveAlbum(e) {
    e.preventDefault();
    const id = document.getElementById('albumId').value;
    const album = {
        id: id || generateId(),
        title: document.getElementById('albumTitle').value,
        date: document.getElementById('albumDate').value,
        location: document.getElementById('albumLocation').value,
        description: document.getElementById('albumDescription').value,
        cover: document.getElementById('albumCover').value || currentPhotos[0] || '',
        photos: currentPhotos
    };

    let albums = getData(STORAGE_KEYS.ALBUMS, []);
    if (id) {
        albums = albums.map(a => a.id === id ? album : a);
    } else {
        albums.push(album);
    }
    saveData(STORAGE_KEYS.ALBUMS, albums);
    closeAlbumModal();
    loadAlbumsList();
    alert('Đã lưu album! ✅');
}

function editAlbum(id) {
    const albums = getData(STORAGE_KEYS.ALBUMS, []);
    const album = albums.find(a => a.id === id);
    if (album) openAlbumModal(album);
}

function deleteAlbum(id) {
    if (confirm('Xác nhận xóa album này?')) {
        let albums = getData(STORAGE_KEYS.ALBUMS, []);
        albums = albums.filter(a => a.id !== id);
        saveData(STORAGE_KEYS.ALBUMS, albums);
        loadAlbumsList();
    }
}

// ========================================
// ACHIEVEMENTS
// ========================================
function loadAchievementsList() {
    const achievements = getData(STORAGE_KEYS.ACHIEVEMENTS, []);
    const list = document.getElementById('achievementsList');
    const empty = document.getElementById('emptyAchievements');

    if (achievements.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.innerHTML = achievements.map(ach => `
    <div class="item-card">
      <img class="item-image" src="${ach.imageUrl || 'https://placehold.co/80'}" alt="">
      <div class="item-info">
        <div class="item-title">${getTierEmoji(ach.tier)} ${ach.name}</div>
        <div class="item-meta">${ach.category || 'Chưa phân loại'}</div>
        <div class="item-meta">${formatDate(ach.date)}</div>
        <div class="item-actions">
          <button class="item-btn item-btn-edit" onclick="editAchievement('${ach.id}')">
            <i class="fas fa-edit"></i> Sửa
          </button>
          <button class="item-btn item-btn-delete" onclick="deleteAchievement('${ach.id}')">
            <i class="fas fa-trash"></i> Xóa
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function openAchievementModal(ach = null) {
    document.getElementById('achievementModalTitle').textContent = ach ? 'Sửa Thành tích' : 'Thêm Thành tích';
    document.getElementById('achievementId').value = ach?.id || '';
    document.getElementById('achievementName').value = ach?.name || '';
    document.getElementById('achievementCategory').value = ach?.category || '';
    document.getElementById('achievementDate').value = ach?.date || '';
    document.getElementById('achievementImage').value = ach?.imageUrl || '';
    selectTier(ach?.tier || 'gold');
    document.getElementById('achievementModal').classList.add('active');
}

function closeAchievementModal() {
    document.getElementById('achievementModal').classList.remove('active');
    document.getElementById('achievementForm').reset();
}

function selectTier(tier) {
    document.querySelectorAll('.tier-option').forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.tier === tier) opt.classList.add('active');
    });
    document.getElementById('achievementTier').value = tier;
}

function saveAchievement(e) {
    e.preventDefault();
    const id = document.getElementById('achievementId').value;
    const ach = {
        id: id || generateId(),
        name: document.getElementById('achievementName').value,
        category: document.getElementById('achievementCategory').value,
        date: document.getElementById('achievementDate').value,
        tier: document.getElementById('achievementTier').value,
        imageUrl: document.getElementById('achievementImage').value
    };

    let achievements = getData(STORAGE_KEYS.ACHIEVEMENTS, []);
    if (id) {
        achievements = achievements.map(a => a.id === id ? ach : a);
    } else {
        achievements.push(ach);
    }
    saveData(STORAGE_KEYS.ACHIEVEMENTS, achievements);
    closeAchievementModal();
    loadAchievementsList();
    alert('Đã lưu thành tích! ✅');
}

function editAchievement(id) {
    const achievements = getData(STORAGE_KEYS.ACHIEVEMENTS, []);
    const ach = achievements.find(a => a.id === id);
    if (ach) openAchievementModal(ach);
}

function deleteAchievement(id) {
    if (confirm('Xác nhận xóa thành tích này?')) {
        let achievements = getData(STORAGE_KEYS.ACHIEVEMENTS, []);
        achievements = achievements.filter(a => a.id !== id);
        saveData(STORAGE_KEYS.ACHIEVEMENTS, achievements);
        loadAchievementsList();
    }
}

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('loginPassword').value;
        if (!login(password)) {
            document.getElementById('loginError').style.display = 'block';
        }
    });

    // Profile form
    document.getElementById('profileForm').addEventListener('submit', saveProfile);

    // Album form
    document.getElementById('albumForm').addEventListener('submit', saveAlbum);

    // Achievement form
    document.getElementById('achievementForm').addEventListener('submit', saveAchievement);

    // Init tabs
    initTabs();

    // Check auth
    checkAuth();

    console.log('🔐 Admin CV loaded!');
});
