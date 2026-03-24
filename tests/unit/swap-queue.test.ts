import assert from "assert";
import { AsyncStorageTaskQueue } from "@arkade-os/sdk/worker/expo";
import type { TaskItem, TaskResult } from "@arkade-os/sdk/worker/expo";

// In-memory AsyncStorage mock
class MockAsyncStorage {
  private store: Record<string, string> = {};

  async getItem(key: string): Promise<string | null> {
    return this.store[key] ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store[key] = value;
  }

  async removeItem(key: string): Promise<void> {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const SWAP_MONITOR_TASK_TYPE = "ark-swap-monitor";

function swapTaskId(namespace: string, swapId: string): string {
  return `${namespace}:${swapId}`;
}

describe("Swap Queue", () => {
  let storage: MockAsyncStorage;
  let queue: AsyncStorageTaskQueue;

  beforeEach(() => {
    storage = new MockAsyncStorage();
    queue = new AsyncStorageTaskQueue(storage, "ark:swap-queue:v1");
  });

  describe("deterministic task IDs", () => {
    it("produces stable IDs from namespace + swapId", () => {
      const id1 = swapTaskId("ns1", "swap-abc");
      const id2 = swapTaskId("ns1", "swap-abc");
      assert.strictEqual(id1, id2);
      assert.strictEqual(id1, "ns1:swap-abc");
    });

    it("produces different IDs for different namespaces", () => {
      const id1 = swapTaskId("ns1", "swap-abc");
      const id2 = swapTaskId("ns2", "swap-abc");
      assert.notStrictEqual(id1, id2);
    });

    it("produces different IDs for different swap IDs", () => {
      const id1 = swapTaskId("ns1", "swap-abc");
      const id2 = swapTaskId("ns1", "swap-def");
      assert.notStrictEqual(id1, id2);
    });
  });

  describe("inbox lifecycle", () => {
    it("adds and retrieves tasks", async () => {
      const task: TaskItem = {
        id: swapTaskId("ns1", "swap-1"),
        type: SWAP_MONITOR_TASK_TYPE,
        data: { namespace: "ns1", swapId: "swap-1" },
        createdAt: Date.now(),
      };

      await queue.addTask(task);
      const tasks = await queue.getTasks();
      assert.strictEqual(tasks.length, 1);
      assert.strictEqual(tasks[0].id, "ns1:swap-1");
    });

    it("filters tasks by type", async () => {
      await queue.addTask({
        id: "other-1",
        type: "other-type",
        data: {},
        createdAt: Date.now(),
      });
      await queue.addTask({
        id: swapTaskId("ns1", "swap-1"),
        type: SWAP_MONITOR_TASK_TYPE,
        data: { namespace: "ns1", swapId: "swap-1" },
        createdAt: Date.now(),
      });

      const swapTasks = await queue.getTasks(SWAP_MONITOR_TASK_TYPE);
      assert.strictEqual(swapTasks.length, 1);

      const allTasks = await queue.getTasks();
      assert.strictEqual(allTasks.length, 2);
    });

    it("removes a task by ID", async () => {
      const id = swapTaskId("ns1", "swap-1");
      await queue.addTask({
        id,
        type: SWAP_MONITOR_TASK_TYPE,
        data: { namespace: "ns1", swapId: "swap-1" },
        createdAt: Date.now(),
      });

      await queue.removeTask(id);
      const tasks = await queue.getTasks();
      assert.strictEqual(tasks.length, 0);
    });

    it("clears all tasks", async () => {
      await queue.addTask({
        id: swapTaskId("ns1", "swap-1"),
        type: SWAP_MONITOR_TASK_TYPE,
        data: { namespace: "ns1", swapId: "swap-1" },
        createdAt: Date.now(),
      });
      await queue.addTask({
        id: swapTaskId("ns1", "swap-2"),
        type: SWAP_MONITOR_TASK_TYPE,
        data: { namespace: "ns1", swapId: "swap-2" },
        createdAt: Date.now(),
      });

      await queue.clearTasks();
      const tasks = await queue.getTasks();
      assert.strictEqual(tasks.length, 0);
    });
  });

  describe("outbox lifecycle", () => {
    it("pushes and retrieves results", async () => {
      const result: TaskResult = {
        id: "result-1",
        taskItemId: "ns1:swap-1",
        type: SWAP_MONITOR_TASK_TYPE,
        status: "success",
        data: { swapId: "swap-1", statusChanged: true },
        executedAt: Date.now(),
      };

      await queue.pushResult(result);
      const results = await queue.getResults();
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, "result-1");
    });

    it("acknowledges results by ID", async () => {
      await queue.pushResult({
        id: "result-1",
        taskItemId: "ns1:swap-1",
        type: SWAP_MONITOR_TASK_TYPE,
        status: "success",
        executedAt: Date.now(),
      });
      await queue.pushResult({
        id: "result-2",
        taskItemId: "ns1:swap-2",
        type: SWAP_MONITOR_TASK_TYPE,
        status: "success",
        executedAt: Date.now(),
      });

      await queue.acknowledgeResults(["result-1"]);
      const results = await queue.getResults();
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, "result-2");
    });
  });

  describe("idempotent enqueue", () => {
    it("does not duplicate tasks with the same ID", async () => {
      const task: TaskItem = {
        id: swapTaskId("ns1", "swap-1"),
        type: SWAP_MONITOR_TASK_TYPE,
        data: { namespace: "ns1", swapId: "swap-1" },
        createdAt: Date.now(),
      };

      await queue.addTask(task);
      // Simulate idempotent enqueue by checking before adding
      const existing = await queue.getTasks(SWAP_MONITOR_TASK_TYPE);
      if (!existing.some((t) => t.id === task.id)) {
        await queue.addTask(task);
      }

      const tasks = await queue.getTasks();
      assert.strictEqual(tasks.length, 1);
    });
  });

  describe("reconciliation", () => {
    it("adds missing tasks and removes stale ones", async () => {
      const namespace = "ns1";
      const prefix = `${namespace}:`;

      // Existing tasks: swap-1 (still pending), swap-2 (now final)
      await queue.addTask({
        id: swapTaskId(namespace, "swap-1"),
        type: SWAP_MONITOR_TASK_TYPE,
        data: { namespace, swapId: "swap-1" },
        createdAt: Date.now(),
      });
      await queue.addTask({
        id: swapTaskId(namespace, "swap-2"),
        type: SWAP_MONITOR_TASK_TYPE,
        data: { namespace, swapId: "swap-2" },
        createdAt: Date.now(),
      });

      // Current pending swaps: swap-1 (still), swap-3 (new)
      const pendingSwapIds = ["swap-1", "swap-3"];
      const pendingSet = new Set(pendingSwapIds);

      // Remove stale
      const tasks = await queue.getTasks(SWAP_MONITOR_TASK_TYPE);
      for (const task of tasks) {
        if (!task.id.startsWith(prefix)) continue;
        const swapId = task.id.slice(prefix.length);
        if (!pendingSet.has(swapId)) {
          await queue.removeTask(task.id);
        }
      }

      // Add missing
      const remaining = await queue.getTasks(SWAP_MONITOR_TASK_TYPE);
      const existingIds = new Set(remaining.map((t) => t.id));
      for (const swapId of pendingSwapIds) {
        const id = swapTaskId(namespace, swapId);
        if (!existingIds.has(id)) {
          await queue.addTask({
            id,
            type: SWAP_MONITOR_TASK_TYPE,
            data: { namespace, swapId },
            createdAt: Date.now(),
          });
        }
      }

      const final = await queue.getTasks(SWAP_MONITOR_TASK_TYPE);
      const finalIds = final.map((t) => t.id).sort();
      assert.deepStrictEqual(finalIds, ["ns1:swap-1", "ns1:swap-3"]);
    });

    it("does not affect tasks from other namespaces", async () => {
      await queue.addTask({
        id: swapTaskId("ns1", "swap-1"),
        type: SWAP_MONITOR_TASK_TYPE,
        data: { namespace: "ns1", swapId: "swap-1" },
        createdAt: Date.now(),
      });
      await queue.addTask({
        id: swapTaskId("ns2", "swap-x"),
        type: SWAP_MONITOR_TASK_TYPE,
        data: { namespace: "ns2", swapId: "swap-x" },
        createdAt: Date.now(),
      });

      // Reconcile ns1 with empty pending set (all done)
      const namespace = "ns1";
      const prefix = `${namespace}:`;
      const tasks = await queue.getTasks(SWAP_MONITOR_TASK_TYPE);
      for (const task of tasks) {
        if (task.id.startsWith(prefix)) {
          await queue.removeTask(task.id);
        }
      }

      const final = await queue.getTasks(SWAP_MONITOR_TASK_TYPE);
      assert.strictEqual(final.length, 1);
      assert.strictEqual(final[0].id, "ns2:swap-x");
    });
  });
});
