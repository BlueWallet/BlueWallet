export class WalletDescriptor {
  static getDescriptor(fpHex: string, path: string, xpub: string, scriptType?: 'p2tr'): string {
    switch (true) {
      case scriptType === 'p2tr':
        return `tr([${fpHex.toLowerCase()}/${path.replace('m/', '')}]${xpub})`;
      default:
        throw new Error('Dont know how to make a descriptor');
    }
  }
}
