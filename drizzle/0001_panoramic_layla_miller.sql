CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`purchaseId` int,
	`type` enum('return_deadline','warranty_expiry','missing_information','duplicate') NOT NULL,
	`severity` enum('critical','urgent','reminder','safe') NOT NULL DEFAULT 'reminder',
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`isRead` int NOT NULL DEFAULT 0,
	`eventAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`productImageUrl` text,
	`brand` varchar(160),
	`category` varchar(100),
	`description` text,
	`purchaseDate` timestamp NOT NULL,
	`priceCents` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'USD',
	`quantity` int NOT NULL DEFAULT 1,
	`merchant` varchar(255),
	`store` varchar(255),
	`orderId` varchar(255),
	`invoiceNumber` varchar(255),
	`serialNumber` varchar(255),
	`modelNumber` varchar(255),
	`paymentMethod` varchar(100),
	`warrantyMonths` int,
	`warrantyStartDate` timestamp,
	`warrantyExpiryDate` timestamp,
	`returnPeriodDays` int,
	`returnDeadline` timestamp,
	`status` enum('active','archived','returned','claimed') NOT NULL DEFAULT 'active',
	`receiptUrl` text,
	`receiptKey` text,
	`receiptFileName` varchar(255),
	`notes` text,
	`tags` json NOT NULL,
	`extractionConfidence` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reminderDays` json NOT NULL,
	`notificationsEnabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`userId`,`isRead`);--> statement-breakpoint
CREATE INDEX `notifications_purchase_idx` ON `notifications` (`purchaseId`);--> statement-breakpoint
CREATE INDEX `purchases_user_status_idx` ON `purchases` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `purchases_deadline_idx` ON `purchases` (`returnDeadline`);--> statement-breakpoint
CREATE INDEX `purchases_warranty_idx` ON `purchases` (`warrantyExpiryDate`);