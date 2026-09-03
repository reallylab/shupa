CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text,
	`front` text GENERATED ALWAYS AS (json_extract("data", '$.front.content')) STORED,
	`deck_id` text NOT NULL,
	`owned_by` text NOT NULL,
	`next_due` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_cards_deck_id_next_due` ON `cards` (`deck_id`,`next_due`);--> statement-breakpoint
CREATE INDEX `idx_cards_owned_by_next_due` ON `cards` (`owned_by`,`next_due`);--> statement-breakpoint
CREATE INDEX `idx_cards_front` ON `cards` (`front`);--> statement-breakpoint
CREATE TABLE `decks` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text,
	`owned_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_decks_owned_by` ON `decks` (`owned_by`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text,
	`owned_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_owned_by` ON `sessions` (`owned_by`);