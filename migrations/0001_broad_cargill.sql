PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`due_date` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "name", "slug", "description", "completed", "due_date") SELECT "id", "name", "slug", "description", "completed", "due_date" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_slug_unique` ON `tasks` (`slug`);