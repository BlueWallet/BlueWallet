import fs from 'fs';
import path from 'path';

const SECRET_NAMES = ['HD_MNEMONIC', 'HD_MNEMONIC_BIP84', 'MNEMONICS_COBO'] as const;

export const secretValues = (): string[] => SECRET_NAMES.map(name => process.env[name]?.trim() ?? '').filter(value => value.length > 0);

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Artifacts can carry a secret in three shapes: the plain value (native log, text fields), the
// base64 payload Appium logs for `macos: setClipboard` (every pasted mnemonic), and the numbered
// words the WalletExport screen exposes one static text at a time ("1. abandon").
export const redactSecrets = (text: string, secrets: string[]): string => {
  let result = text;
  for (const value of secrets) {
    const collapsed = value.split(/\s+/).join(' ');
    const forms = new Set([value, collapsed, Buffer.from(value).toString('base64'), Buffer.from(collapsed).toString('base64')]);
    for (const form of forms) result = result.replace(new RegExp(escape(form), 'g'), '[redacted]');
    const words = [...new Set(collapsed.split(' '))].map(escape).join('|');
    result = result.replace(new RegExp(`\\b\\d+\\. (?:${words})\\b`, 'g'), '[redacted]');
  }
  return result;
};

// Appium's debug log records request bodies; rewrite every server log of this run in place.
export const redactAppiumLogs = (artifactsDir: string, secrets: string[]) => {
  if (!secrets.length || !fs.existsSync(artifactsDir)) return;
  for (const name of fs.readdirSync(artifactsDir)) {
    if (!/^appium-\d+\.log$/.test(name)) continue;
    const file = path.join(artifactsDir, name);
    fs.writeFileSync(file, redactSecrets(fs.readFileSync(file, 'utf8'), secrets));
  }
};
