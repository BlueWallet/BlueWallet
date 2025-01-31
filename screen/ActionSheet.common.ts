// ActionSheet.common.ts
export interface ActionSheetOptions {
  title?: string;
  message?: string;
  options: string[]; // Array of button labels.
  destructiveButtonIndex?: number;
  cancelButtonIndex?: number;
  confirmButtonIndex?: number;
  anchor?: number;
}

export type CompletionCallback = (buttonIndex: number) => void;
