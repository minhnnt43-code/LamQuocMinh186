/**
 * ============================================================
 * DATA MIGRATION SCRIPT - LifeOS 2026
 * ============================================================
 * Migrate task field names từ legacy format sang chuẩn mới:
 * - title → name
 * - deadline → dueDate
 * - description → notes
 * - completed → status: 'Hoàn thành'
 * - pending → Chưa thực hiện
 * ============================================================
 */

import { saveUserData } from '../firebase.js';

/**
 * Migrate một task từ format cũ sang format mới
 */
function migrateTask(task) {
    const migrated = { ...task };

    // title → name
    if (task.title && !task.name) {
        migrated.name = task.title;
        delete migrated.title;
    }

    // deadline → dueDate
    if (task.deadline && !task.dueDate) {
        migrated.dueDate = task.deadline;
        delete migrated.deadline;
    }

    // description → notes
    if (task.description !== undefined && task.notes === undefined) {
        migrated.notes = task.description || '';
        delete migrated.description;
    }

    // completed: true → status: 'Hoàn thành'
    if (task.completed === true && !task.status) {
        migrated.status = 'Hoàn thành';
        delete migrated.completed;
    }

    // status: 'pending' → 'Chưa thực hiện'
    if (task.status === 'pending') {
        migrated.status = 'Chưa thực hiện';
    }

    // Đảm bảo có các fields cơ bản
    if (!migrated.name) migrated.name = '';
    if (!migrated.status) migrated.status = 'Chưa thực hiện';
    if (!migrated.priority) migrated.priority = 'medium';
    if (!migrated.category) migrated.category = 'Khác';

    return migrated;
}

/**
 * Migrate tất cả tasks trong userData
 */
export function migrateTasks(tasks) {
    if (!tasks || !Array.isArray(tasks)) return [];

    let migratedCount = 0;
    const migratedTasks = tasks.map(task => {
        const original = JSON.stringify(task);
        const migrated = migrateTask(task);
        if (original !== JSON.stringify(migrated)) {
            migratedCount++;
        }
        return migrated;
    });

    console.log(`📦 Migrated ${migratedCount}/${tasks.length} tasks`);
    return migratedTasks;
}

/**
 * Chạy migration cho user hiện tại
 */
export async function runMigration(userData, userId) {
    if (!userData || !userId) {
        console.error('❌ Migration: userData hoặc userId không hợp lệ');
        return false;
    }

    try {
        console.log('🚀 Bắt đầu migration...');

        // Migrate tasks
        const originalTasks = userData.tasks || [];
        const migratedTasks = migrateTasks(originalTasks);

        // Lưu vào Firebase
        await saveUserData(userId, { tasks: migratedTasks });

        console.log('✅ Migration hoàn tất!');
        return true;
    } catch (error) {
        console.error('❌ Migration lỗi:', error);
        return false;
    }
}

/**
 * Auto-migrate khi load data (chạy silent)
 */
export function autoMigrate(tasks) {
    if (!tasks || !Array.isArray(tasks)) return tasks;

    // Check xem có cần migrate không
    const needsMigration = tasks.some(t =>
        t.title !== undefined ||
        t.deadline !== undefined ||
        t.description !== undefined ||
        t.status === 'pending' ||
        t.completed !== undefined
    );

    if (needsMigration) {
        console.log('🔄 Auto-migrating legacy task data...');
        return migrateTasks(tasks);
    }

    return tasks;
}

// Export cho window object
if (typeof window !== 'undefined') {
    window.DataMigration = {
        migrateTasks,
        runMigration,
        autoMigrate
    };
}
