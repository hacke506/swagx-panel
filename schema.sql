CREATE TABLE `bridge_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`result` text,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	`claimed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bridge_jobs_pending` ON `bridge_jobs` (`claimed`,`expires`);--> statement-breakpoint
CREATE TABLE `bridge_state` (
	`id` text PRIMARY KEY NOT NULL,
	`seen` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`n` integer NOT NULL
);
