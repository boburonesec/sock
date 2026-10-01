import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

/**
 * Resolves internal/external API base URL for server-side proxying.
 * Prioritizes API_INTERNAL_URL (Render private network or env),
 * falls back to NEXT_PUBLIC_API_URL or local default.
 */
export function resolveInternalApiUrl(): string {
  const configured =
    process.env.API_INTERNAL_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();

  // Production must be told explicitly where the API is. There is no hosted
  // fallback: a misconfigured deployment must fail loudly rather than proxy
  // operator credentials to an unintended host.
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "API_INTERNAL_URL (or NEXT_PUBLIC_API_URL) must be set in production.",
      );
    }

    return "http://localhost:3001";
  }

  let url = configured.replace(/\/+$/, "").trim();

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    const isLocal = url.startsWith("localhost") || url.startsWith("127.0.0.1");

    if (!isLocal && process.env.NODE_ENV === "production") {
      throw new Error(
        "API_INTERNAL_URL must be an absolute http(s) URL in production.",
      );
    }

    url = isLocal ? `http://${url}` : `https://${url}`;
  }

  return url;
}

/**
 * Rewrites upstream Set-Cookie header into a first-party cookie for the web domain:
 * 1. Strips upstream Domain attribute (making it strictly host-only first-party).
 * 2. Rewrites Path attribute to targetPath (e.g. /api/auth or /api/platform-auth).
 * 3. Enforces SameSite=Lax (first-party standard, immune to Safari ITP).
 * 4. Ensures HttpOnly is present.
 * 5. Configures Secure attribute based on HTTPS/production.
 * 6. Strips Partitioned attribute (only needed for third-party cross-site cookies).
 */
export function rewriteSetCookie(
  rawCookie: string,
  targetPath: string,
  isSecure: boolean,
): string {
  let cookie = rawCookie.trim();
  if (!cookie) return "";

  // Strip upstream domain so cookie is host-only (first-party to web origin)
  cookie = cookie.replace(/Domain=[^;]+;?\s*/gi, "");

  // Rewrite or append Path
  if (/Path=[^;]+/i.test(cookie)) {
    cookie = cookie.replace(/Path=[^;]+/i, `Path=${targetPath}`);
  } else {
    cookie += `; Path=${targetPath}`;
  }

  // Rewrite SameSite to Lax (first-party)
  if (/SameSite=[^;]+/i.test(cookie)) {
    cookie = cookie.replace(/SameSite=[^;]+/i, "SameSite=Lax");
  } else {
    cookie += "; SameSite=Lax";
  }

  // Ensure HttpOnly
  if (!/HttpOnly/i.test(cookie)) {
    cookie += "; HttpOnly";
  }

  // Configure Secure
  if (isSecure) {
    if (!/Secure/i.test(cookie)) {
      cookie += "; Secure";
    }
  } else {
    cookie = cookie.replace(/;\s*Secure/gi, "");
  }

  // Strip Partitioned
  cookie = cookie.replace(/;\s*Partitioned/gi, "");

  return cookie.trim();
}

const PROXY_PATH_SEGMENT = /^[a-zA-Z0-9._-]+$/;

/**
 * A proxied auth path segment must use the allow-listed characters and must
 * not be a dot segment. `.` and `..` would pass the character check, and the
 * upstream URL is built by concatenation and then normalized by `fetch`, so an
 * accepted `..` would escape the fixed upstream prefix (e.g. `/auth/..` → `/`).
 * Next.js currently normalizes dot segments before routing; this is the
 * handler's own guarantee, independent of the framework. `%` is not allowed,
 * so encoded dots (`%2e`) cannot survive to the upstream URL either.
 */
export function isSafeProxyPathSegment(segment: string): boolean {
  return segment !== "." && segment !== ".." && PROXY_PATH_SEGMENT.test(segment);
}

/**
 * The client IP to hand to the API, which keys its auth rate limiter on it.
 *
 * Incoming forwarding headers are untrusted input. The value is usable only
 * because of the deployment boundary: the web tier is reachable solely through
 * the reverse proxy (compose publishes it on 127.0.0.1, PM2 binds 127.0.0.1),
 * and that proxy overwrites X-Forwarded-For with the socket address it saw
 * (nginx example: `X-Forwarded-For $remote_addr`). With no header, Next.js
 * sets it from its own socket. Only the rightmost entry is taken, so a proxy
 * that appends instead of overwriting still yields the address it added;
 * earlier entries are never forwarded. Other topologies must verify these
 * properties before relying on this value.
 * X-Real-IP is deliberately ignored: not every proxy overwrites it. Values
 * that are not an IP address are dropped.
 */
export function resolveForwardedClientIp(headers: Headers): string | null {
  const candidate = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();

  return candidate && isIP(candidate) ? candidate : null;
}

interface AuthProxyOptions {
  upstreamPrefix: "auth" | "platform-auth";
  cookiePath: string;
}

export function createAuthProxyHandler(options: AuthProxyOptions) {
  return async function handleAuthProxy(
    request: NextRequest,
    context: { params: Promise<{ path?: string[] }> },
  ): Promise<NextResponse> {
    try {
      const { path = [] } = await context.params;

      // Validate path segments to prevent path traversal or SSRF
      const isValidPath = path.every(isSafeProxyPathSegment);
      if (!isValidPath) {
        return NextResponse.json(
          { message: "Noto‘g‘ri so‘rov manzili" },
          { status: 400 },
        );
      }

      const apiBase = resolveInternalApiUrl();
      const pathSuffix = path.length > 0 ? `/${path.join("/")}` : "";
      const search = request.nextUrl.search || "";
      const upstreamUrl = `${apiBase}/${options.upstreamPrefix}${pathSuffix}${search}`;

      const forwardHeaders = new Headers();
      forwardHeaders.set("Accept", "application/json");

      const contentType = request.headers.get("content-type");
      if (contentType) forwardHeaders.set("content-type", contentType);

      const authorization = request.headers.get("authorization");
      if (authorization) forwardHeaders.set("authorization", authorization);

      const factoryId = request.headers.get("x-factory-id");
      if (factoryId) forwardHeaders.set("x-factory-id", factoryId);

      const cookie = request.headers.get("cookie");
      if (cookie) forwardHeaders.set("cookie", cookie);

      const userAgent = request.headers.get("user-agent");
      if (userAgent) forwardHeaders.set("user-agent", userAgent);

      const clientIp = resolveForwardedClientIp(request.headers);
      if (clientIp) forwardHeaders.set("x-forwarded-for", clientIp);

      const method = request.method.toUpperCase();
      let body: string | undefined = undefined;

      if (["POST", "PUT", "PATCH"].includes(method)) {
        body = await request.text();
      }

      const upstreamResponse = await fetch(upstreamUrl, {
        method,
        headers: forwardHeaders,
        body: body && body.length > 0 ? body : undefined,
        cache: "no-store",
      });

      const responseBody = await upstreamResponse.text();
      const responseHeaders = new Headers();

      const upstreamContentType = upstreamResponse.headers.get("content-type");
      if (upstreamContentType) {
        responseHeaders.set("content-type", upstreamContentType);
      }
      responseHeaders.set("cache-control", "no-store");

      const proto =
        request.headers.get("x-forwarded-proto") ||
        request.nextUrl.protocol.replace(":", "");
      const isSecure = proto === "https";

      const rawCookies =
        typeof upstreamResponse.headers.getSetCookie === "function"
          ? upstreamResponse.headers.getSetCookie()
          : ([upstreamResponse.headers.get("set-cookie")].filter(Boolean) as string[]);

      for (const rawCookie of rawCookies) {
        const rewritten = rewriteSetCookie(rawCookie, options.cookiePath, isSecure);
        if (rewritten) {
          responseHeaders.append("set-cookie", rewritten);
        }

        // If upstream is expiring/clearing a cookie (e.g. on logout), also clear legacy paths
        const isClearing =
          /Expires=Thu, 01 Jan 1970/i.test(rawCookie) ||
          /Max-Age=0/i.test(rawCookie) ||
          /=\s*;/i.test(rawCookie);

        if (isClearing) {
          const clearLegacyAuth = rewriteSetCookie(rawCookie, `/${options.upstreamPrefix}`, isSecure);
          if (clearLegacyAuth) {
            responseHeaders.append("set-cookie", clearLegacyAuth);
          }
          const clearRoot = rewriteSetCookie(rawCookie, "/", isSecure);
          if (clearRoot) {
            responseHeaders.append("set-cookie", clearRoot);
          }
        }
      }

      return new NextResponse(responseBody, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error(`[Auth Proxy Error: ${options.upstreamPrefix}]`, error);
      return NextResponse.json(
        {
          message: "Serverga ulanishda xatolik yuz berdi. Keyinroq urinib ko‘ring.",
        },
        { status: 502 },
      );
    }
  };
}
