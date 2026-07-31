DELETE FROM `reviews`
WHERE `user_id` GLOB 'user_seed_*';
--> statement-breakpoint
DELETE FROM `users`
WHERE `id` GLOB 'user_seed_*'
	AND NOT EXISTS (
		SELECT 1 FROM `stars` WHERE `stars`.`user_id` = `users`.`id`
	)
	AND NOT EXISTS (
		SELECT 1 FROM `comments` WHERE `comments`.`user_id` = `users`.`id`
	)
	AND NOT EXISTS (
		SELECT 1 FROM `projects`
		WHERE `projects`.`submitted_by_id` = `users`.`id`
			 OR `projects`.`claimed_by_id` = `users`.`id`
	)
	AND NOT EXISTS (
		SELECT 1 FROM `claims` WHERE `claims`.`user_id` = `users`.`id`
	)
	AND NOT EXISTS (
		SELECT 1 FROM `project_maintainers`
		WHERE `project_maintainers`.`added_by_id` = `users`.`id`
	);