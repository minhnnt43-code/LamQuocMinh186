// --- FILE: js/pf-effects.js ---
// Portfolio Visual Effects - All Phases (Restored & Enhanced)

(function () {
    'use strict';

    // ============================================================
    // PHASE A: HERO ENHANCEMENTS
    // ============================================================

    // #1 - TYPING ANIMATION
    const TYPING_TEXTS = ['Lâm Quốc Minh', 'Sinh viên Luật 📚', 'Yêu công nghệ 💻', 'Thích sáng tạo 🎨'];
    let typeIndex = 0, charIdx = 0, isDeleting = false;

    function initTyping() {
        const hero = document.getElementById('pf-name');

        // Hỗ trợ Split Layout mới (typing-box-inline)
        const inlineBox = document.querySelector('.typing-box-inline');
        if (inlineBox) {
            inlineBox.innerHTML = '<span class="t-text"></span><span class="t-cursor">|</span>';
            // Thêm CSS cho inline typing
            if (!document.getElementById('pf-typing-css')) {
                const css = document.createElement('style');
                css.id = 'pf-typing-css';
                css.textContent = `
                .typing-box-inline { display:flex; align-items:center; gap:4px; }
                .typing-box-inline .t-text { color:var(--orange,#FF7A00); font-weight:700; min-width:180px; }
                .typing-box-inline .t-cursor { color:var(--blue,#005B96); animation:tcur .8s infinite; }
                @keyframes tcur { 0%,50%{opacity:1} 51%,100%{opacity:0} }
            `;
                document.head.appendChild(css);
            }
            runTyping();
            return;
        }

        // Fallback cho layout cũ
        if (!hero || document.querySelector('.typing-box')) return;

        const box = document.createElement('div');
        box.className = 'typing-box';
        box.innerHTML = '<span class="t-text"></span><span class="t-cursor">|</span>';
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
    // PHASE C: LIGHTBOX PRO (GLOBAL FUNCTION)
    // ============================================================
    window.openLightbox = function (items, startIdx = 0) {
        // Chuẩn hóa input
        const images = items.map(item => {
            if (typeof item === 'string') return { url: item, caption: '' };
            return { url: item.url || item.src, caption: item.caption || item.desc || '' };
        });

        let idx = startIdx;

        // Tạo Element nếu chưa có
        let overlay = document.querySelector('.pf-lightbox-pro');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'pf-lightbox-pro';
            overlay.innerHTML = `
                <div class="lb-backdrop"></div>
                <div class="lb-container">
                    <div class="lb-header">
                        <span class="lb-counter"></span>
                        <button class="lb-close" title="Đóng">&times;</button>
                    </div>
                    <div class="lb-main">
                        <button class="lb-btn lb-prev" title="Trước">&#10094;</button>
                        <div class="lb-img-wrapper">
                            <img class="lb-img" src="" alt="Image">
                            <div class="lb-caption"></div>
                        </div>
                        <button class="lb-btn lb-next" title="Sau">&#10095;</button>
                    </div>
                    <div class="lb-thumbnails"></div>
                </div>
            `;
            document.body.appendChild(overlay);

            // CSS
            const css = document.createElement('style');
            css.textContent = `
                .pf-lightbox-pro { position:fixed; top:0; left:0; width:100%; height:100%; z-index:10000; display:flex; opacity:0; visibility:hidden; transition:opacity .3s; }
                .pf-lightbox-pro.active { opacity:1; visibility:visible; }
                .lb-backdrop { position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); }
                .lb-container { position:relative; width:100%; height:100%; display:flex; flex-direction:column; z-index:1; pointer-events:none; }
                .lb-container > * { pointer-events:auto; }
                
                .lb-header { padding:20px; display:flex; justify-content:space-between; align-items:center; color:#fff; }
                .lb-counter { font-size:1.1rem; opacity:0.8; }
                .lb-close { background:none; border:none; color:#fff; font-size:2.5rem; cursor:pointer; line-height:1; }
                
                .lb-main { flex:1; display:flex; align-items:center; justify-content:space-between; padding:0 20px; overflow:hidden; position:relative; }
                .lb-btn { background:rgba(255,255,255,0.1); border:none; color:#fff; padding:15px; border-radius:50%; font-size:1.5rem; cursor:pointer; transition:.2s; }
                .lb-btn:hover { background:rgba(255,255,255,0.3); }
                
                .lb-img-wrapper { flex:1; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; }
                .lb-img { max-width:90%; max-height:85%; object-fit:contain; border-radius:4px; box-shadow:0 10px 40px rgba(0,0,0,0.5); transition:transform .3s; }
                .lb-caption { color:#ccc; margin-top:15px; text-align:center; max-width:80%; font-size:1rem; }
                
                .lb-thumbnails { height:80px; padding:10px; display:flex; justify-content:center; gap:10px; overflow-x:auto; background:rgba(0,0,0,0.5); }
                .lb-thumb { height:100%; border-radius:4px; opacity:0.5; cursor:pointer; transition:.2s; border:2px solid transparent; }
                .lb-thumb.active { opacity:1; border-color:var(--orange,#FF7A00); transform:scale(1.1); }
                
                @media(max-width:768px) { .lb-thumbnails { display:none; } .lb-btn { padding:10px; font-size:1.2rem; } }
            `;
            document.head.appendChild(css);

            // Events
            overlay.querySelector('.lb-close').onclick = window.closeLightboxPro;
            overlay.querySelector('.lb-backdrop').onclick = window.closeLightboxPro;
            overlay.querySelector('.lb-prev').onclick = () => window.lbNav(-1);
            overlay.querySelector('.lb-next').onclick = () => window.lbNav(1);

            // KeyNav
            document.addEventListener('keydown', e => {
                if (!document.querySelector('.pf-lightbox-pro.active')) return;
                if (e.key === 'Escape') window.closeLightboxPro();
                if (e.key === 'ArrowLeft') window.lbNav(-1);
                if (e.key === 'ArrowRight') window.lbNav(1);
            });
        }

        // Logic Update UI
        window.activeLbStore = { images, idx };

        window.updateLbUI = () => {
            const st = window.activeLbStore;
            const imgEl = overlay.querySelector('.lb-img');
            const capEl = overlay.querySelector('.lb-caption');
            const cntEl = overlay.querySelector('.lb-counter');
            const thumbCon = overlay.querySelector('.lb-thumbnails');

            imgEl.style.opacity = 0;
            setTimeout(() => {
                imgEl.src = st.images[st.idx].url;
                capEl.textContent = st.images[st.idx].caption;
                cntEl.textContent = `${st.idx + 1} / ${st.images.length}`;
                imgEl.style.opacity = 1;
            }, 200);

            // Render Thumbs
            thumbCon.innerHTML = st.images.map((img, i) =>
                `<img src="${img.url}" class="lb-thumb ${i === st.idx ? 'active' : ''}" onclick="window.lbGoto(${i})">`
            ).join('');
        };

        window.lbNav = (dir) => {
            const st = window.activeLbStore;
            st.idx = (st.idx + dir + st.images.length) % st.images.length;
            window.updateLbUI();
        };

        window.lbGoto = (i) => {
            window.activeLbStore.idx = i;
            window.updateLbUI();
        };

        window.closeLightboxPro = () => overlay.classList.remove('active');

        // Show
        window.updateLbUI();
        overlay.classList.add('active');
    };

    // Alias
    window.closeLightbox = window.closeLightboxPro;

    // ============================================================
    // PHASE D: ALBUM & GUESTBOOK
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

    // Guestbook Bubble UI
    function initBubbleGuestbook() {
        if (document.getElementById('bubble-css')) return;
        const css = document.createElement('style');
        css.id = 'bubble-css';
        css.textContent = `
            .msg-bubble { background:#f1f2f6; border-radius:15px; padding:15px; margin-bottom:10px; position:relative; animation:popIn .3s ease; }
            .msg-bubble::before { content:''; position:absolute; top:15px; left:-8px; border:8px solid transparent; border-right-color:#f1f2f6; }
            @keyframes popIn { from{transform:scale(0.8);opacity:0} to{transform:scale(1);opacity:1} }
        `;
        document.head.appendChild(css);
    }

    function initStickerPicker() {
        // Placeholder
    }

    // ============================================================
    // PHASE E: FOOTER WIDGETS
    // ============================================================

    function initMusicWidget() {
        if (!document.querySelector('footer') || document.getElementById('music-widget')) return;
        const div = document.createElement('div');
        div.id = 'music-widget';
        div.innerHTML = `<span style="font-size:1.5rem">🎵</span> <span style="font-size:0.8rem">Lofi Chill</span>`;
        div.style.cssText = 'position:fixed; bottom:20px; right:80px; background:#fff; padding:8px 15px; border-radius:30px; box-shadow:0 5px 15px rgba(0,0,0,0.1); cursor:pointer; z-index:900; display:flex; align-items:center; gap:8px; opacity:0.8; transition:.3s;';
        div.onmouseenter = () => div.style.opacity = 1;
        div.onmouseleave = () => div.style.opacity = 0.8;
        if (window.innerWidth <= 768) div.style.display = 'none';
        document.body.appendChild(div);
    }

    function initWeatherWidget() {
        // Placeholder
    }

    function initVisitorCounter() {
        const el = document.getElementById('visitor-count');
        if (el) {
            let count = 1250;
            const target = 1532;
            const inc = setInterval(() => {
                count += Math.floor(Math.random() * 10);
                if (count >= target) { count = target; clearInterval(inc); }
                el.innerText = count.toLocaleString();
            }, 50);
        }
    }

    function initLoveBadge() {
        // Logic handled in portfolio.html
    }

    // ============================================================
    // PHASE F: AI FEATURES
    // ============================================================

    function initSmartRecommendations() {
        if (document.querySelector('.smart-recs-widget')) return;

        const widget = document.createElement('div');
        widget.className = 'smart-recs-widget';
        widget.innerHTML = `
            <div class="sr-toggle" onclick="this.parentNode.classList.toggle('active')">
                <span>💡 Gợi ý</span>
            </div>
            <div class="sr-content">
                <div class="sr-title">Khám phá nhanh:</div>
                <div class="sr-chips">
                    <span class="rec-chip" onclick="filterProjects('web', this)">🌐 Web Dev</span>
                    <span class="rec-chip" onclick="filterProjects('ai', this)">🤖 AI Projects</span>
                    <span class="rec-chip" onclick="window.scrollTo({top:0,behavior:'smooth'});window.switchTab('tab-achievements')">🏆 Thành tích</span>
                </div>
            </div>
        `;

        if (!document.getElementById('recs-css')) {
            const css = document.createElement('style');
            css.id = 'recs-css';
            css.textContent = `
            .smart-recs-widget { position:fixed; bottom:20px; left:20px; z-index:900; font-family:sans-serif; }
            .sr-toggle { background:#fff; color:var(--orange,#FF7A00); padding:10px 18px; border-radius:30px; box-shadow:0 5px 15px rgba(0,0,0,.15); cursor:pointer; font-weight:700; display:flex; align-items:center; gap:5px; transition:.3s; border:1px solid #eee; }
            .sr-toggle:hover { transform:translateY(-3px); box-shadow:0 8px 20px rgba(0,0,0,.2); }
            
            .sr-content { position:absolute; bottom:55px; left:0; background:#fff; padding:15px; border-radius:15px; width:200px; box-shadow:0 10px 30px rgba(0,0,0,.15); opacity:0; visibility:hidden; transform:translateY(10px); transition:.3s; border:1px solid #eee; }
            .smart-recs-widget.active .sr-content { opacity:1; visibility:visible; transform:translateY(0); }
            .sr-title { font-size:.8rem; color:#888; margin-bottom:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
            .sr-chips { display:flex; flex-direction:column; gap:8px; }
            .rec-chip { padding:8px 12px; background:#f8f9fa; border-radius:8px; cursor:pointer; font-size:.85rem; color:#333; transition:.2s; display:flex; align-items:center; gap:8px; }
            .rec-chip:hover { background:var(--blue,#005B96); color:#fff; padding-left:15px; }
            
            @media(max-width:768px) { .smart-recs-widget { bottom:80px; left:10px; } }
            `;
            document.head.appendChild(css);
        }
        document.body.appendChild(widget);
        setTimeout(() => { if (window.scrollY < 100) widget.classList.add('active'); }, 5000);
    }

    function initAIChatbot() {
        if (document.getElementById('ai-chat-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'ai-chat-widget';
        widget.innerHTML = `
            <div class="ai-chat-btn">🤖</div>
            <div class="ai-chat-window">
                <div class="ai-header">
                    <span>Trợ lý ảo</span>
                    <span class="ai-close" style="cursor:pointer">&times;</span>
                </div>
                <div class="ai-body">
                    <div class="ai-msg bot">Xin chào! Mình có thể giúp gì cho bạn?</div>
                </div>
                <div class="ai-input">
                    <input type="text" placeholder="Hỏi gì đó...">
                    <button class="ai-send">🚀</button>
                </div>
            </div>
        `;
        document.body.appendChild(widget);

        // Events
        const btnToggle = widget.querySelector('.ai-chat-btn');
        const btnClose = widget.querySelector('.ai-close');
        const btnSend = widget.querySelector('.ai-send');
        const inp = widget.querySelector('input');

        btnToggle.addEventListener('click', () => {
            widget.classList.toggle('open');
            if (widget.classList.contains('open')) inp.focus();
        });

        btnClose.addEventListener('click', (e) => {
            e.stopPropagation(); // Ngăn click lan ra ngoài
            widget.classList.remove('open');
        });

        const sendMsg = () => {
            const txt = inp.value.trim();
            if (!txt) return;
            addMsg(txt, 'user');
            inp.value = '';

            // Bot reply
            setTimeout(() => {
                let reply = "Mình chưa phải AI thực sự đâu, mình chỉ là demo thôi!";
                const lower = txt.toLowerCase();
                if (lower.includes('chào')) reply = "Chào bạn! Chúc bạn ngày mới vui vẻ.";
                if (lower.includes('giá') || lower.includes('tiền')) reply = "Về chi phí dự án, bạn hãy liên hệ trực tiếp qua Zalo nhé!";
                if (lower.includes('liên hệ')) reply = "Bạn có thể liên hệ qua Zalo hoặc Email ở cuối trang.";
                addMsg(reply, 'bot');
            }, 600);
        };

        btnSend.addEventListener('click', sendMsg);
        inp.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMsg();
        });

        function addMsg(txt, type) {
            const body = widget.querySelector('.ai-body');
            const d = document.createElement('div');
            d.className = `ai-msg ${type}`;
            d.textContent = txt;
            body.appendChild(d);
            body.scrollTop = body.scrollHeight;
        }

        if (!document.getElementById('ai-chat-css')) {
            const css = document.createElement('style');
            css.id = 'ai-chat-css';
            css.textContent = `
                #ai-chat-widget { position:fixed; bottom:90px; right:20px; z-index:9999; font-family:sans-serif; }
                .ai-chat-btn { width:50px; height:50px; background:linear-gradient(135deg, #005B96, #0088CC); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; cursor:pointer; box-shadow:0 5px 15px rgba(0,0,0,0.2); transition:.3s; user-select:none; }
                .ai-chat-btn:hover { transform:scale(1.1); }
                
                .ai-chat-window { position:absolute; bottom:60px; right:0; width:300px; height:400px; background:#fff; border-radius:15px; box-shadow:0 10px 40px rgba(0,0,0,0.2); display:flex; flex-direction:column; overflow:hidden; opacity:0; visibility:hidden; transform:translateY(20px); transition:.3s; pointer-events:none; }
                #ai-chat-widget.open .ai-chat-window { opacity:1; visibility:visible; transform:translateY(0); pointer-events:auto; }
                
                .ai-header { background:#005B96; color:#fff; padding:15px; font-weight:bold; display:flex; justify-content:space-between; align-items:center; }
                .ai-body { flex:1; padding:15px; overflow-y:auto; background:#f9f9f9; display:flex; flex-direction:column; gap:10px; }
                .ai-msg { padding:8px 12px; border-radius:10px; max-width:80%; font-size:0.9rem; line-height:1.4; word-wrap:break-word; }
                .ai-msg.bot { background:#e1f5fe; color:#0277bd; align-self:flex-start; border-bottom-left-radius:2px; }
                .ai-msg.user { background:#005B96; color:#fff; align-self:flex-end; border-bottom-right-radius:2px; }
                
                .ai-input { padding:10px; border-top:1px solid #eee; display:flex; gap:5px; background:#fff; }
                .ai-input input { flex:1; padding:8px 12px; border:1px solid #ddd; border-radius:20px; outline:none; font-size:0.9rem; }
                .ai-input button { background:none; border:none; cursor:pointer; font-size:1.2rem; padding:0 5px; }
            `;
            document.head.appendChild(css);
        }
    }

    function initAISummary() {
        // Simple alert as summary for now
    }

    // ============================================================
    // HELPERS
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
        // initTyping(); // Đã tắt - Typing animation
        init3DAvatar();
        initTabUnderline();
        initKeyNav();
        initMasonryAlbum();
        // initBubbleGuestbook(); // Đã tắt - Guestbook
        initStickerPicker();
        initMusicWidget();
        initWeatherWidget();
        initVisitorCounter();
        initLoveBadge();
        // initAIChatbot(); // Đã tắt - AI Chatbot
        // initAISummary(); // Đã tắt - AI Summary
        // initSmartRecommendations(); // Đã tắt - Smart Recommendations
        console.log('✨ Portfolio Effects Ready!');
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initAll); }
    else { setTimeout(initAll, 100); }

})();
