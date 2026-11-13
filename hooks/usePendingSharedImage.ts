import type { OpenURLEvent } from '../helpers/sharedImage';

type OpenURLHandler = (event: OpenURLEvent) => Promise<void>;

const usePendingSharedImage = (_enabled: boolean, _handleOpenURL: OpenURLHandler) => {};

export default usePendingSharedImage;
