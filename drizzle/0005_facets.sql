CREATE TABLE `facets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facets_kind_slug_unique` ON `facets` (`kind`,`slug`);--> statement-breakpoint
CREATE TABLE `project_facets` (
	`project_id` integer NOT NULL,
	`facet_id` integer NOT NULL,
	PRIMARY KEY(`project_id`, `facet_id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`facet_id`) REFERENCES `facets`(`id`) ON UPDATE no action ON DELETE cascade
);
