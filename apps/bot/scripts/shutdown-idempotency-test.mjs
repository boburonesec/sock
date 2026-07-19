import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["dist/main.js"], {
  cwd: new URL("..", import.meta.url),
  env: {
    ...process.env,
    BOT_MODE: "disabled",
    API_BASE_URL: "http://127.0.0.1:1",
    BOT_INTERNAL_API_KEY: "shutdown-test-internal-key",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
let signalsSent = false;
child.stdout.on("data", (chunk) => {
  output += chunk.toString();
  if (!signalsSent && output.includes("external polling disabled")) {
    signalsSent = true;
    child.kill("SIGTERM");
    child.kill("SIGINT");
  }
});
child.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

const exitCode = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    child.kill("SIGKILL");
    reject(new Error(`Bot did not shut down in time. Output: ${output}`));
  }, 10_000);
  child.once("exit", (code) => {
    clearTimeout(timeout);
    resolve(code);
  });
});

assert.equal(exitCode, 0, output);
assert.equal((output.match(/external polling disabled/g) ?? []).length, 1, output);
assert.equal((output.match(/bot stopping \(SIG(?:TERM|INT)\)/g) ?? []).length, 1, output);
assert.equal((output.match(/bot stopping/g) ?? []).length, 1, output);
console.log("bot shutdown idempotency: 4 passed, 0 failed");
