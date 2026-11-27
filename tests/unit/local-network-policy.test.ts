/**
 * H28 · ws:// (no TLS) is allowed for exactly the hosts Android lets through
 * in a release build: 192.168.0.x and 192.168.1.x. Debug builds add only the
 * development machine for Metro. A host is local only as a complete literal.
 */
import fs from 'fs';
import path from 'path';

import { isCleartextAllowedHost, parseIPv4 } from '../../blue_modules/neurai/localNetwork';
import { isAllowedDepinServerUrl } from '../../blue_modules/neurai/depinRpcOverrides';

const read = (variant: 'main' | 'debug') =>
  Array.from(
    fs
      .readFileSync(path.join(__dirname, `../../android/app/src/${variant}/res/xml/network_security_config.xml`), 'utf8')
      .matchAll(/<domain includeSubdomains="(true|false)">([^<]+)<\/domain>/g),
  ).map(m => ({ subdomains: m[1] === 'true', domain: m[2].trim() }));

const lan = [0, 1].flatMap(a => Array.from({ length: 256 }, (_, b) => `192.168.${a}.${b}`));

describe('H28 · cleartext host policy', () => {
  it('release builds allow exactly 192.168.0.x and 192.168.1.x, without subdomains', () => {
    const release = read('main');
    expect(release.map(entry => entry.domain).sort()).toEqual([...lan].sort());
    expect(release.every(entry => !entry.subdomains)).toBe(true);
  });

  it('debug builds add only the development machine', () => {
    const extra = read('debug')
      .map(entry => entry.domain)
      .filter(domain => !lan.includes(domain));
    expect(extra.sort()).toEqual(['10.0.2.2', '127.0.0.1', 'localhost']);
  });

  it('JS accepts every release host and nothing else', () => {
    for (const host of lan) expect(isCleartextAllowedHost(host)).toBe(true);
    for (const host of [
      '192.168.2.1',
      '192.168.255.255',
      '10.0.0.1',
      '172.16.0.1',
      '127.0.0.1',
      'localhost',
      '10.0.2.2',
      'node.onion',
      'node.tailnet.ts.net',
      'nas.local',
      '192.168.1.5.example.com',
      '10.evil.com',
      '192.168.1.256',
      '192.168.01.5',
      '192.168.1',
      '',
    ]) {
      expect(isCleartextAllowedHost(host)).toBe(false);
    }
    expect(parseIPv4('192.168.1.5')).toEqual([192, 168, 1, 5]);
  });

  it('applies the policy to DePIN server URLs', () => {
    expect(isAllowedDepinServerUrl('wss://depin.example.com/ws')).toBe(true);
    expect(isAllowedDepinServerUrl('wss://10.0.0.5:9001')).toBe(true); // TLS: any host
    expect(isAllowedDepinServerUrl('ws://192.168.0.20:9001')).toBe(true);
    expect(isAllowedDepinServerUrl('ws://192.168.1.20:9001/push')).toBe(true);
    expect(isAllowedDepinServerUrl('ws://192.168.2.20:9001')).toBe(false);
    expect(isAllowedDepinServerUrl('ws://127.0.0.1:9001')).toBe(false);
    expect(isAllowedDepinServerUrl('ws://node.tailnet.ts.net')).toBe(false);
    expect(isAllowedDepinServerUrl('ws://depin.example.com')).toBe(false);
    expect(isAllowedDepinServerUrl('http://192.168.1.20')).toBe(false);
  });
});
