export class WalletDescriptor {
  static getDescriptor(fpHex: string, path: string, xpub: string, scriptType?: 'p2tr'): string {
    switch (true) {
      // p2tr: watch-only export (path is editable). m/86': seed xpub screen, unchanged.
      case scriptType === 'p2tr' || path.startsWith("m/86'"):
        return `tr([${fpHex.toLowerCase()}/${path.replace('m/', '')}]${xpub})`;
      default:
        throw new Error('Dont know how to make a descriptor');
    }
  }
}
