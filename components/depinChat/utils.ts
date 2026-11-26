import { ONE_COIN } from './constants';

export const parseRevealed = (response: unknown): boolean | null => {
  if (response && typeof response === 'object') {
    const result = response as { revealed?: number; pubkey?: string };
    if (typeof result.revealed === 'number') return result.revealed === 1;
    if (typeof result.pubkey === 'string' && /^0[23][0-9a-f]{64}$/i.test(result.pubkey.trim())) return true;
  }
  if (typeof response === 'string' && /^0[23][0-9a-f]{64}$/i.test(response.trim())) return true;
  return null;
};

export const normalizeAmount = (raw: unknown): number => {
  if (typeof raw === 'number') return raw > 1e6 ? raw / ONE_COIN : raw;
  const amount = Number(raw);
  return Number.isFinite(amount) ? (amount > 1e6 ? amount / ONE_COIN : amount) : 0;
};
