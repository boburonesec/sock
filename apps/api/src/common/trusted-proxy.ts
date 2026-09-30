import { BlockList, isIP } from 'node:net';

/**
 * `TRUSTED_PROXIES`: the peers allowed to tell the API a client's IP via
 * X-Forwarded-For. `request.ip` keys the auth rate limiter, so this is a
 * security boundary, not a convenience. List it per deployment — the default
 * is `loopback` (nginx/web on the same host, local development):
 *
 * - `loopback`    127.0.0.0/8, ::1
 * - `uniquelocal` 10/8, 172.16/12, 192.168/16, fc00::/7 — only where the
 *                  network can carry nothing but this stack (the compose
 *                  network, with api/web published on 127.0.0.1)
 * - `linklocal`   169.254/16, fe80::/10
 * - an IP address or CIDR (`172.30.0.0/16`, `2001:db8::/32`)
 */
export const DEFAULT_TRUSTED_PROXIES = 'loopback';

type Family = 'ipv4' | 'ipv6';

const KEYWORD_RANGES: Record<string, Array<[string, number, Family]>> = {
  loopback: [
    ['127.0.0.0', 8, 'ipv4'],
    ['::1', 128, 'ipv6'],
  ],
  uniquelocal: [
    ['10.0.0.0', 8, 'ipv4'],
    ['172.16.0.0', 12, 'ipv4'],
    ['192.168.0.0', 16, 'ipv4'],
    ['fc00::', 7, 'ipv6'],
  ],
  linklocal: [
    ['169.254.0.0', 16, 'ipv4'],
    ['fe80::', 10, 'ipv6'],
  ],
};

const familyOf = (address: string): Family | null => {
  const version = isIP(address);
  return version === 4 ? 'ipv4' : version === 6 ? 'ipv6' : null;
};

/** Parses a TRUSTED_PROXIES value; throws on any entry it does not understand. */
export function parseTrustedProxies(spec: string): BlockList {
  const list = new BlockList();
  const entries = spec
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    throw new Error('TRUSTED_PROXIES must list at least one entry (e.g. "loopback").');
  }

  for (const entry of entries) {
    const keyword = KEYWORD_RANGES[entry.toLowerCase()];
    if (keyword) {
      for (const [network, prefix, family] of keyword) list.addSubnet(network, prefix, family);
      continue;
    }

    const [address, prefixText] = entry.split('/');
    const family = familyOf(address);
    const maxPrefix = family === 'ipv4' ? 32 : 128;
    const prefix = prefixText === undefined ? maxPrefix : Number(prefixText);

    if (!family || !Number.isInteger(prefix) || prefix < 0 || prefix > maxPrefix || (prefixText !== undefined && !/^\d+$/.test(prefixText))) {
      throw new Error(`TRUSTED_PROXIES contains an invalid entry: "${entry}".`);
    }

    list.addSubnet(address, prefix, family);
  }

  return list;
}

/**
 * Express `trust proxy` function: X-Forwarded-For is honoured for exactly one
 * hop, and only when the socket peer is a listed trusted proxy. Any other peer
 * — a directly connecting client on the internet or the LAN — is its own
 * identity, so it cannot choose its limiter bucket with a forged header.
 * `hopIndex` 0 is the socket peer; X-Forwarded-For entries are never trusted.
 */
export function createTrustedProxyFn(spec: string): (address: string, hopIndex: number) => boolean {
  const list = parseTrustedProxies(spec);

  return (address, hopIndex) => {
    if (hopIndex !== 0) return false;
    const family = familyOf(address);
    // BlockList matches IPv4-mapped IPv6 (::ffff:127.0.0.1) against IPv4 ranges.
    return family !== null && list.check(address, family);
  };
}
