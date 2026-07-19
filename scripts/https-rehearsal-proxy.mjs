import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";

const port = Number(process.env.HTTPS_REHEARSAL_PORT || 34443);
const webHost = process.env.HTTPS_WEB_HOST || "web.paypoq.test";
const apiHost = process.env.HTTPS_API_HOST || "api.paypoq.test";
const webPort = Number(process.env.HTTPS_WEB_UPSTREAM_PORT || 3100);
const apiPort = Number(process.env.HTTPS_API_UPSTREAM_PORT || 3101);
const certPath = process.env.HTTPS_CERT_PATH;
const keyPath = process.env.HTTPS_KEY_PATH;

if (!certPath || !keyPath) throw new Error("HTTPS_CERT_PATH and HTTPS_KEY_PATH are required");

const server = https.createServer(
  { cert: readFileSync(certPath), key: readFileSync(keyPath) },
  (request, response) => {
    const hostname = (request.headers.host ?? "").split(":")[0];
    const upstreamPort = hostname === apiHost ? apiPort : hostname === webHost ? webPort : null;
    if (!upstreamPort) {
      response.writeHead(421, { "content-type": "text/plain" });
      response.end("Unknown rehearsal host");
      return;
    }
    const headers = { ...request.headers, host: `127.0.0.1:${upstreamPort}` };
    headers["x-forwarded-host"] = request.headers.host;
    headers["x-forwarded-proto"] = "https";
    const proxy = http.request(
      { host: "127.0.0.1", port: upstreamPort, method: request.method, path: request.url, headers },
      (upstream) => {
        response.writeHead(upstream.statusCode ?? 502, upstream.headers);
        upstream.pipe(response);
      },
    );
    proxy.on("error", (error) => {
      response.writeHead(502, { "content-type": "text/plain" });
      response.end(`Rehearsal upstream unavailable: ${error.message}`);
    });
    request.pipe(proxy);
  },
);

let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  server.close(() => process.exit(0));
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
server.listen(port, "127.0.0.1", () => {
  console.log(`HTTPS rehearsal proxy ready on 127.0.0.1:${port}`);
});
