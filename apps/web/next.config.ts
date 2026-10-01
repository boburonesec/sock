import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Where the browser may send requests. Production: this origin (auth/TV BFF
 * routes) plus the API origin baked into the bundle via NEXT_PUBLIC_API_URL —
 * nothing else, so injected script cannot exfiltrate to arbitrary hosts.
 * Development keeps http/https/ws for HMR and LAN device testing.
 */
function connectSrc(): string {
  if (!isProduction) {
    return "'self' https: http: ws:";
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL must be set for a production build (CSP connect-src).");
  }

  return `'self' ${new URL(apiUrl).origin}`;
}

/**
 * Browser security headers for the operator web app.
 * CSP is intentionally strict for a first-party admin UI (no third-party scripts).
 */
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Inline: Next.js bootstrap scripts (no nonce). The production bundle
      // does not use eval, but browser acceptance suites evaluate predicates
      // in the page (Playwright waitForFunction); with 'unsafe-inline' already
      // required, dropping eval adds little. Tighten both together with a
      // nonce-based CSP post-V1.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src ${connectSrc()}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

// HSTS only in production builds: browsers ignore it over plain http, and the
// pilot always terminates TLS in front of the web app. No includeSubDomains —
// the operator's other subdomains may not be https-ready.
if (isProduction) {
  securityHeaders.push({ key: "Strict-Transport-Security", value: "max-age=31536000" });
}

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
