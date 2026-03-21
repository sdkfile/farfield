import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { UnifiedThreadSchema, type UnifiedThread } from "@farfield/unified-surface";
import {
  DevPreviewRegistry,
  enrichUnifiedThreadWithDevPreviews,
  extractLocalDevServerDetections,
  proxyDevPreviewRequest,
} from "../src/dev-preview.js";

async function startServer(
  handler: Parameters<typeof http.createServer>[0],
): Promise<http.Server> {
  const server = http.createServer(handler);
  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.once("error", reject);
  });
  return server;
}

function readServerPort(server: http.Server): number {
  const address = server.address();
  if (address == null || typeof address === "string") {
    throw new Error("Expected TCP server address");
  }
  return address.port;
}

const serversToClose: http.Server[] = [];

afterEach(async () => {
  while (serversToClose.length > 0) {
    const server = serversToClose.pop();
    if (!server) {
      continue;
    }
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
});

function createThreadWithCommandExecution(output: string): UnifiedThread {
  return UnifiedThreadSchema.parse({
    id: "thread-1",
    provider: "codex",
    turns: [
      {
        id: "turn-1",
        status: "completed",
        items: [
          {
            id: "item-1",
            type: "commandExecution",
            command: "bun run dev",
            status: "completed",
            aggregatedOutput: output,
          },
        ],
      },
    ],
    requests: [],
    latestCollaborationMode: null,
    latestModel: null,
    latestReasoningEffort: null,
  });
}

describe("extractLocalDevServerDetections", () => {
  it("extracts localhost and 127.0.0.1 URLs and dedupes by protocol and port", () => {
    const detections = extractLocalDevServerDetections(`
      \u001b[32mready\u001b[0m http://localhost:3000/
      https://127.0.0.1:3443/path
      http://localhost:3000/again
      http://example.com:3000/
    `);

    expect(detections).toEqual([
      { protocol: "http", port: 3000 },
      { protocol: "https", port: 3443 },
    ]);
  });
});

describe("DevPreviewRegistry", () => {
  it("reuses the same port entry and preserves firstSeenAt", async () => {
    const registry = new DevPreviewRegistry({
      probePortStatus: async () => true,
    });

    const firstEntries = await registry.registerDetections({
      detections: [{ protocol: "http", port: 3000 }],
      sourceThreadId: "thread-1",
      sourceItemId: "item-1",
    });
    const secondEntries = await registry.registerDetections({
      detections: [{ protocol: "http", port: 3000 }],
      sourceThreadId: "thread-1",
      sourceItemId: "item-2",
    });

    expect(firstEntries[0]?.firstSeenAt).toBe(secondEntries[0]?.firstSeenAt);
    expect(secondEntries[0]?.sourceItemId).toBe("item-2");
    expect(secondEntries[0]?.status).toBe("online");
  });

  it("updates status when the target later becomes offline", async () => {
    let reachable = true;
    const registry = new DevPreviewRegistry({
      probePortStatus: async () => reachable,
    });

    await registry.registerDetections({
      detections: [{ protocol: "http", port: 3001 }],
      sourceThreadId: "thread-1",
      sourceItemId: "item-1",
    });

    reachable = false;
    const refreshedEntry = await registry.refreshEntry(3001);

    expect(refreshedEntry?.status).toBe("offline");
  });
});

describe("enrichUnifiedThreadWithDevPreviews", () => {
  it("adds an openDevPreview action for detected localhost output", async () => {
    const registry = new DevPreviewRegistry({
      previewPrefix: "/__preview",
      probePortStatus: async () => true,
    });
    const thread = createThreadWithCommandExecution(
      "ready on http://localhost:3000/",
    );

    const enrichedThread = await enrichUnifiedThreadWithDevPreviews(
      thread,
      registry,
    );
    const commandItem = enrichedThread.turns[0]?.items[0];

    expect(commandItem?.type).toBe("commandExecution");
    if (commandItem?.type !== "commandExecution") {
      throw new Error("Expected commandExecution item");
    }

    expect(commandItem.commandActions).toEqual([
      {
        type: "openDevPreview",
        name: "Open preview (HTTP :3000)",
        path: "/__preview/3000/",
        port: 3000,
        status: "online",
      },
    ]);
  });
});

describe("proxyDevPreviewRequest", () => {
  it("proxies registered previews and rewrites HTML asset paths", async () => {
    const upstream = await startServer((_req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
      });
      res.end(
        "<html><head></head><body><script type=\"module\" src=\"/@vite/client\"></script></body></html>",
      );
    });
    serversToClose.push(upstream);
    const upstreamPort = readServerPort(upstream);

    const registry = new DevPreviewRegistry({
      previewPrefix: "/__preview",
      probePortStatus: async () => true,
    });
    await registry.registerDetections({
      detections: [{ protocol: "http", port: upstreamPort }],
      sourceThreadId: "thread-1",
      sourceItemId: "item-1",
    });

    const proxy = await startServer(async (req, res) => {
      const handled = await proxyDevPreviewRequest({
        req,
        res,
        registry,
        previewPrefix: "/__preview",
      });
      if (!handled) {
        res.writeHead(404);
        res.end("not found");
      }
    });
    serversToClose.push(proxy);
    const proxyPort = readServerPort(proxy);

    const response = await fetch(
      `http://127.0.0.1:${String(proxyPort)}/__preview/${String(upstreamPort)}/`,
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain(`<base href="/__preview/${String(upstreamPort)}/">`);
    expect(body).toContain(
      `src="/__preview/${String(upstreamPort)}/@vite/client"`,
    );
  });

  it("returns 404 for unregistered ports", async () => {
    const registry = new DevPreviewRegistry({
      previewPrefix: "/__preview",
      probePortStatus: async () => true,
    });
    const proxy = await startServer(async (req, res) => {
      const handled = await proxyDevPreviewRequest({
        req,
        res,
        registry,
        previewPrefix: "/__preview",
      });
      if (!handled) {
        res.writeHead(404);
        res.end("not found");
      }
    });
    serversToClose.push(proxy);
    const proxyPort = readServerPort(proxy);

    const response = await fetch(
      `http://127.0.0.1:${String(proxyPort)}/__preview/3999/`,
    );

    expect(response.status).toBe(404);
  });

  it("returns 502 when a registered port goes offline", async () => {
    let reachable = true;
    const registry = new DevPreviewRegistry({
      previewPrefix: "/__preview",
      probePortStatus: async () => reachable,
    });
    await registry.registerDetections({
      detections: [{ protocol: "http", port: 3555 }],
      sourceThreadId: "thread-1",
      sourceItemId: "item-1",
    });
    reachable = false;

    const proxy = await startServer(async (req, res) => {
      const handled = await proxyDevPreviewRequest({
        req,
        res,
        registry,
        previewPrefix: "/__preview",
      });
      if (!handled) {
        res.writeHead(404);
        res.end("not found");
      }
    });
    serversToClose.push(proxy);
    const proxyPort = readServerPort(proxy);

    const response = await fetch(
      `http://127.0.0.1:${String(proxyPort)}/__preview/3555/`,
    );

    expect(response.status).toBe(502);
  });
});
