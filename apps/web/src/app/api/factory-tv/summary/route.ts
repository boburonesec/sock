import { NextRequest, NextResponse } from "next/server";
import { resolveInternalApiUrl } from "@/lib/api/auth-proxy";

/**
 * Server-side Factory TV proxy.
 *
 * Each factory now carries its own token in the page URL (?token=...,
 * generated per-factory in Sozlamalar) — this route only ever forwards it to
 * the API, never the browser bundle. With no token param it falls back to
 * the legacy shared FACTORY_TV_ACCESS_TOKEN (single-tenant/dev deployments;
 * the API resolves that one to whichever single factory it can identify).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

function resolveApiBaseUrl(): string {
  return resolveInternalApiUrl();
}

function resolveFactoryTvToken(requestToken: string | null): string {
  const token = requestToken?.trim() || process.env.FACTORY_TV_ACCESS_TOKEN?.trim();

  if (!token) {
    throw new Error(
      "No Factory TV token in the URL, and FACTORY_TV_ACCESS_TOKEN is not configured on the web server.",
    );
  }

  return token;
}

export async function GET(request: NextRequest) {
  try {
    const apiBase = resolveApiBaseUrl();
    const token = resolveFactoryTvToken(request.nextUrl.searchParams.get("token"));

    const upstream = await fetch(`${apiBase}/dashboard/factory-tv-summary`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Factory-TV-Token": token,
      },
      cache: "no-store",
    });

    const bodyText = await upstream.text();
    let body: unknown = null;

    if (bodyText) {
      try {
        body = JSON.parse(bodyText) as unknown;
      } catch {
        body = { message: bodyText };
      }
    }

    return NextResponse.json(body ?? { message: upstream.statusText }, {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Factory TV proxy failed unexpectedly.";

    return NextResponse.json(
      { message, error: "Factory TV configuration error" },
      { status: 500 },
    );
  }
}
