/// <reference types="node" />
export declare class CipherSeed {
    entropy: Buffer;
    salt: Buffer;
    internalVersion: number;
    birthday: number;
    private static decipher;
    static fromMnemonic(mnemonic: string, password?: string): CipherSeed;
    static random(): CipherSeed;
    static changePassword(mnemonic: string, oldPassword: string | null, newPassword: string): string;
    constructor(entropy: Buffer, salt: Buffer, internalVersion?: number, birthday?: number);
    get birthDate(): Date;
    toMnemonic(password?: string, cipherSeedVersion?: number): string;
    private encipher;
}
