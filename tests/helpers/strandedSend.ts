// A send as @arkade-os/boltz-swap 0.3.67 stored it. The lockup addresses come
// from its own createVHTLCScript, the construction it checked every address
// Boltz returned against before saving a swap.
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
