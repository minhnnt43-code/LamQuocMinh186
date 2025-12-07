// --- FILE: js/ai-chatbot.js ---
// AI Chatbot Widget - Phase 6 (126-145) + Phase G Upgrades

import { aiService } from './ai-service.js';
import { showNotification, escapeHTML, formatAIContent } from './common.js';

let globalData = null;
let currentUser = null;
let chatHistory = [];

// #57 - AI Personas
const AI_PERSONAS = {
    assistant: {
        name: 'Trợ lý',
        icon: '🤖',
        prompt: 'Bạn là LQM AI Assistant - trợ lý thông minh thân thiện cho sinh viên.'
    },
    teacher: {
        name: 'Gia sư',
        icon: '👨‍🏫',
        prompt: 'Bạn là gia sư kiên nhẫn, giải thích chi tiết từng bước, sử dụng ví dụ dễ hiểu.'
    },
    lawyer: {
        name: 'Luật sư',
        icon: '⚖️',
        prompt: 'Bạn là chuyên gia pháp luật, trả lời chính xác về thuật ngữ và quy định pháp luật Việt Nam.'
    },
    coach: {
        name: 'Coach',
        icon: '💪',
        prompt: 'Bạn là life coach động viên, giúp đặt mục tiêu và quản lý thời gian hiệu quả.'
    },
    creative: {
        name: 'Sáng tạo',
        icon: '🎨',
        prompt: 'Bạn là người sáng tạo, giúp brainstorm ý tưởng mới lạ và đột phá.'
    }
};

let currentPersona = 'assistant';

// #60 - Memory Context (lưu conversation context)
const loadChatMemory = () => {
    try {
        const saved = localStorage.getItem('ai_chat_memory');
        return saved ? JSON.parse(saved) : { summaries: [], preferences: {} };
    } catch (e) {
        return { summaries: [], preferences: {} };
    }
};

const saveChatMemory = (memory) => {
    localStorage.setItem('ai_chat_memory', JSON.stringify(memory));
};

let chatMemory = loadChatMemory();

/**
 * Khởi tạo AI Chatbot
 */
export const initAIChatbot = (data, user) => {
    globalData = data;
    currentUser = user;
    setupChatbotEvents();
    renderPersonaSelector();
};

/**
 * Lấy context từ dữ liệu người dùng
 */
const getUserContext = () => {
    const tasks = globalData?.tasks || [];
    const events = globalData?.calendarEvents || [];
    const pendingTasks = tasks.filter(t => t.status !== 'Hoàn thành');
    const todayTasks = pendingTasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        const today = new Date();
        return due.toDateString() === today.toDateString();
    });

    return `
CONTEXT - Thông tin người dùng:
- Tên: ${currentUser?.displayName || 'User'}
- Ngày hiện tại: ${new Date().toLocaleDateString('vi-VN')}
- Giờ hiện tại: ${new Date().toLocaleTimeString('vi-VN')}
- Tasks chưa hoàn thành: ${pendingTasks.length}
- Tasks hôm nay: ${todayTasks.length}
- Sự kiện lịch: ${events.length}
${todayTasks.length > 0 ? `- Chi tiết tasks hôm nay: ${todayTasks.map(t => t.title).join(', ')}` : ''}
`;
};

/**
 * Thêm tin nhắn vào chat
 */
const addMessage = (content, isUser = false) => {
    const container = document.getElementById('chatbot-messages');
    const msg = document.createElement('div');
    msg.className = `chat-msg ${isUser ? 'user' : 'ai'}`;
    msg.style.cssText = isUser
        ? 'padding: 12px 16px; background: #e3f2fd; color: #333; border-radius: 18px 18px 4px 18px; max-width: 85%; align-self: flex-end; line-height: 1.5;'
        : 'padding: 12px 16px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 18px 18px 18px 4px; max-width: 85%; line-height: 1.5;';
    msg.innerHTML = isUser ? escapeHTML(content) : formatAIContent(content);
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
};

/**
 * Thêm typing indicator
 */
const showTyping = () => {
    const container = document.getElementById('chatbot-messages');
    const typing = document.createElement('div');
    typing.id = 'typing-indicator';
    typing.style.cssText = 'padding: 12px 16px; background: #f0f0f0; border-radius: 18px; max-width: 80px;';
    typing.innerHTML = '<span style="animation: pulse 1s infinite;">💭 ...</span>';
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
};

const hideTyping = () => {
    document.getElementById('typing-indicator')?.remove();
};

/**
 * Gửi tin nhắn - sử dụng persona hiện tại (#57)
 */
const sendMessage = async (message) => {
    if (!message.trim()) return;

    // Thêm tin nhắn user
    addMessage(message, true);
    chatHistory.push({ role: 'user', content: message });

    // Clear input
    document.getElementById('chatbot-input').value = '';

    // Show typing
    showTyping();

    try {
        const context = getUserContext();
        const persona = AI_PERSONAS[currentPersona];

        // #60 - Memory context
        const memoryContext = chatMemory.summaries.length > 0
            ? `\nTóm tắt hội thoại trước: ${chatMemory.summaries.slice(-3).join('. ')}`
            : '';

        const systemPrompt = `${persona.prompt}
${context}
${memoryContext}

Quy tắc:
- Trả lời ngắn gọn, súc tích (tối đa 3-4 câu trừ khi cần chi tiết)
- Sử dụng emoji phù hợp
- Luôn thân thiện và động viên
- Nếu được hỏi về tasks/lịch, tham khảo context
- Trả lời bằng tiếng Việt
- Persona hiện tại: ${persona.icon} ${persona.name}`;

        const response = await aiService.ask(message, { systemPrompt });

        hideTyping();
        addMessage(response);
        chatHistory.push({ role: 'assistant', content: response });

        // #60 - Lưu summary định kỳ (mỗi 5 tin nhắn)
        if (chatHistory.length % 10 === 0 && chatHistory.length > 0) {
            const recentMsgs = chatHistory.slice(-10).map(m => m.content.substring(0, 100)).join(' ');
            chatMemory.summaries.push(recentMsgs.substring(0, 200));
            if (chatMemory.summaries.length > 10) chatMemory.summaries.shift();
            saveChatMemory(chatMemory);
        }

    } catch (error) {
        hideTyping();
        addMessage('Xin lỗi, có lỗi xảy ra. Vui lòng thử lại! 😅');
        console.error('Chatbot error:', error);
    }
};

/**
 * #57 - Render persona selector
 */
const renderPersonaSelector = () => {
    const container = document.getElementById('chatbot-personas');
    if (!container) return;

    container.innerHTML = Object.entries(AI_PERSONAS).map(([key, p]) => `
        <button class="persona-btn ${key === currentPersona ? 'active' : ''}" 
                data-persona="${key}" 
                title="${p.name}"
                style="padding: 5px 10px; border: 1px solid ${key === currentPersona ? '#667eea' : '#ddd'}; 
                       border-radius: 20px; background: ${key === currentPersona ? '#667eea' : 'white'}; 
                       color: ${key === currentPersona ? 'white' : '#333'}; cursor: pointer; font-size: 0.8rem;">
            ${p.icon} ${p.name}
        </button>
    `).join('');

    container.querySelectorAll('.persona-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPersona = btn.dataset.persona;
            renderPersonaSelector();
            showNotification(`Đã chuyển sang ${AI_PERSONAS[currentPersona].icon} ${AI_PERSONAS[currentPersona].name}`);
        });
    });
};

/**
 * #62 - Daily Briefing
 */
const getDailyBriefing = async () => {
    showTyping();
    try {
        const tasks = globalData?.tasks || [];
        const events = globalData?.calendarEvents || [];
        const today = new Date().toISOString().split('T')[0];

        const todayTasks = tasks.filter(t => t.dueDate === today && t.status !== 'Hoàn thành');
        const todayEvents = events.filter(e => e.date === today);

        const prompt = `Tạo tóm tắt buổi sáng ngắn gọn cho tôi:
- ${todayTasks.length} công việc cần làm hôm nay: ${todayTasks.map(t => t.name).join(', ') || 'Không có'}
- ${todayEvents.length} sự kiện: ${todayEvents.map(e => `${e.title} (${e.startTime})`).join(', ') || 'Không có'}
Đưa ra 2-3 gợi ý để bắt đầu ngày hiệu quả.`;

        const response = await aiService.ask(prompt, { systemPrompt: 'Bạn là trợ lý morning briefing.' });
        hideTyping();
        addMessage(response);
    } catch (e) {
        hideTyping();
        addMessage('Không thể tạo daily briefing.');
    }
};

/**
 * #63 - Weekly Review
 */
const getWeeklyReview = async () => {
    showTyping();
    try {
        const tasks = globalData?.tasks || [];
        const completedThisWeek = tasks.filter(t => t.status === 'Hoàn thành').length;
        const pending = tasks.filter(t => t.status !== 'Hoàn thành').length;

        const prompt = `Tạo đánh giá tuần ngắn gọn:
- Đã hoàn thành: ${completedThisWeek} công việc
- Chưa xong: ${pending} công việc
Phân tích năng suất và đưa ra 2-3 đề xuất cải thiện cho tuần tới.`;

        const response = await aiService.ask(prompt, { systemPrompt: 'Bạn là productivity coach.' });
        hideTyping();
        addMessage(response);
    } catch (e) {
        hideTyping();
        addMessage('Không thể tạo weekly review.');
    }
};

/**
 * Setup events
 */
const setupChatbotEvents = () => {
    const toggleBtn = document.getElementById('btn-chatbot-toggle');
    const closeBtn = document.getElementById('btn-chatbot-close');
    const sendBtn = document.getElementById('btn-chatbot-send');
    const input = document.getElementById('chatbot-input');
    const window_ = document.getElementById('chatbot-window');

    // Toggle chatbot
    toggleBtn?.addEventListener('click', () => {
        const isOpen = window_.style.display === 'flex';
        window_.style.display = isOpen ? 'none' : 'flex';
        if (!isOpen) input?.focus();
    });

    // Close
    closeBtn?.addEventListener('click', () => {
        window_.style.display = 'none';
    });

    // Send message
    sendBtn?.addEventListener('click', () => {
        sendMessage(input.value);
    });

    // Enter key
    input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input.value);
        }
    });

    // Quick prompts + Briefings
    document.querySelectorAll('.quick-prompt').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            if (prompt === 'daily-briefing') {
                getDailyBriefing();
            } else if (prompt === 'weekly-review') {
                getWeeklyReview();
            } else if (prompt) {
                sendMessage(prompt);
            }
        });
    });

    // Hover effect on toggle button
    toggleBtn?.addEventListener('mouseenter', () => {
        toggleBtn.style.transform = 'scale(1.1)';
    });
    toggleBtn?.addEventListener('mouseleave', () => {
        toggleBtn.style.transform = 'scale(1)';
    });
};

// Export briefing functions for external use
export { getDailyBriefing, getWeeklyReview };
