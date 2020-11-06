import { call, fork, cancel, take } from 'redux-saga/effects';

export function takeLatestPerKey(
  patternOrChannel: string,
  worker: any,
  keySelector: (...args: any[]) => any,
  ...args: any[]
) {
  return fork(function*() {
    const tasks = {};

    while (true) {
      const action = yield take(patternOrChannel);
      const key = yield call(keySelector, action);

      if (tasks[key]) {
        yield cancel(tasks[key]);
      }

      tasks[key] = yield fork(worker, ...args, action);
    }
  });
}
