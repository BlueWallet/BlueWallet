import { isSharedImageEvent } from '../../helpers/sharedImage';

it('does not treat a user file as temporary based on its path', () => {
  expect(isSharedImageEvent({ url: 'file:///Users/alice/shared-images/original.png' })).toBe(false);
});

it('recognizes only explicitly tagged App Group files', () => {
  expect(isSharedImageEvent({ url: 'file:///AppGroup/shared-images/import.png', sharedImage: true })).toBe(true);
});
