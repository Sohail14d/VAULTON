import { describe, expect, it, vi } from "vitest";
import { runScheduledReminderReview } from "./scheduledReminders";

const createDependencies = () => ({
  getScheduleByTaskUid: vi.fn(async () => ({ enabled: 1 })),
  listUsers: vi.fn(async () => [{ id: 4 }, { id: 9 }]),
  generateForUser: vi.fn(async () => [{ id: 1 }]),
  markRun: vi.fn(async () => undefined),
});

describe("scheduled reminder review", () => {
  it("rejects requests that do not carry a cron identity", async () => {
    const dependencies = createDependencies();
    await expect(runScheduledReminderReview({ isCron: false, taskUid: "task-a" }, dependencies)).resolves.toEqual({ status: 403, body: { error: "cron-only" } });
    expect(dependencies.getScheduleByTaskUid).not.toHaveBeenCalled();
  });

  it("skips stale or disabled task identifiers without reading user records", async () => {
    const dependencies = createDependencies();
    dependencies.getScheduleByTaskUid.mockResolvedValue(undefined);
    await expect(runScheduledReminderReview({ isCron: true, taskUid: "orphan" }, dependencies)).resolves.toEqual({ status: 200, body: { ok: true, skipped: "inactive-or-orphan" } });
    expect(dependencies.listUsers).not.toHaveBeenCalled();
  });

  it("generates user-scoped alerts and records the run for an active task", async () => {
    const dependencies = createDependencies();
    const result = await runScheduledReminderReview({ isCron: true, taskUid: "daily-task" }, dependencies);
    expect(result).toEqual({ status: 200, body: { ok: true, usersProcessed: 2, notificationsCreated: 2 } });
    expect(dependencies.generateForUser).toHaveBeenCalledWith(4);
    expect(dependencies.generateForUser).toHaveBeenCalledWith(9);
    expect(dependencies.markRun).toHaveBeenCalledWith("daily-task");
  });
});
