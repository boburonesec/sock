import { NextRequest, NextResponse } from "next/server";

/**
 * Resolves internal/external API base URL for server-side proxying.
 * Prioritizes API_INTERNAL_URL (Render private network or env),
 * falls back to NEXT_PUBLIC_API_URL or local default.
 */
export function resolveInternalApiUrl(): string {
  let url =
    process.env.API_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    (process.env.NODE_ENV === "production"
      ? "https://paypoq-api.onrender.com"
      : "http://localhost:3001");

  url = url.replace(/\/+$/, "").trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = url.includes("localhost") || url.includes("127.0.0.1")
      ? `http://${url}`
      : `https://${url}`;
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
      const isValidPath = path.every((seg) => /^[a-zA-Z0-9._-]+$/.test(seg));
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

      const forwardedFor =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip");
      if (forwardedFor) forwardHeaders.set("x-forwarded-for", forwardedFor);

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
