import { sha256 } from '@noble/hashes/sha256';
import DefaultPreference from 'react-native-default-preference';

import loc from '../loc';
import { GROUP_IO_BLUEWALLET } from './currency';
import { base64ToUint8Array, uint8ArrayToHex } from './uint8array-extras/index';

const ELECTRUM_SERVER_IDENTITIES = 'electrum_server_identities';
/** saved for a server whose certificate passed regular validation, instead of a public key */
const CA = 'ca';

// have proper certificates and must keep having them
const caOnlyHosts = [
  'electrum1.bluewallet.io',
  'electrum2.bluewallet.io',
  'electrum3.bluewallet.io',
  'electrum.acinq.co',
  'mainnet-0.foundation.xyz',
];

// self-signed ones. sha256 of the bare public key:
//   openssl x509 -noout -pubkey | openssl rsa -pubin -RSAPublicKey_out -outform der | openssl dgst -sha256
const pinnedPubkeys: Record<string, string> = {
  'bitcoin.lu.ke': '8ade3b5af95c11aa2fad39f38fd256a3e00e1c8fc362ef95288b37f2ded23f3f',
};

type PeerCertificate = { pubkey?: string | Uint8Array } | null | undefined;
type Client = {
  conn: {
    getPeerCertificate: () => PeerCertificate | Promise<PeerCertificate>;
  };
};

export type ServerKeyChange = {
  host: string;
  port: number;
  savedPubkey: string;
  newPubkey: string;
};

/** Server is not the one we know. `message` is localized and meant to be shown to the user. */
export class ServerIdentityError extends Error {
  /** set when its up to the user whether to trust the new key */
  change?: ServerKeyChange;

  constructor(message: string, change?: ServerKeyChange) {
    super(message);
    this.change = change;
  }
}

async function loadIdentities(): Promise<Record<string, string>> {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  try {
    return JSON.parse(((await DefaultPreference.get(ELECTRUM_SERVER_IDENTITIES)) as string) || '{}');
  } catch {
    return {}; // garbage must not lock user out of every server
  }
}

export async function saveServerIdentity(host: string, port: number, identity: string): Promise<void> {
  const identities = await loadIdentities();
  identities[`${host.toLowerCase()}:${port}`] = identity;
  await DefaultPreference.set(ELECTRUM_SERVER_IDENTITIES, JSON.stringify(identities));
}

/**
 * Certificate validation modes to try, in order. `true` is the regular one (system CAs + hostname). `false` is none,
 * for self-signed certificates: there server's key is compared to the one we remember.
 *
 * @param userChoice user explicitly chose this server just now, so the key we remember does not matter
 */
export async function validationModes(host: string, port: number, userChoice = false): Promise<boolean[]> {
  host = host.toLowerCase();
  if (pinnedPubkeys[host]) return [false];
  if (caOnlyHosts.includes(host)) return [true];
  const saved = (await loadIdentities())[`${host}:${port}`];
  if (saved === CA) return [true]; // even for the user: otherwise re-saving the server while someone is in the middle would let them in
  return saved && !userChoice ? [false] : [true, false];
}

/** @returns [offset, length] of the content of DER element that starts at `offset` */
function derContent(der: Uint8Array, offset: number): [number, number] {
  const first = der[offset + 1];
  if (first < 0x80) return [offset + 2, first];
  const lengthBytes = first - 0x80;
  let length = 0;
  for (let i = 0; i < lengthBytes; i++) length = length * 256 + der[offset + 2 + i];
  return [offset + 2 + lengthBytes, length];
}

/** Android reports peer's public key wrapped in SubjectPublicKeyInfo, iOS reports it bare. Unwrapping, so it's the same everywhere. */
function barePubkey(key: Uint8Array): Uint8Array {
  const [algorithm] = derContent(key, 0);
  if (key[0] !== 0x30 || key[algorithm] !== 0x30) return key; // already bare: EC point or RSAPublicKey
  const [algorithmContent, algorithmLength] = derContent(key, algorithm);
  const [bitString] = derContent(key, algorithmContent + algorithmLength);
  return key.subarray(bitString + 1); // BIT STRING starts with the count of unused bits
}

/**
 * Makes sure TLS peer is the server we wanted and not someone in the middle. Call after the first response
 * (thats when handshake is surely over) and before sending anything sensitive.
 *
 * @param validated whether certificate went through regular validation, see `validationModes()`
 * @param userChoice user explicitly chose this server just now, so its key is remembered even if it differs from the saved one
 * @throws {ServerIdentityError}
 */
export async function verifyServerIdentity(client: Client, host: string, port: number, validated: boolean, userChoice = false) {
  host = host.toLowerCase();
  const server = `${host}:${port}`;

  if (validated) {
    if (!caOnlyHosts.includes(host) && (await loadIdentities())[server] !== CA) await saveServerIdentity(host, port, CA);
    return;
  }

  const pubkey = (await client.conn.getPeerCertificate())?.pubkey; // base64 in RN, Buffer in nodejs
  if (!pubkey) throw new ServerIdentityError(loc.formatString(loc.settings.electrum_error_cert, { server }));
  const newPubkey = uint8ArrayToHex(sha256(barePubkey(typeof pubkey === 'string' ? base64ToUint8Array(pubkey) : pubkey)));

  if (pinnedPubkeys[host]) {
    if (pinnedPubkeys[host] !== newPubkey) throw new ServerIdentityError(loc.formatString(loc.settings.electrum_error_cert, { server }));
    return;
  }

  // trust on first use
  const savedPubkey = (await loadIdentities())[server];
  if (savedPubkey === newPubkey) return;
  if (savedPubkey && !userChoice) {
    throw new ServerIdentityError(loc.formatString(loc.settings.electrum_cert_changed, { server }), { host, port, savedPubkey, newPubkey });
  }
  await saveServerIdentity(host, port, newPubkey);
}
