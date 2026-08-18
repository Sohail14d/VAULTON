# GUARD Daily Reminder Scheduling

## Purpose

GUARD can run a protected daily review that creates idempotent in-app alerts for return deadlines, warranty expiry, and incomplete purchase records. The review respects each user’s selected reminder timing and whether they have enabled notifications.

## Activation after publication

After the project is published, sign in as the workspace administrator and open **Reminder schedule** in the sidebar. Choose the desired UTC run hour and select **Enable daily review**. The application creates or updates a single deployment-managed scheduled callback at `/api/scheduled/daily-reminders`.

The schedule state, task identifier, cron expression, enabled flag, and most recent successful execution time are stored in the `automationSchedules` table. Re-enabling the schedule updates the existing task rather than creating duplicates.

## Safety guarantees

The callback accepts only an authenticated scheduler identity and verifies that its task identifier matches an enabled durable schedule before reading user records. Each generated alert is scoped to one user and is skipped when an equivalent alert already exists. An inactive or orphaned task returns a successful no-op response.

## Verification

The application includes unit coverage for cron identity rejection, orphaned-task no-op behavior, active-task user processing, and reminder preference rules. The owner can check the schedule status and last run time on the **Reminder schedule** page after activation.
