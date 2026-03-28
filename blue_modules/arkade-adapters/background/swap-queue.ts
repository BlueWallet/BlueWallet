import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageTaskQueue } from '@arkade-os/sdk/worker/expo';
import type { TaskItem } from '@arkade-os/sdk/worker/expo';

/** Task type identifier for per-swap monitoring tasks. */
export const SWAP_MONITOR_TASK_TYPE = 'ark-swap-monitor';

/** Queue prefix — namespaced and versioned. */
const QUEUE_PREFIX = 'ark:swap-queue:v1';

/** Singleton queue instance backed by AsyncStorage. */
export const swapTaskQueue = new AsyncStorageTaskQueue(AsyncStorage, QUEUE_PREFIX);

/** Payload carried by each swap-monitor task. */
export interface SwapMonitorPayload {
  namespace: string;
  swapId: string;
  arkServerUrl?: string;
  boltzApiUrl?: string;
  network?: string;
}

/**
 * Build a deterministic task ID from namespace + swapId.
 */
export function swapTaskId(namespace: string, swapId: string): string {
  return `${namespace}:${swapId}`;
}

/**
 * Enqueue a single swap-monitor task.
 * Idempotent — skips if a task with the same ID already exists.
 */
export async function enqueueSwapTask(payload: SwapMonitorPayload): Promise<void> {
  const id = swapTaskId(payload.namespace, payload.swapId);
  const existing = await swapTaskQueue.getTasks(SWAP_MONITOR_TASK_TYPE);
  if (existing.some(t => t.id === id)) return;

  const task: TaskItem = {
    id,
    type: SWAP_MONITOR_TASK_TYPE,
    data: payload as unknown as Record<string, unknown>,
    createdAt: Date.now(),
  };
  await swapTaskQueue.addTask(task);
}

/**
 * Remove a swap-monitor task by namespace + swapId.
 */
export async function removeSwapTask(namespace: string, swapId: string): Promise<void> {
  await swapTaskQueue.removeTask(swapTaskId(namespace, swapId));
}

/**
 * Reconcile the task queue against the actual set of pending swap IDs.
 *
 * - Adds tasks for pending swaps that are missing from the queue.
 * - Removes tasks for swaps that are no longer pending (final or deleted).
 */
export async function reconcileSwapTasks(
  namespace: string,
  pendingSwapIds: string[],
  opts?: { arkServerUrl?: string; boltzApiUrl?: string; network?: string },
): Promise<void> {
  const pendingSet = new Set(pendingSwapIds);
  const tasks = await swapTaskQueue.getTasks(SWAP_MONITOR_TASK_TYPE);
  const prefix = `${namespace}:`;

  // Remove stale tasks (swap no longer pending or belongs to this namespace but is done)
  for (const task of tasks) {
    if (!task.id.startsWith(prefix)) continue;
    const swapId = task.id.slice(prefix.length);
    if (!pendingSet.has(swapId)) {
      await swapTaskQueue.removeTask(task.id);
    }
  }

  // Add missing tasks
  const existingIds = new Set(tasks.map(t => t.id));
  for (const swapId of pendingSwapIds) {
    const id = swapTaskId(namespace, swapId);
    if (!existingIds.has(id)) {
      await enqueueSwapTask({
        namespace,
        swapId,
        ...opts,
      });
    }
  }
}

/**
 * Remove all tasks for a given namespace (e.g. when a wallet is deleted).
 */
export async function clearNamespaceTasks(namespace: string): Promise<void> {
  const tasks = await swapTaskQueue.getTasks(SWAP_MONITOR_TASK_TYPE);
  const prefix = `${namespace}:`;
  for (const task of tasks) {
    if (task.id.startsWith(prefix)) {
      await swapTaskQueue.removeTask(task.id);
    }
  }
}
