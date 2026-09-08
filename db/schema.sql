-- WatchWDS MySQL Schema
-- Migrated from Firebase Firestore

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================
-- USERS
-- ============================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(100) PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) DEFAULT '',
  `avatar` TEXT DEFAULT NULL,
  `role` ENUM('viewer','creator','operator','admin') DEFAULT 'viewer',
  `balance` DECIMAL(12,2) DEFAULT 0.00,
  `status` ENUM('active','banned','suspended') DEFAULT 'active',
  `active_device_id` VARCHAR(255) DEFAULT NULL,
  `plan_id` VARCHAR(100) DEFAULT NULL,
  `plan_expires_at` DATETIME DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `points` DECIMAL(12,2) DEFAULT 0.00,
  `dob` VARCHAR(50) DEFAULT NULL,
  `gender` VARCHAR(50) DEFAULT NULL,
  `subscribed_matches` JSON DEFAULT NULL,
  `subscribed_categories` JSON DEFAULT NULL,
  `verified` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MATCHES
-- ============================================
CREATE TABLE IF NOT EXISTS `matches` (
  `id` VARCHAR(100) PRIMARY KEY,
  `title` VARCHAR(500) NOT NULL DEFAULT '',
  `slug` VARCHAR(500) DEFAULT '',
  `description` TEXT DEFAULT NULL,
  `content` LONGTEXT DEFAULT NULL,
  `date` VARCHAR(100) DEFAULT '',
  `start_time` DATETIME DEFAULT NULL,
  `price` DECIMAL(10,2) DEFAULT 0.00,
  `embed_price` DECIMAL(10,2) DEFAULT 0.00,
  `status` VARCHAR(50) DEFAULT 'upcoming',
  `publish_status` VARCHAR(50) DEFAULT 'published',
  `access` VARCHAR(50) DEFAULT 'free',
  `access_type` VARCHAR(50) DEFAULT NULL,
  `ppv_price` DECIMAL(10,2) DEFAULT NULL,
  `required_plan_id` VARCHAR(100) DEFAULT NULL,
  `thumbnail` TEXT DEFAULT NULL,
  `categories` JSON DEFAULT NULL,
  `seo` JSON DEFAULT NULL,
  `scheduled_date` VARCHAR(100) DEFAULT NULL,
  `live_commenting` TINYINT(1) DEFAULT 1,
  `comment_alignment` VARCHAR(20) DEFAULT 'right',
  `views` INT DEFAULT 0,
  `ad_settings` JSON DEFAULT NULL,
  `operator_id` VARCHAR(100) DEFAULT NULL,
  `creator_id` VARCHAR(100) DEFAULT NULL,
  `duration` INT DEFAULT 120,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PURCHASES
-- ============================================
CREATE TABLE IF NOT EXISTS `purchases` (
  `id` VARCHAR(100) PRIMARY KEY,
  `user_id` VARCHAR(100) NOT NULL,
  `match_id` VARCHAR(100) DEFAULT NULL,
  `amount` DECIMAL(10,2) DEFAULT 0.00,
  `type` VARCHAR(50) DEFAULT 'watch',
  `code` TEXT DEFAULT NULL,
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_purchases_user` (`user_id`),
  INDEX `idx_purchases_match` (`match_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` VARCHAR(100) PRIMARY KEY,
  `user_id` VARCHAR(100) DEFAULT NULL,
  `type` VARCHAR(50) DEFAULT 'top_up',
  `amount` DECIMAL(12,2) DEFAULT 0.00,
  `description` TEXT DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'pending',
  `gateway` VARCHAR(50) DEFAULT NULL,
  `currency` VARCHAR(10) DEFAULT NULL,
  `metadata` JSON DEFAULT NULL,
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_transactions_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PLANS (Subscriptions)
-- ============================================
CREATE TABLE IF NOT EXISTS `plans` (
  `id` VARCHAR(100) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL DEFAULT '',
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(10,2) DEFAULT 0.00,
  `duration_days` INT DEFAULT 30,
  `categories` JSON DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TASKS (Missions)
-- ============================================
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` VARCHAR(100) PRIMARY KEY,
  `title` VARCHAR(255) DEFAULT '',
  `description` TEXT DEFAULT NULL,
  `reward` DECIMAL(10,2) DEFAULT 0.00,
  `type` VARCHAR(50) DEFAULT 'visit',
  `link` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(100) PRIMARY KEY,
  `user_id` VARCHAR(100) NOT NULL,
  `title` VARCHAR(500) DEFAULT '',
  `message` TEXT DEFAULT NULL,
  `type` VARCHAR(50) DEFAULT 'info',
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notifications_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SAVED MATCHES
-- ============================================
CREATE TABLE IF NOT EXISTS `saved_matches` (
  `id` VARCHAR(100) PRIMARY KEY,
  `user_id` VARCHAR(100) NOT NULL,
  `match_id` VARCHAR(100) NOT NULL,
  UNIQUE KEY `uk_saved_matches` (`user_id`, `match_id`),
  INDEX `idx_saved_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- FEATURES (Toggles)
-- ============================================
CREATE TABLE IF NOT EXISTS `features` (
  `id` VARCHAR(100) PRIMARY KEY,
  `key_name` VARCHAR(100) NOT NULL UNIQUE,
  `label` VARCHAR(255) DEFAULT '',
  `enabled` TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS `comments` (
  `id` VARCHAR(100) PRIMARY KEY,
  `match_id` VARCHAR(100) DEFAULT NULL,
  `user_id` VARCHAR(100) DEFAULT NULL,
  `user_name` VARCHAR(255) DEFAULT '',
  `user_avatar` TEXT DEFAULT NULL,
  `text` TEXT DEFAULT NULL,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `likes` INT DEFAULT 0,
  `liked_by` JSON DEFAULT NULL,
  `role` VARCHAR(50) DEFAULT 'user',
  `status` VARCHAR(50) DEFAULT 'active',
  INDEX `idx_comments_match` (`match_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BLOG POSTS
-- ============================================
CREATE TABLE IF NOT EXISTS `blog_posts` (
  `id` VARCHAR(100) PRIMARY KEY,
  `title` VARCHAR(500) NOT NULL DEFAULT '',
  `slug` VARCHAR(500) DEFAULT '',
  `content` LONGTEXT DEFAULT NULL,
  `excerpt` TEXT DEFAULT NULL,
  `featured_image` TEXT DEFAULT NULL,
  `author_id` VARCHAR(100) DEFAULT 1,
  `categories` JSON DEFAULT NULL,
  `tags` JSON DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'draft',
  `scheduled_date` VARCHAR(100) DEFAULT NULL,
  `restricted` VARCHAR(50) DEFAULT 'none',
  `seo` JSON DEFAULT NULL,
  `embed_url` TEXT DEFAULT NULL,
  `views` INT DEFAULT 0,
  `likes` INT DEFAULT 0,
  `reading_time_minutes` INT DEFAULT 3,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- FORUM CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS `forum_categories` (
  `id` VARCHAR(100) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL DEFAULT '',
  `description` TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- FORUM TOPICS
-- ============================================
CREATE TABLE IF NOT EXISTS `forum_topics` (
  `id` VARCHAR(100) PRIMARY KEY,
  `category_id` VARCHAR(100) NOT NULL,
  `title` VARCHAR(500) NOT NULL DEFAULT '',
  `content` LONGTEXT DEFAULT NULL,
  `author_id` VARCHAR(100) DEFAULT NULL,
  `author_name` VARCHAR(255) DEFAULT '',
  `author_avatar` TEXT DEFAULT NULL,
  `reply_count` INT DEFAULT 0,
  `is_pinned` TINYINT(1) DEFAULT 0,
  `is_locked` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_topics_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- FORUM REPLIES
-- ============================================
CREATE TABLE IF NOT EXISTS `forum_replies` (
  `id` VARCHAR(100) PRIMARY KEY,
  `topic_id` VARCHAR(100) NOT NULL,
  `content` LONGTEXT DEFAULT NULL,
  `author_id` VARCHAR(100) DEFAULT NULL,
  `author_name` VARCHAR(255) DEFAULT '',
  `author_avatar` TEXT DEFAULT NULL,
  `author_role` VARCHAR(50) DEFAULT 'user',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_replies_topic` (`topic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- KNOWLEDGE BASE
-- ============================================
CREATE TABLE IF NOT EXISTS `knowledge_base` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(500) NOT NULL DEFAULT '',
  `content` LONGTEXT DEFAULT NULL,
  `tags` JSON DEFAULT NULL,
  `category` VARCHAR(255) DEFAULT '',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PASSWORD RESETS
-- ============================================
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` VARCHAR(100) PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL,
  `token` VARCHAR(255) NOT NULL UNIQUE,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_resets_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SETTINGS (Key-Value store for app config)
-- ============================================
CREATE TABLE IF NOT EXISTS `settings` (
  `key_name` VARCHAR(100) PRIMARY KEY,
  `value` JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PAYMENT SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS `payment_settings` (
  `key_name` VARCHAR(100) PRIMARY KEY,
  `value` JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EMAIL SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS `email_settings` (
  `key_name` VARCHAR(100) PRIMARY KEY,
  `value` JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EMAIL BRANDING
-- ============================================
CREATE TABLE IF NOT EXISTS `email_branding` (
  `key_name` VARCHAR(100) PRIMARY KEY,
  `value` JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EMAIL TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS `email_templates` (
  `slug` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(500) NOT NULL DEFAULT '',
  `subject` TEXT NOT NULL,
  `body` LONGTEXT NOT NULL,
  `category` VARCHAR(255) DEFAULT 'Custom',
  `variables_hint` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_custom` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EMAIL TEMPLATE VERSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS `email_versions` (
  `id` VARCHAR(100) PRIMARY KEY,
  `template_id` VARCHAR(255) NOT NULL,
  `subject` TEXT DEFAULT NULL,
  `body` LONGTEXT DEFAULT NULL,
  `version_number` INT DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(255) DEFAULT 'Admin',
  INDEX `idx_versions_template` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EMAIL TEMPLATE ANALYTICS
-- ============================================
CREATE TABLE IF NOT EXISTS `email_template_analytics` (
  `slug` VARCHAR(255) PRIMARY KEY,
  `sent` INT DEFAULT 0,
  `delivered` INT DEFAULT 0,
  `opened` INT DEFAULT 0,
  `clicked` INT DEFAULT 0,
  `failed` INT DEFAULT 0,
  `bounced` INT DEFAULT 0,
  `last_sent_at` VARCHAR(100) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ADS MANAGER
-- ============================================
CREATE TABLE IF NOT EXISTS `ads` (
  `id` VARCHAR(100) PRIMARY KEY,
  `campaignName` VARCHAR(255) NOT NULL,
  `status` ENUM('active','inactive') DEFAULT 'active',
  `type` ENUM('video','html','embed','affiliate','adsense') DEFAULT 'html',
  `code` LONGTEXT NOT NULL,
  `destinationUrl` VARCHAR(500) DEFAULT NULL,
  `startDate` DATETIME DEFAULT NULL,
  `endDate` DATETIME DEFAULT NULL,
  `priority` INT DEFAULT 1,
  `weight` INT DEFAULT 1,
  `targetAll` TINYINT(1) DEFAULT 1,
  `targetMatches` JSON DEFAULT NULL,
  `targetCategories` JSON DEFAULT NULL,
  `targetLeagues` JSON DEFAULT NULL,
  `targetClubs` JSON DEFAULT NULL,
  `skipTimer` INT DEFAULT 5,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ad_impressions` (
  `id` VARCHAR(100) PRIMARY KEY,
  `adId` VARCHAR(100) NOT NULL,
  `matchId` VARCHAR(100) DEFAULT NULL,
  `userId` VARCHAR(100) DEFAULT NULL,
  `clicked` TINYINT(1) DEFAULT 0,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ad_impressions_ad` (`adId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MATCH CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS `match_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(128) NOT NULL,
  `slug` VARCHAR(64) NOT NULL UNIQUE,
  `description` VARCHAR(500) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BLOG CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS `blog_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(128) NOT NULL,
  `slug` VARCHAR(64) NOT NULL UNIQUE,
  `description` VARCHAR(500) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PARTNER CLUBS (Stripe Connect)
-- ============================================
CREATE TABLE IF NOT EXISTS `clubs` (
  `id` VARCHAR(100) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `logo` TEXT DEFAULT NULL,
  `contact_email` VARCHAR(255) DEFAULT NULL,
  `stripe_account_id` VARCHAR(255) DEFAULT NULL,
  `stripe_onboarding_complete` TINYINT(1) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PAYOUTS (Partner Club Direct Settlements)
-- ============================================
CREATE TABLE IF NOT EXISTS `payouts` (
  `id` VARCHAR(100) PRIMARY KEY,
  `club_id` VARCHAR(100) NOT NULL,
  `stripe_payout_id` VARCHAR(255) NOT NULL,
  `stripe_account_id` VARCHAR(255) DEFAULT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'GBP',
  `status` VARCHAR(50) DEFAULT 'pending',
  `arrival_date` DATETIME DEFAULT NULL,
  `failure_code` VARCHAR(255) DEFAULT NULL,
  `failure_message` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_payout_club` (`club_id`),
  INDEX `idx_payout_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- REVENUE POLICIES (Per-club split config)
-- ============================================
CREATE TABLE IF NOT EXISTS `revenue_policies` (
  `id` VARCHAR(100) PRIMARY KEY,
  `club_id` VARCHAR(100) NOT NULL,
  `platform_fee_percent` DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  `club_share_percent` DECIMAL(5,2) NOT NULL DEFAULT 80.00,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_policy_club` (`club_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SECURITY SYSTEM TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS `trusted_devices` (
  `id` varchar(100) NOT NULL PRIMARY KEY,
  `user_id` varchar(100) NOT NULL,
  `device_fingerprint` varchar(255) NOT NULL,
  `device_name` varchar(255) DEFAULT '',
  `ip_address` varchar(45) DEFAULT '',
  `country` varchar(100) DEFAULT '',
  `city` varchar(100) DEFAULT '',
  `last_used_at` datetime DEFAULT current_timestamp(),
  `created_at` datetime DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  KEY `idx_trusted_devices_user` (`user_id`),
  KEY `idx_trusted_devices_fingerprint` (`device_fingerprint`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `verification_codes` (
  `id` varchar(100) NOT NULL PRIMARY KEY,
  `user_id` varchar(100) NOT NULL,
  `code` varchar(10) NOT NULL,
  `device_fingerprint` varchar(255) DEFAULT '',
  `ip_address` varchar(45) DEFAULT '',
  `browser_info` text DEFAULT NULL,
  `location_info` varchar(255) DEFAULT '',
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  KEY `idx_verification_codes_user` (`user_id`),
  KEY `idx_verification_codes_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id` varchar(100) NOT NULL PRIMARY KEY,
  `email` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT '',
  `user_agent` text DEFAULT NULL,
  `success` tinyint(1) DEFAULT 0,
  `reason` varchar(255) DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  KEY `idx_login_attempts_email` (`email`),
  KEY `idx_login_attempts_ip` (`ip_address`),
  KEY `idx_login_attempts_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `security_settings` (
  `key_name` varchar(100) NOT NULL PRIMARY KEY,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- USER FEEDBACK & REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS `user_feedback` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(100) DEFAULT NULL,
  `user_name` VARCHAR(255) DEFAULT 'Anonymous',
  `user_email` VARCHAR(255) DEFAULT NULL,
  `user_avatar` TEXT DEFAULT NULL,
  `is_guest` TINYINT(1) DEFAULT 0,
  `rating` INT NOT NULL DEFAULT 5,
  `rating_label` VARCHAR(50) DEFAULT 'Excellent',
  `category` VARCHAR(100) DEFAULT 'Website Experience',
  `feedback_text` TEXT NOT NULL,
  `page_url` VARCHAR(500) DEFAULT '/',
  `device_info` TEXT DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'new',
  `admin_notes` TEXT DEFAULT NULL,
  `response_count` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_feedback_status` (`status`),
  INDEX `idx_feedback_rating` (`rating`),
  INDEX `idx_feedback_category` (`category`),
  INDEX `idx_feedback_user` (`user_id`),
  INDEX `idx_feedback_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `feedback_responses` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `feedback_id` VARCHAR(100) NOT NULL,
  `admin_id` VARCHAR(100) NOT NULL,
  `admin_name` VARCHAR(255) DEFAULT 'WatchWDS Support',
  `response_text` TEXT NOT NULL,
  `email_sent` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_resp_feedback` (`feedback_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

