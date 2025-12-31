-- ============================================================
-- FILE: database.sql
-- Script tạo các bảng cho LifeOS trên MySQL
-- Chạy trong phpMyAdmin của TinoHost
-- ============================================================

-- Đặt charset UTF-8
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================================
-- BẢNG USERS (Người dùng)
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(100) DEFAULT 'User',
    `avatar_url` TEXT,
    `settings` JSON,
    `personal_info` JSON,
    `achievements` JSON,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BẢNG TASKS (Công việc)
-- ============================================================
CREATE TABLE IF NOT EXISTS `tasks` (
    `id` VARCHAR(50) PRIMARY KEY,
    `user_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `priority` VARCHAR(20) DEFAULT 'medium',
    `category` VARCHAR(50) DEFAULT 'Chung',
    `due_date` DATE,
    `status` VARCHAR(50) DEFAULT 'Chưa thực hiện',
    `project` VARCHAR(100),
    `recurrence` VARCHAR(20) DEFAULT 'none',
    `link` TEXT,
    `tags` TEXT,
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user` (`user_id`),
    INDEX `idx_due_date` (`due_date`),
    INDEX `idx_status` (`status`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BẢNG CALENDAR_EVENTS (Sự kiện lịch)
-- ============================================================
CREATE TABLE IF NOT EXISTS `calendar_events` (
    `id` VARCHAR(50) PRIMARY KEY,
    `user_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `date` DATE NOT NULL,
    `start_time` TIME,
    `end_time` TIME,
    `color` VARCHAR(20) DEFAULT '#3788d8',
    `description` TEXT,
    `linked_task_id` VARCHAR(50),
    `type` VARCHAR(20) DEFAULT 'manual',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user` (`user_id`),
    INDEX `idx_date` (`date`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BẢNG PROJECTS (Dự án)
-- ============================================================
CREATE TABLE IF NOT EXISTS `projects` (
    `id` VARCHAR(50) PRIMARY KEY,
    `user_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `start_date` DATE,
    `end_date` DATE,
    `status` VARCHAR(50) DEFAULT 'Đang thực hiện',
    `color` VARCHAR(20) DEFAULT '#667eea',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user` (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BẢNG TODO_GROUPS (Nhóm To-do)
-- ============================================================
CREATE TABLE IF NOT EXISTS `todo_groups` (
    `id` VARCHAR(50) PRIMARY KEY,
    `user_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `color` VARCHAR(20) DEFAULT '#667eea',
    `deadline` DATE,
    `items` JSON,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user` (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BẢNG DOCUMENTS (Tài liệu thư viện số)
-- ============================================================
CREATE TABLE IF NOT EXISTS `documents` (
    `id` VARCHAR(50) PRIMARY KEY,
    `user_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100),
    `file_url` TEXT,
    `file_name` VARCHAR(255),
    `file_size` INT,
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user` (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BẢNG DRAFTS (Bản nháp)
-- ============================================================
CREATE TABLE IF NOT EXISTS `drafts` (
    `id` VARCHAR(50) PRIMARY KEY,
    `user_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` LONGTEXT,
    `category` VARCHAR(100),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_user` (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DONE! Đã tạo xong tất cả các bảng
-- ============================================================
