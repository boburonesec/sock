// Client-IP trust for the auth rate limiter (run `pnpm build` first).
// Exercises Express's real `req.ip` getter — the same Express copy Nest uses —
// with the compiled TRUSTED_PROXIES trust function, so peers on any address
// (public, LAN, container network) can be modelled without real sockets.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createTrustedProxyFn, parseTrustedProxies, DEFAULT_TRUSTED_PROXIES } = require('../dist/src/common/trusted-proxy.js');
const { validateEnvironment } = require('../dist/src/config/env.validation.js');
const express = createRequire(require.resolve('@nestjs/platform-express'))('express');

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

/** Express req.ip for a socket peer + headers under a TRUSTED_PROXIES spec. */
function ipFor(spec, remoteAddress, headers = {}) {
  const app = express();
  app.set('trust proxy', createTrustedProxyFn(spec));
  const socket = { remoteAddress };
  const req = Object.create(app.request);
  req.app = app;
  req.socket = socket;
  req.connection = socket;
  req.headers = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return req.ip;
}

const PM2 = 'loopback';
const COMPOSE = 'loopback,uniquelocal';
const xff = (value) => ({ 'X-Forwarded-For': value });

check('default trust is loopback only', () => {
  assert.equal(DEFAULT_TRUSTED_PROXIES, 'loopback');
});

check('spec parsing: keywords, IPs, CIDRs, IPv6, IPv4-mapped', () => {
  const list = parseTrustedProxies('loopback, 172.30.0.0/16, 2001:db8::/32, 198.51.100.7');
  assert.equal(list.check('127.0.0.1', 'ipv4'), true);
  assert.equal(list.check('::1', 'ipv6'), true);
  assert.equal(list.check('::ffff:127.0.0.1', 'ipv6'), true);
  assert.equal(list.check('172.30.9.9', 'ipv4'), true);
  assert.equal(list.check('172.31.0.1', 'ipv4'), false);
  assert.equal(list.check('2001:db8::5', 'ipv6'), true);
  assert.equal(list.check('198.51.100.7', 'ipv4'), true);
  assert.equal(list.check('198.51.100.8', 'ipv4'), false);
});

check('invalid TRUSTED_PROXIES entries are rejected (and fail env validation)', () => {
  for (const spec of ['', ' , ', 'everything', '*', '10.0.0.0/33', '10.0.0.0/x', '300.1.1.1', 'fc00::/129', '1']) {
    assert.throws(() => parseTrustedProxies(spec), /TRUSTED_PROXIES/, JSON.stringify(spec));
  }
  assert.throws(() => validateEnvironment({ TRUSTED_PROXIES: 'everything' }), /TRUSTED_PROXIES contains an invalid entry/);
  assert.doesNotThrow(() => validateEnvironment({ TRUSTED_PROXIES: 'loopback,uniquelocal' }));
});

check('direct public client cannot forge its IP (any spec)', () => {
  for (const spec of [PM2, COMPOSE]) {
    assert.equal(ipFor(spec, '203.0.113.77', xff('198.51.100.1')), '203.0.113.77');
    assert.equal(ipFor(spec, '::ffff:203.0.113.77', xff('198.51.100.1')), '::ffff:203.0.113.77');
    assert.equal(ipFor(spec, '2001:db8::77', xff('198.51.100.1')), '2001:db8::77');
  }
});

check('direct LAN client is not a trusted proxy under the loopback default (PM2)', () => {
  assert.equal(ipFor(PM2, '192.168.1.50', xff('198.51.100.1')), '192.168.1.50');
  assert.equal(ipFor(PM2, '10.0.0.8', xff('198.51.100.1')), '10.0.0.8');
});

check('rotating X-Forwarded-For from a direct client keeps one identity', () => {
  for (const [spec, peer] of [[PM2, '203.0.113.77'], [PM2, '192.168.1.50'], [COMPOSE, '203.0.113.77']]) {
    const identities = new Set();
    for (let i = 0; i < 20; i += 1) identities.add(ipFor(spec, peer, xff(`198.51.100.${i}`)));
    assert.deepEqual([...identities], [peer], `${spec} ${peer}`);
  }
});

check('PM2: nginx/web on loopback supply the client IP', () => {
  assert.equal(ipFor(PM2, '127.0.0.1', xff('203.0.113.5')), '203.0.113.5');
  assert.equal(ipFor(PM2, '::1', xff('203.0.113.5')), '203.0.113.5');
  assert.equal(ipFor(PM2, '::ffff:127.0.0.1', xff('203.0.113.5')), '203.0.113.5');
});

check('compose: web container and host proxy (network gateway) supply the client IP', () => {
  assert.equal(ipFor(COMPOSE, '172.18.0.4', xff('203.0.113.5')), '203.0.113.5');
  assert.equal(ipFor(COMPOSE, '172.18.0.1', xff('203.0.113.5')), '203.0.113.5');
});

check('exactly one hop: caller-supplied entries left of the proxy-added one never win', () => {
  assert.equal(ipFor(PM2, '127.0.0.1', xff('203.0.113.99, 192.168.1.20')), '192.168.1.20');
  assert.equal(ipFor(COMPOSE, '172.18.0.4', xff('10.9.9.9, 203.0.113.5')), '203.0.113.5');
});

check('distinct clients behind the proxy keep distinct identities', () => {
  assert.notEqual(ipFor(PM2, '127.0.0.1', xff('203.0.113.5')), ipFor(PM2, '127.0.0.1', xff('203.0.113.6')));
});

check('trusted peer without forwarding header is its own identity', () => {
  assert.equal(ipFor(PM2, '127.0.0.1'), '127.0.0.1');
});

check('X-Real-IP never influences the identity', () => {
  assert.equal(ipFor(PM2, '203.0.113.77', { 'X-Real-IP': '198.51.100.1' }), '203.0.113.77');
  assert.equal(ipFor(PM2, '127.0.0.1', { 'X-Real-IP': '198.51.100.1' }), '127.0.0.1');
});

check('malformed peer addresses are never trusted', () => {
  const trust = createTrustedProxyFn(COMPOSE);
  for (const address of ['', 'not-an-ip', '127.0.0.1:80', undefined]) {
    assert.equal(trust(address, 0), false, String(address));
  }
});

console.log(`trusted proxy: ${passed} passed, 0 failed`);
