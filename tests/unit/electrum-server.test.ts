import {
  createElectrumServerHistoryDeepLink,
  formatElectrumServer,
  electrumServerKey,
  parseElectrumServer,
  parseElectrumServerDocument,
  parseElectrumServerDocumentResult,
  parseElectrumServerHistoryDeepLink,
  serializeElectrumServerDocument,
  uniqueElectrumServers,
} from '../../blue_modules/electrumServer';

describe('Electrum server parsing', () => {
  it.each([
    ['hippo.1209k.com\t50002\tssl', { host: 'hippo.1209k.com', ssl: 50002 }],
    ['HIPPO.1209K.COM:50001:tcp', { host: 'hippo.1209k.com', tcp: 50001 }],
    ['bluewallet:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As', { host: 'electrum1.bluewallet.io', ssl: 443 }],
    ['hippo.1209k.com\u00a050002\u00a0SSL', { host: 'hippo.1209k.com', ssl: 50002 }],
  ])('normalizes and parses %s', (value, expected) => {
    expect(parseElectrumServer(value)).toEqual(expected);
  });

  it('rejects invalid ports and incomplete endpoints', () => {
    expect(parseElectrumServer('example.com 0 ssl')).toBeUndefined();
    expect(parseElectrumServer('example.com 70000 ssl')).toBeUndefined();
    expect(parseElectrumServer('example.com')).toBeUndefined();
  });

  it('extracts valid servers from a mixed text document', () => {
    expect(
      parseElectrumServerDocument('Host Port Protocol\nhippo.1209k.com\t50002\tssl\nignored text\nnode.example.com,50001,tcp'),
    ).toEqual([
      { host: 'hippo.1209k.com', ssl: 50002 },
      { host: 'node.example.com', tcp: 50001 },
    ]);
  });

  it('extracts multiple servers from one line and JSON Lines documents', () => {
    expect(parseElectrumServerDocument('one.example.com:50002:ssl, two.example.com:50001:tcp')).toEqual([
      { host: 'one.example.com', ssl: 50002 },
      { host: 'two.example.com', tcp: 50001 },
    ]);
    expect(parseElectrumServerDocument('{"host":"one.example.com","ssl":50002}\n{"host":"two.example.com","tcp":50001}')).toEqual([
      { host: 'one.example.com', ssl: 50002 },
      { host: 'two.example.com', tcp: 50001 },
    ]);
  });

  it('supports Electrum peer-list records with multiple transports', () => {
    expect(parseElectrumServerDocument(JSON.stringify([['node.example.com', 'v1.4', ['s50002', 't50001']]]))).toEqual([
      { host: 'node.example.com', ssl: 50002 },
      { host: 'node.example.com', tcp: 50001 },
    ]);
  });

  it('supports a single JSON server and common nested peer collections', () => {
    expect(parseElectrumServerDocument('{"host":"one.example.com","ssl":50002}')).toEqual([{ host: 'one.example.com', ssl: 50002 }]);
    expect(parseElectrumServerDocument('{"peers":[{"host":"two.example.com","tcp":50001}]}')).toEqual([
      { host: 'two.example.com', tcp: 50001 },
    ]);
  });

  it('recovers valid entries from corrupt JSON while reporting damage', () => {
    const result = parseElectrumServerDocumentResult(
      '{"servers":[{"host":"one.example.com","ssl":50002}, BROKEN, {"host":"two.example.com","tcp":50001}]}',
    );

    expect(result.servers).toEqual([
      { host: 'one.example.com', ssl: 50002 },
      { host: 'two.example.com', tcp: 50001 },
    ]);
    expect(result.recoveredFromCorruption).toBe(true);
    expect(result.rejectedEntries).toBeGreaterThan(0);
  });

  it('safely rejects incompatible and oversized documents', () => {
    expect(parseElectrumServerDocumentResult('{"version":2,"servers":[]}').incompatibleVersion).toBe('2');
    expect(parseElectrumServerDocumentResult('x'.repeat(2_000_001)).tooLarge).toBe(true);
  });

  it('round trips the exported server history document', () => {
    const servers = [
      { host: 'electrum1.bluewallet.io', ssl: 443 },
      { host: 'node.example.com', tcp: 50001 },
    ];
    expect(parseElectrumServerDocument(serializeElectrumServerDocument(servers))).toEqual(servers);
    expect(formatElectrumServer(servers[0])).toBe('electrum1.bluewallet.io:443:s');
  });

  it('round trips an Apple Handoff server-history deep link and rejects invalid payloads', () => {
    const servers = [
      { host: 'one.example.com', ssl: 50002 },
      { host: 'two.example.com', tcp: 50001 },
    ];
    const deepLink = createElectrumServerHistoryDeepLink(servers);
    const document = parseElectrumServerHistoryDeepLink(deepLink);

    expect(document).toBeDefined();
    expect(parseElectrumServerDocument(document ?? '')).toEqual(servers);
    expect(parseElectrumServerHistoryDeepLink('bluewallet:importelectrumserverhistory?data=broken')).toBeUndefined();
  });

  it('treats normalized hostnames with the same port and transport as one server', () => {
    const first = { host: 'NODE.example.com', ssl: 50002 };
    const duplicate = { host: 'node.example.com', ssl: 50002 };
    const differentTransport = { host: 'node.example.com', tcp: 50002 };

    expect(electrumServerKey(first)).toBe(electrumServerKey(duplicate));
    expect(uniqueElectrumServers([first, duplicate, differentTransport])).toEqual([first, differentTransport]);
  });

  it('removes duplicate servers while parsing and exporting documents', () => {
    const duplicateDocument = JSON.stringify({
      servers: [
        { host: 'NODE.example.com', ssl: 50002 },
        { host: 'node.example.com', ssl: 50002 },
      ],
    });

    expect(parseElectrumServerDocument(duplicateDocument)).toEqual([{ host: 'node.example.com', ssl: 50002 }]);
    expect(
      JSON.parse(
        serializeElectrumServerDocument([
          { host: 'node.example.com', ssl: 50002 },
          { host: 'NODE.example.com', ssl: 50002 },
        ]),
      ),
    ).toEqual({
      version: 1,
      servers: [{ host: 'node.example.com', ssl: 50002 }],
    });
  });
});
