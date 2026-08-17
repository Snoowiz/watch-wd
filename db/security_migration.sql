-- =============================================
-- Login Security System Migration
-- Tables: trusted_devices, verification_codes, login_attempts, security_settings
-- =============================================

SET NAMES utf8mb4;

-- Trusted Devices Table
DROP TABLE IF EXISTS `trusted_devices`;
CREATE TABLE `trusted_devices` (
  `id` varchar(100) NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `device_fingerprint` varchar(255) NOT NULL,
  `device_name` varchar(255) DEFAULT '',
  `ip_address` varchar(45) DEFAULT '',
  `country` varchar(100) DEFAULT '',
  `city` varchar(100) DEFAULT '',
  `last_used_at` datetime DEFAULT current_timestamp(),
  `created_at` datetime DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_trusted_devices_user` (`user_id`),
  KEY `idx_trusted_devices_fingerprint` (`device_fingerprint`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verification Codes Table
DROP TABLE IF EXISTS `verification_codes`;
CREATE TABLE `verification_codes` (
  `id` varchar(100) NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `code` varchar(10) NOT NULL,
  `device_fingerprint` varchar(255) DEFAULT '',
  `ip_address` varchar(45) DEFAULT '',
  `browser_info` text DEFAULT NULL,
  `location_info` varchar(255) DEFAULT '',
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_verification_codes_user` (`user_id`),
  KEY `idx_verification_codes_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Login Attempts Table
DROP TABLE IF EXISTS `login_attempts`;
CREATE TABLE `login_attempts` (
  `id` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT '',
  `user_agent` text DEFAULT NULL,
  `success` tinyint(1) DEFAULT 0,
  `reason` varchar(255) DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_login_attempts_email` (`email`),
  KEY `idx_login_attempts_ip` (`ip_address`),
  KEY `idx_login_attempts_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Security Settings Table
DROP TABLE IF EXISTS `security_settings`;
CREATE TABLE `security_settings` (
  `key_name` varchar(100) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`value`)),
  PRIMARY KEY (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `security_settings` (`key_name`, `value`) VALUES
('config', '{"trusted_device_expiry_days":60,"max_login_attempts":5,"lockout_duration_minutes":30,"enable_suspicious_login_alerts":true,"admin_ip_whitelist":[],"enforce_admin_ip_whitelist":false,"enable_device_verification":true}');
