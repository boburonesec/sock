/** Mock native host APIs only; React, Zustand, Query and app logic remain real. */
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import ts from "typescript";
import { notifyManager } from "@tanstack/react-query";
// Deterministic host scheduling: deliver Query observer notifications inside
// React act instead of relying on Node's timer/setImmediate phase ordering.
notifyManager.setScheduler(queueMicrotask);
export const mobileRoot = fileURLToPath(new URL("../", import.meta.url));
const nativeModules = new Set(["expo-constants", "expo-secure-store", "expo-router", "react-native", "react-native-safe-area-context", "@expo/vector-icons"]);
registerHooks({
  resolve(specifier, context, next) {
    if (nativeModules.has(specifier)) return { url: `native-test:${specifier}`, shortCircuit: true };
    if (specifier.startsWith("@/")) {
      const file = resolve(mobileRoot, "src", specifier.slice(2));
      return { url: pathToFileURL(existsSync(`${file}.ts`) ? `${file}.ts` : `${file}.tsx`).href, shortCircuit: true };
    }
    return next(specifier, context.parentURL?.startsWith("native-test:") ? { ...context, parentURL: import.meta.url } : context);
  },
  load(url, context, next) {
    let source;
    if (url === "native-test:expo-constants") source = 'export default { expoConfig: { extra: { apiBaseUrl: process.env.CONTEXT_API_URL || "https://context.test" } } };';
    if (url === "native-test:expo-secure-store") source = 'export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = "device"; export async function getItemAsync(key) { return globalThis.__nativeSecureAdapter?.getItemAsync(key) ?? null; } export async function setItemAsync(key, value) { await globalThis.__nativeSecureAdapter?.setItemAsync(key, value); } export async function deleteItemAsync(key) { await globalThis.__nativeSecureAdapter?.deleteItemAsync(key); }';
    if (url === "native-test:expo-router") source = `
      import React from "react";
      export const useRouter = () => globalThis.__contextRouter;
      export const usePathname = () => {
        const router = globalThis.__contextRouter;
        return React.useSyncExternalStore(router.subscribe, () => router.pathname);
      };
      export const useLocalSearchParams = () => globalThis.__contextRouter.params;
      export const Link = ({ children }) => children;
    `;
    if (url === "native-test:react-native") source = `
      import React from "react";
      export const FlatList="FlatList", View="View", Text="Text", Pressable="Pressable", ScrollView="ScrollView", TextInput="TextInput", ActivityIndicator="ActivityIndicator", KeyboardAvoidingView="KeyboardAvoidingView", RefreshControl="RefreshControl";
      export const Modal = ({ visible, children, ...props }) => visible ? React.createElement("Modal", props, children) : null;
      export const Platform = { OS: "ios", select: (values) => values.ios ?? values.default };
      export const StyleSheet = { create: (value) => value, absoluteFillObject: {} };
      export const AppState = { addEventListener: (_, callback) => { globalThis.__appStateListener = callback; return { remove() {} }; } };
      export const useWindowDimensions = () => ({ width: 390, height: 844 });
    `;
    if (url === "native-test:react-native-safe-area-context") source = 'export const SafeAreaView="SafeAreaView"; export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});';
    if (url === "native-test:@expo/vector-icons") source = 'export const Ionicons="Icon";';
    if (source !== undefined) return { format: "module", source, shortCircuit: true };
    if (url.startsWith("file:") && url.endsWith(".tsx")) {
      const file = fileURLToPath(url);
      return { format: "module", source: ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    }
    return next(url, context);
  },
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export const response = (status, data) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
export function router(pathname = "/home", params = {}) {
  const listeners = new Set();
  const value = {
    pathname, params, replacements: [],
    subscribe(callback) { listeners.add(callback); return () => listeners.delete(callback); },
    replace(path) { value.replacements.push(path); value.pathname = path.replace("/(app)", ""); value.params = {}; for (const listener of listeners) listener(); },
    push() {}, back() {}, canGoBack() { return true; },
  };
  globalThis.__contextRouter = value;
  return value;
}
