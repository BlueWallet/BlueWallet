export const makeLabelFileName = (label: string, extension: string) => {
  const safeLabel = Array.from(label, character => (character.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(character) ? '_' : character))
    .join('')
    .trim();
  const safeExtension = extension.replace(/^\.+/, '');
  return `${safeLabel || 'wallet-backup'}.${safeExtension}`;
};
