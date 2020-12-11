import Detox, { waitFor } from 'detox';

import { WAIT_FOR_ELEMENT_TIMEOUT } from './helpers';

interface TypeTextOptions {
  replace?: boolean;
  closeKeyboard?: boolean;
}

const Actions = () => {
  const waitForElement = async (element: Detox.DetoxAny) => {
    await waitFor(element)
      .toBeVisible()
      .withTimeout(WAIT_FOR_ELEMENT_TIMEOUT);
  };

  const typeText = async (element: Detox.DetoxAny, text: string, options?: TypeTextOptions) => {
    await waitForElement(element);

    if (options?.replace) {
      await element.clearText();
    }

    await element.typeText(text);

    if (options?.closeKeyboard) {
      await element.typeText('\n');
    }
  };

  const tap = async (element: Detox.DetoxAny) => {
    await waitForElement(element);
    await element.tap();
  };

  const multiTap = async (element: Detox.DetoxAny, times: number) => {
    await waitForElement(element);
    await element.multiTap(times);
  };

  return { waitForElement, typeText, tap, multiTap };
};

export default Actions();
