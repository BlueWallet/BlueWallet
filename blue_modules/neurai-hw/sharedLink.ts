/**
 * The one USB link to the NeuraiHW device, shared by every screen (H18).
 *
 * - Opening is shared: two screens that find no link at the same moment wait
 *   for one `open()` instead of racing two permission prompts and two ports.
 * - Each user holds the link. Releasing it closes the port only when nobody
 *   else holds it: a signing screen finishing must not cut off the DePIN chat.
 * - Close goes through the command queue, so it never lands in the middle of
 *   another user's command.
 *
 * React lives in `useNeuraiHwDevice`; this module has no UI so it can be tested.
 */
import type { NeuraiESP32 } from '@neuraiproject/neurai-sign-esp32/react-native';

import { withDevice } from './deviceQueue';

export type LinkHolder = string | symbol;

const state: {
  device: NeuraiESP32 | null;
  opening: Promise<NeuraiESP32> | null;
  holders: Set<LinkHolder>;
  /** Screens inside `acquireLink`, by how many calls each has in flight. */
  acquiring: Map<LinkHolder, number>;
} = {
  device: null,
  opening: null,
  holders: new Set(),
  acquiring: new Map(),
};

/** The open link, if any (for callers that only want to reuse one). */
export function currentLink(): NeuraiESP32 | null {
  return state.device;
}

/**
 * Closes the port: the device was lost or stopped answering. Its holders are
 * gone with it, but screens still acquiring keep their place, so two screens
 * reconnecting together both hold the new port (second review).
 */
export async function dropLink(): Promise<void> {
  const device = state.device;
  state.device = null;
  state.holders = new Set(state.acquiring.keys());
  if (device) await withDevice(() => device.disconnect()).catch(() => {});
}

const MAX_ATTEMPTS = 3;

/**
 * Returns the open link, opening it with `open` if needed. A link that no
 * longer answers a ping is dropped and reopened; concurrent callers share one
 * open. The holder is registered for the whole wait, so a last holder leaving
 * meanwhile cannot close the port under this caller.
 */
export async function acquireLink(holder: LinkHolder, open: () => Promise<NeuraiESP32>): Promise<NeuraiESP32> {
  state.holders.add(holder);
  state.acquiring.set(holder, (state.acquiring.get(holder) ?? 0) + 1);
  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const existing = state.device;
      if (existing) {
        try {
          await withDevice(() => existing.ping());
        } catch {
          if (state.device === existing) await dropLink();
          continue;
        }
        if (state.device === existing) return existing;
        continue; // replaced while we waited: check the new one
      }
      if (!state.opening) {
        state.opening = open()
          .then(device => {
            state.device = device;
            return device;
          })
          .finally(() => {
            state.opening = null;
          });
      }
      const device = await state.opening;
      if (state.device === device) return device;
    }
    throw new Error('The hardware device keeps disconnecting');
  } catch (error) {
    state.holders.delete(holder);
    throw error;
  } finally {
    const pending = (state.acquiring.get(holder) ?? 1) - 1;
    if (pending > 0) state.acquiring.set(holder, pending);
    else state.acquiring.delete(holder);
  }
}

/** Stops holding the link; the port closes when the last holder lets go. */
export async function releaseLink(holder: LinkHolder): Promise<void> {
  state.holders.delete(holder);
  if (state.holders.size > 0) return;
  await dropLink();
}

/** Test hook: forget everything without touching a device. */
export function resetLinkForTests(): void {
  state.device = null;
  state.opening = null;
  state.holders.clear();
  state.acquiring.clear();
}
