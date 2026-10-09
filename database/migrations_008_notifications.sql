-- ============================================================================
-- Migration 008: Notifications and Firebase Push Notification Tokens
-- Compatible with MySQL 8.0+ / MariaDB 10.5+
-- ============================================================================

-- 1. In-App Notifications table (Admin, Compounder & Patient notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSON NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME NULL,
    INDEX idx_notifications_user_read (user_id, is_read),
    INDEX idx_notifications_created (created_at),
    INDEX idx_notifications_type (type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. FCM Device Registration Tokens table (Browser & Mobile push tokens)
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    device_type VARCHAR(50) NOT NULL DEFAULT 'web',
    user_agent TEXT NULL,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fcm_tokens_user (user_id),
    INDEX idx_fcm_tokens_token (token(255)),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
