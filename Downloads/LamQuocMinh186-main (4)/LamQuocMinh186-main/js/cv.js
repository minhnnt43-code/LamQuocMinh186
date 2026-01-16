/**
 * CV Portfolio - Lâm Quốc Minh
 * JavaScript for Portfolio Page
 */

// ========================================
// DATA STORAGE
// ========================================
const STORAGE_KEYS = {
  PROFILE: 'cv_profile',
  ALBUMS: 'cv_albums',
  ACHIEVEMENTS: 'cv_achievements',
  GUESTBOOK: 'cv_guestbook'
};

// Default Data
const DEFAULT_PROFILE = {
  fullName: 'Lâm Quốc Minh',
  school: 'Sinh viên Khoa Luật, ĐH Kinh tế - Luật',
  position: 'UV BCH Đoàn trường • Trưởng ban Truyền thông',
  bio: 'Đam mê truyền thông, yêu thích hoạt động xã hội. Luôn nỗ lực không ngừng để phát triển bản thân và đóng góp cho cộng đồng.',
  avatarUrl: 'https://i.imgur.com/8Km9tLL.png'
};

const DEFAULT_ALBUMS = [
  {
    id: 'album_001',
    title: 'Chuyến đi Đà Lạt 2024',
    description: 'Kỷ niệm đẹp cùng các bạn tại thành phố ngàn hoa',
    date: '2024-01-15',
    location: 'Đà Lạt',
    cover: 'https://images.unsplash.com/photo-1586611292717-f828b167408c?w=800',
    photos: [
      'https://images.unsplash.com/photo-1586611292717-f828b167408c?w=1200',
      'https://images.unsplash.com/photo-1600320339788-3d5f4c35cc80?w=1200',
      'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200'
    ]
  },
  {
    id: 'album_002',
    title: 'Lễ tốt nghiệp THPT',
    description: 'Những khoảnh khắc đáng nhớ của ngày tốt nghiệp',
    date: '2023-06-20',
    location: 'TP. Hồ Chí Minh',
    cover: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
    photos: [
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200',
      'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=1200'
    ]
  },
  {
    id: 'album_003',
    title: 'Hoạt động Đoàn - Hội',
    description: 'Những hoạt động ý nghĩa cùng Đoàn trường',
    date: '2024-03-10',
    location: 'UEL Campus',
    cover: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
    photos: [
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200',
      'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1200',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200',
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200'
    ]
  }
];

const DEFAULT_ACHIEVEMENTS = [
  {
    id: 'ach_001',
    name: 'Giải Nhất Cuộc thi Hùng biện Tiếng Việt',
    category: 'Văn hóa',
    date: '2024-01-15',
    tier: 'gold',
    imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800'
  },
  {
    id: 'ach_002',
    name: 'Giải Nhì Olympic Luật học',
    category: 'Học thuật',
    date: '2023-12-10',
    tier: 'silver',
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800'
  },
  {
    id: 'ach_003',
    name: 'Sinh viên 5 tốt cấp Thành phố',
    category: 'Danh hiệu',
    date: '2024-02-20',
    tier: 'gold',
    imageUrl: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=800'
  },
  {
    id: 'ach_004',
    name: 'Giải Ba Cuộc thi Thiết kế Poster',
    category: 'Truyền thông',
    date: '2023-11-05',
    tier: 'bronze',
    imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800'
  }
];

const DEFAULT_GUESTBOOK = [
  {
    id: 'msg_001',
    name: 'Nguyễn Văn A',
    email: 'a@email.com',
    message: 'Portfolio rất đẹp và chuyên nghiệp! Chúc bạn thành công!',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'msg_002',
    name: 'Trần Thị B',
    email: '',
    message: 'Ấn tượng với những thành tích của bạn. Tiếp tục cố gắng nhé!',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  }
];

// ========================================
// UTILITY FUNCTIONS
// ========================================
function getData(key, defaultValue) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error('Error reading data:', e);
    return defaultValue;
  }
}

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving data:', e);
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`;
  return `${Math.floor(diffDays / 365)} năm trước`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getTierEmoji(tier) {
  switch(tier) {
    case 'gold': return '🥇';
    case 'silver': return '🥈';
    case 'bronze': return '🥉';
    default: return '🏅';
  }
}

// ========================================
// PROFILE
// ========================================
function loadProfile() {
  const profile = getData(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
  
  document.getElementById('profileAvatar').src = profile.avatarUrl;
  document.getElementById('profileName').textContent = profile.fullName;
  document.getElementById('profileSchool').innerHTML = `
    <i class="fas fa-graduation-cap"></i>
    <span>${profile.school}</span>
  `;
  document.getElementById('profilePosition').innerHTML = `
    <i class="fas fa-briefcase"></i>
    <span>${profile.position}</span>
  `;
  document.getElementById('profileBio').textContent = `"${profile.bio}"`;
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
      
      // Update tabs
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update panes
      panes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === targetId) {
          pane.classList.add('active');
        }
      });
    });
  });
}

// ========================================
// ALBUMS
// ========================================
let currentAlbum = null;
let currentPhotoIndex = 0;

function loadAlbums() {
  const albums = getData(STORAGE_KEYS.ALBUMS, DEFAULT_ALBUMS);
  const grid = document.getElementById('albumsGrid');
  const noAlbums = document.getElementById('noAlbums');
  
  if (albums.length === 0) {
    grid.classList.add('hidden');
    noAlbums.classList.remove('hidden');
    return;
  }
  
  grid.classList.remove('hidden');
  noAlbums.classList.add('hidden');
  
  grid.innerHTML = albums.map(album => `
    <div class="album-card" onclick="openAlbum('${album.id}')">
      <div class="album-cover-wrapper">
        <img class="album-cover" src="${album.cover}" alt="${album.title}" loading="lazy">
        <div class="album-overlay">
          <span class="album-photo-count">
            <i class="fas fa-images"></i>
            ${album.photos.length} ảnh
          </span>
        </div>
      </div>
      <div class="album-info">
        <h3 class="album-title">${album.title}</h3>
        <p class="album-location">
          <i class="fas fa-map-marker-alt"></i>
          ${album.location}
        </p>
        <p class="album-date">${formatDate(album.date)}</p>
      </div>
    </div>
  `).join('');
}

function openAlbum(albumId) {
  const albums = getData(STORAGE_KEYS.ALBUMS, DEFAULT_ALBUMS);
  currentAlbum = albums.find(a => a.id === albumId);
  
  if (currentAlbum && currentAlbum.photos.length > 0) {
    currentPhotoIndex = 0;
    showLightbox();
  }
}

// ========================================
// LIGHTBOX
// ========================================
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  
  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', prevPhoto);
  nextBtn.addEventListener('click', nextPhoto);
  
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    
    switch(e.key) {
      case 'Escape':
        closeLightbox();
        break;
      case 'ArrowLeft':
        prevPhoto();
        break;
      case 'ArrowRight':
        nextPhoto();
        break;
    }
  });
}

function showLightbox() {
  if (!currentAlbum) return;
  
  const lightbox = document.getElementById('lightbox');
  updateLightboxImage();
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
  currentAlbum = null;
}

function updateLightboxImage() {
  if (!currentAlbum) return;
  
  const image = document.getElementById('lightboxImage');
  const caption = document.getElementById('lightboxCaption');
  const counter = document.getElementById('lightboxCounter');
  
  image.src = currentAlbum.photos[currentPhotoIndex];
  caption.textContent = currentAlbum.title;
  counter.textContent = `${currentPhotoIndex + 1} / ${currentAlbum.photos.length}`;
}

function prevPhoto() {
  if (!currentAlbum) return;
  currentPhotoIndex = (currentPhotoIndex - 1 + currentAlbum.photos.length) % currentAlbum.photos.length;
  updateLightboxImage();
}

function nextPhoto() {
  if (!currentAlbum) return;
  currentPhotoIndex = (currentPhotoIndex + 1) % currentAlbum.photos.length;
  updateLightboxImage();
}

// ========================================
// ACHIEVEMENTS
// ========================================
function loadAchievements(filter = 'all') {
  let achievements = getData(STORAGE_KEYS.ACHIEVEMENTS, DEFAULT_ACHIEVEMENTS);
  const grid = document.getElementById('achievementsGrid');
  const noAchievements = document.getElementById('noAchievements');
  
  // Apply filter
  if (filter !== 'all') {
    achievements = achievements.filter(a => a.tier === filter);
  }
  
  if (achievements.length === 0) {
    grid.classList.add('hidden');
    noAchievements.classList.remove('hidden');
    return;
  }
  
  grid.classList.remove('hidden');
  noAchievements.classList.add('hidden');
  
  grid.innerHTML = achievements.map(ach => `
    <div class="achievement-card" data-tier="${ach.tier}">
      <span class="tier-badge">${getTierEmoji(ach.tier)}</span>
      <img class="achievement-image" src="${ach.imageUrl}" alt="${ach.name}" loading="lazy">
      <div class="achievement-info">
        <h3 class="achievement-name">${ach.name}</h3>
        <span class="achievement-category">${ach.category}</span>
        <p class="achievement-date">
          <i class="fas fa-calendar-alt"></i>
          ${formatDate(ach.date)}
        </p>
      </div>
    </div>
  `).join('');
}

function initAchievementFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      loadAchievements(filter);
    });
  });
}

// ========================================
// GUESTBOOK
// ========================================
function loadGuestbook() {
  const messages = getData(STORAGE_KEYS.GUESTBOOK, DEFAULT_GUESTBOOK);
  const list = document.getElementById('messagesList');
  const noMessages = document.getElementById('noMessages');
  
  if (messages.length === 0) {
    list.classList.add('hidden');
    noMessages.classList.remove('hidden');
    return;
  }
  
  list.classList.remove('hidden');
  noMessages.classList.add('hidden');
  
  // Sort by newest first
  messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  list.innerHTML = messages.map(msg => `
    <div class="message-card">
      <div class="message-header">
        <span class="message-author">${msg.name}</span>
        <span class="message-time">${formatTimeAgo(msg.createdAt)}</span>
      </div>
      <p class="message-content">${msg.message}</p>
    </div>
  `).join('');
}

function initGuestbookForm() {
  const form = document.getElementById('guestbookForm');
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('guestName').value.trim();
    const email = document.getElementById('guestEmail').value.trim();
    const message = document.getElementById('guestMessage').value.trim();
    
    if (!name || !message) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }
    
    const messages = getData(STORAGE_KEYS.GUESTBOOK, DEFAULT_GUESTBOOK);
    
    const newMessage = {
      id: generateId(),
      name,
      email,
      message,
      createdAt: new Date().toISOString()
    };
    
    messages.push(newMessage);
    saveData(STORAGE_KEYS.GUESTBOOK, messages);
    
    // Reset form
    form.reset();
    
    // Reload messages
    loadGuestbook();
    
    // Show success
    alert('Cảm ơn bạn đã để lại lời nhắn! 💬');
  });
}

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize default data if not exists
  if (!localStorage.getItem(STORAGE_KEYS.ALBUMS)) {
    saveData(STORAGE_KEYS.ALBUMS, DEFAULT_ALBUMS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS)) {
    saveData(STORAGE_KEYS.ACHIEVEMENTS, DEFAULT_ACHIEVEMENTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.GUESTBOOK)) {
    saveData(STORAGE_KEYS.GUESTBOOK, DEFAULT_GUESTBOOK);
  }
  
  // Load content
  loadProfile();
  loadAlbums();
  loadAchievements();
  loadGuestbook();
  
  // Initialize interactions
  initTabs();
  initLightbox();
  initAchievementFilters();
  initGuestbookForm();
  
  console.log('🎨 CV Portfolio loaded successfully!');
});
