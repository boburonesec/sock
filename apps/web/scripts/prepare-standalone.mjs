import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneWeb = join(webRoot, ".next", "standalone", "apps", "web");
const staticSrc = join(webRoot, ".next", "static");
const publicSrc = join(webRoot, "public");

if (!existsSync(standaloneWeb)) {
  console.warn(
    "[prepare-standalone] standalone output missing; skip static copy.",
  );
  process.exit(0);
}

const staticDest = join(standaloneWeb, ".next", "static");
mkdirSync(dirname(staticDest), { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });

if (existsSync(publicSrc)) {
  cpSync(publicSrc, join(standaloneWeb, "public"), { recursive: true });
}

console.log("[prepare-standalone] static + public copied for standalone start.");
