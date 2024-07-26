import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { PromptType, modalParams, handleCancel, handleContinue } from '../components/PromptModal';
import loc from '../loc';

const prompt = async (
  title: string,
  text: string,
  type: PromptType = PromptType.SecureText,
  isCancelable = true,
  continueButtonText = loc._.continue
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    modalParams.title = title;
    modalParams.text = text;
    modalParams.type = type;
    modalParams.continueButtonText = continueButtonText;
    modalParams.isCancelable = isCancelable;

    resolvePromise = resolve;
    rejectPromise = reject;

    await TrueSheet.present('PromptModal');
  });
};

export default prompt;