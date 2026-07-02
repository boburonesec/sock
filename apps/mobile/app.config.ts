import { type ConfigContext, type ExpoConfig } from "expo/config";

const DEFAULT_API_BASE_URL = "http://localhost:3001";

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiBaseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? DEFAULT_API_BASE_URL;

  return {
    ...config,
    name: config.name ?? "Paypoq Mobile",
    slug: config.slug ?? "paypoq-mobile",
    extra: {
      ...config.extra,
      apiBaseUrl,
      environment: process.env.APP_ENV ?? "development",
    },
  };
};

