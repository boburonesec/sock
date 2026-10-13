/// <reference types="expo/types" />

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_PILOT_SCOPE_MODE?: string;
    APP_ENV?: "development" | "staging" | "production";
  }
}

