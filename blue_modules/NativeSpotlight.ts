export { default, type Spec } from '../codegen/NativeSpotlight';

export const isSpotlightDeepLink = (url: string): boolean =>
  url.startsWith('bluewallet://wallet') || url.startsWith('bluewallet://transaction') || url.startsWith('bluewallet://contact');
