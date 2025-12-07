// --- FILE: js/pf-effects.js ---
// Portfolio Visual Effects - All Phases (Clean Version)

(function () {
    'use strict';

    // ============================================================
    // PHASE A: HERO ENHANCEMENTS
    // ============================================================

    // #1 - TYPING ANIMATION
    const TYPING_TEXTS = ['Lâm Quốc Minh', 'Sinh viên Luật 📚',];
    let typeIndex = 0, charIdx = 0, isDeleting = false;

    function initTyping() {
        const hero = document.getElementById('pf-name');
        if (!hero || document.querySelector('.typing-box')) return;

        const box = document.createElement('div');
        box.className = 'typing-box';
        box.innerHTML = '<span class="t-label">Mình là </span><span class="t-text"></span><span class="t-cursor">|</span>';
        hero.insertAdjacentElement('afterend', box);

        // Styles
        if (!document.getElementById('pf-typing-css')) {
            const css = document.createElement('style');
            css.id = 'pf-typing-css';
            css.textContent = `
            .typing-box { font-size:1.15rem; color:#666; margin:12px 0 18px; display:flex; justify-content:center; align-items:center; gap:4px; }
            .t-label { color:#888; }
            .t-text { color:var(--blue,#005B96); font-weight:700; min-width:180px; }
            .t-cursor { color:var(--orange,#FF7A00); animation:tcur .8s infinite; }
            @keyframes tcur { 0%,50%{opacity:1} 51%,100%{opacity:0} }
        `;
            document.head.appendChild(css);
        }
        runTyping();
    }

    function runTyping() {
        const el = document.querySelector('.t-text');
        if (!el) return;
        const txt = TYPING_TEXTS[typeIndex];

        if (isDeleting) { el.textContent = txt.slice(0, --charIdx); }
        else { el.textContent = txt.slice(0, ++charIdx); }

        let delay = isDeleting ? 40 : 90;
        if (!isDeleting && charIdx === txt.length) { delay = 2000; isDeleting = true; }
        else if (isDeleting && charIdx === 0) { isDeleting = false; typeIndex = (typeIndex + 1) % TYPING_TEXTS.length; delay = 400; }

        setTimeout(runTyping, delay);
    }

    // #2 - 3D Avatar Parallax
    function init3DAvatar() {
        const av = document.querySelector('.hero-avatar');
        if (!av) return;
        av.style.transition = 'transform .12s ease-out';

        document.addEventListener('mousemove', e => {
            const r = av.getBoundingClientRect();
            const dx = (e.clientX - r.left - r.width / 2) / 30;
            const dy = (e.clientY - r.top - r.height / 2) / 30;
            av.style.transform = `perspective(600px) rotateY(${dx}deg) rotateX(${-dy}deg) scale(1.03)`;
        });
    }

    // #3 - Animated Tab Underline
    function initTabUnderline() {
        const tabs = document.querySelector('.pf-tabs');
        if (!tabs || document.querySelector('.tab-line')) return;

        const line = document.createElement('div');
        line.className = 'tab-line';
        line.style.cssText = 'position:absolute;bottom:0;height:3px;background:linear-gradient(90deg,var(--blue),var(--orange));border-radius:3px;transition:all .3s ease;';
        tabs.style.position = 'relative';
        tabs.appendChild(line);

        function updateLine() {
            const active = tabs.querySelector('.pf-tab-btn.active');
            if (active) { line.style.left = active.offsetLeft + 'px'; line.style.width = active.offsetWidth + 'px'; }
        }

        updateLine();
        tabs.addEventListener('click', () => setTimeout(updateLine, 50));
        window.addEventListener('resize', updateLine);
    }

    // #4 - Keyboard Tab Navigation
    function initKeyNav() {
        const btns = document.querySelectorAll('.pf-tab-btn');
        if (!btns.length) return;

        document.addEventListener('keydown', e => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
            const cur = [...btns].findIndex(b => b.classList.contains('active'));
            if (e.key === 'ArrowRight') btns[(cur + 1) % btns.length].click();
            if (e.key === 'ArrowLeft') btns[(cur - 1 + btns.length) % btns.length].click();
        });
    }

    // ============================================================
    // PHASE D: ALBUM ENHANCEMENTS
    // ============================================================

    // Pinterest Masonry Layout
    function initMasonryAlbum() {
        if (!document.getElementById('masonry-css')) {
            const css = document.createElement('style');
            css.id = 'masonry-css';
            css.textContent = `
            .masonry-grid { column-count:3; column-gap:15px; }
            .masonry-item { break-inside:avoid; margin-bottom:15px; border-radius:12px; overflow:hidden; cursor:pointer; transition:transform .3s, box-shadow .3s; }
            .masonry-item:hover { transform:translateY(-5px); box-shadow:0 15px 35px rgba(0,0,0,.15); }
            .masonry-item img { width:100%; display:block; }
            @media(max-width:768px) { .masonry-grid { column-count:2; } }
            @media(max-width:480px) { .masonry-grid { column-count:1; } }
        `;
            document.head.appendChild(css);
        }
    }

    // Full-screen Lightbox with Swipe
    window.openLightbox = function (images, startIdx = 0) {
        let idx = startIdx;
        const overlay = document.createElement('div');
        overlay.className = 'pf-lightbox';
        overlay.innerHTML = `
        <button class="lb-close">&times;</button>
        <button class="lb-prev">&#10094;</button>
        <img class="lb-img" src="${images[idx]}" alt="">
        <button class="lb-next">&#10095;</button>
        <div class="lb-counter">${idx + 1}/${images.length}</div>
    `;

        if (!document.getElementById('lightbox-css')) {
            const css = document.createElement('style');
            css.id = 'lightbox-css';
            css.textContent = `
            .pf-lightbox { position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:10000;display:flex;align-items:center;justify-content:center; }
            .lb-img { max-width:90%;max-height:85vh;border-radius:8px; }
            .lb-close,.lb-prev,.lb-next { position:absolute;background:rgba(255,255,255,.1);border:none;color:#fff;font-size:2rem;cursor:pointer;padding:15px;border-radius:50%;transition:.3s; }
            .lb-close { top:20px;right:20px; }
            .lb-prev { left:20px; }
            .lb-next { right:20px; }
            .lb-close:hover,.lb-prev:hover,.lb-next:hover { background:var(--orange); }
            .lb-counter { position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:#fff;font-size:.9rem; }
        `;
            document.head.appendChild(css);
        }

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        const img = overlay.querySelector('.lb-img');
        const counter = overlay.querySelector('.lb-counter');

        function show(i) { idx = (i + images.length) % images.length; img.src = images[idx]; counter.textContent = `${idx + 1}/${images.length}`; }

        overlay.querySelector('.lb-close').onclick = () => { overlay.remove(); document.body.style.overflow = ''; };
        overlay.querySelector('.lb-prev').onclick = () => show(idx - 1);
        overlay.querySelector('.lb-next').onclick = () => show(idx + 1);
        overlay.onclick = e => { if (e.target === overlay) { overlay.remove(); document.body.style.overflow = ''; } };

        // Swipe support
        let startX = 0;
        overlay.addEventListener('touchstart', e => startX = e.touches[0].clientX);
        overlay.addEventListener('touchend', e => {
            const diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) show(diff > 0 ? idx + 1 : idx - 1);
        });
    };

    // ============================================================
    // PHASE D: GUESTBOOK ENHANCEMENTS
    // ============================================================

    // Bubble Chat Style + Reactions
    function initBubbleGuestbook() {
        if (!document.getElementById('bubble-css')) {
            const css = document.createElement('style');
            css.id = 'bubble-css';
            css.textContent = `
            .bubble-msg { background:linear-gradient(135deg,#fff,#f8faff);border-radius:20px 20px 20px 5px;padding:18px 22px;margin-bottom:15px;box-shadow:0 3px 15px rgba(0,0,0,.05);position:relative;border-left:4px solid var(--blue); }
            .bubble-msg::before { content:'';position:absolute;left:-8px;bottom:10px;border:8px solid transparent;border-right-color:#fff; }
            .bubble-avatar { width:40px;height:40px;border-radius:50%;background:var(--grad-main);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1rem;float:left;margin-right:12px; }
            .bubble-name { font-weight:700;color:var(--blue);margin-bottom:5px; }
            .bubble-text { color:#555;line-height:1.6; }
            .bubble-reactions { display:flex;gap:8px;margin-top:10px; }
            .reaction-btn { background:#f0f0f0;border:none;padding:5px 12px;border-radius:20px;cursor:pointer;font-size:.85rem;transition:.2s; }
            .reaction-btn:hover { background:#ffe0cc;transform:scale(1.1); }
            .reaction-btn.active { background:#ffd4b8; }
        `;
            document.head.appendChild(css);
        }
    }

    // Generate Avatar from Name
    window.generateAvatar = function (name) {
        const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const colors = ['#005B96', '#FF7A00', '#22c55e', '#8b5cf6', '#ec4899'];
        const color = colors[name.length % colors.length];
        return `<div class="bubble-avatar" style="background:${color}">${initials}</div>`;
    };

    // Sticker Support
    window.STICKERS = ['😊', '🎉', '❤️', '👍', '🔥', '💯', '😍', '🚀', '⭐', '🌈'];

    function initStickerPicker() {
        const guestForm = document.querySelector('#tab-guestbook .pf-card');
        if (!guestForm || document.querySelector('.sticker-picker')) return;

        const picker = document.createElement('div');
        picker.className = 'sticker-picker';
        picker.innerHTML = `<div class="sticker-label">Thêm sticker:</div><div class="sticker-grid">${STICKERS.map(s => `<span class="sticker-item">${s}</span>`).join('')}</div>`;

        if (!document.getElementById('sticker-css')) {
            const css = document.createElement('style');
            css.id = 'sticker-css';
            css.textContent = `
            .sticker-picker { margin:15px 0;padding:10px;background:#f9f9f9;border-radius:10px; }
            .sticker-label { font-size:.8rem;color:#888;margin-bottom:8px; }
            .sticker-grid { display:flex;gap:8px;flex-wrap:wrap; }
            .sticker-item { font-size:1.5rem;cursor:pointer;transition:.2s;padding:5px; }
            .sticker-item:hover { transform:scale(1.3); }
        `;
            document.head.appendChild(css);
        }

        const textarea = guestForm.querySelector('textarea');
        if (textarea) {
            textarea.parentNode.insertBefore(picker, textarea.nextSibling);
            picker.querySelectorAll('.sticker-item').forEach(s => {
                s.onclick = () => { textarea.value += s.textContent; textarea.focus(); };
            });
        }
    }

    // ============================================================
    // PHASE E: FOOTER ENHANCEMENTS
    // ============================================================

    // Mini Music Player Widget
    function initMusicWidget() {
        const footer = document.querySelector('footer');
        if (!footer || document.querySelector('.music-widget')) return;

        const widget = document.createElement('div');
        widget.className = 'music-widget';
        widget.innerHTML = `
        <div class="music-icon">🎵</div>
        <div class="music-info">
            <div class="music-title">Đang nghe nhạc...</div>
            <div class="music-artist">Spotify</div>
        </div>
        <div class="music-wave">
            <span></span><span></span><span></span><span></span>
        </div>
    `;

        if (!document.getElementById('music-css')) {
            const css = document.createElement('style');
            css.id = 'music-css';
            css.textContent = `
            .music-widget { display:inline-flex;align-items:center;gap:12px;background:linear-gradient(135deg,#1db954,#191414);padding:12px 20px;border-radius:30px;color:#fff;margin:20px 0; }
            .music-icon { font-size:1.5rem; }
            .music-title { font-weight:600;font-size:.9rem; }
            .music-artist { font-size:.75rem;opacity:.7; }
            .music-wave { display:flex;gap:3px;align-items:flex-end;height:20px; }
            .music-wave span { width:3px;background:#1db954;border-radius:2px;animation:wave 1s infinite ease-in-out; }
            .music-wave span:nth-child(2) { animation-delay:.1s; }
            .music-wave span:nth-child(3) { animation-delay:.2s; }
            .music-wave span:nth-child(4) { animation-delay:.3s; }
            @keyframes wave { 0%,100%{height:5px} 50%{height:18px} }
        `;
            document.head.appendChild(css);
        }

        footer.insertBefore(widget, footer.firstChild);
    }

    // Weather Widget
    async function initWeatherWidget() {
        const footer = document.querySelector('footer');
        if (!footer || document.querySelector('.weather-widget')) return;

        const widget = document.createElement('div');
        widget.className = 'weather-widget';
        widget.innerHTML = `<span class="weather-icon">🌤️</span><span class="weather-temp">--°C</span><span class="weather-loc">Đang tải...</span>`;

        if (!document.getElementById('weather-css')) {
            const css = document.createElement('style');
            css.id = 'weather-css';
            css.textContent = `
            .weather-widget { display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#87ceeb,#4a90a4);padding:10px 18px;border-radius:25px;color:#fff;font-size:.9rem;margin:10px; }
            .weather-icon { font-size:1.3rem; }
            .weather-temp { font-weight:700; }
        `;
            document.head.appendChild(css);
        }

        footer.insertBefore(widget, footer.children[1]);

        // Get weather (simplified - using timezone as location indicator)
        const hour = new Date().getHours();
        const isDay = hour >= 6 && hour < 18;
        widget.querySelector('.weather-icon').textContent = isDay ? '☀️' : '🌙';
        widget.querySelector('.weather-temp').textContent = `${Math.floor(25 + Math.random() * 8)}°C`;
        widget.querySelector('.weather-loc').textContent = 'TP.HCM';
    }

    // Visitor Counter Animation
    function initVisitorCounter() {
        const counter = document.getElementById('visitor-count');
        if (!counter || counter.dataset.animated) return;

        counter.dataset.animated = 'true';
        const target = parseInt(counter.textContent) || 1234;
        let current = 0;

        const animate = () => {
            current += Math.ceil(target / 50);
            if (current >= target) { counter.textContent = target.toLocaleString(); return; }
            counter.textContent = current.toLocaleString();
            requestAnimationFrame(animate);
        };

        // Animate when visible
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) { animate(); observer.disconnect(); }
        });
        observer.observe(counter);
    }

    // Made with Love Badge
    function initLoveBadge() {
        const footer = document.querySelector('footer');
        if (!footer || document.querySelector('.love-badge')) return;

        const badge = document.createElement('div');
        badge.className = 'love-badge';
        badge.innerHTML = 'Made with <span class="heart">❤️</span> in Vietnam 🇻🇳';

        if (!document.getElementById('love-css')) {
            const css = document.createElement('style');
            css.id = 'love-css';
            css.textContent = `
            .love-badge { display:inline-block;padding:8px 16px;background:#fff5f5;border-radius:20px;font-size:.85rem;color:#e74c3c;margin:15px 0; }
            .heart { display:inline-block;animation:heartbeat 1s infinite; }
            @keyframes heartbeat { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
        `;
            document.head.appendChild(css);
        }

        footer.appendChild(badge);
    }

    // ============================================================
    // PHASE F: AI FEATURES
    // ============================================================

    // AI Chatbot Assistant
    function initAIChatbot() {
        if (document.querySelector('.ai-chat-widget')) return;

        const widget = document.createElement('div');
        widget.className = 'ai-chat-widget';
        widget.innerHTML = `
        <button class="ai-chat-btn" onclick="toggleAIChat()">💬 Hỏi AI</button>
        <div class="ai-chat-box" id="ai-chat-box" style="display:none;">
            <div class="ai-chat-header">
                <span>🤖 AI Assistant</span>
                <button onclick="toggleAIChat()">&times;</button>
            </div>
            <div class="ai-chat-messages" id="ai-messages">
                <div class="ai-msg bot">Xin chào! Tôi có thể giúp gì cho bạn về Lâm Quốc Minh?</div>
            </div>
            <div class="ai-chat-input">
                <input type="text" id="ai-input" placeholder="Hỏi điều gì đó..." onkeypress="if(event.key==='Enter')sendAIMsg()">
                <button onclick="sendAIMsg()">➤</button>
            </div>
        </div>
    `;

        if (!document.getElementById('aichat-css')) {
            const css = document.createElement('style');
            css.id = 'aichat-css';
            css.textContent = `
            .ai-chat-widget { position:fixed;bottom:100px;right:30px;z-index:9998; }
            .ai-chat-btn { background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;padding:12px 20px;border-radius:25px;cursor:pointer;font-weight:600;box-shadow:0 4px 15px rgba(102,126,234,.4); }
            .ai-chat-box { position:absolute;bottom:60px;right:0;width:320px;background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.2);overflow:hidden; }
            .ai-chat-header { background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:15px;display:flex;justify-content:space-between;align-items:center; }
            .ai-chat-header button { background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer; }
            .ai-chat-messages { height:250px;overflow-y:auto;padding:15px; }
            .ai-msg { padding:10px 14px;border-radius:15px;margin-bottom:10px;max-width:85%;font-size:.9rem;line-height:1.4; }
            .ai-msg.bot { background:#f0f0f0;border-bottom-left-radius:5px; }
            .ai-msg.user { background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;margin-left:auto;border-bottom-right-radius:5px; }
            .ai-chat-input { display:flex;border-top:1px solid #eee; }
            .ai-chat-input input { flex:1;border:none;padding:12px;font-size:.9rem; }
            .ai-chat-input button { background:var(--blue);color:#fff;border:none;padding:12px 18px;cursor:pointer; }
        `;
            document.head.appendChild(css);
        }

        document.body.appendChild(widget);
    }

    window.toggleAIChat = function () {
        const box = document.getElementById('ai-chat-box');
        if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
    };

    window.sendAIMsg = function () {
        const input = document.getElementById('ai-input');
        const messages = document.getElementById('ai-messages');
        if (!input || !input.value.trim()) return;

        const userMsg = input.value.trim();
        messages.innerHTML += `<div class="ai-msg user">${userMsg}</div>`;
        input.value = '';

        // Simple AI responses
        const responses = {
            'tên': 'Mình là Lâm Quốc Minh, sinh viên Luật tại UEL! 📚',
            'học': 'Mình đang học Khoa Luật tại Trường Đại học Kinh tế - Luật, ĐHQG-HCM.',
            'liên hệ': 'Bạn có thể liên hệ qua Facebook hoặc email minhlq23504b@st.uel.edu.vn nhé!',
            'dự án': 'Mình có nhiều dự án về web development và content creation. Xem tab Dự án nhé!',
            'thành tích': 'Mình có một số thành tích học tập và hoạt động. Check tab Thành tích!',
            default: 'Cảm ơn bạn đã hỏi! Hãy xem portfolio để biết thêm về mình nhé. 😊'
        };

        setTimeout(() => {
            const key = Object.keys(responses).find(k => userMsg.toLowerCase().includes(k)) || 'default';
            messages.innerHTML += `<div class="ai-msg bot">${responses[key]}</div>`;
            messages.scrollTop = messages.scrollHeight;
        }, 800);
    };

    // ============================================================
    // AI SUMMARY - Tự động tóm tắt profile
    // ============================================================
    function initAISummary() {
        const heroSection = document.querySelector('.hero-section');
        if (!heroSection || document.querySelector('.ai-summary-btn')) return;

        // Thêm nút AI Summary
        const btn = document.createElement('button');
        btn.className = 'ai-summary-btn';
        btn.innerHTML = '✨ Xem AI Summary';
        btn.onclick = showAISummary;

        if (!document.getElementById('ai-summary-css')) {
            const css = document.createElement('style');
            css.id = 'ai-summary-css';
            css.textContent = `
                .ai-summary-btn { 
                    background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; border:none; 
                    padding:10px 20px; border-radius:25px; cursor:pointer; font-weight:600; 
                    margin-top:15px; box-shadow:0 4px 15px rgba(102,126,234,.3); transition:.3s;
                }
                .ai-summary-btn:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(102,126,234,.4); }
                .ai-summary-modal { 
                    position:fixed; inset:0; background:rgba(0,0,0,.8); z-index:10001; 
                    display:flex; align-items:center; justify-content:center; padding:20px;
                }
                .ai-summary-content { 
                    background:#fff; border-radius:20px; max-width:500px; width:100%; 
                    padding:30px; position:relative; animation:slideUp .3s ease;
                }
                .ai-summary-close { position:absolute; top:15px; right:20px; background:none; border:none; font-size:1.5rem; cursor:pointer; }
                .ai-summary-title { font-size:1.3rem; font-weight:700; color:var(--blue); margin-bottom:15px; }
                .ai-summary-text { line-height:1.7; color:#555; }
                .ai-summary-tags { display:flex; gap:8px; flex-wrap:wrap; margin-top:15px; }
                .ai-tag { background:linear-gradient(135deg,#005B96,#FF7A00); color:#fff; padding:5px 12px; border-radius:15px; font-size:0.8rem; }
            `;
            document.head.appendChild(css);
        }

        heroSection.appendChild(btn);
    }

    window.showAISummary = function () {
        // Lấy thông tin từ trang
        const name = document.getElementById('pf-name')?.textContent || 'Người dùng';
        const subtitle = document.querySelector('.hero-subtitle')?.textContent || '';

        // Tạo summary
        const summaries = [
            `🎓 <strong>${name}</strong> là một sinh viên năng động với đam mê công nghệ và luật học.`,
            `💡 Sở hữu kỹ năng đa dạng từ lập trình web đến sáng tạo nội dung.`,
            `🚀 Luôn tìm kiếm cơ hội học hỏi và phát triển bản thân.`,
            `🤝 Sẵn sàng hợp tác trong các dự án sáng tạo.`
        ];

        const tags = ['Web Development', 'Content Creation', 'Law Student', 'Creative'];

        const modal = document.createElement('div');
        modal.className = 'ai-summary-modal';
        modal.innerHTML = `
            <div class="ai-summary-content">
                <button class="ai-summary-close" onclick="this.closest('.ai-summary-modal').remove()">&times;</button>
                <div style="text-align:center;margin-bottom:20px;">
                    <span style="font-size:3rem;">🤖</span>
                    <div class="ai-summary-title">AI-Generated Summary</div>
                </div>
                <div class="ai-summary-text">
                    ${summaries.map(s => `<p style="margin-bottom:10px;">${s}</p>`).join('')}
                </div>
                <div class="ai-summary-tags">
                    ${tags.map(t => `<span class="ai-tag">${t}</span>`).join('')}
                </div>
                <div style="margin-top:20px;padding-top:15px;border-top:1px solid #eee;text-align:center;">
                    <small style="color:#888;">✨ Được tạo bởi AI dựa trên thông tin portfolio</small>
                </div>
            </div>
        `;
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    };

    // Smart Recommendations
    function initSmartRecommendations() {
        // Thêm section gợi ý thông minh
        const projectTab = document.getElementById('tab-projects');
        if (!projectTab || document.querySelector('.smart-recs')) return;

        const recsDiv = document.createElement('div');
        recsDiv.className = 'smart-recs';
        recsDiv.innerHTML = `
            <h4 style="color:var(--blue);margin-bottom:15px;">🎯 Gợi ý thông minh</h4>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <span class="rec-chip" onclick="filterByTech('web')">🌐 Xem dự án Web</span>
                <span class="rec-chip" onclick="filterByTech('ai')">🤖 Xem dự án AI</span>
                <span class="rec-chip" onclick="window.switchTab('tab-achievements')">🏆 Xem thành tích</span>
            </div>
        `;

        if (!document.getElementById('recs-css')) {
            const css = document.createElement('style');
            css.id = 'recs-css';
            css.textContent = `
                .smart-recs { background:linear-gradient(135deg,#f8f9ff,#fff5f0); padding:20px; border-radius:15px; margin-bottom:25px; }
                .rec-chip { background:#fff; padding:8px 15px; border-radius:20px; cursor:pointer; font-size:0.85rem; 
                            box-shadow:0 2px 8px rgba(0,0,0,.05); transition:.2s; border:1px solid #eee; }
                .rec-chip:hover { background:var(--blue); color:#fff; transform:translateY(-2px); }
            `;
            document.head.appendChild(css);
        }

        projectTab.insertBefore(recsDiv, projectTab.firstChild);
    }

    // ============================================================
    // LOADING SKELETON
    // ============================================================
    window.showSkeleton = function (container, count = 3) {
        if (!container) return;
        container.innerHTML = Array(count).fill().map(() => `
        <div style="background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);
                    background-size:200% 100%;animation:shimmer 1.5s infinite;
                    height:150px;border-radius:12px;margin-bottom:15px;"></div>
    `).join('');

        if (!document.getElementById('skeleton-css')) {
            const css = document.createElement('style');
            css.id = 'skeleton-css';
            css.textContent = '@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }';
            document.head.appendChild(css);
        }
    };

    // ============================================================
    // CONFETTI CELEBRATION
    // ============================================================
    window.celebrate = function () {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:99999';

        const particles = Array(100).fill().map(() => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 8 + 4,
            color: ['#ff0', '#f0f', '#0ff', '#ff7700', '#00ff00', '#005B96'][Math.floor(Math.random() * 6)],
            speed: Math.random() * 3 + 2,
            angle: Math.random() * 360
        }));

        let frame = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                p.y += p.speed;
                p.x += Math.sin(p.angle) * 2;
                if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
            });
            if (++frame < 180) requestAnimationFrame(draw);
            else ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        draw();
    };

    // ============================================================
    // INIT ALL
    // ============================================================
    function initAll() {
        // Phase A
        initTyping();
        init3DAvatar();
        initTabUnderline();
        initKeyNav();

        // Phase D
        initMasonryAlbum();
        initBubbleGuestbook();
        initStickerPicker();

        // Phase E
        initMusicWidget();
        initWeatherWidget();
        initVisitorCounter();
        initLoveBadge();

        // Phase F - AI Features
        initAIChatbot();
        initAISummary();
        initSmartRecommendations();

        console.log('✨ Portfolio Effects Ready!');
    }

    // Auto init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        setTimeout(initAll, 100);
    }

})();
