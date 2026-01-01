// --- FILE: js/lifestyle.js ---
// Module xử lý các tính năng Lifestyle: Journal, Habits, Goals, Finance, Productivity

import { saveUserData, getUserData } from './api.js';
import { showNotification, generateID, toLocalISOString } from './common.js';
import { aiService } from './ai-service.js';

let globalData = {};
let currentUser = null;

// ============================================================
// KHỞI TẠO MODULE
// ============================================================
export const initLifestyleModule = (data, user) => {
    globalData = data;
    currentUser = user;

    if (!globalData.journal) globalData.journal = [];
    if (!globalData.habits) globalData.habits = [];
    if (!globalData.goals) globalData.goals = [];
    if (!globalData.transactions) globalData.transactions = [];
    if (!globalData.productivityLog) globalData.productivityLog = [];
    if (!globalData.healthLog) globalData.healthLog = [];

    // Setup event listeners
    setupJournalEvents();
    setupHabitEvents();
    setupGoalEvents();
    setupFinanceEvents();
    setupProductivityEvents();
    setupHealthEvents();

    // Render initial data
    renderJournal();
    renderHabits();
    renderGoals();
    renderFinance();
    renderProductivity();
    renderHealth();

    console.log('✅ Lifestyle module initialized');
};

// ============================================================
// 1. DAILY JOURNAL
// ============================================================
let selectedMood = null;

const setupJournalEvents = () => {
    // Mood buttons
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mood-btn').forEach(b => b.style.background = 'rgba(255,255,255,0.2)');
            btn.style.background = 'rgba(255,255,255,0.5)';
            selectedMood = btn.dataset.mood;
            const moodText = document.getElementById('selected-mood-text');
            const moodNames = {
                happy: '😊 Vui vẻ', excited: '🤩 Hào hứng', neutral: '😐 Bình thường',
                sad: '😢 Buồn', angry: '😡 Tức giận', tired: '😴 Mệt mỏi'
            };
            if (moodText) moodText.textContent = `Bạn đang cảm thấy: ${moodNames[selectedMood]}`;
        });
    });

    // Set default date
    const dateInput = document.getElementById('journal-date');
    if (dateInput) dateInput.value = toLocalISOString(new Date());

    // Save button
    document.getElementById('btn-save-journal')?.addEventListener('click', saveJournalEntry);

    // AI buttons
    document.getElementById('btn-journal-gratitude')?.addEventListener('click', () => aiJournalPrompt('gratitude'));
    document.getElementById('btn-journal-reflection')?.addEventListener('click', () => aiJournalPrompt('reflection'));
    document.getElementById('btn-ai-analyze-mood')?.addEventListener('click', aiAnalyzeMood);
};

const saveJournalEntry = async () => {
    const content = document.getElementById('journal-content')?.value?.trim();
    const date = document.getElementById('journal-date')?.value;

    if (!content) {
        showNotification('Vui lòng viết nội dung nhật ký!', 'error');
        return;
    }

    const entry = {
        id: generateID('journal'),
        date: date || toLocalISOString(new Date()),
        mood: selectedMood || 'neutral',
        content,
        createdAt: new Date().toISOString()
    };

    globalData.journal.unshift(entry);
    await saveUserData(currentUser.uid, { journal: globalData.journal });

    document.getElementById('journal-content').value = '';
    selectedMood = null;
    document.querySelectorAll('.mood-btn').forEach(b => b.style.background = 'rgba(255,255,255,0.2)');
    document.getElementById('selected-mood-text').textContent = '';

    renderJournal();
    showNotification('Đã lưu nhật ký! 📔');
};

const renderJournal = () => {
    const container = document.getElementById('journal-entries-list');
    const emptyState = document.getElementById('journal-empty');
    if (!container) return;

    if (globalData.journal.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const moodEmoji = { happy: '😊', excited: '🤩', neutral: '😐', sad: '😢', angry: '😡', tired: '😴' };

    container.innerHTML = globalData.journal.slice(0, 10).map(entry => `
        <div class="journal-entry" style="background: var(--card-bg); padding: 20px; border-radius: 12px; border-left: 4px solid #10b981;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 1.5rem;">${moodEmoji[entry.mood] || '😐'}</span>
                <span style="color: #64748b; font-size: 0.9rem;">${new Date(entry.date).toLocaleDateString('vi-VN')}</span>
            </div>
            <p style="margin: 0; line-height: 1.6;">${entry.content}</p>
        </div>
    `).join('');
};

const aiJournalPrompt = async (type) => {
    const prompts = {
        gratitude: '🙏 3 điều tôi biết ơn hôm nay:\n1. \n2. \n3. ',
        reflection: '💭 Suy ngẫm cuối ngày:\n- Điều tốt nhất hôm nay: \n- Điều có thể làm tốt hơn: \n- Bài học rút ra: '
    };
    const textarea = document.getElementById('journal-content');
    if (textarea) textarea.value = prompts[type] || '';
};

const aiAnalyzeMood = async () => {
    if (globalData.journal.length < 3) {
        showNotification('Cần ít nhất 3 nhật ký để phân tích!', 'error');
        return;
    }
    showNotification('🧠 Đang phân tích cảm xúc...', 'info');

    try {
        const recentEntries = globalData.journal.slice(0, 10);
        const moodData = recentEntries.map(e => `${e.date}: ${e.mood} - "${e.content.substring(0, 100)}"`).join('\n');

        const prompt = `Phân tích cảm xúc từ nhật ký sau và đưa ra nhận xét ngắn gọn (tối đa 200 từ) về xu hướng cảm xúc, lời khuyên cải thiện:\n\n${moodData}`;

        const response = await aiService.ask(prompt);

        // Show result in modal
        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
                <div style="background: white; padding: 30px; border-radius: 20px; max-width: 500px; max-height: 80vh; overflow-y: auto;" onclick="event.stopPropagation()">
                    <h3 style="margin-top: 0;">🧠 Phân tích cảm xúc AI</h3>
                    <div style="line-height: 1.8; color: #334155;">${response.replace(/\n/g, '<br>')}</div>
                    <button onclick="this.closest('div').closest('div').remove()" style="margin-top: 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 10px 25px; border-radius: 10px; cursor: pointer;">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(resultDiv);
        showNotification('✅ Phân tích hoàn tất!');
    } catch (error) {
        console.error(error);
        showNotification('Lỗi phân tích: ' + error.message, 'error');
    }
};

// ============================================================
// 2. HABIT TRACKER
// ============================================================
const setupHabitEvents = () => {
    document.getElementById('btn-add-habit')?.addEventListener('click', addHabit);
};

const addHabit = async () => {
    const name = document.getElementById('new-habit-name')?.value?.trim();
    const frequency = document.getElementById('new-habit-frequency')?.value || 'daily';

    if (!name) {
        showNotification('Vui lòng nhập tên thói quen!', 'error');
        return;
    }

    const habit = {
        id: generateID('habit'),
        name,
        frequency,
        createdAt: new Date().toISOString(),
        completedDates: [],
        streak: 0
    };

    globalData.habits.push(habit);
    await saveUserData(currentUser.uid, { habits: globalData.habits });

    document.getElementById('new-habit-name').value = '';
    renderHabits();
    showNotification('Đã thêm thói quen mới! 🎯');
};

const renderHabits = () => {
    const container = document.getElementById('habits-list');
    const emptyState = document.getElementById('habits-empty');
    const countEl = document.getElementById('habits-completed-count');
    if (!container) return;

    const today = toLocalISOString(new Date());

    if (globalData.habits.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (countEl) countEl.textContent = '0/0';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const completed = globalData.habits.filter(h => h.completedDates?.includes(today)).length;
    if (countEl) countEl.textContent = `${completed}/${globalData.habits.length}`;

    container.innerHTML = globalData.habits.map(habit => {
        const isDone = habit.completedDates?.includes(today);
        return `
            <div class="habit-item" style="display: flex; align-items: center; gap: 15px; padding: 15px; background: ${isDone ? '#dcfce7' : '#f8fafc'}; border-radius: 12px; cursor: pointer;" data-id="${habit.id}">
                <input type="checkbox" ${isDone ? 'checked' : ''} style="width: 24px; height: 24px; cursor: pointer;">
                <span style="flex: 1; font-weight: 500; ${isDone ? 'text-decoration: line-through; color: #16a34a;' : ''}">${habit.name}</span>
                <span style="color: #f59e0b; font-weight: 600;">🔥 ${habit.streak || 0}</span>
                <button class="delete-habit-btn" data-id="${habit.id}" style="background: none; border: none; cursor: pointer; font-size: 1.2rem;">🗑️</button>
            </div>
        `;
    }).join('');

    // Toggle habit completion
    container.querySelectorAll('.habit-item input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', async (e) => {
            const id = e.target.closest('.habit-item').dataset.id;
            await toggleHabit(id);
        });
    });

    // Delete habit
    container.querySelectorAll('.delete-habit-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (confirm('Xóa thói quen này?')) {
                globalData.habits = globalData.habits.filter(h => h.id !== id);
                await saveUserData(currentUser.uid, { habits: globalData.habits });
                renderHabits();
                showNotification('Đã xóa thói quen!');
            }
        });
    });

    updateHabitStats();
};

const toggleHabit = async (id) => {
    const habit = globalData.habits.find(h => h.id === id);
    if (!habit) return;

    const today = toLocalISOString(new Date());
    if (!habit.completedDates) habit.completedDates = [];

    if (habit.completedDates.includes(today)) {
        habit.completedDates = habit.completedDates.filter(d => d !== today);
    } else {
        habit.completedDates.push(today);
        habit.streak = (habit.streak || 0) + 1;
    }

    await saveUserData(currentUser.uid, { habits: globalData.habits });
    renderHabits();
};

const updateHabitStats = () => {
    const currentStreak = Math.max(...globalData.habits.map(h => h.streak || 0), 0);
    const longestStreak = Math.max(...globalData.habits.map(h => h.streak || 0), 0);
    const totalDays = globalData.habits.reduce((sum, h) => sum + (h.completedDates?.length || 0), 0);
    const possibleDays = globalData.habits.length * 30; // Approximate
    const rate = possibleDays > 0 ? Math.round((totalDays / possibleDays) * 100) : 0;

    document.getElementById('habit-current-streak')?.textContent && (document.getElementById('habit-current-streak').textContent = currentStreak);
    document.getElementById('habit-longest-streak')?.textContent && (document.getElementById('habit-longest-streak').textContent = longestStreak);
    document.getElementById('habit-completion-rate')?.textContent && (document.getElementById('habit-completion-rate').textContent = rate + '%');
};

// ============================================================
// 3. GOALS
// ============================================================
const setupGoalEvents = () => {
    document.getElementById('btn-add-goal')?.addEventListener('click', addGoal);
    document.getElementById('btn-ai-suggest-goals')?.addEventListener('click', aiSuggestGoals);
    document.getElementById('btn-ai-weekly-review')?.addEventListener('click', aiWeeklyReview);
};

const addGoal = async () => {
    const name = document.getElementById('new-goal-name')?.value?.trim();
    const deadline = document.getElementById('new-goal-deadline')?.value;
    const category = document.getElementById('new-goal-category')?.value || 'personal';

    if (!name) {
        showNotification('Vui lòng nhập mục tiêu!', 'error');
        return;
    }

    const goal = {
        id: generateID('goal'),
        name,
        deadline,
        category,
        progress: 0,
        milestones: [],
        createdAt: new Date().toISOString()
    };

    globalData.goals.push(goal);
    await saveUserData(currentUser.uid, { goals: globalData.goals });

    document.getElementById('new-goal-name').value = '';
    renderGoals();
    showNotification('Đã thêm mục tiêu mới! 🏆');
};

const renderGoals = () => {
    const container = document.getElementById('goals-list');
    const emptyState = document.getElementById('goals-empty');
    if (!container) return;

    if (globalData.goals.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const categoryColors = {
        personal: '#8b5cf6', career: '#667eea', health: '#10b981', finance: '#f59e0b', social: '#ec4899'
    };

    container.innerHTML = globalData.goals.map(goal => `
        <div class="goal-card" style="background: var(--card-bg); padding: 20px; border-radius: 16px; border-left: 5px solid ${categoryColors[goal.category] || '#667eea'};">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <h3 style="margin: 0;">${goal.name}</h3>
                <button class="delete-goal-btn" data-id="${goal.id}" style="background: none; border: none; cursor: pointer;">🗑️</button>
            </div>
            ${goal.deadline ? `<p style="color: #64748b; font-size: 0.9rem; margin: 5px 0;">📅 Deadline: ${new Date(goal.deadline).toLocaleDateString('vi-VN')}</p>` : ''}
            <div style="margin-top: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-size: 0.9rem;">Tiến độ</span>
                    <span style="font-weight: 600;">${goal.progress}%</span>
                </div>
                <div style="background: #e2e8f0; height: 10px; border-radius: 10px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, ${categoryColors[goal.category]}, #667eea); width: ${goal.progress}%; height: 100%;"></div>
                </div>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.delete-goal-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            if (confirm('Xóa mục tiêu này?')) {
                globalData.goals = globalData.goals.filter(g => g.id !== id);
                await saveUserData(currentUser.uid, { goals: globalData.goals });
                renderGoals();
                showNotification('Đã xóa mục tiêu!');
            }
        });
    });
};

const aiSuggestGoals = async () => {
    showNotification('💡 AI đang đề xuất mục tiêu...', 'info');

    try {
        const existingGoals = globalData.goals.map(g => g.name).join(', ') || 'Chưa có mục tiêu nào';
        const habits = globalData.habits.map(h => h.name).join(', ') || 'Chưa có thói quen';

        const prompt = `Dựa trên mục tiêu hiện tại: [${existingGoals}] và thói quen: [${habits}], hãy gợi ý 3-5 mục tiêu mới phù hợp cho sinh viên. Mỗi mục tiêu ngắn gọn, thực tế, có thể đo lường được.`;

        const response = await aiService.ask(prompt);

        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
                <div style="background: white; padding: 30px; border-radius: 20px; max-width: 500px; max-height: 80vh; overflow-y: auto;" onclick="event.stopPropagation()">
                    <h3 style="margin-top: 0;">💡 Gợi ý mục tiêu từ AI</h3>
                    <div style="line-height: 1.8;">${response.replace(/\n/g, '<br>')}</div>
                    <button onclick="this.closest('div').closest('div').remove()" style="margin-top: 20px; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; border: none; padding: 10px 25px; border-radius: 10px; cursor: pointer;">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(resultDiv);
    } catch (error) {
        showNotification('Lỗi: ' + error.message, 'error');
    }
};

const aiWeeklyReview = async () => {
    showNotification('📊 AI đang tạo tổng kết tuần...', 'info');

    try {
        const tasks = globalData.tasks || [];
        const completedTasks = tasks.filter(t => t.status === 'Hoàn thành').length;
        const habits = globalData.habits || [];
        const totalHabitCompleted = habits.reduce((sum, h) => sum + (h.completedDates?.length || 0), 0);
        const goals = globalData.goals?.map(g => `${g.name} (${g.progress}%)`).join(', ') || 'Chưa có';

        const prompt = `Tạo tổng kết tuần ngắn gọn (150 từ) cho sinh viên với dữ liệu: ${completedTasks} tasks hoàn thành, ${totalHabitCompleted} lần hoàn thành thói quen, Mục tiêu: ${goals}. Nêu điểm mạnh, điểm cần cải thiện, và lời động viên.`;

        const response = await aiService.ask(prompt);

        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
                <div style="background: white; padding: 30px; border-radius: 20px; max-width: 500px;" onclick="event.stopPropagation()">
                    <h3 style="margin-top: 0;">📊 Tổng kết tuần</h3>
                    <div style="line-height: 1.8;">${response.replace(/\n/g, '<br>')}</div>
                    <button onclick="this.closest('div').closest('div').remove()" style="margin-top: 20px; background: linear-gradient(135deg, #f59e0b, #f97316); color: white; border: none; padding: 10px 25px; border-radius: 10px; cursor: pointer;">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(resultDiv);
    } catch (error) {
        showNotification('Lỗi: ' + error.message, 'error');
    }
};

// ============================================================
// 4. FINANCE
// ============================================================
const setupFinanceEvents = () => {
    document.getElementById('btn-add-transaction')?.addEventListener('click', addTransaction);
    document.getElementById('btn-ai-budget-advice')?.addEventListener('click', aiBudgetAdvice);
    document.getElementById('btn-ai-spending-analysis')?.addEventListener('click', aiSpendingAnalysis);
};

const addTransaction = async () => {
    const type = document.querySelector('input[name="transaction-type"]:checked')?.value || 'expense';
    const amount = parseFloat(document.getElementById('transaction-amount')?.value) || 0;
    const category = document.getElementById('transaction-category')?.value || 'other';
    const note = document.getElementById('transaction-note')?.value?.trim() || '';

    if (amount <= 0) {
        showNotification('Vui lòng nhập số tiền hợp lệ!', 'error');
        return;
    }

    const transaction = {
        id: generateID('trans'),
        type,
        amount,
        category,
        note,
        date: new Date().toISOString()
    };

    globalData.transactions.push(transaction);
    await saveUserData(currentUser.uid, { transactions: globalData.transactions });

    document.getElementById('transaction-amount').value = '';
    document.getElementById('transaction-note').value = '';
    renderFinance();
    showNotification(`Đã thêm ${type === 'income' ? 'thu nhập' : 'chi tiêu'}! 💰`);
};

const renderFinance = () => {
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();

    const monthTransactions = globalData.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    const formatMoney = (n) => n.toLocaleString('vi-VN') + ' ₫';

    document.getElementById('finance-income')?.textContent && (document.getElementById('finance-income').textContent = formatMoney(income));
    document.getElementById('finance-expense')?.textContent && (document.getElementById('finance-expense').textContent = formatMoney(expense));
    document.getElementById('finance-balance')?.textContent && (document.getElementById('finance-balance').textContent = formatMoney(balance));

    // Render transactions list
    const container = document.getElementById('transactions-list');
    const emptyState = document.getElementById('transactions-empty');
    if (!container) return;

    if (globalData.transactions.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const categoryEmoji = {
        food: '🍜', transport: '🚗', shopping: '🛍️', bills: '📄',
        entertainment: '🎮', education: '📚', salary: '💼', other: '📦'
    };

    container.innerHTML = globalData.transactions.slice(-20).reverse().map(t => `
        <div style="display: flex; align-items: center; gap: 15px; padding: 12px; border-bottom: 1px solid #e2e8f0;">
            <span style="font-size: 1.5rem;">${categoryEmoji[t.category] || '📦'}</span>
            <div style="flex: 1;">
                <div style="font-weight: 500;">${t.note || t.category}</div>
                <div style="font-size: 0.85rem; color: #64748b;">${new Date(t.date).toLocaleDateString('vi-VN')}</div>
            </div>
            <span style="font-weight: 600; color: ${t.type === 'income' ? '#10b981' : '#ef4444'};">
                ${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
            </span>
        </div>
    `).join('');
};

const aiBudgetAdvice = async () => {
    showNotification('💡 AI đang phân tích chi tiêu...', 'info');

    try {
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();

        const monthTransactions = globalData.transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });

        const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        const categoryBreakdown = {};
        monthTransactions.filter(t => t.type === 'expense').forEach(t => {
            categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
        });

        const categoryStr = Object.entries(categoryBreakdown).map(([k, v]) => `${k}: ${v.toLocaleString()}đ`).join(', ');

        const prompt = `Phân tích chi tiêu sinh viên tháng này: Thu nhập ${income.toLocaleString()}đ, Chi tiêu ${expense.toLocaleString()}đ. Phân loại: ${categoryStr || 'Chưa có'}. Đưa ra 3-5 lời khuyên tiết kiệm cụ thể, ngắn gọn.`;

        const response = await aiService.ask(prompt);

        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
                <div style="background: white; padding: 30px; border-radius: 20px; max-width: 500px;" onclick="event.stopPropagation()">
                    <h3 style="margin-top: 0;">💡 Lời khuyên tiết kiệm</h3>
                    <div style="line-height: 1.8;">${response.replace(/\n/g, '<br>')}</div>
                    <button onclick="this.closest('div').closest('div').remove()" style="margin-top: 20px; background: linear-gradient(135deg, #10b981, #06b6d4); color: white; border: none; padding: 10px 25px; border-radius: 10px; cursor: pointer;">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(resultDiv);
    } catch (error) {
        showNotification('Lỗi: ' + error.message, 'error');
    }
};

const aiSpendingAnalysis = async () => {
    showNotification('📊 AI đang tạo báo cáo...', 'info');

    try {
        const transactions = globalData.transactions.slice(-50);
        if (transactions.length < 5) {
            showNotification('Cần ít nhất 5 giao dịch để phân tích!', 'error');
            return;
        }

        const summary = transactions.map(t => `${t.type}: ${t.amount} - ${t.category}`).join('; ');

        const prompt = `Phân tích xu hướng chi tiêu từ dữ liệu: ${summary}. Tóm tắt ngắn gọn: 1) Danh mục chi nhiều nhất, 2) Xu hướng tăng/giảm, 3) Đề xuất cải thiện.`;

        const response = await aiService.ask(prompt);

        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
                <div style="background: white; padding: 30px; border-radius: 20px; max-width: 500px;" onclick="event.stopPropagation()">
                    <h3 style="margin-top: 0;">📊 Phân tích chi tiêu</h3>
                    <div style="line-height: 1.8;">${response.replace(/\n/g, '<br>')}</div>
                    <button onclick="this.closest('div').closest('div').remove()" style="margin-top: 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 10px 25px; border-radius: 10px; cursor: pointer;">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(resultDiv);
    } catch (error) {
        showNotification('Lỗi: ' + error.message, 'error');
    }
};

// ============================================================
// 5. PRODUCTIVITY
// ============================================================
const setupProductivityEvents = () => {
    document.getElementById('btn-ai-smart-schedule')?.addEventListener('click', aiSmartSchedule);
    document.getElementById('btn-ai-focus-suggest')?.addEventListener('click', aiFocusSuggest);
    document.getElementById('btn-ai-burnout-check')?.addEventListener('click', aiBurnoutCheck);
};

const renderProductivity = () => {
    // Calculate productivity score from tasks, habits, focus time
    const today = toLocalISOString(new Date());
    const todayTasks = (globalData.tasks || []).filter(t => t.status === 'Hoàn thành' && t.dueDate === today).length;
    const todayHabits = (globalData.habits || []).filter(h => h.completedDates?.includes(today)).length;
    const totalHabits = (globalData.habits || []).length;

    // Simple productivity score formula
    const taskScore = Math.min(todayTasks * 10, 40);
    const habitScore = totalHabits > 0 ? Math.round((todayHabits / totalHabits) * 40) : 0;
    const focusScore = 20; // Placeholder
    const score = taskScore + habitScore + focusScore;

    document.getElementById('productivity-score-value')?.textContent && (document.getElementById('productivity-score-value').textContent = score);
    document.getElementById('prod-tasks-done')?.textContent && (document.getElementById('prod-tasks-done').textContent = todayTasks);
    document.getElementById('prod-habits-done')?.textContent && (document.getElementById('prod-habits-done').textContent = todayHabits);
};

const aiSmartSchedule = async () => {
    showNotification('📅 AI đang tối ưu lịch...', 'info');

    try {
        const pendingTasks = (globalData.tasks || []).filter(t => t.status !== 'Hoàn thành').slice(0, 10);
        const taskList = pendingTasks.map(t => `${t.name} (${t.priority || 'Trung bình'})`).join(', ') || 'Không có task';

        const prompt = `Sắp xếp lịch làm việc tối ưu cho các task sau: ${taskList}. Đề xuất thứ tự ưu tiên và khung giờ phù hợp trong ngày (giả sử làm việc 8h-22h).`;

        const response = await aiService.ask(prompt);

        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
                <div style="background: white; padding: 30px; border-radius: 20px; max-width: 500px;" onclick="event.stopPropagation()">
                    <h3 style="margin-top: 0;">📅 Lịch làm việc tối ưu</h3>
                    <div style="line-height: 1.8;">${response.replace(/\n/g, '<br>')}</div>
                    <button onclick="this.closest('div').closest('div').remove()" style="margin-top: 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 10px 25px; border-radius: 10px; cursor: pointer;">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(resultDiv);
    } catch (error) {
        showNotification('Lỗi: ' + error.message, 'error');
    }
};

const aiFocusSuggest = async () => {
    showNotification('🎯 AI đang phân tích...', 'info');

    try {
        const habits = globalData.habits?.map(h => h.name).join(', ') || 'Chưa có';
        const recentMoods = globalData.journal?.slice(0, 5).map(j => j.mood).join(', ') || 'Chưa có dữ liệu';

        const prompt = `Dựa trên thói quen [${habits}] và cảm xúc gần đây [${recentMoods}], đề xuất 3 khoảng thời gian tập trung tốt nhất trong ngày và cách tối ưu focus time.`;

        const response = await aiService.ask(prompt);

        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
                <div style="background: white; padding: 30px; border-radius: 20px; max-width: 500px;" onclick="event.stopPropagation()">
                    <h3 style="margin-top: 0;">🎯 Đề xuất Focus Time</h3>
                    <div style="line-height: 1.8;">${response.replace(/\n/g, '<br>')}</div>
                    <button onclick="this.closest('div').closest('div').remove()" style="margin-top: 20px; background: linear-gradient(135deg, #10b981, #06b6d4); color: white; border: none; padding: 10px 25px; border-radius: 10px; cursor: pointer;">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(resultDiv);
    } catch (error) {
        showNotification('Lỗi: ' + error.message, 'error');
    }
};

const aiBurnoutCheck = async () => {
    showNotification('⚠️ AI đang kiểm tra burnout...', 'info');

    try {
        const recentMoods = globalData.journal?.slice(0, 7).map(j => j.mood) || [];
        const tiredCount = recentMoods.filter(m => m === 'tired' || m === 'sad').length;
        const tasksCount = (globalData.tasks || []).filter(t => t.status !== 'Hoàn thành').length;

        const prompt = `Đánh giá nguy cơ burnout: ${recentMoods.length} ngày ghi nhật ký, ${tiredCount} ngày mệt/buồn, ${tasksCount} tasks đang chờ. Đánh giá mức độ (Thấp/Trung bình/Cao) và đưa ra 3-5 lời khuyên ngắn gọn để phòng tránh.`;

        const response = await aiService.ask(prompt);

        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
                <div style="background: white; padding: 30px; border-radius: 20px; max-width: 500px;" onclick="event.stopPropagation()">
                    <h3 style="margin-top: 0;">⚠️ Kiểm tra Burnout</h3>
                    <div style="line-height: 1.8;">${response.replace(/\n/g, '<br>')}</div>
                    <button onclick="this.closest('div').closest('div').remove()" style="margin-top: 20px; background: linear-gradient(135deg, #ef4444, #f97316); color: white; border: none; padding: 10px 25px; border-radius: 10px; cursor: pointer;">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(resultDiv);
    } catch (error) {
        showNotification('Lỗi: ' + error.message, 'error');
    }
};

// ============================================================
// 6. HEALTH & WELLNESS
// ============================================================
let waterCount = 0;
let breakTimerInterval = null;

const setupHealthEvents = () => {
    document.getElementById('btn-add-water')?.addEventListener('click', addWater);
    document.getElementById('btn-reset-water')?.addEventListener('click', resetWater);
    document.getElementById('btn-save-health')?.addEventListener('click', saveHealthData);
    document.getElementById('btn-start-break-timer')?.addEventListener('click', startBreakTimer);
    document.getElementById('btn-stop-break-timer')?.addEventListener('click', stopBreakTimer);
    document.getElementById('btn-ai-health-tips')?.addEventListener('click', aiHealthTips);
    document.getElementById('btn-ai-meal-suggest')?.addEventListener('click', aiMealSuggest);
    document.getElementById('btn-ai-sleep-analysis')?.addEventListener('click', aiSleepAnalysis);

    // Load today's health data
    renderHealth();
    renderWaterGlasses();
};

const renderHealth = () => {
    const today = toLocalISOString(new Date());
    const todayHealth = globalData.healthLog?.find(h => h.date === today);

    if (todayHealth) {
        waterCount = todayHealth.water || 0;
        document.getElementById('health-water-count').textContent = waterCount;
        document.getElementById('health-sleep-hours').textContent = todayHealth.sleep || '--';
        document.getElementById('health-exercise-mins').textContent = todayHealth.exercise || 0;
        document.getElementById('health-stress-level').textContent = todayHealth.stress || '--';

        // Fill inputs
        if (document.getElementById('health-sleep-input'))
            document.getElementById('health-sleep-input').value = todayHealth.sleep || '';
        if (document.getElementById('health-exercise-input'))
            document.getElementById('health-exercise-input').value = todayHealth.exercise || '';
        if (document.getElementById('health-stress-input'))
            document.getElementById('health-stress-input').value = todayHealth.stress || 5;
    }
    renderWaterGlasses();
};

const renderWaterGlasses = () => {
    const container = document.getElementById('water-glasses');
    if (!container) return;

    let html = '';
    for (let i = 0; i < 8; i++) {
        const filled = i < waterCount;
        html += `<span style="font-size: 2rem; opacity: ${filled ? 1 : 0.3}; cursor: pointer;" onclick="window.setWaterCount(${i + 1})">${filled ? '💧' : '⚪'}</span>`;
    }
    container.innerHTML = html;

    // Update count display
    const countEl = document.getElementById('health-water-count');
    if (countEl) countEl.textContent = waterCount;
};

// Make setWaterCount global for onclick
window.setWaterCount = async (count) => {
    waterCount = count;
    renderWaterGlasses();
    await saveWaterToday();
};

const addWater = async () => {
    if (waterCount < 8) {
        waterCount++;
        renderWaterGlasses();
        await saveWaterToday();
        if (waterCount === 8) {
            showNotification('🎉 Bạn đã uống đủ 8 ly nước hôm nay!');
        }
    }
};

const resetWater = async () => {
    waterCount = 0;
    renderWaterGlasses();
    await saveWaterToday();
};

const saveWaterToday = async () => {
    if (!globalData.healthLog) globalData.healthLog = [];
    const today = toLocalISOString(new Date());
    let todayLog = globalData.healthLog.find(h => h.date === today);

    if (!todayLog) {
        todayLog = { date: today, water: 0 };
        globalData.healthLog.push(todayLog);
    }
    todayLog.water = waterCount;
    await saveUserData(currentUser.uid, { healthLog: globalData.healthLog });
};

const saveHealthData = async () => {
    const sleep = parseFloat(document.getElementById('health-sleep-input')?.value) || 0;
    const exercise = parseInt(document.getElementById('health-exercise-input')?.value) || 0;
    const stress = parseInt(document.getElementById('health-stress-input')?.value) || 5;

    if (!globalData.healthLog) globalData.healthLog = [];
    const today = toLocalISOString(new Date());
    let todayLog = globalData.healthLog.find(h => h.date === today);

    if (!todayLog) {
        todayLog = { date: today };
        globalData.healthLog.push(todayLog);
    }

    todayLog.sleep = sleep;
    todayLog.exercise = exercise;
    todayLog.stress = stress;
    todayLog.water = waterCount;

    await saveUserData(currentUser.uid, { healthLog: globalData.healthLog });
    renderHealth();
    showNotification('💚 Đã lưu dữ liệu sức khỏe!');
};

// Break Timer
const startBreakTimer = () => {
    const interval = parseInt(document.getElementById('break-interval')?.value) || 25;
    let seconds = interval * 60;
    const display = document.getElementById('break-timer-display');

    if (breakTimerInterval) clearInterval(breakTimerInterval);

    breakTimerInterval = setInterval(() => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (display) display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        if (seconds <= 0) {
            clearInterval(breakTimerInterval);
            showNotification('⏰ Đến giờ nghỉ giải lao! Đứng dậy vận động nhé!');
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('⏰ Nghỉ giải lao!', { body: 'Đứng dậy vận động 5 phút nhé!' });
            }
        }
        seconds--;
    }, 1000);

    showNotification(`⏱️ Đã bắt đầu đếm ngược ${interval} phút`);
};

const stopBreakTimer = () => {
    if (breakTimerInterval) {
        clearInterval(breakTimerInterval);
        breakTimerInterval = null;
    }
    const display = document.getElementById('break-timer-display');
    if (display) display.textContent = '--:--';
    showNotification('⏹️ Đã dừng hẹn giờ');
};

// AI Health Functions
const aiHealthTips = async () => {
    showNotification('💡 AI đang tạo mẹo sức khỏe...', 'info');

    try {
        const recentHealth = (globalData.healthLog || []).slice(-7);
        const avgSleep = recentHealth.length > 0
            ? (recentHealth.reduce((s, h) => s + (h.sleep || 0), 0) / recentHealth.length).toFixed(1)
            : 'chưa có';
        const avgExercise = recentHealth.length > 0
            ? Math.round(recentHealth.reduce((s, h) => s + (h.exercise || 0), 0) / recentHealth.length)
            : 'chưa có';

        const prompt = `Đưa ra 5 mẹo sức khỏe ngắn gọn cho sinh viên dựa trên: Ngủ trung bình ${avgSleep}h, Vận động ${avgExercise} phút/ngày. Mẹo phải thực tế, dễ áp dụng.`;

        const response = await aiService.ask(prompt);

        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
                <div style="background: white; padding: 30px; border-radius: 20px; max-width: 500px;" onclick="event.stopPropagation()">
                    <h3 style="margin-top: 0;">💡 Mẹo sức khỏe</h3>
                    <div style="line-height: 1.8;">${response.replace(/\n/g, '<br>')}</div>
                    <button onclick="this.closest('div').closest('div').remove()" style="margin-top: 20px; background: linear-gradient(135deg, #10b981, #06b6d4); color: white; border: none; padding: 10px 25px; border-radius: 10px; cursor: pointer;">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(resultDiv);
    } catch (error) {
        showNotification('Lỗi: ' + error.message, 'error');
    }
};

const aiMealSuggest = async () => {
    showNotification('🍽️ AI đang gợi ý bữa ăn...', 'info');

    try {
        const prompt = `Gợi ý thực đơn 1 ngày cho sinh viên: Sáng, Trưa, Tối, 2 bữa phụ. Yêu cầu: đủ dinh dưỡng, tiết kiệm, dễ chuẩn bị, phù hợp Việt Nam. Ngắn gọn.`;

        const response = await aiService.ask(prompt);

        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
                <div style="background: white; padding: 30px; border-radius: 20px; max-width: 500px;" onclick="event.stopPropagation()">
                    <h3 style="margin-top: 0;">🍽️ Gợi ý bữa ăn</h3>
                    <div style="line-height: 1.8;">${response.replace(/\n/g, '<br>')}</div>
                    <button onclick="this.closest('div').closest('div').remove()" style="margin-top: 20px; background: linear-gradient(135deg, #f59e0b, #f97316); color: white; border: none; padding: 10px 25px; border-radius: 10px; cursor: pointer;">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(resultDiv);
    } catch (error) {
        showNotification('Lỗi: ' + error.message, 'error');
    }
};

const aiSleepAnalysis = async () => {
    showNotification('😴 AI đang phân tích giấc ngủ...', 'info');

    try {
        const recentHealth = (globalData.healthLog || []).slice(-7);
        const sleepData = recentHealth.map(h => `${h.date}: ${h.sleep || 0}h`).join(', ') || 'Chưa có dữ liệu';

        const prompt = `Phân tích chất lượng giấc ngủ từ dữ liệu 7 ngày: ${sleepData}. Đưa ra: 1) Đánh giá chung, 2) Vấn đề cần cải thiện, 3) 3 lời khuyên cụ thể để ngủ ngon hơn. Ngắn gọn.`;

        const response = await aiService.ask(prompt);

        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
                <div style="background: white; padding: 30px; border-radius: 20px; max-width: 500px;" onclick="event.stopPropagation()">
                    <h3 style="margin-top: 0;">😴 Phân tích giấc ngủ</h3>
                    <div style="line-height: 1.8;">${response.replace(/\n/g, '<br>')}</div>
                    <button onclick="this.closest('div').closest('div').remove()" style="margin-top: 20px; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; border: none; padding: 10px 25px; border-radius: 10px; cursor: pointer;">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(resultDiv);
    } catch (error) {
        showNotification('Lỗi: ' + error.message, 'error');
    }
};

// Call setupHealthEvents in init
// Add to initLifestyleModule
