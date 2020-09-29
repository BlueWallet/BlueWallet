import { maxWalletNameLength } from 'app/consts/text';

export const getEllipsisText = (text: string, maxLength: number) =>
  text?.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
export const getEllipsisWalletName = (text: string) => getEllipsisText(text, maxWalletNameLength);
