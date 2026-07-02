import Constants from "expo-constants";

export interface MobileEnv {
  apiBaseUrl: string;
  environment: "development" | "staging" | "production";
}

function readExtraValue(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra;
  const value = extra?.[key];

  return typeof value === "string" ? value : undefined;
}

export function getMobileEnv(): MobileEnv {
  const apiBaseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    readExtraValue("apiBaseUrl") ??
    "http://localhost:3001";

  const environment = process.env.APP_ENV ?? readExtraValue("environment") ?? "development";

  if (!["development", "staging", "production"].includes(environment)) {
    throw new Error(`Unsupported APP_ENV value: ${environment}`);
  }

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/+$/, ""),
    environment: environment as MobileEnv["environment"],
  };
}

