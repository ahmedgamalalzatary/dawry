CREATE TABLE `restaurant_logo` (
	`organization_id` varchar(36) NOT NULL,
	`mime` varchar(32) NOT NULL,
	`data` mediumblob NOT NULL,
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `restaurant_logo_organization_id` PRIMARY KEY(`organization_id`)
);
--> statement-breakpoint
ALTER TABLE `restaurant_logo` ADD CONSTRAINT `restaurant_logo_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;