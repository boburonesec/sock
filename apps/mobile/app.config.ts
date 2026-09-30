import { type ConfigContext, type ExpoConfig } from "expo/config";

const DEFAULT_API_BASE_URL = "http://localhost:3001";
const RELEASE_ENVIRONMENTS = new Set(["staging", "production"]);

/**
 * Release builds must point at an explicit https API. A store build that
 * silently falls back to localhost (or plain http) ships a dead app, and
 * plain http would send the password and refresh cookie in clear text.
 */
function resolveApiBaseUrl(environment: string): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "");

  if (!RELEASE_ENVIRONMENTS.has(environment)) {
    return configured || DEFAULT_API_BASE_URL;
  }

  if (!configured) {
    throw new Error(`EXPO_PUBLIC_API_BASE_URL is required when APP_ENV=${environment}.`);
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error(`EXPO_PUBLIC_API_BASE_URL is not a valid URL: ${configured}`);
  }

  if (url.protocol !== "https:" || ["localhost", "127.0.0.1", "10.0.2.2"].includes(url.hostname)) {
    throw new Error(
      `EXPO_PUBLIC_API_BASE_URL must be a public https URL when APP_ENV=${environment} (got ${configured}).`,
    );
  }

  return configured;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment = process.env.APP_ENV ?? "development";
  const apiBaseUrl = resolveApiBaseUrl(environment);

  return {
    ...config,
    name: config.name ?? "Paypoq Mobile",
    slug: config.slug ?? "paypoq-mobile",
    extra: {
      ...config.extra,
      apiBaseUrl,
      environment,
    },
  };
};
