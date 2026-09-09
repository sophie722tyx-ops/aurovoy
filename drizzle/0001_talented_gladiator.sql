CREATE TABLE `content_entries` (
	`key` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`revision` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_images` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_key` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL
);
