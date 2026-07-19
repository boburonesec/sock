import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forbiddenName = "NEXT_PUBLIC_FACTORY_TV_ACCESS_TOKEN";
const secret = process.env.FACTORY_TV_ACCESS_TOKEN?.trim();

const sourceFiles = [
  "apps/web/src/app/api/factory-tv/summary/route.ts",
  "apps/web/.env.example",
];

for (const relativePath of sourceFiles) {
  const content = await readFile(path.join(root, relativePath), "utf8");
  assert.equal(
    content.includes(forbiddenName),
    false,
    `${forbiddenName} must not appear in ${relativePath}`,
  );
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(absolutePath)));
    else files.push(absolutePath);
  }
  return files;
}

const staticDirectory = path.join(root, "apps/web/.next/static");
const staticFiles = await listFiles(staticDirectory);
for (const file of staticFiles) {
  const content = await readFile(file);
  assert.equal(
    content.includes(Buffer.from(forbiddenName)),
    false,
    `${forbiddenName} leaked into browser asset ${path.relative(root, file)}`,
  );
  if (secret) {
    assert.equal(
      content.includes(Buffer.from(secret)),
      false,
      `FACTORY_TV_ACCESS_TOKEN value leaked into browser asset ${path.relative(root, file)}`,
    );
  }
}

if (process.env.WEB_BASE_URL && secret) {
  const response = await fetch(
    `${process.env.WEB_BASE_URL.replace(/\/+$/, "")}/api/factory-tv/summary`,
  );
  const responseText = await response.text();
  assert.equal(responseText.includes(secret), false, "Factory TV proxy returned its secret");
  for (const [name, value] of response.headers) {
    assert.equal(
      `${name}: ${value}`.includes(secret),
      false,
      "Factory TV proxy exposed its secret in a response header",
    );
  }
}

console.log(
  `PASS Factory TV secret boundary (${staticFiles.length} browser assets checked${
    process.env.WEB_BASE_URL && secret ? ", live proxy checked" : ""
  })`,
);
