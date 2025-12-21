// ============================================================
// FILE: js/ai-communication.js
// Mục đích: Phase 5 - Nhóm 6: Giao tiếp & Cộng tác (10 tính năng)
// ============================================================

import { showNotification } from './common.js';
import { contextMemory, extractEntities } from './ai-core-engine.js';

// Cấu hình API
const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

let globalData = null;
let currentUser = null;

/**
 * Khởi tạo module
 */
export function initCommunication(data, user) {
    globalData = data;
    currentUser = user;
    console.log('✅ AI Communication (Phase 5) đã sẵn sàng');
}

// ============================================================
// #51 - TẠO EMAIL TỰ ĐỘNG (Smart Email Generator)
// Tạo email chuyên nghiệp từ context
// ============================================================
export async function generateEmail(options = {}) {
    const { type = 'general', subject = '', recipient = '', context = '' } = options;

    const templates = {
        'meeting_request': 'Yêu cầu họp',
        'follow_up': 'Follow-up',
        'thank_you': 'Cảm ơn',
        'update': 'Cập nhật tiến độ',
        'apology': 'Xin lỗi',
        'introduction': 'Giới thiệu',
        'general': 'Email chung'
    };

    const prompt = `Bạn là trợ lý viết email chuyên nghiệp. Tạo email tiếng Việt với:
- Loại: ${templates[type] || type}
- Chủ đề: ${subject}
- Người nhận: ${recipient}
- Context: ${context}

Yêu cầu:
1. Lịch sự, chuyên nghiệp
2. Ngắn gọn, đi thẳng vào vấn đề
3. Có lời chào mở đầu và kết thúc phù hợp

Trả về JSON:
{
  "subject": "Tiêu đề email",
  "body": "Nội dung email",
  "tone": "formal/semi-formal/casual"
}`;

    try {
        const response = await callAI(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.error('Lỗi tạo email:', e);
    }

    return {
        subject: subject || 'Không có tiêu đề',
        body: 'Không thể tạo email. Vui lòng thử lại.',
        tone: 'formal'
    };
}

// ============================================================
// #52 - TẠO TIN NHẮN NHANH (Quick Message Templates)
// Templates tin nhắn cho các tình huống phổ biến
// ============================================================
export function getQuickMessageTemplates() {
    return [
        {
            id: 'delay',
            name: 'Thông báo trễ deadline',
            template: 'Xin chào, Em xin phép thông báo task "{task}" sẽ bị delay đến {newDate}. Lý do: {reason}. Em sẽ cố gắng hoàn thành sớm nhất có thể.',
            fields: ['task', 'newDate', 'reason']
        },
        {
            id: 'complete',
            name: 'Thông báo hoàn thành',
            template: 'Xin chào, Em đã hoàn thành "{task}". {additionalInfo}. Anh/chị vui lòng review giúp em.',
            fields: ['task', 'additionalInfo']
        },
        {
            id: 'question',
            name: 'Hỏi clarification',
            template: 'Xin chào, Em có thắc mắc về "{topic}": {question}. Anh/chị có thể giải đáp giúp em không ạ?',
            fields: ['topic', 'question']
        },
        {
            id: 'meeting',
            name: 'Đề xuất họp',
            template: 'Xin chào, Em muốn đề xuất một cuộc họp về "{topic}" vào {suggestedTime}. Mục đích: {purpose}. Anh/chị có rảnh không ạ?',
            fields: ['topic', 'suggestedTime', 'purpose']
        },
        {
            id: 'reminder',
            name: 'Nhắc nhở nhẹ nhàng',
            template: 'Xin chào, Em xin phép nhắc lại về "{item}" mà chúng ta đã thảo luận. Không biết tiến độ hiện tại như thế nào ạ?',
            fields: ['item']
        }
    ];
}

export function fillMessageTemplate(templateId, values = {}) {
    const templates = getQuickMessageTemplates();
    const template = templates.find(t => t.id === templateId);

    if (!template) return null;

    let message = template.template;
    for (const [key, value] of Object.entries(values)) {
        message = message.replace(`{${key}}`, value || `[${key}]`);
    }

    return {
        name: template.name,
        message,
        missingFields: template.fields.filter(f => !values[f])
    };
}

// ============================================================
// #53 - PHÂN TÍCH TONE (Tone Analyzer)
// Phân tích giọng điệu văn bản
// ============================================================
export function analyzeTone(text) {
    const lowerText = text.toLowerCase();
    const scores = {
        formal: 0,
        casual: 0,
        urgent: 0,
        friendly: 0,
        professional: 0,
        negative: 0,
        positive: 0
    };

    // Formal indicators
    const formalWords = ['kính gửi', 'xin chào', 'trân trọng', 'xin phép', 'cho phép', 'vui lòng', 'quý'];
    for (const word of formalWords) {
        if (lowerText.includes(word)) scores.formal += 10;
    }

    // Casual indicators
    const casualWords = ['bạn ơi', 'cậu', 'mày', 'tao', 'lol', 'haha', 'ok nhé', 'oki'];
    for (const word of casualWords) {
        if (lowerText.includes(word)) scores.casual += 10;
    }

    // Urgent indicators
    const urgentWords = ['gấp', 'urgent', 'khẩn', 'ngay', 'asap', 'deadline', 'quan trọng'];
    for (const word of urgentWords) {
        if (lowerText.includes(word)) scores.urgent += 15;
    }

    // Friendly indicators
    const friendlyWords = ['cảm ơn', 'thank', 'rất vui', 'hạnh phúc', 'tuyệt vời', '❤️', '😊'];
    for (const word of friendlyWords) {
        if (lowerText.includes(word)) scores.friendly += 10;
    }

    // Negative indicators
    const negativeWords = ['không thể', 'từ chối', 'không đồng ý', 'thất vọng', 'buồn', 'tức giận'];
    for (const word of negativeWords) {
        if (lowerText.includes(word)) scores.negative += 10;
    }

    // Positive indicators
    const positiveWords = ['đồng ý', 'tốt', 'great', 'excellent', 'hoàn hảo', 'tuyệt'];
    for (const word of positiveWords) {
        if (lowerText.includes(word)) scores.positive += 10;
    }

    // Determine primary tone
    const maxScore = Math.max(...Object.values(scores));
    const primaryTone = Object.entries(scores).find(([_, v]) => v === maxScore)?.[0] || 'neutral';

    return {
        primary: primaryTone,
        scores,
        isUrgent: scores.urgent > 20,
        sentiment: scores.positive > scores.negative ? 'positive' :
            scores.negative > scores.positive ? 'negative' : 'neutral',
        formality: scores.formal > scores.casual ? 'formal' :
            scores.casual > scores.formal ? 'casual' : 'neutral'
    };
}

// ============================================================
// #54 - GỢI Ý NGƯỜI LIÊN HỆ (Contact Suggestions)
// Gợi ý người cần liên hệ dựa trên task
// ============================================================
export function suggestContacts(taskTitle, category) {
    const contacts = globalData?.contacts || [];
    const tasks = globalData?.tasks || [];

    // Tìm contacts liên quan đến category
    const categoryContacts = contacts.filter(c => c.category === category);

    // Tìm contacts từ tasks tương tự
    const relatedTasks = tasks.filter(t => {
        if (!t.assignee && !t.reviewer) return false;
        const titleWords = taskTitle.toLowerCase().split(/\s+/);
        const taskWords = t.title.toLowerCase().split(/\s+/);
        return titleWords.some(w => taskWords.includes(w) && w.length > 3);
    });

    const suggestedContacts = [];

    // Add từ category
    for (const contact of categoryContacts.slice(0, 3)) {
        suggestedContacts.push({
            ...contact,
            reason: `Thuộc nhóm ${category}`
        });
    }

    // Add từ related tasks
    for (const task of relatedTasks) {
        if (task.assignee) {
            suggestedContacts.push({
                name: task.assignee,
                reason: `Đã làm task tương tự: ${task.title}`
            });
        }
    }

    return {
        suggestions: suggestedContacts.slice(0, 5),
        fromCategory: categoryContacts.length,
        fromRelatedTasks: relatedTasks.length
    };
}

// ============================================================
// #55 - LỊCH SỬ GIAO TIẾP (Communication History)
// Theo dõi lịch sử giao tiếp theo task/người
// ============================================================
let communicationHistory = [];

export function logCommunication(entry) {
    const newEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: entry.type || 'message', // email, message, call, meeting
        taskId: entry.taskId,
        contactName: entry.contactName,
        summary: entry.summary,
        direction: entry.direction || 'outgoing' // incoming, outgoing
    };

    communicationHistory.unshift(newEntry);

    // Keep last 100
    if (communicationHistory.length > 100) {
        communicationHistory.pop();
    }

    saveCommunicationHistory();
    return newEntry;
}

function saveCommunicationHistory() {
    try {
        localStorage.setItem('communication_history', JSON.stringify(communicationHistory));
    } catch (e) {
        console.error('Lỗi save communication history:', e);
    }
}

function loadCommunicationHistory() {
    try {
        const saved = localStorage.getItem('communication_history');
        if (saved) communicationHistory = JSON.parse(saved);
    } catch (e) {
        console.error('Lỗi load communication history:', e);
    }
}

export function getCommunicationHistory(filter = {}) {
    loadCommunicationHistory();

    let filtered = communicationHistory;

    if (filter.taskId) {
        filtered = filtered.filter(c => c.taskId === filter.taskId);
    }
    if (filter.contactName) {
        filtered = filtered.filter(c => c.contactName?.includes(filter.contactName));
    }
    if (filter.type) {
        filtered = filtered.filter(c => c.type === filter.type);
    }
    if (filter.days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - filter.days);
        filtered = filtered.filter(c => new Date(c.timestamp) >= cutoff);
    }

    return filtered;
}

// ============================================================
// #56 - TÓM TẮT CUỘC HỌP (Meeting Summary)
// Tạo tóm tắt cuộc họp từ notes
// ============================================================
export async function generateMeetingSummary(notes, participants = []) {
    const prompt = `Tóm tắt cuộc họp từ notes sau:

Notes: """
${notes}
"""

Người tham gia: ${participants.join(', ') || 'Không rõ'}

Trả về JSON:
{
  "title": "Tiêu đề cuộc họp",
  "summary": "Tóm tắt ngắn gọn (2-3 câu)",
  "keyPoints": ["Điểm chính 1", "Điểm chính 2"],
  "actionItems": [{"task": "Việc cần làm", "assignee": "Người phụ trách", "deadline": "Ngày"}],
  "decisions": ["Quyết định 1", "Quyết định 2"],
  "nextMeeting": "Thời gian họp tiếp theo (nếu có)"
}`;

    try {
        const response = await callAI(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.error('Lỗi tóm tắt cuộc họp:', e);
    }

    return {
        title: 'Cuộc họp',
        summary: notes.substring(0, 200) + '...',
        keyPoints: [],
        actionItems: [],
        decisions: [],
        nextMeeting: null
    };
}

// ============================================================
// #57 - NHẮC NHỞ FOLLOW-UP (Follow-up Reminders)
// Tự động tạo nhắc nhở follow-up
// ============================================================
export function createFollowUpReminder(options = {}) {
    const { taskId, contactName, daysAfter = 3, message = '' } = options;

    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + daysAfter);

    const reminder = {
        id: Date.now().toString(),
        type: 'follow_up',
        taskId,
        contactName,
        scheduledFor: reminderDate.toISOString(),
        message: message || `Follow up về task với ${contactName}`,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    // Save to reminders
    const reminders = JSON.parse(localStorage.getItem('follow_up_reminders') || '[]');
    reminders.push(reminder);
    localStorage.setItem('follow_up_reminders', JSON.stringify(reminders));

    return reminder;
}

export function getFollowUpReminders(includeCompleted = false) {
    const reminders = JSON.parse(localStorage.getItem('follow_up_reminders') || '[]');

    if (includeCompleted) return reminders;

    const now = new Date();
    return reminders.filter(r => {
        if (r.status === 'completed') return false;
        const scheduledDate = new Date(r.scheduledFor);
        return scheduledDate <= now || r.status === 'pending';
    });
}

export function completeFollowUp(reminderId) {
    const reminders = JSON.parse(localStorage.getItem('follow_up_reminders') || '[]');
    const index = reminders.findIndex(r => r.id === reminderId);

    if (index >= 0) {
        reminders[index].status = 'completed';
        reminders[index].completedAt = new Date().toISOString();
        localStorage.setItem('follow_up_reminders', JSON.stringify(reminders));
        return true;
    }
    return false;
}

// ============================================================
// #58 - DỊCH THUẬT NHANH (Quick Translation)
// Dịch văn bản nhanh
// ============================================================
export async function translateText(text, targetLang = 'en') {
    const langNames = {
        'en': 'tiếng Anh',
        'vi': 'tiếng Việt',
        'zh': 'tiếng Trung',
        'ja': 'tiếng Nhật',
        'ko': 'tiếng Hàn'
    };

    const prompt = `Dịch văn bản sau sang ${langNames[targetLang] || targetLang}:

"${text}"

Chỉ trả về bản dịch, không có gì thêm.`;

    try {
        const response = await callAI(prompt);
        return {
            original: text,
            translated: response.trim(),
            targetLang,
            success: true
        };
    } catch (e) {
        console.error('Lỗi dịch:', e);
        return {
            original: text,
            translated: text,
            targetLang,
            success: false,
            error: e.message
        };
    }
}

// ============================================================
// #59 - PHÁT HIỆN SENTIMENT (Sentiment Detection)
// Phân tích cảm xúc trong tin nhắn
// ============================================================
export function detectSentiment(text) {
    const toneAnalysis = analyzeTone(text);

    // Thêm chi tiết sentiment
    let sentiment = toneAnalysis.sentiment;
    let confidence = 50;
    let emoticons = [];

    // Check emoticons
    const positiveEmojis = ['😊', '😄', '👍', '❤️', '🎉', '✅', '🙏', '💪'];
    const negativeEmojis = ['😢', '😞', '😠', '👎', '❌', '😤', '💔'];

    for (const emoji of positiveEmojis) {
        if (text.includes(emoji)) {
            emoticons.push({ emoji, type: 'positive' });
            confidence += 10;
        }
    }
    for (const emoji of negativeEmojis) {
        if (text.includes(emoji)) {
            emoticons.push({ emoji, type: 'negative' });
            confidence += 10;
        }
    }

    // Adjust sentiment based on emoticons
    const positiveCount = emoticons.filter(e => e.type === 'positive').length;
    const negativeCount = emoticons.filter(e => e.type === 'negative').length;

    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';

    return {
        sentiment,
        confidence: Math.min(95, confidence),
        tone: toneAnalysis.primary,
        formality: toneAnalysis.formality,
        isUrgent: toneAnalysis.isUrgent,
        emoticons,
        recommendation: sentiment === 'negative'
            ? 'Tin nhắn có thể tiêu cực, cân nhắc phản hồi cẩn thận'
            : sentiment === 'positive'
                ? 'Tin nhắn tích cực!'
                : 'Tin nhắn trung tính'
    };
}

// ============================================================
// #60 - TẠO BÁO CÁO GIAO TIẾP (Communication Report)
// Báo cáo tổng hợp về giao tiếp
// ============================================================
export function generateCommunicationReport(days = 7) {
    const history = getCommunicationHistory({ days });
    const followUps = getFollowUpReminders();

    // Stats by type
    const typeStats = {};
    for (const entry of history) {
        typeStats[entry.type] = (typeStats[entry.type] || 0) + 1;
    }

    // Stats by contact
    const contactStats = {};
    for (const entry of history) {
        if (entry.contactName) {
            contactStats[entry.contactName] = (contactStats[entry.contactName] || 0) + 1;
        }
    }

    // Top contacts
    const topContacts = Object.entries(contactStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    // Direction stats
    const incoming = history.filter(h => h.direction === 'incoming').length;
    const outgoing = history.filter(h => h.direction === 'outgoing').length;

    return {
        period: `${days} ngày qua`,
        totalCommunications: history.length,
        byType: typeStats,
        topContacts,
        direction: { incoming, outgoing },
        pendingFollowUps: followUps.filter(f => f.status === 'pending').length,
        averagePerDay: Math.round(history.length / days * 10) / 10
    };
}

// Helper: Call AI
async function callAI(prompt) {
    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.1-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 1500
        })
    });

    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
}

