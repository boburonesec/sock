import { NextResponse } from "next/server";

/**
 * Server-side Factory TV proxy.
 * Keeps FACTORY_TV_ACCESS_TOKEN off the browser bundle (no NEXT_PUBLIC required).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

function resolveApiBaseUrl(): string {
  const base =
    process.env.API_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!base) {
    throw new Error(
      "API_INTERNAL_URL or NEXT_PUBLIC_API_URL must be configured for Factory TV.",
    );
  }

  return base.replace(/\/+$/, "");
}

function resolveFactoryTvToken(): string {
  const token = process.env.FACTORY_TV_ACCESS_TOKEN?.trim();

  if (!token) {
    throw new Error(
      "FACTORY_TV_ACCESS_TOKEN is not configured on the web server.",
    );
  }

  return token;
}

export async function GET() {
  try {
    const apiBase = resolveApiBaseUrl();
    const token = resolveFactoryTvToken();

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
