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
 *   run on the payer's invoice on a send and on the solver's hold invoice on
 *   a receive — one set of rules for both directions.
 * - **the covclaimd key.** Delegated claim removes the ~30-minute
 *   foreground deadline instead of documenting it and is a release
 *   prerequisite (infrastructure work outside this repository). Until the
 *   deployment exists there is nothing to seal to: the field is left
 *   `undefined`, which is the package's own internal ephemeral self-claim
 *   seal. The reference wallet's `sealingKey()` throwaway helper is
 *   deliberately not ported — it exists to make delegation impossible,
 *   which is the opposite of this decision. Pass a real compressed-hex
 *   deployment key via `covclaimdPubkey` once it exists.
 * - **the co-signer key.** `emulatorPubkey: undefined` on mainnet takes the
 *   package's own pin.
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
  /**
   * Real covclaimd deployment key (33-byte compressed hex) once the
   * deployment exists. `undefined` until then: the internal ephemeral
   * self-claim seal.
   */
  covclaimdPubkey?: string;
  /** Compressed-hex co-signer override. `undefined` on mainnet: the package pin. */
  emulatorPubkey?: string;
}

export const makeSwapClient = ({ wallet, repository, markets, covclaimdPubkey, emulatorPubkey }: MakeSwapClientInput): SwapClient =>
  createSwapClient({
    wallet,
    repository,
    discovery: { snapshot: [...markets] },
    corridors: {
      lightning: {
        // The wallet's own decoder, applied by the corridor to the SOLVER's
        // hold invoice before it is shown: it throws `InvoiceRejected` on a
        // wrong network or an already-expired invoice.
        decode: bolt11 => toInvoiceFacts(bolt11, 'bitcoin'),
        ...(covclaimdPubkey ? { covclaimd: { pubkey: covclaimdPubkey } } : {}),
      },
    },
    // Compressed hex only on mainnet: undefined takes the package's own pin.
    emulatorPubkey,
  });
