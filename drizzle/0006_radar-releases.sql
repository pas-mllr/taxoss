CREATE TABLE `project_releases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`tag` text NOT NULL,
	`name` text,
	`url` text NOT NULL,
	`prerelease` integer DEFAULT false NOT NULL,
	`published_at` integer NOT NULL,
	`fetched_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_releases_project_tag_unique` ON `project_releases` (`project_id`,`tag`);--> statement-breakpoint
CREATE INDEX `project_releases_published_idx` ON `project_releases` (`published_at`);