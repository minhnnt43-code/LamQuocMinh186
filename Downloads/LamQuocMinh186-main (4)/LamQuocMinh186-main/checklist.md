# 🎯 PORTFOLIO SPECIFICATION - LÂM QUỐC MINH

> Tài liệu mô tả chi tiết để code lại portfolio website

---

## 🎨 DESIGN SYSTEM

### Colors
```css
--blue-primary: #005B96;
--blue-light: #0077b6;
--orange: #FF7A00;
--gradient-main: linear-gradient(135deg, #005B96, #0077b6, #FF7A00);
--gradient-soft: linear-gradient(135deg, #f8fbff, #fff5eb, #f0f7ff);
--text-dark: #1e293b;
--text-gray: #64748b;
--border: #e2e8f0;
--shadow: 0 5px 20px rgba(0,0,0,0.08);
```

### Typography
- **Font**: `'Montserrat', sans-serif`
- **Weights**: 400 (normal), 600 (semibold), 700 (bold)
- **Import**: `https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap`

---

## 📄 PAGE: PORTFOLIO (index.html)

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│                      HERO SECTION                           │
│    ┌─────────┐                                              │
│    │ AVATAR  │  Lâm Quốc Minh                               │
│    │  150px  │  🎓 Trường học                               │
│    │  tròn   │  💼 Chức vụ                                  │
│    └─────────┘  "Bio mô tả ngắn..."                         │
├─────────────────────────────────────────────────────────────┤
│  [ 📸 Albums ] [ 🏆 Thành tích ] [ 🚩 Timeline ] [ 💬 Guest ]│
├─────────────────────────────────────────────────────────────┤
│                      TAB CONTENT                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component: Hero Section
```html
<section class="hero">
  <img class="avatar" src="..." alt="Avatar">
  <h1 class="name">Lâm Quốc Minh</h1>
  <p class="school">🎓 Sinh viên Khoa Luật, ĐH Kinh tế - Luật</p>
  <p class="position">💼 UV BCH Đoàn trường • Trưởng ban Truyền thông</p>
  <p class="bio">"Đam mê truyền thông, yêu thích hoạt động xã hội..."</p>
</section>
```

**Styles:**
- Avatar: `width: 150px; height: 150px; border-radius: 50%; border: 4px solid var(--blue-primary);`
- Name: `font-size: 2rem; font-weight: 700; color: var(--blue-primary);`
- School/Position: `font-size: 1rem; color: var(--text-gray);`
- Bio: `font-style: italic; color: var(--text-gray); max-width: 600px;`

---

### Component: Tab Navigation
```html
<nav class="tabs">
  <button class="tab active" data-tab="albums">📸 Albums</button>
  <button class="tab" data-tab="achievements">🏆 Thành tích</button>
  <button class="tab" data-tab="timeline">🚩 Timeline</button>
  <button class="tab" data-tab="guestbook">💬 Guestbook</button>
</nav>
```

**Styles:**
- Container: `display: flex; gap: 10px; justify-content: center;`
- Tab: `padding: 12px 24px; border: none; background: transparent; cursor: pointer;`
- Tab Active: `border-bottom: 3px solid var(--orange); color: var(--blue-primary);`

---

### Component: Album Card
```html
<div class="album-card" onclick="openAlbum(id)">
  <img class="album-cover" src="..." alt="...">
  <div class="album-info">
    <h3>Tên Album</h3>
    <p>📍 Địa điểm</p>
    <span>12 ảnh</span>
  </div>
</div>
```

**Styles:**
- Card: `border-radius: 16px; overflow: hidden; box-shadow: var(--shadow); transition: transform 0.3s;`
- Card Hover: `transform: translateY(-5px);`
- Cover: `width: 100%; height: 200px; object-fit: cover;`
- Grid: `display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;`

---

### Component: Achievement Card
```html
<div class="achievement-card" data-tier="gold">
  <div class="tier-badge">🥇</div>
  <img src="..." alt="...">
  <div class="achievement-info">
    <h3>Giải Nhất Cuộc thi ABC</h3>
    <p class="category">Văn hóa</p>
    <p class="date">📅 15/01/2024</p>
  </div>
</div>
```

**Tier Colors:**
- Gold: `#FFD700` border, glow effect
- Silver: `#C0C0C0` border
- Bronze: `#CD7F32` border

---

### Component: Timeline
```html
<div class="timeline">
  <div class="timeline-item" data-type="education">
    <div class="timeline-dot"></div>
    <div class="timeline-content">
      <span class="time">2024</span>
      <img class="logo" src="..." alt="">
      <h3>Sinh viên năm 3</h3>
      <p class="role">Đại học Kinh tế - Luật</p>
      <p class="description">Mô tả chi tiết...</p>
    </div>
  </div>
</div>
```

**Type Icons:**
- education: 📚
- work: 💼
- activity: 🏆

---

### Component: Guestbook
```html
<div class="guestbook">
  <form class="guestbook-form">
    <input type="text" placeholder="Tên của bạn" required>
    <input type="email" placeholder="Email (không bắt buộc)">
    <textarea placeholder="Lời nhắn..." required></textarea>
    <button type="submit">💬 Gửi lời nhắn</button>
  </form>
  
  <div class="messages">
    <div class="message">
      <strong>Nguyễn Văn A</strong>
      <span class="time">2 ngày trước</span>
      <p>Chúc mừng bạn nhé!</p>
    </div>
  </div>
</div>
```

---

## 📄 PAGE: ADMIN (admin.html)

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  📸 Portfolio Admin          [Xem Portfolio] [Đăng xuất]    │
├─────────────────────────────────────────────────────────────┤
│  [ 👤 Hồ sơ ] [ 📸 Albums ] [ 🏆 Thành tích ] [ 🚩 Timeline ]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────┐     ┌─────────────────┐               │
│   │   FORM TRÁI     │     │  AVATAR PHẢI    │               │
│   │   - Họ tên      │     │  [Khung tròn]   │               │
│   │   - Trường      │     │  [Upload btn]   │               │
│   │   - Chức vụ     │     │  [URL input]    │               │
│   │   - Bio         │     │                 │               │
│   │   [Lưu]         │     │                 │               │
│   └─────────────────┘     └─────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Admin Features
1. **Hồ sơ**: Chỉnh sửa thông tin cá nhân + avatar
2. **Albums**: CRUD albums (thêm/sửa/xóa)
3. **Thành tích**: CRUD achievements
4. **Timeline**: CRUD timeline entries

---

## 📊 DATA STRUCTURES

### Profile
```javascript
{
  fullName: "Lâm Quốc Minh",
  school: "Sinh viên Khoa Luật, ĐH Kinh tế - Luật",
  position: "UV BCH Đoàn trường • Trưởng ban Truyền thông",
  bio: "Đam mê truyền thông, yêu thích hoạt động xã hội...",
  avatarUrl: "https://..."
}
```

### Album
```javascript
{
  id: "album_001",
  title: "Chuyến đi Đà Lạt 2024",
  description: "Kỷ niệm đẹp cùng các bạn...",
  date: "2024-01-15",
  location: "Đà Lạt",
  cover: "https://...",
  photos: ["url1", "url2", "url3"]
}
```

### Achievement
```javascript
{
  id: "ach_001",
  name: "Giải Nhất Cuộc thi Hùng biện",
  category: "Văn hóa",
  date: "2024-01-15",
  tier: "gold", // "gold" | "silver" | "bronze"
  imageUrl: "https://..."
}
```

### Timeline Entry
```javascript
{
  id: "tl_001",
  title: "Sinh viên năm 3",
  role: "Chuyên ngành Luật Kinh doanh",
  time: "2024",
  type: "education", // "education" | "work" | "activity"
  description: "Mô tả chi tiết về giai đoạn này...",
  logo: "https://..."
}
```

### Guestbook Message
```javascript
{
  id: "msg_001",
  name: "Nguyễn Văn A",
  email: "a@email.com",
  message: "Portfolio rất đẹp!",
  createdAt: "2024-01-15T10:30:00Z"
}
```

---

## 🔥 FIREBASE SETUP

### 1. Create Firebase Project
1. Vào https://console.firebase.google.com
2. Create new project
3. Enable Firestore Database
4. Enable Storage (for images)
5. Enable Authentication (optional)

### 2. Firebase Config
```javascript
// js/firebase-config.js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
```

### 3. Firestore Collections
```
/profile (document)
/albums (collection)
/achievements (collection)
/timeline (collection)
/guestbook (collection)
```

### 4. Basic CRUD Functions
```javascript
// Read profile
async function getProfile() {
  const doc = await db.collection('settings').doc('profile').get();
  return doc.data();
}

// Save profile
async function saveProfile(data) {
  await db.collection('settings').doc('profile').set(data);
}

// Get all albums
async function getAlbums() {
  const snapshot = await db.collection('albums').orderBy('date', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Add album
async function addAlbum(data) {
  await db.collection('albums').add(data);
}

// Update album
async function updateAlbum(id, data) {
  await db.collection('albums').doc(id).update(data);
}

// Delete album
async function deleteAlbum(id) {
  await db.collection('albums').doc(id).delete();
}
```

---

## 📁 FILE STRUCTURE

```
project/
├── index.html          # Portfolio page
├── admin.html          # Admin page
├── css/
│   └── style.css       # All styles
├── js/
│   ├── firebase-config.js
│   ├── portfolio.js    # Portfolio logic
│   └── admin.js        # Admin logic
└── assets/
    └── images/
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: Setup
- [ ] Create Firebase project
- [ ] Setup Firestore + Storage
- [ ] Create file structure
- [ ] Add Firebase SDK to HTML

### Phase 2: Portfolio Page
- [ ] Hero section with profile data
- [ ] Tab navigation
- [ ] Albums grid + lightbox
- [ ] Achievements cards
- [ ] Timeline vertical
- [ ] Guestbook form + messages

### Phase 3: Admin Page
- [ ] Login protection (simple password or Firebase Auth)
- [ ] Profile edit form
- [ ] Albums CRUD
- [ ] Achievements CRUD
- [ ] Timeline CRUD

### Phase 4: Deploy
- [ ] Deploy to Vercel
- [ ] Configure custom domain
- [ ] Test all features