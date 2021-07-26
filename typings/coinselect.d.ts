declare module 'coinselect' {
  type Utxo = {
    vout: number;
    value: number;
    txId: string;
  };

  export default function coinSelect<U extends Utxo>(
    utxos: U[],
    targets: { address: string; value?: number }[],
    feeRate: number,
    changeAddress?: string,
  ): {
    inputs: U[];
    outputs: {
      address?: string;
      value: number;
    }[];
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
    inputs: U[];
    outputs: {
      address?: string;
      value: number;
    }[];
    fee: number;
  };
}
