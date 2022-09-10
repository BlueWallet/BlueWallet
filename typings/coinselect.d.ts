declare module 'coinselect' {
  export type CoinSelectTarget = {
    address: string;
    value?: number;
    script?: {
      length: number;
    };
  };

  export type CoinSelectUtxo = {
    vout: number;
    value: number;
    txId: string;
    address?: string;
    wif?: string;
    txhex?: string;
    script?: {
      length: number;
    };
  };

  export type CoinselectReturnInput = {
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
    address?: string;
    value: number;
  };

  export default function coinSelect(
    utxos: CoinSelectUtxo[],
    targets: CoinSelectTarget[],
    feeRate: number,
    changeAddress?: string,
  ): {
    inputs: CoinselectReturnInput[];
    outputs: CoinSelectOutput[];
    fee: number;
  };
}

declare module 'coinselect/split' {
  type Utxo = {
    vout: number;
    value: number;
    txId: string;
  };

  export default function coinSelectSplit<U extends Utxo>(
    utxos: U[],
    targets: { address: string; value?: number }[],
    feeRate: number,
    changeAddress?: string,
  ): {
    inputs: CoinselectReturnInput[];
    outputs: {
      address?: string;
      value: number;
    }[];
    fee: number;
  };
}
