const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "dist");
const portArg = process.argv.indexOf("--port");
const hostArg = process.argv.indexOf("--host");
const port = Number((portArg >= 0 && process.argv[portArg + 1]) || process.env.PORT || 5173);
const host = (hostArg >= 0 && process.argv[hostArg + 1]) || process.env.HOST || "127.0.0.1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function send(response, status, body, type = "text/plain; charset=utf-8") {
  response.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
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
      send(response, 500, "Не удалось открыть сборку LunaPair.");
      return;
    }
    send(response, 200, data, types[path.extname(filePath)] || "application/octet-stream");
  });
});

server.listen(port, host, () => {
  console.log(`LunaPair открыт: http://${host}:${port}/`);
});
