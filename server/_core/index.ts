import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { sdk } from "./sdk";
import { storagePut } from "../storage";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.post("/api/documents/upload", express.raw({ type: () => true, limit: "20mb" }), async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) return res.status(401).json({ error: "Sign in to upload documents." });
      const contentType = (req.headers["content-type"] || "").split(";")[0];
      const allowed = new Set(["image/jpeg", "image/png", "application/pdf"]);
      if (!allowed.has(contentType)) return res.status(400).json({ error: "Use a JPG, PNG, or PDF document." });
      const body = req.body as Buffer;
      if (!body?.length) return res.status(400).json({ error: "The selected file was empty." });
      const originalName = String(req.headers["x-file-name"] || "purchase-document").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180);
      const result = await storagePut(`users/${user.id}/receipts/${originalName}`, body, contentType);
      return res.status(201).json({ ...result, fileName: originalName, mimeType: contentType });
    } catch (error) {
      console.error("[Document upload]", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Unable to store this document." });
    }
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
