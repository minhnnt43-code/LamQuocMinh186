/* ═══════════════════════════════════════════════════════════════
   AI CHAT / INTERVIEW MODULE
   Thu thập thông tin cá nhân để cá nhân hóa lá số
   ═══════════════════════════════════════════════════════════════ */

const AIChat = {
    // Danh sách câu hỏi phỏng vấn
    INTERVIEW_QUESTIONS: [
        {
            id: 'occupation',
            category: 'work',
            question: '👔 Bạn đang làm công việc gì hoặc học ngành gì?',
            placeholder: 'VD: Sinh viên ngành Luật, Nhân viên Marketing...',
            followUp: true
        },
        {
            id: 'work_status',
            category: 'work',
            question: '📊 Tình hình công việc/học tập hiện tại của bạn thế nào?',
            placeholder: 'VD: Đang ổn định, đang tìm việc mới, áp lực deadline...',
            followUp: true
        },
        {
            id: 'relationship_status',
            category: 'relationship',
            question: '💕 Tình trạng hôn nhân/yêu đương hiện tại?',
            options: ['Độc thân', 'Đang hẹn hò', 'Đã kết hôn', 'Đã ly hôn', 'Phức tạp'],
            followUp: true
        },
        {
            id: 'relationship_detail',
            category: 'relationship',
            question: '💭 Có điều gì về tình cảm bạn muốn chia sẻ thêm?',
            placeholder: 'VD: Mới chia tay, đang crush ai đó, hôn nhân hạnh phúc...',
            optional: true
        },
        {
            id: 'family',
            category: 'family',
            question: '👨‍👩‍👧‍👦 Tình hình gia đình hiện tại?',
            placeholder: 'VD: Ở cùng bố mẹ, sống một mình, có con nhỏ...',
            followUp: true
        },
        {
            id: 'health',
            category: 'health',
            question: '🏥 Sức khỏe gần đây thế nào?',
            options: ['Rất tốt', 'Bình thường', 'Hơi mệt', 'Đang có vấn đề', 'Không muốn nói'],
            followUp: true
        },
        {
            id: 'finance',
            category: 'finance',
            question: '💰 Tình hình tài chính hiện tại?',
            options: ['Dư dả', 'Đủ sống', 'Hơi chật', 'Khó khăn', 'Không muốn nói'],
            followUp: true
        },
        {
            id: 'goals',
            category: 'goals',
            question: '🎯 Mục tiêu lớn nhất của bạn trong năm nay là gì?',
            placeholder: 'VD: Lên chức, tốt nghiệp, mua nhà, kết hôn...',
            followUp: true
        },
        {
            id: 'concerns',
            category: 'concerns',
            question: '😰 Điều gì đang khiến bạn lo lắng nhất?',
            placeholder: 'VD: Công việc không ổn, tình cảm rắc rối, tiền bạc...',
            followUp: true
        },
        {
            id: 'wish',
            category: 'spiritual',
            question: '✨ Bạn muốn AI tập trung luận giải về khía cạnh nào?',
            options: ['Sự nghiệp', 'Tình duyên', 'Tài lộc', 'Sức khỏe', 'Tổng quan'],
            followUp: false
        }
    ],

    currentQuestionIndex: 0,
    answers: {},
    chatHistory: [],
    isInterviewing: false,

    // Bắt đầu phỏng vấn
    startInterview() {
        this.currentQuestionIndex = 0;
        this.answers = {};
        this.chatHistory = [];
        this.isInterviewing = true;

        // Tin nhắn chào
        this.addMessage('ai', `Xin chào ${App.activeProfile?.name || 'bạn'}! 🌙\n\nTôi sẽ hỏi bạn một số câu hỏi để hiểu rõ hơn về cuộc sống hiện tại của bạn. Điều này giúp lá số chính xác và phù hợp hơn.\n\nBạn có thể bỏ qua bất kỳ câu hỏi nào không muốn trả lời.`);

        setTimeout(() => this.askNextQuestion(), 1500);
    },

    // Hỏi câu tiếp theo
    askNextQuestion() {
        if (this.currentQuestionIndex >= this.INTERVIEW_QUESTIONS.length) {
            this.finishInterview();
            return;
        }

        const q = this.INTERVIEW_QUESTIONS[this.currentQuestionIndex];
        this.addMessage('ai', q.question, q.options, q.placeholder, q.optional);
    },

    // Xử lý câu trả lời
    handleAnswer(answer) {
        if (!this.isInterviewing) return;

        const q = this.INTERVIEW_QUESTIONS[this.currentQuestionIndex];

        // Lưu câu trả lời
        if (answer && answer.trim()) {
            this.answers[q.id] = answer.trim();
            this.addMessage('user', answer);
        } else if (q.optional) {
            this.addMessage('user', '(Bỏ qua)');
        } else {
            this.addMessage('user', '(Không trả lời)');
        }

        this.currentQuestionIndex++;

        // Chờ một chút rồi hỏi tiếp
        setTimeout(() => this.askNextQuestion(), 800);
    },

    // Bỏ qua câu hỏi
    skipQuestion() {
        const q = this.INTERVIEW_QUESTIONS[this.currentQuestionIndex];
        this.addMessage('user', '(Bỏ qua)');
        this.currentQuestionIndex++;
        setTimeout(() => this.askNextQuestion(), 500);
    },

    // Kết thúc phỏng vấn
    async finishInterview() {
        this.isInterviewing = false;

        // Lưu context vào profile
        if (App.activeProfile) {
            App.activeProfile.lifeContext = {
                ...this.answers,
                updatedAt: new Date().toISOString()
            };
            await Storage.saveSecure('profiles', App.profiles, App.currentPassword);
        }

        this.addMessage('ai', `Cảm ơn bạn đã chia sẻ! 💫\n\nTôi đã ghi nhận thông tin của bạn. Giờ đây, tất cả các phân tích lá số sẽ được cá nhân hóa dựa trên tình huống thực tế của bạn.\n\n👉 Hãy quay lại các mục Bát Tự, Thần Số, Con Giáp... để xem luận giải AI chi tiết hơn!`);

        // Hiển thị nút hoàn tất
        this.showCompletionActions();
    },

    // Thêm tin nhắn vào chat
    addMessage(role, content, options = null, placeholder = '', optional = false) {
        const message = { role, content, options, placeholder, optional, timestamp: Date.now() };
        this.chatHistory.push(message);
        this.renderChat();
    },

    // Render giao diện chat
    renderChat() {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        container.innerHTML = this.chatHistory.map((msg, idx) => {
            if (msg.role === 'ai') {
                let html = `
                    <div class="chat-message ai">
                        <div class="chat-avatar">🤖</div>
                        <div class="chat-bubble">${msg.content.replace(/\n/g, '<br>')}</div>
                    </div>
                `;

                // Nếu là câu hỏi cuối cùng và đang chờ trả lời
                if (idx === this.chatHistory.length - 1 && this.isInterviewing) {
                    if (msg.options) {
                        html += `
                            <div class="chat-options">
                                ${msg.options.map(opt => `
                                    <button class="chat-option-btn" onclick="AIChat.handleAnswer('${opt}')">${opt}</button>
                                `).join('')}
                                ${msg.optional ? '<button class="chat-skip-btn" onclick="AIChat.skipQuestion()">Bỏ qua →</button>' : ''}
                            </div>
                        `;
                    } else {
                        html += `
                            <div class="chat-input-area">
                                <input type="text" id="chat-user-input" class="chat-input" placeholder="${msg.placeholder || 'Nhập câu trả lời...'}" onkeyup="if(event.key==='Enter')AIChat.submitInput()">
                                <button class="chat-send-btn" onclick="AIChat.submitInput()">Gửi</button>
                                ${msg.optional ? '<button class="chat-skip-btn" onclick="AIChat.skipQuestion()">Bỏ qua</button>' : ''}
                            </div>
                        `;
                    }
                }
                return html;
            } else {
                return `
                    <div class="chat-message user">
                        <div class="chat-bubble">${msg.content}</div>
                        <div class="chat-avatar">👤</div>
                    </div>
                `;
            }
        }).join('');

        // Scroll xuống cuối
        container.scrollTop = container.scrollHeight;

        // Focus input nếu có
        setTimeout(() => document.getElementById('chat-user-input')?.focus(), 100);
    },

    submitInput() {
        const input = document.getElementById('chat-user-input');
        if (input && input.value.trim()) {
            this.handleAnswer(input.value);
        }
    },

    showCompletionActions() {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        container.innerHTML += `
            <div class="chat-completion">
                <button class="btn btn-primary" onclick="AppController.showPage('dashboard')">🏠 Về Tổng Quan</button>
                <button class="btn btn-secondary" onclick="AIChat.startInterview()">🔄 Làm Lại</button>
            </div>
        `;
    },

    // Lấy context để gửi cho AI
    getContextForAI() {
        const profile = App.activeProfile;
        if (!profile?.lifeContext) return '';

        const ctx = profile.lifeContext;
        let contextStr = '\n\n=== THÔNG TIN CUỘC SỐNG HIỆN TẠI ===\n';

        if (ctx.occupation) contextStr += `• Nghề nghiệp: ${ctx.occupation}\n`;
        if (ctx.work_status) contextStr += `• Tình hình công việc: ${ctx.work_status}\n`;
        if (ctx.relationship_status) contextStr += `• Tình trạng tình cảm: ${ctx.relationship_status}\n`;
        if (ctx.relationship_detail) contextStr += `• Chi tiết: ${ctx.relationship_detail}\n`;
        if (ctx.family) contextStr += `• Gia đình: ${ctx.family}\n`;
        if (ctx.health) contextStr += `• Sức khỏe: ${ctx.health}\n`;
        if (ctx.finance) contextStr += `• Tài chính: ${ctx.finance}\n`;
        if (ctx.goals) contextStr += `• Mục tiêu: ${ctx.goals}\n`;
        if (ctx.concerns) contextStr += `• Lo lắng: ${ctx.concerns}\n`;
        if (ctx.wish) contextStr += `• Muốn tập trung: ${ctx.wish}\n`;

        return contextStr;
    },

    // Kiểm tra đã có context chưa
    hasContext() {
        return !!App.activeProfile?.lifeContext?.updatedAt;
    },

    // Xem lại context
    viewContext() {
        if (!this.hasContext()) return null;
        return App.activeProfile.lifeContext;
    }
};

if (typeof module !== 'undefined') module.exports = AIChat;
