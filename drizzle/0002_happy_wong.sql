CREATE TABLE `automation_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`cronExpression` varchar(64) NOT NULL,
	`enabled` int NOT NULL DEFAULT 0,
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automation_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `automation_schedules_name_unique` UNIQUE(`name`),
	CONSTRAINT `automation_schedules_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
CREATE INDEX `automation_schedules_task_uid_idx` ON `automation_schedules` (`scheduleCronTaskUid`);