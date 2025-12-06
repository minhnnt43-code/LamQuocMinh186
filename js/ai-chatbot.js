// --- FILE: js/ai-chatbot.js ---
// AI Chatbot Widget - Phase 6 (126-145)

import { aiService } from './ai-service.js';
import { showNotification, escapeHTML, formatAIContent } from './common.js';

let globalData = null;
let currentUser = null;
let chatHistory = [];

/**
 * Khởi tạo AI Chatbot
 */
export const initAIChatbot = (data, user) => {
    globalData = data;
    currentUser = user;
    setupChatbotEvents();
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
 * Gửi tin nhắn
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
        // Gọi AI với context
        const context = getUserContext();
        const systemPrompt = `Bạn là LQM AI Assistant - trợ lý thông minh cá nhân cho sinh viên Luật Lâm Quốc Minh.
${context}

Quy tắc:
- Trả lời ngắn gọn, súc tích (tối đa 3-4 câu trừ khi cần chi tiết)
- Sử dụng emoji phù hợp
- Luôn thân thiện và động viên
- Nếu được hỏi về tasks/lịch, tham khảo context ở trên
- Nếu không biết, nói thật và đề xuất cách tìm hiểu
- Trả lời bằng tiếng Việt`;

        const response = await aiService.ask(message, { systemPrompt });

        hideTyping();
        addMessage(response);
        chatHistory.push({ role: 'assistant', content: response });

    } catch (error) {
        hideTyping();
        addMessage('Xin lỗi, có lỗi xảy ra. Vui lòng thử lại! 😅');
        console.error('Chatbot error:', error);
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

    // Quick prompts
    document.querySelectorAll('.quick-prompt').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            if (prompt) sendMessage(prompt);
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
