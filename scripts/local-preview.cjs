const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "dist");
const portArg = process.argv.indexOf("--port");
const hostArg = process.argv.indexOf("--host");
const port = Number((portArg >= 0 && process.argv[portArg + 1]) || process.env.PORT || 5173);
const host = (hostArg >= 0 && process.argv[hostArg + 1]) || process.env.HOST || "0.0.0.0";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

const zlib = require("node:zlib");

function send(request, response, status, body, type = "text/plain; charset=utf-8", isImmutable = false) {
  const acceptEncoding = request.headers["accept-encoding"] || "";
  const isCompressible = /text|javascript|json|svg/.test(type);

  if (isCompressible && acceptEncoding.includes("gzip")) {
    zlib.gzip(body, (err, compressed) => {
      if (err) {
        response.writeHead(status, {
          "Content-Type": type,
          "Cache-Control": isImmutable ? "public, max-age=31536000, immutable" : "no-cache"
        });
        response.end(body);
        return;
      }
      response.writeHead(status, {
        "Content-Type": type,
        "Content-Encoding": "gzip",
        "Cache-Control": isImmutable ? "public, max-age=31536000, immutable" : "no-cache"
      });
      response.end(compressed);
    });
    return;
  }

  response.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": isImmutable ? "public, max-age=31536000, immutable" : "no-cache"
  });
  response.end(body);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);
  const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const requested = path.resolve(root, cleanPath || "index.html");
  const safePath = requested.startsWith(root) ? requested : path.join(root, "index.html");
  const filePath = fs.existsSync(safePath) && fs.statSync(safePath).isFile() ? safePath : path.join(root, "index.html");

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(request, response, 500, "Не удалось открыть сборку LunaPair.");
      return;
    }
    const isAsset = cleanPath.startsWith("assets/");
    send(request, response, 200, data, types[path.extname(filePath)] || "application/octet-stream", isAsset);
  });
});

server.listen(port, host, () => {
  console.log(`LunaPair открыт: http://${host}:${port}/`);
});
