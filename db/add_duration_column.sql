-- Migration to add duration column to matches table if it doesn't exist
ALTER TABLE `matches` ADD COLUMN `duration` INT DEFAULT 120;
