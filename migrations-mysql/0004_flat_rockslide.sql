ALTER TABLE `users` MODIFY COLUMN `created_at` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `update_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP;