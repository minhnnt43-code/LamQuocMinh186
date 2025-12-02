// ===== PHOTOS LIBRARY =====
const couplePhotos = [
    {
        url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
        caption: 'Khoảnh khắc đầu tiên bên nhau 💕'
    },
    {
        url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800',
        caption: 'Hạnh phúc mỗi ngày 🌸'
    },
    {
        url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800',
        caption: 'Tình yêu vĩnh cửu 💖'
    },
    {
        url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800',
        caption: 'Bên nhau mãi mãi 💑'
    }
];

// ===== TÊN BỊ CẤM =====
const forbiddenNameParts = [
    'nguyễn thị yến nhi',
    'nguyễn',
    'thị',
    'yến nhi',
    'nhi nguyễn',
    'nguyễn nhi',
    'yến',
    'nhi',
    'yen',
    'nguyen'
];

// ===== BIẾN TOÀN CỤC =====
let weddingDate = null;
let currentPhotoIndex = 0;
let musicPlaying = false;

// ===== TẠO NGÀY CƯỚI NGẪU NHIÊN =====
function generateRandomWeddingDate() {
    const currentDate = new Date();
    const futureDate = new Date();

    // Ngày ngẫu nhiên từ 1-12 tháng tính từ hiện tại
    const randomMonths = Math.floor(Math.random() * 12) + 1;
    futureDate.setMonth(currentDate.getMonth() + randomMonths);

    // Ngày ngẫu nhiên trong tháng
    const randomDay = Math.floor(Math.random() * 28) + 1;
    futureDate.setDate(randomDay);

    // Đặt giờ cố định (18:00)
    futureDate.setHours(18, 0, 0, 0);

    return futureDate;
}

// ===== ĐỊNH DẠNG NGÀY THEO KIỂU VIỆT NAM =====
function formatVietnameseDate(date) {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return `${dayName}, ${day}/${month}/${year}`;
}

// ===== TẠO GIỜ NGẪU NHIÊN =====
function generateRandomTime() {
    const hours = Math.floor(Math.random() * 4) + 16; // Từ 16-19 giờ (4PM-7PM)
    const minutes = Math.random() < 0.5 ? '00' : '30';
    return `${hours}:${minutes}`;
}

// ===== KIỂM TRA TÊN CÓ CHỨA PHẦN BỊ CẤM KHÔNG =====
function containsForbiddenName(name) {
    const normalizedName = name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu tiếng Việt
        .replace(/đ/g, 'd');

    return forbiddenNameParts.some(forbiddenPart => {
        const normalizedForbidden = forbiddenPart.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd');

        return normalizedName.includes(normalizedForbidden);
    });
}

// ===== TẠO HIỆU ỨNG CONFETTI (PHÁO GIẤY) =====
function createConfetti() {
    const confettiContainer = document.getElementById('confettiContainer');
    const colors = ['#FF69B4', '#FF1493', '#FFB6C1', '#FFC0CB', '#DB7093', '#C71585'];

    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = confetti.style.width;
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';

            confettiContainer.appendChild(confetti);

            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }, i * 30);
    }
}

// ===== HIỂN THỊ GIAO DIỆN THÀNH CÔNG =====
function showSuccessView(brideName) {
    // Cập nhật hiển thị tên cô dâu
    const brideNameDisplay = document.getElementById('brideName');
    brideNameDisplay.textContent = brideName;
    brideNameDisplay.classList.remove('hidden');

    // Ẩn khung nhập liệu
    const inputContainer = document.querySelector('.bride-input-container');
    inputContainer.style.display = 'none';

    // Tạo và hiển thị ngày cưới
    weddingDate = generateRandomWeddingDate();
    const dateSection = document.getElementById('dateSection');
    const dateDisplay = document.getElementById('weddingDate');
    const timeDisplay = document.getElementById('weddingTime');

    dateDisplay.textContent = formatVietnameseDate(weddingDate);
    timeDisplay.textContent = `⏰ ${weddingDate.getHours()}:00`;
    dateSection.classList.remove('hidden');

    // Cập nhật timeline
    const weddingDateTimeline = document.getElementById('weddingDateTimeline');
    weddingDateTimeline.textContent = formatVietnameseDate(weddingDate);

    // Hiển thị tất cả sections
    document.getElementById('gallerySection').classList.remove('hidden');
    document.getElementById('timelineSection').classList.remove('hidden');
    document.getElementById('venueSection').classList.remove('hidden');
    document.getElementById('weatherSection').classList.remove('hidden');
    document.getElementById('rsvpSection').classList.remove('hidden');
    document.getElementById('guestbookSection').classList.remove('hidden');
    document.getElementById('giftSection').classList.remove('hidden');
    document.getElementById('shareSection').classList.remove('hidden');
    document.getElementById('footerSection').classList.remove('hidden');

    // Bắt đầu countdown
    startCountdown();

    // Khởi tạo photo gallery
    initPhotoGallery();

    // Tạo hiệu ứng confetti
    createConfetti();

    // Phát nhạc tự động
    setTimeout(() => {
        toggleMusic();
    }, 1000);
}

// ===== HIỂN THỊ THÔNG BÁO =====
function showAlert(message) {
    const alertMessage = document.getElementById('alertMessage');
    alertMessage.textContent = message;
    alertMessage.classList.remove('hidden');

    // Ẩn sau 5 giây
    setTimeout(() => {
        alertMessage.classList.add('hidden');
    }, 5000);
}

// ===== XỬ LÝ KHI NHẤN NÚT XÁC NHẬN =====
function handleConfirm() {
    const brideInput = document.getElementById('brideNameInput');
    const brideName = brideInput.value.trim();

    if (!brideName) {
        showAlert('⚠️ Vui lòng nhập tên cô dâu!');
        brideInput.focus();
        return;
    }

    // Kiểm tra tên bị cấm
    if (containsForbiddenName(brideName)) {
        showAlert('ĐỤ MẸ MÀY GIỠN HẢ 😡');
        brideInput.value = '';
        brideInput.focus();

        // Rung khung nhập liệu
        brideInput.style.animation = 'shake 0.5s';
        setTimeout(() => {
            brideInput.style.animation = '';
        }, 500);

        return;
    }

    // Hiển thị giao diện thành công
    showSuccessView(brideName);
}

// ===== COUNTDOWN TIMER =====
function startCountdown() {
    if (!weddingDate) return;

    const countdownSection = document.getElementById('countdownSection');
    countdownSection.classList.remove('hidden');

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = weddingDate.getTime() - now;

        if (distance < 0) {
            document.getElementById('days').textContent = '0';
            document.getElementById('hours').textContent = '0';
            document.getElementById('minutes').textContent = '0';
            document.getElementById('seconds').textContent = '0';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('days').textContent = days;
        document.getElementById('hours').textContent = hours;
        document.getElementById('minutes').textContent = minutes;
        document.getElementById('seconds').textContent = seconds;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// ===== MUSIC PLAYER =====
function toggleMusic() {
    const music = document.getElementById('weddingMusic');
    const musicIcon = document.getElementById('musicToggle');

    if (musicPlaying) {
        music.pause();
        musicIcon.classList.remove('playing');
        musicPlaying = false;
    } else {
        music.play().catch(err => {
            console.log('Không thể phát nhạc tự động:', err);
        });
        musicIcon.classList.add('playing');
        musicPlaying = true;
    }
}

// ===== PHOTO GALLERY =====
function initPhotoGallery() {
    updatePhoto();
    createGalleryDots();
}

function updatePhoto() {
    const photoElement = document.getElementById('currentPhoto');
    const captionElement = document.getElementById('photoCaption');

    photoElement.src = couplePhotos[currentPhotoIndex].url;
    captionElement.textContent = couplePhotos[currentPhotoIndex].caption;

    updateActiveDot();
}

function createGalleryDots() {
    const dotsContainer = document.getElementById('galleryDots');
    dotsContainer.innerHTML = '';

    couplePhotos.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
            currentPhotoIndex = index;
            updatePhoto();
        });
        dotsContainer.appendChild(dot);
    });
}

function updateActiveDot() {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        if (index === currentPhotoIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function nextPhoto() {
    currentPhotoIndex = (currentPhotoIndex + 1) % couplePhotos.length;
    updatePhoto();
}

function prevPhoto() {
    currentPhotoIndex = (currentPhotoIndex - 1 + couplePhotos.length) % couplePhotos.length;
    updatePhoto();
}

// ===== RSVP FORM =====
function handleRSVPSubmit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('guestName').value,
        phone: document.getElementById('guestPhone').value,
        count: document.getElementById('guestCount').value,
        food: document.querySelector('input[name="foodChoice"]:checked').value,
        note: document.getElementById('guestNote').value
    };

    console.log('RSVP Data:', formData);

    createConfetti();
    showAlert('💕 Cảm ơn bạn đã xác nhận! Hẹn gặp bạn tại đám cưới! 💕');

    // Reset form
    e.target.reset();
}

// ===== GUEST BOOK =====
function handleGuestbookSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('wishName').value.trim();
    const message = document.getElementById('wishMessage').value.trim();

    if (!name || !message) return;

    const wishesContainer = document.getElementById('wishesContainer');
    const wishCard = document.createElement('div');
    wishCard.className = 'wish-card';
    wishCard.style.animation = 'fade-in 0.6s ease-out';

    wishCard.innerHTML = `
        <div class="wish-header">
            <span class="wish-author">💖 ${name}</span>
            <span class="wish-time">Vừa xong</span>
        </div>
        <div class="wish-content">${message}</div>
        <button class="wish-like-btn" onclick="this.querySelector('.like-count').textContent = parseInt(this.querySelector('.like-count').textContent) + 1">
            ❤️ <span class="like-count">0</span>
        </button>
    `;

    wishesContainer.insertBefore(wishCard, wishesContainer.firstChild);

    // Reset form
    e.target.reset();

    createConfetti();
    showAlert('💝 Cảm ơn lời chúc của bạn!');
}

// ===== COPY ACCOUNT NUMBER =====
function copyAccountNumber() {
    const accountNumber = document.getElementById('accountNumber').textContent;

    navigator.clipboard.writeText(accountNumber).then(() => {
        const copyBtn = document.getElementById('copyAccountBtn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Đã Copy!';
        copyBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';

        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '';
        }, 2000);
    }).catch(err => {
        showAlert('❌ Không thể copy. Vui lòng copy thủ công.');
    });
}

// ===== SOCIAL SHARE =====
function shareFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
}

function shareZalo() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://chat.zalo.me/?url=${url}`, '_blank');
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        showAlert('🔗 Đã copy link vào clipboard!');
    }).catch(err => {
        showAlert('❌ Không thể copy link.');
    });
}

// ===== SAVE TO CALENDAR =====
function saveToCalendar() {
    if (!weddingDate) return;

    const title = 'Đám Cưới Lâm Quốc Minh';
    const description = 'Lễ cưới của Lâm Quốc Minh. Rất hân hạnh được đón tiếp quý khách!';
    const location = '123 Đường Tình Yêu, Quận Hạnh Phúc, TP. Hồ Chí Minh';

    // Format datetime for Google Calendar
    const startDate = weddingDate;
    const endDate = new Date(weddingDate.getTime() + (3 * 60 * 60 * 1000)); // +3 hours

    const formatDate = (date) => {
        return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;

    window.open(googleCalendarUrl, '_blank');
}

// ===== MAP DIRECTIONS =====
function openDirections() {
    const address = '123 Đường Tình Yêu, Quận Hạnh Phúc, TP. Hồ Chí Minh';
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(mapsUrl, '_blank');
}

// ===== KHỞI TẠO CÁC SỰ KIỆN LẮNG NGHE =====
document.addEventListener('DOMContentLoaded', () => {
    // Nút xác nhận tên cô dâu
    const confirmBtn = document.getElementById('confirmBtn');
    const brideInput = document.getElementById('brideNameInput');

    confirmBtn.addEventListener('click', handleConfirm);

    // Cho phép nhấn Enter để xác nhận
    brideInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleConfirm();
        }
    });

    // Thêm animation khi nhập liệu
    brideInput.addEventListener('input', () => {
        const alertMessage = document.getElementById('alertMessage');
        if (!alertMessage.classList.contains('hidden')) {
            alertMessage.classList.add('hidden');
        }
    });

    // Music player
    document.getElementById('musicToggle').addEventListener('click', toggleMusic);

    // Photo gallery navigation
    document.getElementById('nextBtn').addEventListener('click', nextPhoto);
    document.getElementById('prevBtn').addEventListener('click', prevPhoto);

    // Auto-play slideshow (every 5 seconds)
    setInterval(() => {
        if (document.querySelectorAll('.gallery-section:not(.hidden)').length > 0) {
            nextPhoto();
        }
    }, 5000);

    // RSVP form
    const rsvpForm = document.getElementById('rsvpForm');
    if (rsvpForm) {
        rsvpForm.addEventListener('submit', handleRSVPSubmit);
    }

    // Guest book form
    const guestbookForm = document.getElementById('guestbookForm');
    if (guestbookForm) {
        guestbookForm.addEventListener('submit', handleGuestbookSubmit);
    }

    // Copy account number
    const copyAccountBtn = document.getElementById('copyAccountBtn');
    if (copyAccountBtn) {
        copyAccountBtn.addEventListener('click', copyAccountNumber);
    }

    // Social share buttons
    document.getElementById('shareFacebook').addEventListener('click', shareFacebook);
    document.getElementById('shareZalo').addEventListener('click', shareZalo);
    document.getElementById('copyLink').addEventListener('click', copyLink);

    // Save to calendar
    const saveCalendarBtn = document.getElementById('saveCalendarBtn');
    if (saveCalendarBtn) {
        saveCalendarBtn.addEventListener('click', saveToCalendar);
    }

    // Directions button
    const directionsBtn = document.getElementById('directionsBtn');
    if (directionsBtn) {
        directionsBtn.addEventListener('click', openDirections);
    }
});
