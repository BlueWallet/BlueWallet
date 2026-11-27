/**
 * Hosts that may be reached without TLS (`ws://`) (H28): only the local
 * networks 192.168.0.x and 192.168.1.x, by the owner's decision. Any other
 * host, including other private ranges, loopback names, Tor and Tailscale,
 * must use `wss://`.
 *
 * The list mirrors `android/app/src/main/res/xml/network_security_config.xml`,
 * where Android enforces it for every cleartext connection of a release build;
 * a unit test reads the XML and checks both agree. Debug builds add the
 * development machine there for Metro, which the app itself never dials.
 *
 * Only complete dotted IPv4 literals count: a name that merely starts with
 * digits (`192.168.1.5.example.com`) is not local.
 */

/** Parses a dotted-decimal IPv4 literal; null for anything else (no octal, no leading zeros). */
export function parseIPv4(host: string): [number, number, number, number] | null {
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map(part => (/^(0|[1-9]\d{0,2})$/.test(part) ? Number(part) : NaN));
  if (octets.some(octet => !(octet >= 0 && octet <= 255))) return null;
  return octets as [number, number, number, number];
}

export function isCleartextAllowedHost(rawHost: string): boolean {
  const ip = parseIPv4(rawHost.trim());
  return ip !== null && ip[0] === 192 && ip[1] === 168 && (ip[2] === 0 || ip[2] === 1);
}
