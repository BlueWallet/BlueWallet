export interface ElectrumServerItem {
  host: string;
  tcp?: number;
  ssl?: number;
}

export const hardcodedPeers: ElectrumServerItem[] = [
  { host: 'mainnet.foundationdevices.com', ssl: 50002 },
  { host: 'bitcoin.lu.ke', ssl: 50002 },
  { host: 'electrum1.bluewallet.io', ssl: 443 },
  { host: 'electrum.acinq.co', ssl: 50002 },
];

export const normalizeElectrumServerText = (value: string): string =>
  value
    .normalize('NFKC')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const inferElectrumServerSsl = (port: number): boolean | undefined => {
  const tcpMatches = hardcodedPeers.filter(peer => peer.tcp === port).length;
  const sslMatches = hardcodedPeers.filter(peer => peer.ssl === port).length;
  return tcpMatches === sslMatches ? undefined : sslMatches > tcpMatches;
};

export const parseElectrumServer = (value: string): ElectrumServerItem | undefined => {
  const normalizedValue = normalizeElectrumServerText(value);
  const deepLinkMatch = normalizedValue.match(/^(?:(?:bluewallet|blue|lapp):)?setelectrumserver\?[^#]*\bserver=([^&#]+)/i);
  let serverValue = normalizedValue;
  if (deepLinkMatch) {
    try {
      serverValue = normalizeElectrumServerText(decodeURIComponent(deepLinkMatch[1].replace(/\+/g, ' ')));
    } catch {
      return undefined;
    }
  }

  const match = serverValue.match(/^([^:\s]+)(?::|\s+)(\d{1,5})(?:(?::|\s+)(s|ssl|t|tcp))?$/i);
  if (!match) return undefined;

  const [, rawHost, portValue, connectionType] = match;
  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return undefined;

  const host = rawHost.toLowerCase();
  const validHost =
    host === 'localhost' ||
    (host.length <= 253 &&
      host.split('.').every(label => label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)));
  if (!validHost) return undefined;
  const useSsl = connectionType ? connectionType.toLowerCase().startsWith('s') : inferElectrumServerSsl(port) === true;
  return useSsl ? { host, ssl: port } : { host, tcp: port };
};

export const formatElectrumServer = (server: ElectrumServerItem): string =>
  `${server.host}:${server.ssl ?? server.tcp}:${server.ssl !== undefined ? 's' : 't'}`;

export const electrumServerKey = (server: ElectrumServerItem): string =>
  `${normalizeElectrumServerText(server.host).toLowerCase()}:${server.tcp ?? ''}:${server.ssl ?? ''}`;

export const uniqueElectrumServers = (servers: ElectrumServerItem[]): ElectrumServerItem[] => {
  const seen = new Set<string>();
  return servers.filter(server => {
    const key = electrumServerKey(server);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export interface ElectrumServerDocumentResult {
  servers: ElectrumServerItem[];
  rejectedEntries: number;
  duplicateEntries: number;
  recoveredFromCorruption: boolean;
  truncated: boolean;
  incompatibleVersion?: string;
  tooLarge: boolean;
}

const MAX_SERVER_DOCUMENT_LENGTH = 2_000_000;
const MAX_SERVER_DOCUMENT_RECORDS = 1_000;
const MAX_SERVER_DOCUMENT_LINES = 5_000;

export const parseElectrumServerDocumentResult = (contents: string): ElectrumServerDocumentResult => {
  const emptyResult: ElectrumServerDocumentResult = {
    servers: [],
    rejectedEntries: 0,
    duplicateEntries: 0,
    recoveredFromCorruption: false,
    truncated: false,
    tooLarge: false,
  };
  if (typeof contents !== 'string' || contents.length > MAX_SERVER_DOCUMENT_LENGTH) {
    return { ...emptyResult, tooLarge: true };
  }

  const normalizedContents = contents.replace(/^\uFEFF/, '').normalize('NFKC');
  const trimmedContents = normalizedContents.trimStart();
  const looksLikeJson = trimmedContents.startsWith('{') || trimmedContents.startsWith('[');
  let jsonParsingFailed = false;
  const servers: ElectrumServerItem[] = [];
  const serverKeys = new Set<string>();
  let rejectedEntries = 0;
  let duplicateEntries = 0;
  let truncated = false;

  const addServer = (server?: ElectrumServerItem) => {
    if (!server) {
      rejectedEntries += 1;
      return;
    }
    const key = electrumServerKey(server);
    if (serverKeys.has(key)) {
      duplicateEntries += 1;
      return;
    }
    if (servers.length >= MAX_SERVER_DOCUMENT_RECORDS) {
      truncated = true;
      return;
    }
    serverKeys.add(key);
    servers.push(server);
  };

  const addRecord = (record: unknown) => {
    if (typeof record === 'string') {
      addServer(parseElectrumServer(record));
      return;
    }
    if (Array.isArray(record)) {
      const [host, portOrVersion, protocolOrFeatures] = record;
      if (typeof host !== 'string') {
        rejectedEntries += 1;
        return;
      }
      if (typeof portOrVersion === 'number' || /^\d{1,5}$/.test(String(portOrVersion))) {
        addServer(parseElectrumServer(`${host} ${portOrVersion} ${typeof protocolOrFeatures === 'string' ? protocolOrFeatures : ''}`));
        return;
      }
      if (Array.isArray(protocolOrFeatures)) {
        const features = protocolOrFeatures.filter((feature): feature is string => typeof feature === 'string');
        let foundFeature = false;
        for (const feature of features) {
          const match = feature.match(/^([st])(\d{1,5})$/i);
          if (!match) continue;
          foundFeature = true;
          addServer(parseElectrumServer(`${host} ${match[2]} ${match[1]}`));
        }
        if (!foundFeature) rejectedEntries += 1;
        return;
      }
      rejectedEntries += 1;
      return;
    }
    if (!record || typeof record !== 'object') {
      rejectedEntries += 1;
      return;
    }
    const { host, tcp, ssl, port, protocol, type } = record as Record<string, unknown>;
    if (typeof host !== 'string') {
      rejectedEntries += 1;
      return;
    }
    let foundEndpoint = false;
    if (ssl !== undefined && ssl !== null && ssl !== '') {
      foundEndpoint = true;
      addServer(parseElectrumServer(`${host} ${String(ssl)} ssl`));
    }
    if (tcp !== undefined && tcp !== null && tcp !== '') {
      foundEndpoint = true;
      addServer(parseElectrumServer(`${host} ${String(tcp)} tcp`));
    }
    if (port !== undefined && port !== null && port !== '') {
      foundEndpoint = true;
      const connectionType = typeof protocol === 'string' ? protocol : typeof type === 'string' ? type : '';
      addServer(parseElectrumServer(`${host} ${String(port)}${connectionType ? ` ${connectionType}` : ''}`));
    }
    if (!foundEndpoint) rejectedEntries += 1;
  };

  try {
    const parsed: unknown = JSON.parse(normalizedContents);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const version = (parsed as { version?: unknown }).version;
      if (version !== undefined) {
        const numericVersion = typeof version === 'number' || typeof version === 'string' ? Number(version) : Number.NaN;
        if (!Number.isInteger(numericVersion) || numericVersion !== 1) {
          return { ...emptyResult, incompatibleVersion: String(version) };
        }
      }
    }
    const parsedObject = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : undefined;
    const nestedRecords = parsedObject && [parsedObject.servers, parsedObject.peers, parsedObject.history].find(Array.isArray);
    const records = Array.isArray(parsed)
      ? parsed
      : Array.isArray(nestedRecords)
        ? nestedRecords
        : parsedObject?.host
          ? [parsedObject]
          : [];
    if (records.length > MAX_SERVER_DOCUMENT_RECORDS) truncated = true;
    records.slice(0, MAX_SERVER_DOCUMENT_RECORDS).forEach(addRecord);
    if (records.length === 0) rejectedEntries += 1;
  } catch {
    jsonParsingFailed = true;
    const lines = normalizedContents.split(/\r?\n/);
    if (lines.length > MAX_SERVER_DOCUMENT_LINES) truncated = true;
    for (const rawLine of lines.slice(0, MAX_SERVER_DOCUMENT_LINES)) {
      const line = rawLine
        .trim()
        .replace(/^(?:[-*•]|\d+[.)])\s*/, '')
        .replace(/["']/g, '');
      if (!line || line.startsWith('#') || line.startsWith('//')) continue;

      try {
        addRecord(JSON.parse(rawLine.replace(/,\s*$/, '')));
        continue;
      } catch {
        // Continue with tolerant text extraction.
      }

      let foundOnLine = false;
      const deepLinks = rawLine.match(/(?:(?:bluewallet|blue|lapp):)?setelectrumserver\?[^\s"'<>]+/gi) ?? [];
      for (const deepLink of deepLinks) {
        const parsedServer = parseElectrumServer(deepLink.replace(/[),.;]+$/, ''));
        if (parsedServer) foundOnLine = true;
        addServer(parsedServer);
      }

      const endpointPattern =
        /\b(localhost|[a-z0-9][a-z0-9.-]*[a-z0-9])\s*(?::|[\t,;| ]+)\s*(\d{1,5})(?:\s*(?::|[\t,;| ]+)\s*(ssl|tcp|s|t))?/gi;
      for (const match of line.matchAll(endpointPattern)) {
        if (['host', 'ssl', 'tcp', 'port'].includes(match[1].toLowerCase())) continue;
        foundOnLine = true;
        addServer(parseElectrumServer(`${match[1]} ${match[2]} ${match[3] ?? ''}`));
      }
      if (!foundOnLine) rejectedEntries += 1;
    }

    const jsonFragmentPattern = /["']host["']\s*:\s*["']([^"']+)["'][\s\S]{0,200}?["'](ssl|tcp|port)["']\s*:\s*["']?(\d{1,5})/gi;
    for (const match of normalizedContents.matchAll(jsonFragmentPattern)) {
      const protocol = match[2].toLowerCase() === 'port' ? '' : match[2];
      addServer(parseElectrumServer(`${match[1]} ${match[3]} ${protocol}`));
    }
  }

  return {
    servers,
    rejectedEntries,
    duplicateEntries,
    recoveredFromCorruption: servers.length > 0 && looksLikeJson && jsonParsingFailed,
    truncated,
    tooLarge: false,
  };
};

export const parseElectrumServerDocument = (contents: string): ElectrumServerItem[] => parseElectrumServerDocumentResult(contents).servers;

export const serializeElectrumServerDocument = (servers: ElectrumServerItem[]): string =>
  JSON.stringify({ version: 1, servers: uniqueElectrumServers(servers) }, null, 2);

const ELECTRUM_SERVER_HISTORY_DEEP_LINK_ACTION = 'importelectrumserverhistory';

export const createElectrumServerHistoryDeepLink = (servers: ElectrumServerItem[]): string =>
  `bluewallet:${ELECTRUM_SERVER_HISTORY_DEEP_LINK_ACTION}?data=${encodeURIComponent(serializeElectrumServerDocument(servers))}`;

export const parseElectrumServerHistoryDeepLink = (value: string): string | undefined => {
  if (typeof value !== 'string' || value.length > MAX_SERVER_DOCUMENT_LENGTH * 2) return undefined;
  const match = value.match(
    new RegExp(`^(?:(?:bluewallet|blue|lapp):)?(?://)?${ELECTRUM_SERVER_HISTORY_DEEP_LINK_ACTION}\\?[^#]*\\bdata=([^&#]+)`, 'i'),
  );
  if (!match) return undefined;
  try {
    const document = decodeURIComponent(match[1].replace(/\+/g, ' '));
    const result = parseElectrumServerDocumentResult(document);
    return !result.tooLarge && result.incompatibleVersion === undefined && result.servers.length > 0 ? document : undefined;
  } catch {
    return undefined;
  }
};
