// Vendored from @arkade-os/sdk internal serialization (not exported publicly).
// Source: node_modules/@arkade-os/sdk/dist/cjs/repositories/indexedDB/db.js
// Remove this file once the SDK exports these helpers directly.

import { hex } from '@scure/base';
import { TaprootControlBlock } from '@scure/btc-signer';
import type { TapLeafScript, ExtendedCoin, ExtendedVirtualCoin } from '@arkade-os/sdk';

export type SerializedTapLeaf = { cb: string; s: string };
export type SerializedVtxo = ReturnType<typeof serializeVtxo>;
export type SerializedUtxo = ReturnType<typeof serializeUtxo>;

export const serializeTapLeaf = ([cb, s]: TapLeafScript): SerializedTapLeaf => ({
  cb: hex.encode(TaprootControlBlock.encode(cb)),
  s: hex.encode(s),
});

export const serializeVtxo = (v: ExtendedVirtualCoin) => ({
  ...v,
  tapTree: hex.encode(v.tapTree),
  forfeitTapLeafScript: serializeTapLeaf(v.forfeitTapLeafScript),
  intentTapLeafScript: serializeTapLeaf(v.intentTapLeafScript),
  extraWitness: v.extraWitness?.map(hex.encode),
});

export const serializeUtxo = (u: ExtendedCoin) => ({
  ...u,
  tapTree: hex.encode(u.tapTree),
  forfeitTapLeafScript: serializeTapLeaf(u.forfeitTapLeafScript),
  intentTapLeafScript: serializeTapLeaf(u.intentTapLeafScript),
  extraWitness: u.extraWitness?.map(hex.encode),
});

export const deserializeTapLeaf = (t: SerializedTapLeaf): TapLeafScript => {
  const cb = TaprootControlBlock.decode(hex.decode(t.cb));
  const s = hex.decode(t.s);
  return [cb, s];
};

export const deserializeVtxo = (o: SerializedVtxo): ExtendedVirtualCoin => ({
  ...o,
  createdAt: new Date(o.createdAt),
  tapTree: hex.decode(o.tapTree),
  forfeitTapLeafScript: deserializeTapLeaf(o.forfeitTapLeafScript),
  intentTapLeafScript: deserializeTapLeaf(o.intentTapLeafScript),
  extraWitness: o.extraWitness?.map(hex.decode),
});

export const deserializeUtxo = (o: SerializedUtxo): ExtendedCoin => ({
  ...o,
  tapTree: hex.decode(o.tapTree),
  forfeitTapLeafScript: deserializeTapLeaf(o.forfeitTapLeafScript),
  intentTapLeafScript: deserializeTapLeaf(o.intentTapLeafScript),
  extraWitness: o.extraWitness?.map(hex.decode),
});
