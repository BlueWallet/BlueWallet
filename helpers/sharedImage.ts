export type OpenURLEvent = { url: string; sharedImage?: boolean };

export const isSharedImageEvent = (event: OpenURLEvent): boolean => event.sharedImage === true;
