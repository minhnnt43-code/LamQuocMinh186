// ============================================================
// FILE: js/ai-onboarding.js
// Mục đích: AI Chatbot hỏi thông tin cá nhân người dùng
// ============================================================

import { showNotification } from './common.js';
import { aiPowerHub } from './ai-power-hub.js';

// Danh sách câu hỏi để thu thập thông tin (20 câu)
const ONBOARDING_QUESTIONS = [
    {
        id: 'occupation',
        question: 'Bạn đang học hay đi làm? Nếu học thì học ngành gì, trường nào? Nếu làm thì công việc gì?',
        placeholder: 'VD: Sinh viên Luật năm 3 trường ĐH Luật TP.HCM, làm thêm marketing freelance',
        category: 'basic'
    },
    {
        id: 'daily_schedule',
        question: 'Lịch trình hàng ngày của bạn như thế nào? (Giờ thức dậy, giờ học/làm việc, giờ nghỉ)',
        placeholder: 'VD: Dậy 6h, học buổi sáng 7h-11h, chiều làm việc 2h-6h, tối tự học',
        category: 'schedule'
    },
    {
        id: 'current_focus',
        question: 'Hiện tại bạn đang tập trung vào điều gì? (Các môn học, dự án, mục tiêu ngắn hạn)',
        placeholder: 'VD: Ôn thi cuối kỳ 3 môn, hoàn thành dự án marketing cho client A',
        category: 'focus'
    },
    {
        id: 'challenges',
        question: 'Bạn đang gặp khó khăn gì trong việc quản lý thời gian hoặc công việc?',
        placeholder: 'VD: Hay quên deadline, khó tập trung, nhiều việc cùng lúc',
        category: 'challenges'
    },
    {
        id: 'goals',
        question: 'Mục tiêu của bạn trong 1-3 tháng tới là gì?',
        placeholder: 'VD: Đạt GPA 3.5, hoàn thành 5 dự án freelance, tập gym đều đặn',
        category: 'goals'
    },
    {
        id: 'preferences',
        question: 'Bạn thích làm việc vào thời điểm nào trong ngày? Thích được nhắc nhở như thế nào?',
        placeholder: 'VD: Làm việc hiệu quả nhất buổi sáng, thích được nhắc trước 1 ngày',
        category: 'preferences'
    },
    {
        id: 'hobbies',
        question: 'Sở thích và hoạt động giải trí của bạn là gì?',
        placeholder: 'VD: Chơi guitar, đọc sách self-help, đi cafe với bạn bè cuối tuần',
        category: 'lifestyle'
    },
    {
        id: 'stress_management',
        question: 'Khi căng thẳng, bạn thường làm gì để thư giãn?',
        placeholder: 'VD: Nghe nhạc, chạy bộ, nói chuyện với bạn thân',
        category: 'wellness'
    },
    {
        id: 'learning_style',
        question: 'Bạn học/làm việc hiệu quả nhất theo cách nào? (Đọc, nghe, thực hành, nhóm...)',
        placeholder: 'VD: Thích học qua video, làm bài tập thực hành, học nhóm 2-3 người',
        category: 'learning'
    },
    {
        id: 'productivity_tools',
        question: 'Bạn đang dùng công cụ/app nào để quản lý công việc? (Nếu có)',
        placeholder: 'VD: Google Calendar, Notion, Todoist, hoặc chưa dùng gì',
        category: 'tools'
    },
    {
        id: 'work_environment',
        question: 'Bạn thích làm việc ở đâu? Môi trường như thế nào giúp bạn tập trung nhất?',
        placeholder: 'VD: Thư viện yên tĩnh, quán cafe có nhạc nhẹ, ở nhà có đèn đủ sáng',
        category: 'environment'
    },
    {
        id: 'priorities',
        question: 'Trong cuộc sống, điều gì quan trọng nhất với bạn? (Sự nghiệp, gia đình, sức khỏe, tài chính...)',
        placeholder: 'VD: Sự nghiệp và phát triển bản thân ưu tiên số 1, sau đó là sức khỏe',
        category: 'values'
    },
    {
        id: 'sleep_schedule',
        question: 'Bạn thường ngủ lúc mấy giờ và ngủ bao nhiêu tiếng mỗi đêm?',
        placeholder: 'VD: Ngủ 11h tối, dậy 6h sáng, ngủ 7 tiếng',
        category: 'health'
    },
    {
        id: 'exercise_routine',
        question: 'Bạn có tập thể dục/thể thao không? Bao lâu một lần?',
        placeholder: 'VD: Chạy bộ 3 lần/tuần buổi sáng, gym 2 lần/tuần, hoặc chưa tập gì',
        category: 'health'
    },
    {
        id: 'social_needs',
        question: 'Bạn là người hướng nội hay hướng ngoại? Cần bao nhiêu thời gian giao lưu mỗi tuần?',
        placeholder: 'VD: Hướng nội, thích ở nhà, chỉ gặp bạn bè 1-2 lần/tuần',
        category: 'social'
    },
    {
        id: 'motivation',
        question: 'Điều gì thúc đẩy bạn mỗi ngày? (Động lực làm việc/học tập)',
        placeholder: 'VD: Muốn kiếm tiền để tự lập, làm cha mẹ tự hào, đam mê ngành nghề',
        category: 'motivation'
    },
    {
        id: 'future_vision',
        question: 'Bạn thấy mình sẽ ở đâu trong 3-5 năm tới?',
        placeholder: 'VD: Tốt nghiệp, làm việc tại công ty lớn, có thu nhập ổn định, học thêm MBA',
        category: 'long_term'
    },
    {
        id: 'energy_peaks',
        question: 'Khoảng thời gian nào trong ngày bạn cảm thấy năng lượng nhất? Khi nào mệt nhất?',
        placeholder: 'VD: Năng lượng cao 9h-12h sáng, mệt nhất 2h-4h chiều',
        category: 'energy'
    },
    {
        id: 'productivity_blockers',
        question: 'Điều gì thường làm bạn mất tập trung hoặc trì hoãn công việc?',
        placeholder: 'VD: Mạng xã hội, tin nhắn liên tục, không có deadline rõ ràng',
        category: 'blockers'
    },
    {
        id: 'support_system',
        question: 'Khi gặp khó khăn, bạn thường tìm đến ai hoặc làm gì?',
        placeholder: 'VD: Nói chuyện với gia đình, tìm mentor, tự research giải pháp online',
        category: 'support'
    }
];

// User Profile data structure
let userProfile = {
    occupation: '',
    daily_schedule: '',
    current_focus: '',
    challenges: '',
    goals: '',
    preferences: '',
    hobbies: '',
    stress_management: '',
    learning_style: '',
    productivity_tools: '',
    work_environment: '',
    priorities: '',
    sleep_schedule: '',
    exercise_routine: '',
    social_needs: '',
    motivation: '',
    future_vision: '',
    energy_peaks: '',
    productivity_blockers: '',
    support_system: '',
    lastUpdated: null,
    isComplete: false
};

// Current state
let currentQuestionIndex = 0;
let chatHistory = [];

// ============================================================
// CORE FUNCTIONS
// ============================================================

function loadProfile() {
    try {
        const saved = localStorage.getItem('ai_user_profile');
        if (saved) {
            userProfile = JSON.parse(saved);
            return true;
        }
    } catch (e) {
        console.error('Lỗi load profile:', e);
    }
    return false;
}

function saveProfile() {
    try {
        userProfile.lastUpdated = new Date().toISOString();
        localStorage.setItem('ai_user_profile', JSON.stringify(userProfile));
        return true;
    } catch (e) {
        console.error('Lỗi save profile:', e);
        return false;
    }
}

function getProgress() {
    const answered = ONBOARDING_QUESTIONS.filter(q => userProfile[q.id] && userProfile[q.id].trim()).length;
    return Math.round((answered / ONBOARDING_QUESTIONS.length) * 100);
}

// ============================================================
// UI RENDER FUNCTIONS
// ============================================================

function renderOnboardingUI() {
    const container = document.getElementById('ai-onboarding-container');
    if (!container) return;

    const progress = getProgress();
    const hasProfile = loadProfile() && progress > 0;

    container.innerHTML = `
        <div class="onboarding-chat-container">
            <!-- Progress Bar -->
            <div class="onboarding-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <span class="progress-text">${progress}% hoàn thành</span>
            </div>

            <!-- Chat Messages Area -->
            <div class="onboarding-messages" id="onboarding-messages">
                <!-- Messages will be rendered here -->
            </div>

            <!-- Input Area -->
            <div class="onboarding-input-area">
                <textarea id="onboarding-input" 
                    placeholder="Nhập câu trả lời của bạn..." 
                    rows="3"></textarea>
                <div class="onboarding-actions">
                    <button id="btn-onboarding-send" class="btn-send">
                        📤 Gửi
                    </button>
                    ${hasProfile ? `
                        <button id="btn-onboarding-reset" class="btn-reset">
                            🔄 Bắt đầu lại
                        </button>
                        <button id="btn-onboarding-view" class="btn-view">
                            👤 Xem profile
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    setupOnboardingEvents();
    startConversation();
}

function addMessage(role, content, isTyping = false) {
    const messagesContainer = document.getElementById('onboarding-messages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `onboarding-message ${role}`;

    if (isTyping) {
        messageDiv.innerHTML = `
            <div class="message-content typing">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
        `;
    } else {
        const icon = role === 'ai' ? '🤖' : '👤';
        messageDiv.innerHTML = `
            <div class="message-icon">${icon}</div>
            <div class="message-content">${content}</div>
        `;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageDiv;
}

function removeTypingIndicator() {
    const typing = document.querySelector('.onboarding-message .typing');
    if (typing) {
        typing.closest('.onboarding-message').remove();
    }
}

function updateProgress() {
    const progress = getProgress();
    const progressFill = document.querySelector('.onboarding-progress .progress-fill');
    const progressText = document.querySelector('.onboarding-progress .progress-text');

    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${progress}% hoàn thành`;
}

// ============================================================
// CONVERSATION LOGIC
// ============================================================

async function startConversation() {
    loadProfile();
    chatHistory = [];

    // Find first unanswered question
    currentQuestionIndex = ONBOARDING_QUESTIONS.findIndex(q => !userProfile[q.id] || !userProfile[q.id].trim());

    if (currentQuestionIndex === -1) {
        // All questions answered
        currentQuestionIndex = ONBOARDING_QUESTIONS.length;
        addMessage('ai', `🎉 Tuyệt vời! Tôi đã hiểu về bạn rồi!<br><br>
            <strong>Tóm tắt:</strong><br>
            📚 ${userProfile.occupation || 'Chưa có thông tin'}<br>
            ⏰ ${userProfile.daily_schedule || 'Chưa có thông tin'}<br>
            🎯 ${userProfile.current_focus || 'Chưa có thông tin'}<br><br>
            Bạn có thể nhấn <strong>"👤 Xem profile"</strong> để xem đầy đủ hoặc <strong>"🔄 Bắt đầu lại"</strong> để cập nhật thông tin.`);
        userProfile.isComplete = true;
        saveProfile();
    } else {
        // Greet and ask first question
        const greeting = currentQuestionIndex === 0
            ? `Xin chào! 👋 Tôi là trợ lý AI của bạn. Để hỗ trợ bạn tốt hơn, tôi muốn hiểu về bạn một chút nhé!`
            : `Chào mừng trở lại! Hãy tiếp tục chia sẻ với tôi nhé.`;

        addMessage('ai', greeting);

        setTimeout(() => {
            askNextQuestion();
        }, 1000);
    }
}

function askNextQuestion() {
    if (currentQuestionIndex >= ONBOARDING_QUESTIONS.length) {
        // Complete!
        addMessage('ai', `🎉 Cảm ơn bạn đã chia sẻ! Tôi đã hiểu về bạn rồi.<br><br>
            Từ giờ, tôi sẽ sử dụng những thông tin này để:<br>
            ✅ Gợi ý công việc phù hợp hơn<br>
            ✅ Nhắc nhở đúng thời điểm<br>
            ✅ Hiểu ngữ cảnh khi bạn hỏi<br><br>
            Bạn có thể cập nhật thông tin bất cứ lúc nào!`);
        userProfile.isComplete = true;
        saveProfile();
        updateProgress();
        return;
    }

    const question = ONBOARDING_QUESTIONS[currentQuestionIndex];
    const input = document.getElementById('onboarding-input');

    addMessage('ai', `<strong>Câu ${currentQuestionIndex + 1}/${ONBOARDING_QUESTIONS.length}:</strong><br>${question.question}`);

    if (input) {
        input.placeholder = question.placeholder;
        input.focus();
    }
}

async function handleUserResponse() {
    const input = document.getElementById('onboarding-input');
    if (!input) return;

    const answer = input.value.trim();
    if (!answer) {
        showNotification('Vui lòng nhập câu trả lời', 'error');
        return;
    }

    // Add user message
    addMessage('user', answer);
    input.value = '';

    // Save answer
    const question = ONBOARDING_QUESTIONS[currentQuestionIndex];
    if (question) {
        userProfile[question.id] = answer;
        saveProfile();
        updateProgress();
    }

    // Show typing indicator
    addMessage('ai', '', true);

    // Use AI to generate a natural follow-up response
    try {
        const aiResponse = await generateAIResponse(question, answer);
        removeTypingIndicator();
        addMessage('ai', aiResponse);
    } catch (error) {
        removeTypingIndicator();
        addMessage('ai', 'Cảm ơn bạn! Tôi đã ghi nhận.');
    }

    // Move to next question
    currentQuestionIndex++;

    setTimeout(() => {
        askNextQuestion();
    }, 1500);
}

async function generateAIResponse(question, answer) {
    try {
        const result = await aiPowerHub.call(`
            Bạn là trợ lý AI thân thiện. User vừa trả lời câu hỏi:
            Câu hỏi: "${question.question}"
            Trả lời: "${answer}"
            
            Hãy phản hồi ngắn gọn (1-2 câu), thân thiện, công nhận câu trả lời và khuyến khích họ.
            Chỉ trả lời bằng tiếng Việt, không cần giải thích thêm.
        `, { maxTokens: 100 });

        return result.content || 'Cảm ơn bạn đã chia sẻ! 👍';
    } catch (error) {
        console.error('AI response error:', error);
        return 'Cảm ơn bạn đã chia sẻ! Tôi đã ghi nhận rồi. 👍';
    }
}

// ============================================================
// PROFILE VIEWER
// ============================================================

function showProfileModal() {
    loadProfile();

    const modal = document.createElement('div');
    modal.className = 'onboarding-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <h3>👤 Thông tin của bạn</h3>
            <div class="profile-details">
                ${ONBOARDING_QUESTIONS.map(q => `
                    <div class="profile-item">
                        <label>${q.question}</label>
                        <p>${userProfile[q.id] || '<em>Chưa có thông tin</em>'}</p>
                    </div>
                `).join('')}
            </div>
            <div class="modal-actions">
                <button class="btn-close">Đóng</button>
            </div>
            ${userProfile.lastUpdated ? `
                <small style="color: #888; margin-top: 10px; display: block;">
                    Cập nhật lần cuối: ${new Date(userProfile.lastUpdated).toLocaleString('vi-VN')}
                </small>
            ` : ''}
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.btn-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());
}

function resetProfile() {
    if (!confirm('Bạn có chắc muốn xóa hết thông tin và bắt đầu lại?')) return;

    userProfile = {
        occupation: '',
        daily_schedule: '',
        current_focus: '',
        challenges: '',
        goals: '',
        preferences: '',
        hobbies: '',
        stress_management: '',
        learning_style: '',
        productivity_tools: '',
        work_environment: '',
        priorities: '',
        sleep_schedule: '',
        exercise_routine: '',
        social_needs: '',
        motivation: '',
        future_vision: '',
        energy_peaks: '',
        productivity_blockers: '',
        support_system: '',
        lastUpdated: null,
        isComplete: false
    };
    saveProfile();
    currentQuestionIndex = 0;

    renderOnboardingUI();
    showNotification('Đã reset! Bắt đầu lại từ đầu.', 'success');
}

// ============================================================
// EVENT SETUP
// ============================================================

function setupOnboardingEvents() {
    const sendBtn = document.getElementById('btn-onboarding-send');
    const resetBtn = document.getElementById('btn-onboarding-reset');
    const viewBtn = document.getElementById('btn-onboarding-view');
    const input = document.getElementById('onboarding-input');

    if (sendBtn) {
        sendBtn.addEventListener('click', handleUserResponse);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetProfile);
    }

    if (viewBtn) {
        viewBtn.addEventListener('click', showProfileModal);
    }

    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleUserResponse();
            }
        });
    }
}

// ============================================================
// INIT & EXPORT
// ============================================================

export function initAIOnboarding() {
    console.log('✅ AI Onboarding đã sẵn sàng');

    // Render khi section được active
    const menuBtn = document.querySelector('[data-target="ai-onboarding"]');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            setTimeout(() => {
                renderOnboardingUI();
            }, 100);
        });
    }
}

export function getUserProfile() {
    loadProfile();
    return userProfile;
}

export function getProfileContext() {
    loadProfile();
    if (!userProfile.isComplete) return '';

    return `
        Thông tin người dùng:
        - Nghề nghiệp/Học vấn: ${userProfile.occupation}
        - Lịch trình hàng ngày: ${userProfile.daily_schedule}
        - Đang tập trung: ${userProfile.current_focus}
        - Thách thức: ${userProfile.challenges}
        - Mục tiêu: ${userProfile.goals}
        - Sở thích làm việc: ${userProfile.preferences}
    `;
}

export { userProfile, ONBOARDING_QUESTIONS };
