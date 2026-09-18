declare module 'coinselect' {
  export type CoinSelectTarget = {
    address: string;
    value?: number;
    script?: {
      length: number;
    };
  };

  /**
   * not an accurate definition since coinselect lib can ignore certain fields, and just passes through unknown fields,
   * which we actually rely on
   */
  export type CoinSelectUtxo = {
    vout: number;
    value: number;
    txid: string;
    address?: string;
    wif?: string;
    txhex?: string;
    script?: {
      length: number;
    };
  };

  export type CoinSelectReturnInput = {
    vout: number;
    value: number;
    txid: string;
    address?: string;
    wif?: string;
    txhex?: string;
    script?: {
      length: number;
    };
  };

  export type CoinSelectOutput = {
    address?: string; // if output has no address - this is a change output
    value: number;
  };

  export type CoinSelectOptions = {
    /** scriptPubKey change is going to, p2pkh (25 bytes) is assumed by default. Used for change output size and its dust limit */
    changeScript?: { length: number };
    /** bytes of the transaction the lib is not aware of, e.g. segwit marker & flag */
    txExtraBytes?: number;
  };

  export default function coinSelect(
    utxos: CoinSelectUtxo[],
    targets: CoinSelectTarget[],
    feeRate: number,
    options?: CoinSelectOptions,
  ): {
    inputs: CoinSelectReturnInput[];
    outputs: CoinSelectOutput[];
    fee: number;
  };
}

declare module 'coinselect/split' {
  type Utxo = {
    vout: number;
    value: number;
    txid: string;
  };

  export default function coinSelectSplit<U extends Utxo>(
    utxos: U[],
    targets: { address: string; value?: number }[],
    feeRate: number,
    options?: import('coinselect').CoinSelectOptions,
  ): {
    inputs: CoinselectReturnInput[];
    outputs: {
      address?: string;
      value: number;
    }[];
    fee: number;
  };
}
