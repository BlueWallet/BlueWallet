import assert from 'node:assert/strict';
import test from 'node:test';

import { selectAppleRelease } from './apple-release-selector.mjs';

const pullRequestEvent = ({ action, eventLabel, labels = [] }) => ({
  action,
  label: eventLabel ? { name: eventLabel } : undefined,
  pull_request: {
    head: { sha: 'pr-head-sha' },
    labels: labels.map(name => ({ name })),
  },
});

test('a push releases both Apple platforms from the pushed commit', () => {
  const selected = selectAppleRelease({ eventName: 'push', event: { after: 'push-sha' } });

  assert.equal(selected.upload_testflight, true);
  assert.equal(selected.build_catalyst, true);
  assert.equal(selected.source_sha, 'push-sha');
});

test('the exact testflight label releases both platforms', () => {
  const event = pullRequestEvent({ action: 'labeled', eventLabel: 'testflight', labels: ['testflight'] });
  const selected = selectAppleRelease({ eventName: 'pull_request', event });

  assert.equal(selected.upload_testflight, true);
  assert.equal(selected.build_catalyst, true);
  assert.equal(selected.source_sha, 'pr-head-sha');
});

test('simultaneous source updates release both platforms when testflight remains set', () => {
  const event = pullRequestEvent({ action: 'synchronize', labels: ['testflight'] });
  const selected = selectAppleRelease({ eventName: 'pull_request', event });

  assert.equal(selected.upload_testflight, true);
  assert.equal(selected.build_catalyst, true);
});

test('reopening or adding another label does not release a testflight-labeled PR', () => {
  for (const event of [
    pullRequestEvent({ action: 'reopened', labels: ['testflight'] }),
    pullRequestEvent({ action: 'labeled', eventLabel: 'documentation', labels: ['testflight', 'documentation'] }),
    pullRequestEvent({ action: 'labeled', eventLabel: 'my-testflight-preview', labels: ['my-testflight-preview'] }),
  ]) {
    const selected = selectAppleRelease({ eventName: 'pull_request', event });
    assert.equal(selected.upload_testflight, false);
    assert.equal(selected.build_catalyst, false);
  }
});

test('mac-dmg is ignored while direct distribution is disabled', () => {
  const event = pullRequestEvent({ action: 'labeled', eventLabel: 'mac-dmg', labels: ['mac-dmg'] });
  const selected = selectAppleRelease({ eventName: 'pull_request', event });

  assert.equal(selected.upload_testflight, false);
  assert.equal(selected.build_catalyst, false);
  assert.equal(selected.build_dmg, false);
  assert.equal(selected.direct_distribution, false);
});

test('mac-dmg remains disabled with the legacy opt-out label', () => {
  const event = pullRequestEvent({
    action: 'synchronize',
    labels: ['mac-dmg', 'skip-direct-distribution'],
  });
  const selected = selectAppleRelease({ eventName: 'pull_request', event });

  assert.equal(selected.build_catalyst, false);
  assert.equal(selected.build_dmg, false);
  assert.equal(selected.direct_distribution, false);
});

test('adding mac-dmg to a testflight PR does not start a release', () => {
  const event = pullRequestEvent({
    action: 'labeled',
    eventLabel: 'mac-dmg',
    labels: ['testflight', 'mac-dmg'],
  });
  const selected = selectAppleRelease({ eventName: 'pull_request', event });

  assert.equal(selected.build_catalyst, false);
  assert.equal(selected.upload_testflight, false);
  assert.equal(selected.build_dmg, false);
  assert.equal(selected.direct_distribution, false);
});

test('adding testflight to a mac-dmg PR runs TestFlight without direct distribution', () => {
  const event = pullRequestEvent({
    action: 'labeled',
    eventLabel: 'testflight',
    labels: ['mac-dmg', 'testflight'],
  });
  const selected = selectAppleRelease({ eventName: 'pull_request', event });

  assert.equal(selected.build_catalyst, true);
  assert.equal(selected.upload_testflight, true);
  assert.equal(selected.build_dmg, false);
  assert.equal(selected.direct_distribution, false);
});

test('direct distribution remains disabled for TestFlight labels', () => {
  const enabled = selectAppleRelease({
    eventName: 'pull_request',
    event: pullRequestEvent({ action: 'synchronize', labels: ['testflight'] }),
  });
  const disabled = selectAppleRelease({
    eventName: 'pull_request',
    event: pullRequestEvent({ action: 'synchronize', labels: ['testflight', 'skip-direct-distribution'] }),
  });

  assert.equal(enabled.direct_distribution, false);
  assert.equal(disabled.direct_distribution, false);
});
