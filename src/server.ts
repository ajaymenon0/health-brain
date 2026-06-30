import http from "http";
import fs from "fs";
import path from "path";
import config from "./config";
import { publicDir } from "./generate";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

export function startServer(): void {
  const server = http.createServer((req, res) => {
    const urlPath = req.url === "/" ? "/index.html" : (req.url ?? "/index.html");

    // Prevent path traversal
    const filePath = path.resolve(publicDir, "." + urlPath);
    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // If the dashboard hasn't been generated yet, return a friendly placeholder
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Health Dashboard</title></head><body style="font-family:sans-serif;padding:2rem"><p>No dashboard generated yet. Send <code>/generate</code> in the Telegram bot.</p></body></html>`,
        );
        return;
      }

      const ext = path.extname(filePath);
      const contentType = MIME[ext] ?? "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  });

  server.listen(config.server.port, () => {
    console.log(`HTTP server listening on port ${config.server.port}`);
  });
}
