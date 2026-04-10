import type { TaskItem, TaskProcessor, TaskResult } from '@arkade-os/sdk/worker/expo';
import {
  ArkadeSwaps,
  BoltzSwapProvider,
  isPendingReverseSwap,
  isPendingSubmarineSwap,
  isReverseClaimableStatus,
  isReverseFinalStatus,
  isSubmarineFinalStatus,
  isSubmarineSwapRefundable,
} from '@arkade-os/boltz-swap';
import type { SwapRepository } from '@arkade-os/boltz-swap';
import type { IWallet } from '@arkade-os/sdk';
import type { SwapMonitorPayload } from './swap-queue';
import { SWAP_MONITOR_TASK_TYPE } from './swap-queue';

/**
 * Dependencies needed by the swap processor at runtime.
 *
 * These must be constructed from the wallet's in-memory state
 * (foreground) or rehydrated from persisted config (headless).
 */
export interface SwapProcessorDeps {
  swapRepository: SwapRepository;
  swapProvider: BoltzSwapProvider;
  wallet: IWallet;
}

/**
 * Per-swap processor that polls Boltz for a single swap's status
 * and attempts best-effort claim/refund when actionable.
 *
 * Follows the TaskProcessor interface from @arkade-os/sdk.
 *
 * Steps per task:
 * 1. Load swap by swapId from SwapRepository
 * 2. If missing or already final → noop
 * 3. Poll Boltz HTTP API for current status
 * 4. Persist status change if different
 * 5. Attempt claim (reverse) or refund (submarine) if actionable
 * 6. Return result summary
 */
export const swapMonitorProcessor: TaskProcessor<SwapProcessorDeps> = {
  taskType: SWAP_MONITOR_TASK_TYPE,

  async execute(
    item: TaskItem,
    deps: SwapProcessorDeps,
  ): Promise<Omit<TaskResult, 'id' | 'executedAt'>> {
    const payload = item.data as unknown as SwapMonitorPayload;
    const { swapId } = payload;
    const { swapRepository, swapProvider, wallet } = deps;

    // Load the swap from the repository
    const allSwaps = await swapRepository.getAllSwaps();
    const swap = allSwaps.find(s => s.id === swapId);

    // Swap missing or already final — nothing to do
    if (!swap) {
      return { taskItemId: item.id, type: SWAP_MONITOR_TASK_TYPE, status: 'noop', data: { reason: 'not_found' } };
    }

    if (isPendingReverseSwap(swap) && isReverseFinalStatus(swap.status)) {
      return { taskItemId: item.id, type: SWAP_MONITOR_TASK_TYPE, status: 'success', data: { reason: 'already_final', swapId } };
    }
    if (isPendingSubmarineSwap(swap) && isSubmarineFinalStatus(swap.status)) {
      return { taskItemId: item.id, type: SWAP_MONITOR_TASK_TYPE, status: 'success', data: { reason: 'already_final', swapId } };
    }

    // Poll Boltz for latest status
    const { status: currentStatus } = await swapProvider.getSwapStatus(swapId);

    // Persist status change
    let statusChanged = false;
    if (currentStatus !== swap.status) {
      await swapRepository.saveSwap({ ...swap, status: currentStatus });
      statusChanged = true;
    }

    // Create a temporary ArkadeSwaps (no SwapManager) for claim/refund operations
    const tempSwaps = new ArkadeSwaps({
      wallet,
      swapProvider,
      swapManager: false,
      swapRepository,
    });

    let action: string | undefined;

    try {
      // Attempt claim for reverse swaps with claimable status
      if (isPendingReverseSwap(swap) && isReverseClaimableStatus(currentStatus)) {
        if (swap.preimage) {
          await tempSwaps.claimVHTLC(swap);
          action = 'claimed';
        } else {
          action = 'skipped_no_preimage';
        }
      }

      // Attempt refund for submarine swaps with refundable status
      if (isPendingSubmarineSwap(swap)) {
        const swapWithStatus = { ...swap, status: currentStatus };
        if (isSubmarineSwapRefundable(swapWithStatus)) {
          if (swap.request.invoice || swap.preimageHash) {
            await tempSwaps.refundVHTLC(swapWithStatus);
            action = 'refunded';
          } else {
            action = 'skipped_no_invoice';
          }
        }
      }
    } finally {
      await tempSwaps.dispose();
    }

    // Check if swap reached final state after our processing
    const isFinal =
      (isPendingReverseSwap(swap) && isReverseFinalStatus(currentStatus)) ||
      (isPendingSubmarineSwap(swap) && isSubmarineFinalStatus(currentStatus));

    return {
      taskItemId: item.id,
      type: SWAP_MONITOR_TASK_TYPE,
      status: 'success',
      data: { swapId, statusChanged, previousStatus: swap.status, currentStatus, action, isFinal },
    };
  },
};
