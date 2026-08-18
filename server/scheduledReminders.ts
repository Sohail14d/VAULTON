export type CronIdentity = { isCron?: boolean; taskUid?: string } | null | undefined;

type Schedule = { enabled: number } | undefined;
type ReminderDependencies = {
  getScheduleByTaskUid: (taskUid: string) => Promise<Schedule>;
  listUsers: () => Promise<Array<{ id: number }>>;
  generateForUser: (userId: number) => Promise<unknown[]>;
  markRun: (taskUid: string) => Promise<void>;
};

export type ScheduledReminderResult =
  | { status: 403; body: { error: "cron-only" } }
  | { status: 200; body: { ok: true; skipped: "inactive-or-orphan" } }
  | { status: 200; body: { ok: true; usersProcessed: number; notificationsCreated: number } };

export async function runScheduledReminderReview(identity: CronIdentity, dependencies: ReminderDependencies): Promise<ScheduledReminderResult> {
  if (!identity?.isCron || !identity.taskUid) return { status: 403, body: { error: "cron-only" } };
  const schedule = await dependencies.getScheduleByTaskUid(identity.taskUid);
  if (!schedule || !schedule.enabled) return { status: 200, body: { ok: true, skipped: "inactive-or-orphan" } };
  const users = await dependencies.listUsers();
  const created = await Promise.all(users.map(user => dependencies.generateForUser(user.id)));
  await dependencies.markRun(identity.taskUid);
  return { status: 200, body: { ok: true, usersProcessed: users.length, notificationsCreated: created.reduce((total, rows) => total + rows.length, 0) } };
}
