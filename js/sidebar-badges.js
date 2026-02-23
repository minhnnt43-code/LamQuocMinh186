// ============================================================
// FILE: js/sidebar-badges.js
// Mục đích: Quản lý badges đếm số cho sidebar menu
// ============================================================

/**
 * Update all sidebar badges with current data counts
 * @param {Object} userData - User data object
 */
export function updateAllBadges(userData) {
    if (!userData) return;

    updateTasksBadge(userData.tasks || []);
    updateTodoBadge(userData.todos || []);
    updateProjectsBadge(userData.projects || []);
    updateCalendarBadge(userData.calendarEvents || []);
    updateDraftsBadge(userData.drafts || []);
}

/**
 * Update Tasks badge - count uncompleted tasks
 */
function updateTasksBadge(tasks) {
    const pending = tasks.filter(t => !t.completed).length;
    updateBadge('tasks-badge', pending);
}

/**
 * Update To-do badge - count uncompleted todos
 */
function updateTodoBadge(todos) {
    const pending = todos.filter(t => !t.completed).length;
    updateBadge('todo-badge', pending);
}

/**
 * Update Projects badge - count active projects
 */
function updateProjectsBadge(projects) {
    const active = projects.filter(p => p.status !== 'completed' && p.status !== 'archived').length;
    updateBadge('projects-badge', active);
}

/**
 * Update Calendar badge - count events today
 */
function updateCalendarBadge(calendarEvents) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEvents = calendarEvents.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate >= today && eventDate < tomorrow;
    }).length;

    updateBadge('calendar-badge', todayEvents);
}

/**
 * Update Drafts badge - count all drafts
 */
function updateDraftsBadge(drafts) {
    updateBadge('drafts-badge', drafts.length);
}

/**
 * Generic badge update function
 * Always shows badge, even when count = 0
 */
function updateBadge(badgeId, count) {
    const badge = document.getElementById(badgeId);
    if (!badge) return;

    // Always show badge, including when count = 0
    badge.textContent = count;
    badge.style.display = 'inline-block';
}
