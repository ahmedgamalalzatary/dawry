CREATE TABLE `custom_field` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`label` varchar(100) NOT NULL,
	`required` boolean NOT NULL DEFAULT false,
	`public` boolean NOT NULL DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `custom_field_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorite_restaurant` (
	`user_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `favorite_restaurant_user_id_organization_id_pk` PRIMARY KEY(`user_id`,`organization_id`)
);
--> statement-breakpoint
CREATE TABLE `menu_item` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `menu_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_field_value` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`field_id` varchar(36),
	`label` varchar(100) NOT NULL,
	`public` boolean NOT NULL,
	`value` varchar(500) NOT NULL,
	`position` int NOT NULL,
	CONSTRAINT `order_field_value_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_item` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`menu_item_id` varchar(36),
	`name` varchar(100) NOT NULL,
	`quantity` int NOT NULL,
	`position` int NOT NULL,
	CONSTRAINT `order_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`invoice_number` varchar(32) NOT NULL,
	`business_day` varchar(10) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'preparing',
	`eta_mode` varchar(10) NOT NULL,
	`eta_at` timestamp(3) NOT NULL,
	`customer_name` varchar(100) NOT NULL DEFAULT '',
	`customer_phone` varchar(20) NOT NULL DEFAULT '',
	`address` varchar(500) NOT NULL DEFAULT '',
	`notes` varchar(500) NOT NULL DEFAULT '',
	`created_by_id` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	`out_at` timestamp(3),
	`delivered_at` timestamp(3),
	`cancelled_at` timestamp(3),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_invoice_per_day_uq` UNIQUE(`organization_id`,`business_day`,`invoice_number`)
);
--> statement-breakpoint
CREATE TABLE `restaurant_settings` (
	`organization_id` varchar(36) NOT NULL,
	`phone` varchar(20) NOT NULL DEFAULT '',
	`logo_url` varchar(500) NOT NULL DEFAULT '',
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `restaurant_settings_organization_id` PRIMARY KEY(`organization_id`)
);
--> statement-breakpoint
CREATE TABLE `saved_order` (
	`user_id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_order_user_id_order_id_pk` PRIMARY KEY(`user_id`,`order_id`)
);
--> statement-breakpoint
ALTER TABLE `custom_field` ADD CONSTRAINT `custom_field_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorite_restaurant` ADD CONSTRAINT `favorite_restaurant_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorite_restaurant` ADD CONSTRAINT `favorite_restaurant_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_item` ADD CONSTRAINT `menu_item_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_field_value` ADD CONSTRAINT `order_field_value_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_field_value` ADD CONSTRAINT `order_field_value_field_id_custom_field_id_fk` FOREIGN KEY (`field_id`) REFERENCES `custom_field`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_menu_item_id_menu_item_id_fk` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_item`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_created_by_id_user_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `restaurant_settings` ADD CONSTRAINT `restaurant_settings_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_order` ADD CONSTRAINT `saved_order_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_order` ADD CONSTRAINT `saved_order_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `custom_field_org_idx` ON `custom_field` (`organization_id`);--> statement-breakpoint
CREATE INDEX `menu_item_org_idx` ON `menu_item` (`organization_id`);--> statement-breakpoint
CREATE INDEX `order_field_value_order_idx` ON `order_field_value` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_item_order_idx` ON `order_item` (`order_id`);--> statement-breakpoint
CREATE INDEX `orders_org_day_status_idx` ON `orders` (`organization_id`,`business_day`,`status`);