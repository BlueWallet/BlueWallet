import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export function selectAppleRelease({ eventName, event }) {
  const labels = new Set((event.pull_request?.labels ?? []).map(label => label.name));
  const action = event.action;
  const eventLabel = event.label?.name;

  const pushRelease = eventName === 'push';
  // Direct Catalyst distribution is temporarily disabled. Keep its reusable
  // workflow implementation intact so it can be restored once signing is ready.
  const directDistributionEnabled = false;
  const releaseLabelAdded = eventName === 'pull_request' && action === 'labeled' && eventLabel === 'testflight';
  const releaseSourceUpdated = eventName === 'pull_request' && action === 'synchronize';
  const releaseRequested = releaseLabelAdded || releaseSourceUpdated;
  const uploadTestFlight = pushRelease || (releaseRequested && labels.has('testflight'));
  const buildDmg = directDistributionEnabled && releaseRequested && labels.has('mac-dmg');
  const buildCatalyst = uploadTestFlight || buildDmg;

  return {
    build_catalyst: buildCatalyst,
    build_dmg: buildDmg,
    direct_distribution: directDistributionEnabled && (uploadTestFlight || buildDmg) && !labels.has('skip-direct-distribution'),
    source_sha: event.pull_request?.head?.sha ?? event.after ?? process.env.GITHUB_SHA ?? '',
    upload_testflight: uploadTestFlight,
  };
}

function writeOutputs(outputs, outputPath) {
  const serialized = Object.entries(outputs)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.appendFileSync(outputPath, `${serialized}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const outputPath = process.env.GITHUB_OUTPUT;

  if (!eventPath || !outputPath) {
    throw new Error('GITHUB_EVENT_PATH and GITHUB_OUTPUT are required');
  }

  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  writeOutputs(selectAppleRelease({ eventName: process.env.GITHUB_EVENT_NAME, event }), outputPath);
}
