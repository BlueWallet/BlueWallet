/** message of whatever was thrown; catch clauses receive `unknown`. electrum-client rejects with plain { code, message } objects */
export const errorMessage = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string') return e.message;
  return String(e);
};
