import http from "http";
import fs from "fs";
import path from "path";
import config from "./config";
import { fetchDashboardData, type Period } from "./dashboard";

const VALID_PERIODS = new Set<string>(["10", "30", "90", "year", "all"]);

const publicDir = path.join(process.cwd(), "public");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

async function handleApiData(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const userId = config.dashboard.telegramUserId;

  if (!userId) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "DASHBOARD_TELEGRAM_USER_ID is not set in environment.",
      }),
    );
    return;
  }

  const qs = new URLSearchParams((req.url ?? "").split("?")[1] ?? "");
  const rawPeriod = qs.get("period") ?? "10";
  const period: Period = VALID_PERIODS.has(rawPeriod) ? (rawPeriod as Period) : "10";
  const weekStart = qs.get("weekStart") ?? undefined;

  try {
    const data = await fetchDashboardData(userId, period, weekStart);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  } catch (err) {
    console.error("Dashboard API error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch dashboard data." }));
  }
}

function handleStatic(urlPath: string, res: http.ServerResponse): void {
  const resolved = path.resolve(publicDir, "." + urlPath);

  // Prevent path traversal
  if (!resolved.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(resolved, (err, data) => {
    if (err) {
      // Fall back to index.html for SPA routing, or show placeholder
      const indexPath = path.join(publicDir, "index.html");
      fs.readFile(indexPath, (indexErr, indexData) => {
        if (indexErr) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(
            `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Health Brain</title></head><body style="font-family:sans-serif;padding:2rem"><p>Dashboard not built yet. Run <code>npm run build</code> in the <code>frontend/</code> directory.</p></body></html>`,
          );
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(indexData);
      });
      return;
    }

    const ext = path.extname(resolved);
    const contentType = MIME[ext] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

export function startServer(): void {
  const server = http.createServer((req, res) => {
    const urlPath = req.url?.split("?")[0] ?? "/";

    if (req.method === "GET" && urlPath === "/api/data") {
      void handleApiData(req, res);
      return;
    }

    handleStatic(urlPath === "/" ? "/index.html" : urlPath, res);
  });

  server.listen(config.server.port, () => {
    console.log(`HTTP server listening on port ${config.server.port}`);
  });
}
