import { createAuthProxyHandler } from "@/lib/api/auth-proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const handler = createAuthProxyHandler({
  upstreamPrefix: "platform-auth",
  cookiePath: "/api/platform-auth",
});

export const GET = handler;
export const POST = handler;
