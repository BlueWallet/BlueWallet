/**
 * The wallet's one `@arkade-os/swap` client.
 *
 * Construction stays inert: no network, no wallet read, no repository touch.
 * The first `await client.ready` runs the restore read and arms the drive
 * where there is live work.
 *
 * What is left here is configuration the client cannot infer:
 * - **discovery.** An injected, pre-filtered snapshot (see
 *   `arkade-markets.ts`) — never a registry URL, so supersession re-runs on
 *   every refresh and the UI and the quote path provably agree.
 * - **the BOLT11 decoder.** The corridor override, so the wallet's own gates
 *   run on the invoice it pays.
 *
 * No server URL and no providers built from one: the swap client takes the
 * wallet as its operator seam (`getArkadeInfo` / `getArkadeReader` /
 * `getArkadeBroadcaster`) and accepts none anywhere.
 */

import { createSwapClient, type AssetSwapRepository, type SwapClient } from '@arkade-os/swap';
import type { DiscoveredMarket } from '@arkade-os/solver-discovery';
import type { IWallet } from '@arkade-os/sdk';

import { toInvoiceFacts } from './arkade-bolt11';

export interface MakeSwapClientInput {
  wallet: IWallet;
  repository: AssetSwapRepository;
  /** Pre-filtered market set from `discoverMarkets()` — one set for the UI and the quote path. */
  markets: readonly DiscoveredMarket[];
}

export const makeSwapClient = ({ wallet, repository, markets }: MakeSwapClientInput): SwapClient =>
  createSwapClient({
    wallet,
    repository,
    discovery: { snapshot: [...markets] },
    corridors: {
      lightning: {
        decode: bolt11 => toInvoiceFacts(bolt11, 'bitcoin'),
      },
    },
  });
