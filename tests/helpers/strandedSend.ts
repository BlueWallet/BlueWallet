// A swap as @arkade-os/boltz-swap 0.3.67 stored it; the lockup addresses are
// its own createVHTLCScript's, checked against Boltz's before it saved them.
export const SENDER = 'd862741c0e40278606fe88d6b827b84c247e8bc468c1cc31704771df3024f011';
export const PAYMENT_HASH = 'db6b2ad5b901cfcdc717814793dc00a79a520abfa7f716bb74f80fa7f1cb2597';
const INVOICE =
  'lnbc200u1p54twgqpp5md4j44deq88um3chs9re8hqq57d9yz4l5lm3dwm5lq860uwtyktssp59wuq65mmrk378z7nqds64p2ks677p6kdw930aa4ztl5hhaf85fdsdqawd68yctwv3jkggrnv4hxggr5v4ehgxqrrss9qypqsqcqpf08uknwxlvtjml9c0usmjax35tz3wm5tdr8h0ua9367wcvr2uxjyseyx5awp0xwpspwqpsgj334pwctl2j3ywsnptu8fz35e9esrwf6cp558acn';
export const LOCKUP = {
  currentSigner: 'ark1qzpq904am6clw3pgqwyh4p02708fy4xs0hcpwt7rwfdttuxsjamee0h5gl4adev6tev5kly4fnt5m40qgm9y7zqttxjvu80ghtz5s3s96dplmv',
  previousSigner: 'ark1qq4hfssprtcgnjzf8qlw2f78yvjau5kldfugg29k34y7j96q2w4t48u9f5ec9fd8jjpgh7trq484x625jnkwr70fuy4tawlnwrxme7c7m5jm7n',
};

export const storedSend = (overrides: Record<string, unknown> = {}) => ({
  id: 'send-1',
  type: 'submarine',
  createdAt: 1767225600,
  status: 'transaction.mempool',
  request: { invoice: INVOICE, refundPublicKey: '03' + SENDER },
  response: {
    id: 'send-1',
    address: LOCKUP.currentSigner,
    expectedAmount: 20050,
    claimPublicKey: '0281a90ed37c66ce185217b0768e955bb7e335f8dcd013568787aebff7d2b2ec91',
    acceptZeroConf: true,
    timeoutBlockHeights: { refund: 1767312000, unilateralClaim: 98304, unilateralRefund: 172032, unilateralRefundWithoutReceiver: 259072 },
  },
  ...overrides,
});

// A receive: the stored preimage and our identity claim key make the lockup
// ours alone to claim once Boltz funds it.
export const storedReceive = (overrides: Record<string, unknown> = {}) => ({
  id: 'receive-1',
  type: 'reverse',
  createdAt: 1767225600,
  status: 'transaction.confirmed',
  preimage: '7f2b1c5d9e8a4f6b3c0d7e1a2b4c6d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8',
  request: { invoiceAmount: 20000, claimPublicKey: '02' + SENDER, preimageHash: PAYMENT_HASH },
  response: { id: 'receive-1', lockupAddress: LOCKUP.currentSigner, onchainAmount: 19800, invoice: 'lnbc200u1...' },
  ...overrides,
});

export const storedChainSwap = (overrides: Record<string, unknown> = {}) => ({
  id: 'chain-1',
  type: 'chain',
  createdAt: 1767225600,
  status: 'transaction.server.confirmed',
  preimage: '8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a09f',
  ephemeralKey: '1f2e3d4c5b6a79880f1e2d3c4b5a69780f1e2d3c4b5a69780f1e2d3c4b5a6978',
  feeSatsPerByte: 2,
  amount: 50000,
  request: {},
  response: {},
  ...overrides,
});
