CREATE TABLE `portfolio_projects` (
	`portfolio_id` integer NOT NULL,
	`project_id` integer NOT NULL,
	`decision_state` text DEFAULT 'candidate' NOT NULL,
	`notes` text,
	`version` integer DEFAULT 1 NOT NULL,
	`removed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`portfolio_id`, `project_id`),
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `portfolio_projects_project_idx` ON `portfolio_projects` (`project_id`);--> statement-breakpoint
CREATE TABLE `portfolio_scope_facets` (
	`portfolio_id` integer NOT NULL,
	`facet_id` integer NOT NULL,
	PRIMARY KEY(`portfolio_id`, `facet_id`),
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`facet_id`) REFERENCES `facets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `portfolio_scope_facets_facet_idx` ON `portfolio_scope_facets` (`facet_id`);--> statement-breakpoint
CREATE TABLE `portfolios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text DEFAULT 'My tax portfolio' NOT NULL,
	`description` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portfolios_user_unique` ON `portfolios` (`user_id`);
--> statement-breakpoint
INSERT INTO `facets` (`kind`, `slug`, `name`, `sort`) VALUES
	('subject', 'pillar-two', 'Pillar Two & Global Minimum Tax', 31),
	('subject', 'tax-provision-ias12', 'IAS 12 & Tax Provision', 32),
	('subject', 'cbcr', 'Country-by-Country Reporting', 33),
	('subject', 'withholding', 'Withholding Tax', 34),
	('subject', 'unclassified', 'Unclassified', 35),
	('process', 'interpret', 'Interpret', 36),
	('process', 'calculate', 'Calculate', 37),
	('process', 'prepare', 'Prepare', 38),
	('process', 'validate', 'Validate', 39),
	('process', 'report', 'Report', 40),
	('process', 'file', 'File', 41),
	('process', 'archive', 'Archive', 42),
	('process', 'monitor-defend', 'Monitor & Defend', 43),
	('process', 'unclassified', 'Unclassified', 44)
ON CONFLICT (`kind`, `slug`) DO UPDATE SET
	`name` = excluded.`name`,
	`sort` = excluded.`sort`;
--> statement-breakpoint
INSERT OR IGNORE INTO `project_facets` (`project_id`, `facet_id`)
SELECT p.`id`, f.`id`
FROM `projects` p
LEFT JOIN `project_stats` ps ON ps.`project_id` = p.`id`
JOIN `facets` f ON f.`kind` = 'subject'
WHERE (
	(f.`slug` = 'pillar-two' AND (
		lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%pillar two%'
		OR lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%pillar 2%'
		OR lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%global minimum tax%'
		OR lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%globe%'
		OR lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%qdmtt%'
		OR lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%qualified domestic minimum top-up tax%'
		OR lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%qualified domestic minimum top up tax%'
	))
	OR (f.`slug` = 'tax-provision-ias12' AND (
		lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%ias 12%'
		OR lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%tax provision%'
		OR lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%deferred tax%'
	))
	OR (f.`slug` = 'cbcr' AND (
		lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%cbcr%'
		OR lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%country-by-country%'
		OR lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%country by country%'
		OR lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%form 8975%'
	))
	OR (f.`slug` = 'withholding' AND (
		lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%withholding tax%'
		OR lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '% wht %'
		OR lower(coalesce(p.`full_name_key`, '') || ' ' || coalesce(ps.`description`, '') || ' ' || coalesce(ps.`topics`, '')) LIKE '%tds%'
	))
);
--> statement-breakpoint
WITH process_map (`category_slug`, `process_slug`) AS (VALUES
	('platforms', 'interpret'), ('platforms', 'prepare'),
	('agent-skills', 'interpret'), ('agent-skills', 'prepare'),
	('mcp-servers', 'interpret'),
	('tax-prep-filing', 'prepare'), ('tax-prep-filing', 'validate'), ('tax-prep-filing', 'file'),
	('vat-gst', 'calculate'), ('vat-gst', 'validate'), ('vat-gst', 'report'),
	('invoicing', 'prepare'), ('invoicing', 'validate'), ('invoicing', 'report'), ('invoicing', 'file'),
	('payroll', 'calculate'), ('payroll', 'prepare'), ('payroll', 'report'), ('payroll', 'file'),
	('accounting', 'prepare'), ('accounting', 'report'), ('accounting', 'archive'),
	('tax-engines', 'calculate'), ('tax-engines', 'validate'),
	('rules-as-code', 'interpret'), ('rules-as-code', 'calculate'), ('rules-as-code', 'validate'),
	('tax-data', 'interpret'), ('tax-data', 'monitor-defend'),
	('tax-ai', 'interpret'), ('tax-ai', 'prepare'),
	('rag-retrieval', 'interpret'),
	('compliance', 'validate'), ('compliance', 'report'), ('compliance', 'file'), ('compliance', 'monitor-defend'),
	('transfer-pricing', 'calculate'), ('transfer-pricing', 'prepare'), ('transfer-pricing', 'report'), ('transfer-pricing', 'monitor-defend'),
	('crypto-gains', 'calculate'), ('crypto-gains', 'prepare'), ('crypto-gains', 'report'),
	('policy-microsim', 'interpret'), ('policy-microsim', 'calculate'),
	('local-ai', 'interpret'), ('local-ai', 'prepare'),
	('benchmarks-datasets', 'validate'),
	('curated-lists', 'interpret')
)
INSERT OR IGNORE INTO `project_facets` (`project_id`, `facet_id`)
SELECT pc.`project_id`, f.`id`
FROM `project_categories` pc
JOIN `categories` c ON c.`id` = pc.`category_id`
JOIN process_map m ON m.`category_slug` = c.`slug`
JOIN `facets` f ON f.`kind` = 'process' AND f.`slug` = m.`process_slug`
WHERE NOT EXISTS (
	SELECT 1 FROM `project_facets` existing_pf
	JOIN `facets` existing_f ON existing_f.`id` = existing_pf.`facet_id`
	WHERE existing_pf.`project_id` = pc.`project_id` AND existing_f.`kind` = 'process'
);
--> statement-breakpoint
INSERT OR IGNORE INTO `project_facets` (`project_id`, `facet_id`)
SELECT p.`id`, f.`id`
FROM `projects` p
JOIN `facets` f ON f.`kind` = 'subject' AND f.`slug` = 'unclassified'
WHERE NOT EXISTS (
	SELECT 1 FROM `project_facets` pf
	JOIN `facets` assigned ON assigned.`id` = pf.`facet_id`
	WHERE pf.`project_id` = p.`id` AND assigned.`kind` = 'subject'
);
--> statement-breakpoint
INSERT OR IGNORE INTO `project_facets` (`project_id`, `facet_id`)
SELECT p.`id`, f.`id`
FROM `projects` p
JOIN `facets` f ON f.`kind` = 'process' AND f.`slug` = 'unclassified'
WHERE NOT EXISTS (
	SELECT 1 FROM `project_facets` pf
	JOIN `facets` assigned ON assigned.`id` = pf.`facet_id`
	WHERE pf.`project_id` = p.`id` AND assigned.`kind` = 'process'
);