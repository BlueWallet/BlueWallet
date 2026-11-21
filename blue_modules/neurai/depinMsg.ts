/** Typed RPC 6 / ECIES format 3 SDK access. The IIFE remains portable on Hermes without Node globals. */
import '@neuraiproject/neurai-depin-msg/dist/neurai-depin-msg.js';
import type * as Contract from '@neuraiproject/neurai-depin-msg';

type Library = typeof Contract;
function api(): Library {
  const sdk = (globalThis as { neuraiDepinMsg?: Library }).neuraiDepinMsg;
  if (!sdk || sdk.DEPIN_RPC_PROTOCOL !== 6) throw new Error('DePIN RPC 6 SDK is not loaded');
  return sdk;
}
export function normalizeDepinToken(token: string): string {
  const value = String(token ?? '').trim();
  if (!value) throw new Error('DePIN token is required');
  return value.startsWith('&') ? value : `&${value}`;
}
export function depinNetwork(network: string): Contract.Network {
  if (['mainnet', 'xna', 'xna-ecdsa'].includes(network)) return 'mainnet';
  if (['test', 'testnet', 'xna-test', 'xna-ecdsa-test'].includes(network)) return 'test';
  if (network === 'regtest') return 'regtest';
  throw new Error('Unsupported DePIN network');
}
export type DepinIdentity = Contract.SenderIdentity;
export type DepinPoolPin = Contract.PoolPin;
export type DepinTrust = Contract.PoolTrust;
export type DepinPoolInfoResult = Contract.DepinPoolInfoResult;
export type VerifiedDepinReply = Contract.VerifiedDepinReply;
export type DepinRpcContext = Contract.DepinRpcContext;
export type DepinSequenceCursor = Contract.DepinSequenceCursor;
export type DepinChallenge = Contract.ChallengeResult;
export type DepinReceiveResult = Contract.ReceiveMessagesResult;
export type DepinRecipients = Contract.DepinRecipientsResolution;
export type DepinBuildResult = Contract.BuildDepinMessageResult;
export type DepinPreimageResult = Contract.BuildDepinPreimageResult;
export type DepinAssembleParams = Contract.AssembleDepinMessageParams;
export type DepinPoolBuildResult = Contract.BuildDepinMessageResult & {
  resolution: Contract.DepinRecipientsResolution;
  context: Contract.DepinRpcContext;
};
/** Format 3 binds every envelope to its chain, so the network is mandatory. */
export type DepinBuildInput = Omit<Contract.BuildDepinMessageParams, 'network'> & { network: string };
export type DepinPoolInfoParams = Omit<Contract.DepinPoolInfoParams, 'network'> & { network?: string };
export type DepinChallengeParams = Parameters<Library['requestDepinChallenge']>[0];
export interface DepinServerWrapResult {
  sender: string;
  encrypted: string;
}

export const buildDepinMessage = (input: DepinBuildInput) =>
  api().buildDepinMessage({
    ...input,
    token: normalizeDepinToken(input.token),
    network: depinNetwork(input.network),
  });
export const buildDepinPreimage = (input: Omit<DepinBuildInput, 'privateKey'>) =>
  api().buildDepinPreimage({
    ...input,
    token: normalizeDepinToken(input.token),
    network: depinNetwork(input.network),
  });
export const assembleDepinMessage: Library['assembleDepinMessage'] = (params, signature) => api().assembleDepinMessage(params, signature);
/** Format 3 opens only under the context the envelope was sealed for: `messageContext` for content, `transportContext` for pool traffic. */
export const decryptDepinReceiveEncryptedPayload: Library['decryptDepinReceiveEncryptedPayload'] = (hex, key, context) =>
  api().decryptDepinReceiveEncryptedPayload(hex, key, context);
export const messageContext: Library['messageContext'] = (fields, genesis) => api().messageContext(fields, genesis);
export const transportContext: Library['transportContext'] = (use, genesis) => api().transportContext(use, genesis);
export const wrapMessageForServer: Library['wrapMessageForServer'] = (hex, key, address, genesis) =>
  api().wrapMessageForServer(hex, key, address, genesis);
export const unwrapMessageFromServer = (hex: string, key: string, options: Contract.EnvelopeNetwork): Promise<string | null> =>
  api().unwrapMessageFromServer(hex, key, options) as Promise<string | null>;
export const wifToHex: Library['wifToHex'] = (key) => api().wifToHex(key);
export const isWIF: Library['isWIF'] = (value) => api().isWIF(value);
export const getDepinPoolInfo = (params: DepinPoolInfoParams) =>
  api().getDepinPoolInfo({ ...params, network: params.network ? depinNetwork(params.network) : undefined });
export const createSoftwareIdentity = (params: {
  privateKey: string;
  network: string;
  address?: string;
  addressType?: 'legacy' | 'ecdsa';
}) => api().createSoftwareIdentity({ ...params, network: depinNetwork(params.network) });
export const requestDepinChallenge: Library['requestDepinChallenge'] = (params) => api().requestDepinChallenge(params);
export const receiveDepinMessages: Library['receiveDepinMessages'] = (params) => api().receiveDepinMessages(params);
export const resolveDepinRecipients: Library['resolveDepinRecipients'] = (params) => api().resolveDepinRecipients(params);
export const buildDepinMessageForPool = (params: Parameters<Library['buildDepinMessageForPool']>[0]) =>
  api().buildDepinMessageForPool(params);
export const submitDepinMessage: Library['submitDepinMessage'] = (params) => api().submitDepinMessage(params);
export const verifyDepinReply: Library['verifyDepinReply'] = (params) => api().verifyDepinReply(params);
export const decodePlainReply: Library['decodePlainReply'] = (verified) => api().decodePlainReply(verified);
export const decodeDepinRecipientDirectory: Library['decodeDepinRecipientDirectory'] = (body, params) =>
  api().decodeDepinRecipientDirectory(body, params);
export const decodeDepinRecipients: Library['decodeDepinRecipients'] = (body, params) => api().decodeDepinRecipients(body, params);
export const poolKeyFingerprint: Library['poolKeyFingerprint'] = (key) => api().poolKeyFingerprint(key);
export const callDepinRpc: Library['callDepinRpc'] = (params) => api().callDepinRpc(params);
export const createDepinRpcRequest: Library['createDepinRpcRequest'] = (params) => api().createDepinRpcRequest(params);
export const pubKeyMatchesAddress: Library['pubKeyMatchesAddress'] = (key, address, network) =>
  api().pubKeyMatchesAddress(key, address, network);

/** Only the SDK's authenticated, decrypted operation errors allow a safe retry. */
export function isVerifiedDepinRpcError(error: unknown): error is Contract.DepinRpcError {
  return error instanceof api().DepinRpcError;
}
