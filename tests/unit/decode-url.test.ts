import decodeURL from '../../helpers/decodeURL';

it('decodes valid URLs', () => {
  expect(decodeURL('file:///tmp/qr%20code.png')).toBe('file:///tmp/qr code.png');
});

it('returns malformed URLs unchanged', () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  expect(decodeURL('file:///tmp/incomplete%2.png')).toBe('file:///tmp/incomplete%2.png');
  expect(consoleError).toHaveBeenCalled();
});
