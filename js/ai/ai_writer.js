// ============================================================
// FILE: js/ai/ai_writer.js  
// Enhanced với API Key Management UI & Quota Warning
// ============================================================

import { generateContent, hasApiKey, setApiKey, getApiKey, getQuotaInfo, QuotaExceededError, clearApiKey } from './gemini.js';
import { PROMPTS } from './prompts.js';
import { showNotification, toggleLoading } from '../common.js';

let quotaUpdateInterval = null;

export function initAIWriter() {
    console.log("🤖 Khởi tạo AI Writer Module...");

    renderAIWriterSection();
    setupAIEvents();
    checkApiKeyStatus();
    startQuotaMonitoring();

    console.log("✅ AI Writer Module ready!");
}

function renderAIWriterSection() {
    if (document.getElementById('communication-hub')) {
        console.log("Section đã tồn tại, skip render.");
        return;
    }

    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
        console.error("Không tìm thấy .main-content");
        return;
    }

    const sectionHTML = `
    <section id="communication-hub" class="content-section">
        <h1>🤖 Truyền thông & AI Content</h1>
        <p style="color:var(--text-secondary); margin-bottom:20px;">
            Sử dụng Google Gemini AI để tạo nội dung chuyên nghiệp cho công tác Đoàn - Hội và Học tập.
        </p>

        <!-- API Key Status Panel -->
        <div id="api-key-panel" class="api-key-panel">
            <div class="api-key-section">
                <div class="api-key-info">
                    <span class="api-key-label">🔑 API Key:</span>
                    <span id="api-key-display" class="api-key-display">Chưa thiết lập</span>
                </div>
                <div class="api-key-actions">
                    <button id="btn-manage-key" class="btn-manage-key">⚙️ Quản lý Key</button>
                </div>
            </div>
            <div class="quota-section">
                <div class="quota-label">📊 Quota sử dụng:</div>
                <div class="quota-display">
                    <div class="quota-bar">
                        <div id="quota-progress" class="quota-progress" style="width: 0%"></div>
                    </div>
                    <div id="quota-text" class="quota-text">0/60 requests</div>
                </div>
            </div>
        </div>

        <!-- Cảnh báo hết quota -->
        <div id="quota-exceeded-warning" class="quota-warning" style="display:none;">
            <span style="font-size:1.2rem;">⏱️</span>
            <div>
                <strong>Đã vượt quá giới hạn!</strong><br>
                <span id="quota-countdown">Vui lòng đợi 60 giây...</span>
            </div>
        </div>

        <!-- Grid 10 công cụ -->
        <div class="ai-tools-grid">
            <div class="ai-tool-card" data-tool="activity-news">
                <div class="tool-icon">📰</div>
                <h3>Tin Hoạt Động</h3>
                <p>Viết tin hoạt động Đoàn - Hội chuyên nghiệp</p>
                <button class="btn-use-tool">Sử dụng</button>
            </div>

            <div class="ai-tool-card" data-tool="party-news">
                <div class="tool-icon">🚩</div>
                <h3>Tin Sinh hoạt</h3>
                <p>Viết tin sinh hoạt Chi bộ, Đảng bộ</p>
                <button class="btn-use-tool">Sử dụng</button>
            </div>

            <div class="ai-tool-card" data-tool="social-caption">
                <div class="tool-icon">📱</div>
                <h3>Caption MXH</h3>
                <p>Viết caption Facebook, Zalo, TikTok hấp dẫn</p>
                <button class="btn-use-tool">Sử dụng</button>
            </div>

            <div class="ai-tool-card" data-tool="activity-report">
                <div class="tool-icon">📊</div>
                <h3>Báo Cáo</h3>
                <p>Tổng hợp báo cáo hoạt động tháng/quý</p>
                <button class="btn-use-tool">Sử dụng</button>
            </div>

            <div class="ai-tool-card" data-tool="summarize-resolution">
                <div class="tool-icon">📜</div>
                <h3>Tóm tắt NQ</h3>
                <p>Tóm tắt Nghị quyết Đảng ngắn gọn</p>
                <button class="btn-use-tool">Sử dụng</button>
            </div>

            <div class="ai-tool-card" data-tool="campaign-post">
                <div class="tool-icon">📣</div>
                <h3>Kêu Gọi</h3>
                <p>Viết bài kêu gọi tham gia hoạt động</p>
                <button class="btn-use-tool">Sử dụng</button>
            </div>

            <div class="ai-tool-card" data-tool="video-script">
                <div class="tool-icon">🎬</div>
                <h3>Kịch Bản Video</h3>
                <p>Viết kịch bản TikTok, Reels ngắn</p>
                <button class="btn-use-tool">Sử dụng</button>
            </div>

            <div class="ai-tool-card" data-tool="formal-letter">
                <div class="tool-icon">📨</div>
                <h3>Thư Mời</h3>
                <p>Viết thư mời, thông báo chính thức</p>
                <button class="btn-use-tool">Sử dụng</button>
            </div>

            <div class="ai-tool-card" data-tool="improve-text">
                <div class="tool-icon">✏️</div>
                <h3>Chỉnh Sửa</h3>
                <p>Cải thiện văn bản, sửa lỗi</p>
                <button class="btn-use-tool">Sử dụng</button>
            </div>

            <div class="ai-tool-card" data-tool="translate">
                <div class="tool-icon">🌐</div>
                <h3>Dịch Thuật</h3>
                <p>Dịch văn bản Anh - Việt</p>
                <button class="btn-use-tool">Sử dụng</button>
            </div>
        </div>

        <!-- Khu vực kết quả -->
        <div id="ai-result-area" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h2 style="margin:0;">✨ Kết quả từ Gemini AI</h2>
                <button id="btn-copy-result" class="btn-copy">📋 Sao chép</button>
            </div>
            <div id="ai-output" class="ai-output"></div>
        </div>
    </section>
    `;

    mainContent.insertAdjacentHTML('beforeend', sectionHTML);
    createModals();
}

function createModals() {
    const modalsHTML = `
    <!-- Modal API Key Management -->
    <div id="api-key-modal" class="modal" style="display:none;">
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>🔑 Quản lý API Key</h2>
                <span class="close-btn" onclick="document.getElementById('api-key-modal').style.display='none'">&times;</span>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label><strong>Lấy API Key miễn phí:</strong></label>
                    <p style="font-size:0.9rem; color:var(--text-secondary); margin:5px 0 10px 0;">
                        1. Truy cập: <a href="https://ai.google.dev/" target="_blank">https://ai.google.dev/</a><br>
                        2. Click "Get API Key"<br>
                        3. Tạo project mới hoặc chọn project có sẵn<br>
                        4. Copy key (bắt đầu với "AIza...")
                    </p>
                </div>
                <div class="form-group">
                    <label>Nhập API Key:</label>
                    <input type="text" id="api-key-input" placeholder="AIzaSy..." style="width:100%;">
                </div>
                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button class="btn-generate" id="btn-save-key" style="flex:1;">💾 Lưu Key</button>
                    <button class="btn-setup" id="btn-delete-key" style="background:#dc3545;">🗑️ Xóa Key</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal công cụ -->
    <div id="ai-modal" class="modal" style="display:none;">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modal-title">Công cụ AI</h2>
                <span class="close-btn" id="close-ai-modal">&times;</span>
            </div>
            <div class="modal-body" id="modal-form-container">
                <!-- Form sẽ được inject động -->
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalsHTML);
}

function setupAIEvents() {
    // Click cards
    document.querySelectorAll('.ai-tool-card').forEach(card => {
        const toolId = card.getAttribute('data-tool');
        const btn = card.querySelector('.btn-use-tool');

        btn.addEventListener('click', () => {
            if (!hasApiKey()) {
                showNotification('Vui lòng thiết lập API Key trước!', 'error');
                openKeyManagementModal();
                return;
            }
            openToolModal(toolId);
        });
    });

    // Manage key button
    document.getElementById('btn-manage-key')?.addEventListener('click', openKeyManagementModal);

    // Save key
    document.getElementById('btn-save-key')?.addEventListener('click', () => {
        const keyInput = document.getElementById('api-key-input');
        const key = keyInput.value.trim();

        if (!key) {
            showNotification('Vui lòng nhập API Key!', 'error');
            return;
        }

        if (!key.startsWith('AIza')) {
            showNotification('API Key không đúng định dạng! (Phải bắt đầu với "AIza...")', 'error');
            return;
        }

        setApiKey(key);
        checkApiKeyStatus();
        updateQuotaDisplay();
        document.getElementById('api-key-modal').style.display = 'none';
        showNotification('✅ Đã lưu API Key!');
    });

    // Delete key
    document.getElementById('btn-delete-key')?.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn xóa API Key?')) {
            clearApiKey();
            checkApiKeyStatus();
            updateQuotaDisplay();
            document.getElementById('api-key-modal').style.display = 'none';
            showNotification('🗑️ Đã xóa API Key');
        }
    });

    // Close modal
    document.getElementById('close-ai-modal')?.addEventListener('click', closeModal);

    // Copy result
    document.getElementById('btn-copy-result')?.addEventListener('click', copyResult);
}

function openKeyManagementModal() {
    const modal = document.getElementById('api-key-modal');
    const input = document.getElementById('api-key-input');

    if (hasApiKey()) {
        const currentKey = getApiKey();
        input.value = currentKey.substring(0, 10) + '...' + currentKey.substring(currentKey.length - 4);
    } else {
        input.value = '';
    }

    modal.style.display = 'flex';
}

function openToolModal(toolId) {
    const modal = document.getElementById('ai-modal');
    const titleEl = document.getElementById('modal-title');
    const formContainer = document.getElementById('modal-form-container');

    const toolConfigs = {
        'activity-news': {
            title: '📰 Viết Tin Hoạt Động',
            fields: [
                { id: 'name', label: 'Tên hoạt động', type: 'text', placeholder: 'VD: Ngày hội Đoàn viên 2024' },
                { id: 'time', label: 'Thời gian', type: 'text', placeholder: 'VD: 15h00, 05/12/2024' },
                { id: 'location', label: 'Địa điểm', type: 'text', placeholder: 'VD: Hội trường A1' },
                { id: 'participants', label: 'Thành phần', type: 'text', placeholder: 'VD: 150 đoàn viên' },
                { id: 'content', label: 'Nội dung chính', type: 'textarea', placeholder: 'Mô tả diễn biến...' },
                { id: 'purpose', label: 'Mục đích/Ý nghĩa', type: 'textarea', placeholder: 'Tại sao tổ chức?' }
            ]
        },
        'party-news': {
            title: '🚩 Viết Tin Sinh hoạt Chi bộ',
            fields: [
                { id: 'name', label: 'Tên buổi sinh hoạt', type: 'text', placeholder: 'VD: Sinh hoạt Chi bộ tháng 12' },
                { id: 'time', label: 'Thời gian', type: 'text' },
                { id: 'host', label: 'Chủ trì', type: 'text', placeholder: 'VD: Đ/c Bí thư Chi bộ' },
                { id: 'content', label: 'Nội dung quán triệt', type: 'textarea' },
                { id: 'discussion', label: 'Ý kiến nổi bật', type: 'textarea' },
                { id: 'conclusion', label: 'Kết luận', type: 'textarea' }
            ]
        },
        'social-caption': {
            title: '📱 Viết Caption Mạng Xã Hội',
            fields: [
                { id: 'platform', label: 'Nền tảng', type: 'select', options: ['Facebook', 'Zalo', 'TikTok', 'Instagram'] },
                { id: 'content', label: 'Nội dung/Chủ đề', type: 'textarea', placeholder: 'Mô tả bạn muốn viết caption về gì...' }
            ]
        },
        'activity-report': {
            title: '📊 Báo Cáo Hoạt Động',
            fields: [
                { id: 'month', label: 'Tháng/Quý', type: 'text', placeholder: 'VD: Tháng 12/2024' },
                { id: 'count', label: 'Tổng số hoạt động', type: 'text', placeholder: 'VD: 5 hoạt động' },
                { id: 'highlights', label: 'Hoạt động nổi bật', type: 'textarea' },
                { id: 'participants', label: 'Tổng lượt tham gia', type: 'text' },
                { id: 'results', label: 'Kết quả đạt được', type: 'textarea' },
                { id: 'limitations', label: 'Khó khăn/Hạn chế', type: 'textarea' },
                { id: 'next_month', label: 'Phương hướng tháng tới', type: 'textarea' }
            ]
        },
        'summarize-resolution': {
            title: '📜 Tóm tắt Nghị quyết',
            fields: [
                { id: 'text', label: 'Nội dung Nghị quyết', type: 'textarea', placeholder: 'Dán toàn bộ nội dung Nghị quyết vào đây...', rows: 12 }
            ]
        },
        'campaign-post': {
            title: '📣 Bài Kêu Gọi Tham Gia',
            fields: [
                { id: 'name', label: 'Tên hoạt động', type: 'text' },
                { id: 'time', label: 'Thời gian', type: 'text' },
                { id: 'target', label: 'Đối tượng', type: 'text', placeholder: 'VD: Toàn thể đoàn viên' },
                { id: 'benefits', label: 'Quyền lợi', type: 'textarea', placeholder: 'Lợi ích khi tham gia' },
                { id: 'registration', label: 'Cách đăng ký', type: 'text', placeholder: 'Link/Form' }
            ]
        },
        'video-script': {
            title: '🎬 Kịch Bản Video Ngắn',
            fields: [
                { id: 'topic', label: 'Chủ đề', type: 'text', placeholder: 'VD: Giới thiệu hoạt động Đoàn' },
                { id: 'duration', label: 'Thời lượng', type: 'text', placeholder: 'VD: 30-60 giây' },
                { id: 'message', label: 'Thông điệp chính', type: 'textarea' },
                { id: 'audience', label: 'Đối tượng', type: 'text', placeholder: 'VD: Gen Z' }
            ]
        },
        'formal-letter': {
            title: '📨 Thư Mời / Thông Báo',
            fields: [
                { id: 'type', label: 'Loại văn bản', type: 'select', options: ['Thư mời', 'Thông báo', 'Giấy mời'] },
                { id: 'recipient', label: 'Người nhận', type: 'text', placeholder: 'VD: Quý Thầy/Cô' },
                { id: 'content', label: 'Nội dung chính', type: 'textarea' },
                { id: 'details', label: 'Thời gian/Địa điểm', type: 'text' }
            ]
        },
        'improve-text': {
            title: '✏️ Chỉnh Sửa Văn Bản',
            fields: [
                { id: 'text', label: 'Văn bản cần sửa', type: 'textarea', placeholder: 'Dán văn bản cần cải thiện...', rows: 10 }
            ]
        },
        'translate': {
            title: '🌐 Dịch Thuật',
            fields: [
                { id: 'text', label: 'Văn bản cần dịch', type: 'textarea', rows: 8 },
                { id: 'targetLang', label: 'Dịch sang', type: 'select', options: ['Tiếng Anh', 'Tiếng Việt', 'Tiếng Pháp'] }
            ]
        }
    };

    const config = toolConfigs[toolId];
    if (!config) return;

    titleEl.textContent = config.title;

    let formHTML = '<div class="ai-form">';
    config.fields.forEach(field => {
        formHTML += `<div class="form-group">`;
        formHTML += `<label>${field.label}</label>`;

        if (field.type === 'textarea') {
            formHTML += `<textarea id="field-${field.id}" placeholder="${field.placeholder || ''}" rows="${field.rows || 4}"></textarea>`;
        } else if (field.type === 'select') {
            formHTML += `<select id="field-${field.id}">`;
            field.options.forEach(opt => {
                formHTML += `<option value="${opt}">${opt}</option>`;
            });
            formHTML += `</select>`;
        } else {
            formHTML += `<input type="${field.type}" id="field-${field.id}" placeholder="${field.placeholder || ''}">`;
        }

        formHTML += `</div>`;
    });
    formHTML += `<button class="btn-generate" id="btn-generate-${toolId}">✨ Tạo nội dung</button>`;
    formHTML += `</div>`;

    formContainer.innerHTML = formHTML;

    document.getElementById(`btn-generate-${toolId}`).addEventListener('click', async () => {
        await handleGenerate(toolId, config.fields);
    });

    modal.style.display = 'flex';
}

async function handleGenerate(toolId, fields) {
    const data = {};
    fields.forEach(field => {
        const el = document.getElementById(`field-${field.id}`);
        data[field.id] = el ? el.value.trim() : '';
    });

    let prompt = '';
    switch (toolId) {
        case 'activity-news':
            prompt = PROMPTS.ACTIVITY_NEWS(data);
            break;
        case 'party-news':
            prompt = PROMPTS.PARTY_NEWS(data);
            break;
        case 'social-caption':
            prompt = PROMPTS.SOCIAL_CAPTION(data.content, data.platform);
            break;
        case 'activity-report':
            prompt = PROMPTS.ACTIVITY_REPORT(data);
            break;
        case 'summarize-resolution':
            prompt = PROMPTS.SUMMARIZE_RESOLUTION(data.text);
            break;
        case 'campaign-post':
            prompt = PROMPTS.CAMPAIGN_POST(data);
            break;
        case 'video-script':
            prompt = PROMPTS.VIDEO_SCRIPT(data);
            break;
        case 'formal-letter':
            prompt = PROMPTS.FORMAL_LETTER(data);
            break;
        case 'improve-text':
            prompt = PROMPTS.IMPROVE_TEXT(data.text);
            break;
        case 'translate':
            prompt = PROMPTS.TRANSLATE(data.text, data.targetLang);
            break;
    }

    try {
        toggleLoading(true);
        closeModal();

        const result = await generateContent(prompt);

        displayResult(result);
        showNotification('✅ Đã tạo nội dung thành công!');
        updateQuotaDisplay();

    } catch (error) {
        console.error(error);

        if (error instanceof QuotaExceededError) {
            showQuotaExceededWarning(error.waitTime);
            showNotification(`⏱️ ${error.message}`, 'error');
        } else {
            showNotification('Lỗi: ' + error.message, 'error');
        }
    } finally {
        toggleLoading(false);
    }
}

function displayResult(text) {
    const resultArea = document.getElementById('ai-result-area');
    const outputEl = document.getElementById('ai-output');

    if (resultArea && outputEl) {
        outputEl.textContent = text;
        resultArea.style.display = 'block';
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function copyResult() {
    const text = document.getElementById('ai-output').textContent;
    navigator.clipboard.writeText(text).then(() => {
        showNotification('📋 Đã sao chép vào clipboard!');
    });
}

function closeModal() {
    const modal = document.getElementById('ai-modal');
    if (modal) modal.style.display = 'none';
}

function checkApiKeyStatus() {
    const displayEl = document.getElementById('api-key-display');
    if (!displayEl) return;

    if (hasApiKey()) {
        const key = getApiKey();
        displayEl.textContent = `${key.substring(0, 10)}...${key.substring(key.length - 4)}`;
        displayEl.style.color = '#28a745';
    } else {
        displayEl.textContent = 'Chưa thiết lập';
        displayEl.style.color = '#dc3545';
    }
}

function updateQuotaDisplay() {
    const quotaInfo = getQuotaInfo();
    const progressBar = document.getElementById('quota-progress');
    const quotaText = document.getElementById('quota-text');

    if (progressBar && quotaText) {
        const percentage = (quotaInfo.used / quotaInfo.limit) * 100;
        progressBar.style.width = `${percentage}%`;

        // Đổi màu theo mức độ sử dụng
        if (percentage < 50) {
            progressBar.style.background = '#28a745';
        } else if (percentage < 80) {
            progressBar.style.background = '#ffc107';
        } else {
            progressBar.style.background = '#dc3545';
        }

        quotaText.textContent = `${quotaInfo.used}/${quotaInfo.limit} requests (Còn ${quotaInfo.remaining})`;
    }
}

function showQuotaExceededWarning(waitTime) {
    const warning = document.getElementById('quota-exceeded-warning');
    const countdown = document.getElementById('quota-countdown');

    if (warning && countdown) {
        warning.style.display = 'flex';

        let remaining = waitTime;
        const timer = setInterval(() => {
            remaining--;
            countdown.textContent = `Vui lòng đợi ${remaining} giây...`;

            if (remaining <= 0) {
                clearInterval(timer);
                warning.style.display = 'none';
                updateQuotaDisplay();
            }
        }, 1000);
    }
}

function startQuotaMonitoring() {
    updateQuotaDisplay();

    // Cập nhật quota mỗi 5 giây
    quotaUpdateInterval = setInterval(() => {
        updateQuotaDisplay();
    }, 5000);
}
