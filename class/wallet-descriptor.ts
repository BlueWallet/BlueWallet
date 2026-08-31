export class WalletDescriptor {
  static getDescriptor(fpHex: string, path: string, xpub: string, scriptType?: 'p2tr'): string {
    switch (true) {
      // the caller can state the script type explicitly; the path prefix alone is not
      // reliable because the derivation path is editable signer metadata
      case scriptType === 'p2tr' || path.startsWith("m/86'"):
        return `tr([${fpHex.toLowerCase()}/${path.replace('m/', '')}]${xpub})`;
      default:
        throw new Error('Dont know how to make a descriptor');
    }
  }
}
