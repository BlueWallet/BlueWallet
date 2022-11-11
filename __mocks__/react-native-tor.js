/* global jest */

export const startIfNotStarted = jest.fn(async (key, value, callback) => {
  return 666;
});


export const get = jest.fn();
export const post = jest.fn();
export const deleteMock = jest.fn();
export const stopIfRunning = jest.fn();
export const getDaemonStatus = jest.fn();

const mock = jest.fn().mockImplementation(() => {
  return { startIfNotStarted, get, post, delete: deleteMock, stopIfRunning, getDaemonStatus };
});

export default mock;