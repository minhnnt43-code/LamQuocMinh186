// ============================================================
// FILE: js/ai-automation-engine.js
// Mục đích: Phase 7 - Nhóm 8: Tự động hóa & Tích hợp (10 tính năng)
// ============================================================

import { showNotification, generateID, toLocalISOString } from './common.js';
import { saveUserData } from './api.js';
import { classifyIntent, extractEntities } from './ai-core-engine.js';

let globalData = null;
let currentUser = null;

// Automation rules storage
let automationRules = [];
let automationHistory = [];

/**
 * Khởi tạo module
 */
export function initAutomationEngine(data, user) {
    globalData = data;
    currentUser = user;
    loadAutomationRules();
    startAutomationScheduler();
    console.log('✅ AI Automation Engine (Phase 7) đã sẵn sàng');
}

// ============================================================
// #71 - TẠO RULE TỰ ĐỘNG (Automation Rules)
// Tạo và quản lý các quy tắc tự động
// ============================================================
export function createAutomationRule(rule) {
    const newRule = {
        id: generateID('rule'),
        name: rule.name,
        description: rule.description || '',
        trigger: rule.trigger, // { type: 'time'|'event'|'condition', value: ... }
        conditions: rule.conditions || [], // [{ field, operator, value }]
        actions: rule.actions, // [{ type: 'create_task'|'send_notification'|..., params: {} }]
        enabled: rule.enabled !== false,
        createdAt: new Date().toISOString(),
        runCount: 0,
        lastRun: null
    };

    automationRules.push(newRule);
    saveAutomationRules();

    return newRule;
}

export function getAutomationRules() {
    return automationRules;
}

export function updateAutomationRule(ruleId, updates) {
    const index = automationRules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
        automationRules[index] = { ...automationRules[index], ...updates };
        saveAutomationRules();
        return automationRules[index];
    }
    return null;
}

export function deleteAutomationRule(ruleId) {
    const index = automationRules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
        automationRules.splice(index, 1);
        saveAutomationRules();
        return true;
    }
    return false;
}

function saveAutomationRules() {
    localStorage.setItem('automation_rules', JSON.stringify(automationRules));
}

function loadAutomationRules() {
    try {
        const saved = localStorage.getItem('automation_rules');
        if (saved) automationRules = JSON.parse(saved);
    } catch (e) {
        console.error('Lỗi load automation rules:', e);
    }
}

// ============================================================
// #72 - TỰ ĐỘNG TẠO TASK (Auto Task Creation)
// Tự động tạo tasks từ patterns
// ============================================================
export function createRecurringTask(template) {
    const recurring = {
        id: generateID('recurring'),
        name: template.name,
        taskTemplate: {
            title: template.title,
            description: template.description || '',
            priority: template.priority || 'medium',
            category: template.category || 'Công việc',
            estimatedDuration: template.estimatedDuration || 30
        },
        schedule: template.schedule, // { type: 'daily'|'weekly'|'monthly', day?: N, time?: 'HH:mm' }
        enabled: true,
        nextRun: calculateNextRun(template.schedule),
        createdTasks: []
    };

    // Save to recurring tasks list
    const recurringTasks = JSON.parse(localStorage.getItem('recurring_tasks') || '[]');
    recurringTasks.push(recurring);
    localStorage.setItem('recurring_tasks', JSON.stringify(recurringTasks));

    return recurring;
}

function calculateNextRun(schedule) {
    const now = new Date();
    const next = new Date(now);

    switch (schedule.type) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            break;
        case 'weekly':
            const daysUntil = (schedule.day - now.getDay() + 7) % 7 || 7;
            next.setDate(next.getDate() + daysUntil);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            next.setDate(schedule.day || 1);
            break;
    }

    if (schedule.time) {
        const [hours, minutes] = schedule.time.split(':');
        next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }

    return next.toISOString();
}

export function getRecurringTasks() {
    return JSON.parse(localStorage.getItem('recurring_tasks') || '[]');
}

// ============================================================
// #73 - TRIGGER CONDITIONS (Điều kiện kích hoạt)
// Đánh giá các điều kiện trigger
// ============================================================
export function evaluateConditions(conditions, context) {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(condition => {
        const value = getNestedValue(context, condition.field);

        switch (condition.operator) {
            case 'equals':
                return value === condition.value;
            case 'not_equals':
                return value !== condition.value;
            case 'contains':
                return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
            case 'greater_than':
                return Number(value) > Number(condition.value);
            case 'less_than':
                return Number(value) < Number(condition.value);
            case 'is_empty':
                return !value || value.length === 0;
            case 'is_not_empty':
                return value && value.length > 0;
            case 'before':
                return new Date(value) < new Date(condition.value);
            case 'after':
                return new Date(value) > new Date(condition.value);
            default:
                return true;
        }
    });
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

// ============================================================
// #74 - WORKFLOW BUILDER (Xây dựng workflow)
// Tạo workflows phức tạp từ nhiều bước
// ============================================================
export function createWorkflow(workflow) {
    const newWorkflow = {
        id: generateID('workflow'),
        name: workflow.name,
        description: workflow.description || '',
        steps: workflow.steps.map((step, index) => ({
            id: generateID('step'),
            order: index + 1,
            type: step.type, // 'action' | 'condition' | 'delay' | 'parallel'
            config: step.config,
            nextOnSuccess: step.nextOnSuccess || (index < workflow.steps.length - 1 ? index + 2 : null),
            nextOnFailure: step.nextOnFailure || null
        })),
        trigger: workflow.trigger,
        enabled: true,
        createdAt: new Date().toISOString()
    };

    const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');
    workflows.push(newWorkflow);
    localStorage.setItem('workflows', JSON.stringify(workflows));

    return newWorkflow;
}

export function executeWorkflow(workflowId, context = {}) {
    const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');
    const workflow = workflows.find(w => w.id === workflowId);

    if (!workflow) return { success: false, error: 'Workflow not found' };

    const results = [];
    let currentStep = 0;

    while (currentStep < workflow.steps.length) {
        const step = workflow.steps[currentStep];
        const result = executeStep(step, context);
        results.push({ step: step.id, ...result });

        if (result.success) {
            if (step.nextOnSuccess === null) break;
            currentStep = step.nextOnSuccess - 1;
        } else {
            if (step.nextOnFailure === null) break;
            currentStep = step.nextOnFailure - 1;
        }
    }

    return { success: true, results };
}

function executeStep(step, context) {
    switch (step.type) {
        case 'action':
            return executeAction(step.config, context);
        case 'condition':
            return { success: evaluateConditions(step.config.conditions, context) };
        case 'delay':
            // In real app, would schedule continuation
            return { success: true, delayed: step.config.duration };
        default:
            return { success: true };
    }
}

// ============================================================
// #75 - ACTION EXECUTOR (Thực thi hành động)
// Thực thi các actions được định nghĩa
// ============================================================
export function executeAction(action, context = {}) {
    try {
        switch (action.type) {
            case 'create_task':
                return createTaskAction(action.params, context);
            case 'update_task':
                return updateTaskAction(action.params, context);
            case 'send_notification':
                return sendNotificationAction(action.params, context);
            case 'set_reminder':
                return setReminderAction(action.params, context);
            case 'log':
                console.log('[Automation]', action.params.message);
                return { success: true };
            default:
                return { success: false, error: 'Unknown action type' };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function createTaskAction(params, context) {
    const task = {
        id: generateID('task'),
        title: replaceVariables(params.title, context),
        description: replaceVariables(params.description || '', context),
        priority: params.priority || 'medium',
        category: params.category || 'Tự động',
        deadline: params.deadline,
        completed: false,
        createdAt: new Date().toISOString(),
        createdBy: 'automation'
    };

    if (!globalData.tasks) globalData.tasks = [];
    globalData.tasks.push(task);

    // Save async
    if (currentUser) {
        saveUserData(currentUser.uid, { tasks: globalData.tasks });
    }

    return { success: true, taskId: task.id };
}

function updateTaskAction(params, context) {
    const taskId = replaceVariables(params.taskId, context);
    const task = globalData.tasks?.find(t => t.id === taskId);

    if (!task) return { success: false, error: 'Task not found' };

    Object.assign(task, params.updates);

    if (currentUser) {
        saveUserData(currentUser.uid, { tasks: globalData.tasks });
    }

    return { success: true };
}

function sendNotificationAction(params, context) {
    const message = replaceVariables(params.message, context);
    showNotification(message, params.type || 'info');
    return { success: true };
}

function setReminderAction(params, context) {
    const reminder = {
        id: generateID('reminder'),
        message: replaceVariables(params.message, context),
        scheduledFor: params.time,
        createdAt: new Date().toISOString()
    };

    const reminders = JSON.parse(localStorage.getItem('auto_reminders') || '[]');
    reminders.push(reminder);
    localStorage.setItem('auto_reminders', JSON.stringify(reminders));

    return { success: true, reminderId: reminder.id };
}

function replaceVariables(template, context) {
    if (!template) return '';
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => context[key] || match);
}

// ============================================================
// #76 - SCHEDULER (Lập lịch tự động)
// Quản lý scheduled tasks
// ============================================================
let schedulerInterval = null;

function startAutomationScheduler() {
    // Check every minute
    schedulerInterval = setInterval(() => {
        checkScheduledTasks();
        checkRecurringTasks();
        checkTimeBasedRules();
    }, 60000);

    // Initial check
    setTimeout(() => {
        checkScheduledTasks();
        checkRecurringTasks();
    }, 5000);
}

function checkScheduledTasks() {
    const reminders = JSON.parse(localStorage.getItem('auto_reminders') || '[]');
    const now = new Date();
    const due = reminders.filter(r => new Date(r.scheduledFor) <= now && !r.triggered);

    for (const reminder of due) {
        showNotification(reminder.message, 'info');
        reminder.triggered = true;
    }

    localStorage.setItem('auto_reminders', JSON.stringify(reminders));
}

function checkRecurringTasks() {
    const recurring = getRecurringTasks();
    const now = new Date();

    for (const task of recurring) {
        if (!task.enabled) continue;
        if (new Date(task.nextRun) <= now) {
            // Create the task
            const newTask = {
                id: generateID('task'),
                ...task.taskTemplate,
                completed: false,
                createdAt: now.toISOString(),
                createdBy: 'recurring'
            };

            if (!globalData.tasks) globalData.tasks = [];
            globalData.tasks.push(newTask);

            // Update next run
            task.nextRun = calculateNextRun(task.schedule);
            task.createdTasks.push(newTask.id);
        }
    }

    localStorage.setItem('recurring_tasks', JSON.stringify(recurring));
}

function checkTimeBasedRules() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    for (const rule of automationRules) {
        if (!rule.enabled) continue;
        if (rule.trigger.type !== 'time') continue;

        const [triggerHour, triggerMinute] = rule.trigger.value.split(':').map(Number);

        if (currentHour === triggerHour && currentMinute === triggerMinute) {
            runAutomationRule(rule);
        }
    }
}

// ============================================================
// #77 - EVENT LISTENERS (Lắng nghe sự kiện)
// Lắng nghe và phản ứng với events
// ============================================================
const eventListeners = {};

export function registerEventListener(eventType, callback) {
    if (!eventListeners[eventType]) {
        eventListeners[eventType] = [];
    }
    eventListeners[eventType].push(callback);
}

export function emitEvent(eventType, data) {
    const listeners = eventListeners[eventType] || [];
    for (const listener of listeners) {
        try {
            listener(data);
        } catch (e) {
            console.error('Event listener error:', e);
        }
    }

    // Check event-based automation rules
    for (const rule of automationRules) {
        if (!rule.enabled) continue;
        if (rule.trigger.type !== 'event') continue;
        if (rule.trigger.value === eventType) {
            if (evaluateConditions(rule.conditions, data)) {
                runAutomationRule(rule, data);
            }
        }
    }
}

// Common events
export const EVENTS = {
    TASK_CREATED: 'task_created',
    TASK_COMPLETED: 'task_completed',
    TASK_OVERDUE: 'task_overdue',
    DEADLINE_APPROACHING: 'deadline_approaching',
    GOAL_ACHIEVED: 'goal_achieved',
    STREAK_UPDATED: 'streak_updated'
};

// ============================================================
// #78 - AUTOMATION TEMPLATES (Templates tự động)
// Templates cho các automations phổ biến
// ============================================================
export function getAutomationTemplates() {
    return [
        {
            id: 'daily_review',
            name: 'Daily Review',
            description: 'Tạo task review hàng ngày lúc 9h sáng',
            trigger: { type: 'time', value: '09:00' },
            actions: [{
                type: 'create_task',
                params: {
                    title: '📋 Daily Review - {{date}}',
                    description: 'Review tasks và lập kế hoạch cho ngày hôm nay',
                    priority: 'high',
                    category: 'Công việc'
                }
            }]
        },
        {
            id: 'deadline_reminder',
            name: 'Deadline Reminder',
            description: 'Nhắc nhở khi task sắp hết hạn (1 ngày trước)',
            trigger: { type: 'event', value: EVENTS.DEADLINE_APPROACHING },
            actions: [{
                type: 'send_notification',
                params: {
                    message: '⏰ Task "{{taskTitle}}" sẽ hết hạn trong 1 ngày!',
                    type: 'warning'
                }
            }]
        },
        {
            id: 'weekly_summary',
            name: 'Weekly Summary',
            description: 'Tạo task tổng kết tuần vào Chủ nhật',
            trigger: { type: 'time', value: '18:00' },
            conditions: [{ field: 'dayOfWeek', operator: 'equals', value: 0 }],
            actions: [{
                type: 'create_task',
                params: {
                    title: '📊 Weekly Summary',
                    description: 'Tổng kết công việc tuần qua và lập kế hoạch tuần tới',
                    priority: 'medium',
                    category: 'Công việc'
                }
            }]
        },
        {
            id: 'completion_celebration',
            name: 'Task Completion',
            description: 'Thông báo chúc mừng khi hoàn thành task quan trọng',
            trigger: { type: 'event', value: EVENTS.TASK_COMPLETED },
            conditions: [{ field: 'priority', operator: 'equals', value: 'high' }],
            actions: [{
                type: 'send_notification',
                params: {
                    message: '🎉 Tuyệt vời! Bạn đã hoàn thành "{{title}}"!',
                    type: 'success'
                }
            }]
        }
    ];
}

export function applyAutomationTemplate(templateId) {
    const template = getAutomationTemplates().find(t => t.id === templateId);
    if (!template) return null;

    return createAutomationRule({
        name: template.name,
        description: template.description,
        trigger: template.trigger,
        conditions: template.conditions,
        actions: template.actions
    });
}

// ============================================================
// #79 - AUTOMATION HISTORY (Lịch sử tự động)
// Ghi lại lịch sử các automations đã chạy
// ============================================================
function runAutomationRule(rule, context = {}) {
    const startTime = new Date();
    const results = [];

    for (const action of rule.actions) {
        const result = executeAction(action, {
            ...context,
            date: startTime.toLocaleDateString('vi-VN'),
            time: startTime.toLocaleTimeString('vi-VN')
        });
        results.push({ action: action.type, ...result });
    }

    // Update rule stats
    rule.runCount++;
    rule.lastRun = startTime.toISOString();
    saveAutomationRules();

    // Log to history
    const historyEntry = {
        id: generateID('history'),
        ruleId: rule.id,
        ruleName: rule.name,
        timestamp: startTime.toISOString(),
        duration: new Date() - startTime,
        results,
        success: results.every(r => r.success)
    };

    automationHistory.unshift(historyEntry);
    if (automationHistory.length > 100) automationHistory.pop();
    saveAutomationHistory();

    return historyEntry;
}

function saveAutomationHistory() {
    localStorage.setItem('automation_history', JSON.stringify(automationHistory));
}

export function getAutomationHistory(limit = 20) {
    try {
        const saved = localStorage.getItem('automation_history');
        if (saved) automationHistory = JSON.parse(saved);
    } catch (e) { }
    return automationHistory.slice(0, limit);
}

// ============================================================
// #80 - AUTOMATION ANALYTICS (Phân tích tự động)
// Thống kê về automations
// ============================================================
export function getAutomationAnalytics() {
    const history = getAutomationHistory(100);
    const rules = getAutomationRules();

    // Success rate
    const successCount = history.filter(h => h.success).length;
    const successRate = history.length > 0 ? Math.round((successCount / history.length) * 100) : 0;

    // Most active rules
    const ruleStats = {};
    for (const entry of history) {
        ruleStats[entry.ruleId] = (ruleStats[entry.ruleId] || 0) + 1;
    }

    const mostActiveRules = Object.entries(ruleStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ruleId, count]) => {
            const rule = rules.find(r => r.id === ruleId);
            return { ruleId, name: rule?.name || 'Unknown', runCount: count };
        });

    // Actions created
    const actionsCreated = history.reduce((sum, h) => sum + h.results.length, 0);

    // Time saved estimate (assume 2 min per automated action)
    const timeSavedMinutes = actionsCreated * 2;

    return {
        totalRules: rules.length,
        enabledRules: rules.filter(r => r.enabled).length,
        totalRuns: history.length,
        successRate,
        mostActiveRules,
        actionsCreated,
        timeSavedMinutes,
        timeSavedFormatted: timeSavedMinutes >= 60
            ? `${Math.round(timeSavedMinutes / 60 * 10) / 10} giờ`
            : `${timeSavedMinutes} phút`
    };
}

