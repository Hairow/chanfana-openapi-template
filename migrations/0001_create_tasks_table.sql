CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`due_date` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_slug_unique` ON `tasks` (`slug`);