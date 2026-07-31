CREATE TABLE `mandate_phases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mandate_id` integer NOT NULL,
	`slug` text NOT NULL,
	`label` text NOT NULL,
	`phase_type` text DEFAULT 'obligation' NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`scope` text NOT NULL,
	`exceptions` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`mandate_id`) REFERENCES `mandates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mandate_phases_mandate_slug_unique` ON `mandate_phases` (`mandate_id`,`slug`);--> statement-breakpoint
CREATE INDEX `mandate_phases_mandate_idx` ON `mandate_phases` (`mandate_id`);--> statement-breakpoint
CREATE INDEX `mandate_phases_effective_idx` ON `mandate_phases` (`effective_from`);--> statement-breakpoint
CREATE TABLE `mandate_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mandate_id` integer NOT NULL,
	`phase_id` integer,
	`kind` text DEFAULT 'primary' NOT NULL,
	`title` text NOT NULL,
	`publisher` text NOT NULL,
	`url` text NOT NULL,
	`citation` text,
	`published_on` text,
	`accessed_on` text NOT NULL,
	`supports` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`mandate_id`) REFERENCES `mandates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`phase_id`) REFERENCES `mandate_phases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `mandate_sources_mandate_idx` ON `mandate_sources` (`mandate_id`);--> statement-breakpoint
CREATE INDEX `mandate_sources_phase_idx` ON `mandate_sources` (`phase_id`);--> statement-breakpoint
CREATE TRIGGER `mandate_sources_phase_mandate_insert`
BEFORE INSERT ON `mandate_sources`
WHEN NEW.`phase_id` IS NOT NULL AND NOT EXISTS (
	SELECT 1 FROM `mandate_phases`
	WHERE `id` = NEW.`phase_id` AND `mandate_id` = NEW.`mandate_id`
)
BEGIN
	SELECT RAISE(ABORT, 'phase does not belong to mandate');
END;--> statement-breakpoint
CREATE TRIGGER `mandate_sources_phase_mandate_update`
BEFORE UPDATE OF `mandate_id`, `phase_id` ON `mandate_sources`
WHEN NEW.`phase_id` IS NOT NULL AND NOT EXISTS (
	SELECT 1 FROM `mandate_phases`
	WHERE `id` = NEW.`phase_id` AND `mandate_id` = NEW.`mandate_id`
)
BEGIN
	SELECT RAISE(ABORT, 'phase does not belong to mandate');
END;--> statement-breakpoint
CREATE TRIGGER `mandate_phases_mandate_update`
BEFORE UPDATE OF `mandate_id` ON `mandate_phases`
WHEN EXISTS (
	SELECT 1 FROM `mandate_sources`
	WHERE `phase_id` = OLD.`id` AND `mandate_id` <> NEW.`mandate_id`
)
BEGIN
	SELECT RAISE(ABORT, 'linked sources belong to the original mandate');
END;--> statement-breakpoint
CREATE TABLE `mandates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`jurisdiction_facet_id` integer NOT NULL,
	`name` text NOT NULL,
	`summary` text NOT NULL,
	`legal_basis` text,
	`scope` text NOT NULL,
	`exceptions` text NOT NULL,
	`lifecycle` text DEFAULT 'ahead' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`reviewer_id` text,
	`reviewer_name` text,
	`last_reviewed_at` integer,
	`review_due_at` integer,
	`published_at` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`jurisdiction_facet_id`) REFERENCES `facets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mandates_slug_unique` ON `mandates` (`slug`);--> statement-breakpoint
CREATE INDEX `mandates_jurisdiction_idx` ON `mandates` (`jurisdiction_facet_id`);--> statement-breakpoint
CREATE INDEX `mandates_status_idx` ON `mandates` (`status`);--> statement-breakpoint
CREATE INDEX `mandates_review_due_idx` ON `mandates` (`review_due_at`);--> statement-breakpoint
CREATE TABLE `project_evaluation_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`dimension` text NOT NULL,
	`kind` text DEFAULT 'primary' NOT NULL,
	`title` text NOT NULL,
	`publisher` text NOT NULL,
	`url` text NOT NULL,
	`citation` text,
	`observed_on` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project_evaluations`(`project_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_evaluation_sources_project_idx` ON `project_evaluation_sources` (`project_id`);--> statement-breakpoint
CREATE TABLE `project_evaluations` (
	`project_id` integer PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`legal_currency` text DEFAULT 'unreviewed' NOT NULL,
	`legal_as_of` text,
	`legal_scope` text,
	`production_readiness` text DEFAULT 'unreviewed' NOT NULL,
	`publisher_kind` text DEFAULT 'unknown' NOT NULL,
	`publisher_name` text,
	`publisher_relationship` text,
	`license_confidence` text DEFAULT 'unreviewed' NOT NULL,
	`documentation` text DEFAULT 'unreviewed' NOT NULL,
	`automated_tests` text DEFAULT 'unreviewed' NOT NULL,
	`release_discipline` text DEFAULT 'unreviewed' NOT NULL,
	`security_process` text DEFAULT 'unreviewed' NOT NULL,
	`deployment_operability` text DEFAULT 'unreviewed' NOT NULL,
	`data_handling` text DEFAULT 'unreviewed' NOT NULL,
	`governance_continuity` text DEFAULT 'unreviewed' NOT NULL,
	`support_path` text DEFAULT 'unreviewed' NOT NULL,
	`editorial_note` text,
	`reviewer_id` text,
	`reviewer_name` text,
	`last_reviewed_at` integer,
	`review_due_at` integer,
	`published_at` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_evaluations_status_idx` ON `project_evaluations` (`status`);--> statement-breakpoint
CREATE INDEX `project_evaluations_review_due_idx` ON `project_evaluations` (`review_due_at`);--> statement-breakpoint
CREATE TRIGGER `project_evaluations_delete_sources`
AFTER DELETE ON `project_evaluations`
BEGIN
	DELETE FROM `project_evaluation_sources` WHERE `project_id` = OLD.`project_id`;
END;--> statement-breakpoint
CREATE TRIGGER `project_evaluation_sources_parent_insert`
BEFORE INSERT ON `project_evaluation_sources`
WHEN NOT EXISTS (
	SELECT 1 FROM `project_evaluations`
	WHERE `project_id` = NEW.`project_id`
)
BEGIN
	SELECT RAISE(ABORT, 'evaluation source requires an evaluation');
END;--> statement-breakpoint
CREATE TRIGGER `project_evaluation_sources_parent_update`
BEFORE UPDATE OF `project_id` ON `project_evaluation_sources`
WHEN NOT EXISTS (
	SELECT 1 FROM `project_evaluations`
	WHERE `project_id` = NEW.`project_id`
)
BEGIN
	SELECT RAISE(ABORT, 'evaluation source requires an evaluation');
END;--> statement-breakpoint
CREATE TABLE `project_mandates` (
	`project_id` integer NOT NULL,
	`mandate_id` integer NOT NULL,
	`relationship` text NOT NULL,
	`coverage_note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`project_id`, `mandate_id`, `relationship`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mandate_id`) REFERENCES `mandates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_mandates_mandate_idx` ON `project_mandates` (`mandate_id`);