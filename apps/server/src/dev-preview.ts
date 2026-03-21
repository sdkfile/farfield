import http, {
  type IncomingMessage,
  type OutgoingHttpHeaders,
  type ServerResponse,
} from "node:http";
import https from "node:https";
import net from "node:net";
import type { Duplex } from "node:stream";
import { z } from "zod";
import {
  UnifiedThreadSchema,
  type UnifiedThread,
} from "@farfield/unified-surface";

const LocalDevPreviewProtocolSchema = z.enum(["http", "https"]);
export type LocalDevPreviewProtocol = z.infer<
  typeof LocalDevPreviewProtocolSchema
>;

export const DevPreviewStatusSchema = z.enum(["online", "offline"]);
export type DevPreviewStatus = z.infer<typeof DevPreviewStatusSchema>;

const DevPreviewPortSchema = z.number().int().min(1).max(65535);

const DetectedLocalDevServerSchema = z
  .object({
    protocol: LocalDevPreviewProtocolSchema,
    port: DevPreviewPortSchema,
  })
  .strict();
export type DetectedLocalDevServer = z.infer<
  typeof DetectedLocalDevServerSchema
>;

export const DevPreviewRegistryEntrySchema = z
  .object({
    port: DevPreviewPortSchema,
    protocol: LocalDevPreviewProtocolSchema,
    sourceThreadId: z.string().min(1),
    sourceItemId: z.string().min(1),
    firstSeenAt: z.string().min(1),
    lastSeenAt: z.string().min(1),
    status: DevPreviewStatusSchema,
  })
  .strict();
export type DevPreviewRegistryEntry = z.infer<
  typeof DevPreviewRegistryEntrySchema
>;

const DevPreviewMatchSchema = z
  .object({
    port: DevPreviewPortSchema,
    upstreamPath: z.string().min(1),
    canonicalPath: z.string().min(1),
    shouldRedirectToCanonicalPath: z.boolean(),
  })
  .strict();
export type DevPreviewMatch = z.infer<typeof DevPreviewMatchSchema>;

const CommandExecutionItemSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("commandExecution"),
    command: z.string(),
    status: z.string().min(1),
    commandActions: z
      .array(
        z
          .union([
            z
              .object({
                type: z.literal("openDevPreview"),
                name: z.string().min(1),
                path: z.string().min(1),
                port: DevPreviewPortSchema,
                status: DevPreviewStatusSchema,
              })
              .strict(),
            z
              .object({
                type: z.string().min(1),
                command: z.string().optional(),
                name: z.string().optional(),
                path: z.union([z.string(), z.null()]).optional(),
                query: z.string().optional(),
              })
              .strict(),
          ])
          .refine((action) => action.type !== "", {
            message: "Command action type must not be empty",
          }),
      )
      .optional(),
    aggregatedOutput: z.union([z.string(), z.null()]).optional(),
    exitCode: z.union([z.number().int(), z.null()]).optional(),
    durationMs: z.union([z.number().int().nonnegative(), z.null()]).optional(),
    cwd: z.string().optional(),
    processId: z.string().optional(),
  })
  .strict();

type UnifiedCommandExecutionItem = z.infer<typeof CommandExecutionItemSchema>;

const ANSI_ESCAPE_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g;
const LOCALHOST_URL_PATTERN =
  /\b(https?):\/\/(?:localhost|127\.0\.0\.1):(\d{1,5})(?:\/[^\s"'<>)]*)?/gi;
const HTML_CONTENT_TYPE_PATTERN = /\btext\/html\b/i;
const ROOT_RELATIVE_ATTRIBUTE_PATTERN =
  /((?:src|href|action)=["'])\/(?!\/)([^"'#][^"']*)/gi;

export interface DevPreviewProxyOptions {
  previewPrefix: string;
}

export interface DevPreviewRegistryOptions {
  previewPrefix?: string;
  probeTimeoutMs?: number;
  probePortStatus?: (port: number) => Promise<boolean>;
}

export function normalizeDevPreviewPrefix(input: string | undefined): string {
  const rawValue = input ?? "/__preview";
  const trimmed = rawValue.trim();
  const withLeadingSlash =
    trimmed.length === 0
      ? "/__preview"
      : trimmed.startsWith("/")
        ? trimmed
        : `/${trimmed}`;
  if (withLeadingSlash === "/") {
    return "/__preview";
  }
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

function stripAnsiSequences(input: string): string {
  return input.replace(ANSI_ESCAPE_PATTERN, "");
}

function isHtmlResponse(
  contentTypeHeader: string | string[] | undefined,
): boolean {
  if (typeof contentTypeHeader === "string") {
    return HTML_CONTENT_TYPE_PATTERN.test(contentTypeHeader);
  }
  if (Array.isArray(contentTypeHeader)) {
    return contentTypeHeader.some((value) =>
      HTML_CONTENT_TYPE_PATTERN.test(value),
    );
  }
  return false;
}

function serializeHeaderValue(value: string | string[]): string {
  return Array.isArray(value) ? value.join(", ") : value;
}

function buildPreviewPath(
  previewPrefix: string,
  port: number,
  upstreamPath: string,
): string {
  const normalizedPrefix = normalizeDevPreviewPrefix(previewPrefix);
  const sanitizedUpstreamPath =
    upstreamPath === "/" ? "" : upstreamPath.replace(/^\/+/, "");
  if (sanitizedUpstreamPath.length === 0) {
    return `${normalizedPrefix}/${String(port)}/`;
  }
  return `${normalizedPrefix}/${String(port)}/${sanitizedUpstreamPath}`;
}

function rewriteHtmlForPreview(
  html: string,
  previewPrefix: string,
  port: number,
): string {
  const previewRoot = buildPreviewPath(previewPrefix, port, "/");
  const previewRootWithoutLeadingSlash = previewRoot.replace(/^\/+/, "");
  const baseTag = `<base href="${previewRoot}">`;
  const withBase = /<base\s/i.test(html)
    ? html
    : html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);

  return withBase.replace(
    ROOT_RELATIVE_ATTRIBUTE_PATTERN,
    (match, prefix: string, pathRemainder: string) => {
      if (pathRemainder.startsWith(previewRootWithoutLeadingSlash)) {
        return match;
      }
      return `${prefix}${buildPreviewPath(previewPrefix, port, pathRemainder)}`;
    },
  );
}

function rewriteLocationHeader(
  location: string,
  entry: DevPreviewRegistryEntry,
  previewPrefix: string,
): string {
  if (location.startsWith("/")) {
    return buildPreviewPath(previewPrefix, entry.port, location);
  }

  try {
    const parsed = new URL(location);
    if (
      parsed.hostname !== "localhost" &&
      parsed.hostname !== "127.0.0.1"
    ) {
      return location;
    }

    const parsedPort = parsed.port.length > 0 ? Number(parsed.port) : null;
    if (parsedPort !== entry.port) {
      return location;
    }

    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return buildPreviewPath(previewPrefix, entry.port, path);
  } catch {
    return location;
  }
}

function sanitizeProxyRequestHeaders(
  headers: IncomingMessage["headers"],
  port: number,
): OutgoingHttpHeaders {
  const nextHeaders: OutgoingHttpHeaders = {};
  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (headerValue === undefined) {
      continue;
    }
    const lowerHeaderName = headerName.toLowerCase();
    if (
      lowerHeaderName === "host" ||
      lowerHeaderName === "connection" ||
      lowerHeaderName === "accept-encoding"
    ) {
      continue;
    }
    nextHeaders[headerName] = headerValue;
  }
  nextHeaders.host = `127.0.0.1:${String(port)}`;
  nextHeaders["accept-encoding"] = "identity";
  return nextHeaders;
}

function copyProxyResponseHeaders(
  headers: IncomingMessage["headers"],
  entry: DevPreviewRegistryEntry,
  previewPrefix: string,
): OutgoingHttpHeaders {
  const nextHeaders: OutgoingHttpHeaders = {};
  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (headerValue === undefined) {
      continue;
    }

    if (headerName.toLowerCase() === "location") {
      if (typeof headerValue === "string") {
        nextHeaders[headerName] = rewriteLocationHeader(
          headerValue,
          entry,
          previewPrefix,
        );
      } else {
        nextHeaders[headerName] = headerValue.map((value) =>
          rewriteLocationHeader(value, entry, previewPrefix),
        );
      }
      continue;
    }

    nextHeaders[headerName] = headerValue;
  }
  return nextHeaders;
}

async function defaultProbePortStatus(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({
      host: "127.0.0.1",
      port,
    });

    const complete = (reachable: boolean): void => {
      socket.removeAllListeners();
      if (!socket.destroyed) {
        socket.destroy();
      }
      resolve(reachable);
    };

    socket.setTimeout(300);
    socket.once("connect", () => {
      complete(true);
    });
    socket.once("timeout", () => {
      complete(false);
    });
    socket.once("error", () => {
      complete(false);
    });
  });
}

function parsePreviewMatch(
  requestPath: string,
  previewPrefix: string,
): DevPreviewMatch | null {
  const normalizedPrefix = normalizeDevPreviewPrefix(previewPrefix);
  if (
    requestPath !== normalizedPrefix &&
    !requestPath.startsWith(`${normalizedPrefix}/`)
  ) {
    return null;
  }

  const suffix = requestPath.slice(normalizedPrefix.length);
  if (!suffix.startsWith("/")) {
    return null;
  }

  const withoutLeadingSlash = suffix.slice(1);
  if (withoutLeadingSlash.length === 0) {
    return null;
  }

  const separatorIndex = withoutLeadingSlash.indexOf("/");
  const portSegment =
    separatorIndex === -1
      ? withoutLeadingSlash
      : withoutLeadingSlash.slice(0, separatorIndex);

  if (!/^\d+$/.test(portSegment)) {
    return null;
  }

  const port = DevPreviewPortSchema.parse(Number(portSegment));
  const upstreamSuffix =
    separatorIndex === -1 ? "" : withoutLeadingSlash.slice(separatorIndex);
  const upstreamPath =
    upstreamSuffix.length === 0 ? "/" : upstreamSuffix;
  const canonicalPath = buildPreviewPath(previewPrefix, port, "/");

  return DevPreviewMatchSchema.parse({
    port,
    upstreamPath,
    canonicalPath,
    shouldRedirectToCanonicalPath: upstreamSuffix.length === 0,
  });
}

function writePlainResponse(
  res: ServerResponse,
  statusCode: number,
  body: string,
): void {
  const encoded = Buffer.from(body, "utf8");
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": encoded.length,
  });
  res.end(encoded);
}

function formatUpgradeHeaders(headers: IncomingMessage["headers"]): string {
  const serialized: string[] = [];
  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (headerValue === undefined) {
      continue;
    }
    serialized.push(`${headerName}: ${serializeHeaderValue(headerValue)}`);
  }
  return serialized.join("\r\n");
}

export function extractLocalDevServerDetections(
  input: string,
): DetectedLocalDevServer[] {
  const sanitizedInput = stripAnsiSequences(input);
  const detections: DetectedLocalDevServer[] = [];
  const seen = new Set<string>();

  for (const match of sanitizedInput.matchAll(LOCALHOST_URL_PATTERN)) {
    const protocolMatch = match[1];
    const portMatch = match[2];
    if (protocolMatch === undefined || portMatch === undefined) {
      continue;
    }

    const detection = DetectedLocalDevServerSchema.parse({
      protocol: protocolMatch.toLowerCase(),
      port: Number(portMatch),
    });
    const dedupeKey = `${detection.protocol}:${String(detection.port)}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    detections.push(detection);
  }

  return detections;
}

function isOpenDevPreviewAction(
  action: NonNullable<UnifiedCommandExecutionItem["commandActions"]>[number],
): action is Extract<
  NonNullable<UnifiedCommandExecutionItem["commandActions"]>[number],
  { type: "openDevPreview" }
> {
  return action.type === "openDevPreview";
}

function mergeDetectionsByPort(
  detections: readonly DetectedLocalDevServer[],
): DetectedLocalDevServer[] {
  const byPort = new Map<number, DetectedLocalDevServer>();
  for (const detection of detections) {
    byPort.set(detection.port, detection);
  }
  return [...byPort.values()];
}

export class DevPreviewRegistry {
  private readonly entries = new Map<number, DevPreviewRegistryEntry>();

  private readonly previewPrefix: string;

  private readonly probePortStatus: (port: number) => Promise<boolean>;

  public constructor(options: DevPreviewRegistryOptions = {}) {
    this.previewPrefix = normalizeDevPreviewPrefix(options.previewPrefix);
    this.probePortStatus =
      options.probePortStatus ?? defaultProbePortStatus;
  }

  public getPreviewPrefix(): string {
    return this.previewPrefix;
  }

  public getPreviewPath(port: number): string {
    return buildPreviewPath(this.previewPrefix, DevPreviewPortSchema.parse(port), "/");
  }

  public getRegisteredEntry(port: number): DevPreviewRegistryEntry | null {
    const normalizedPort = DevPreviewPortSchema.parse(port);
    return this.entries.get(normalizedPort) ?? null;
  }

  public async registerDetections(input: {
    detections: readonly DetectedLocalDevServer[];
    sourceThreadId: string;
    sourceItemId: string;
  }): Promise<DevPreviewRegistryEntry[]> {
    const now = new Date().toISOString();
    const uniqueDetections = mergeDetectionsByPort(input.detections);
    const registeredEntries: DevPreviewRegistryEntry[] = [];

    for (const detection of uniqueDetections) {
      const isReachable = await this.probePortStatus(detection.port);
      const existing = this.entries.get(detection.port);
      const entry = DevPreviewRegistryEntrySchema.parse({
        port: detection.port,
        protocol: detection.protocol,
        sourceThreadId: input.sourceThreadId,
        sourceItemId: input.sourceItemId,
        firstSeenAt: existing?.firstSeenAt ?? now,
        lastSeenAt: now,
        status: isReachable ? "online" : "offline",
      });
      this.entries.set(detection.port, entry);
      registeredEntries.push(entry);
    }

    return registeredEntries;
  }

  public async refreshEntry(port: number): Promise<DevPreviewRegistryEntry | null> {
    const normalizedPort = DevPreviewPortSchema.parse(port);
    const existing = this.entries.get(normalizedPort);
    if (existing == null) {
      return null;
    }

    const isReachable = await this.probePortStatus(normalizedPort);
    const refreshed = DevPreviewRegistryEntrySchema.parse({
      ...existing,
      lastSeenAt: new Date().toISOString(),
      status: isReachable ? "online" : "offline",
    });
    this.entries.set(normalizedPort, refreshed);
    return refreshed;
  }
}

export async function enrichUnifiedThreadWithDevPreviews(
  thread: UnifiedThread,
  registry: DevPreviewRegistry,
): Promise<UnifiedThread> {
  UnifiedThreadSchema.parse(thread);

  const nextTurns: UnifiedThread["turns"] = [];

  for (const turn of thread.turns) {
    const nextItems: UnifiedThread["turns"][number]["items"] = [];

    for (const item of turn.items) {
      if (item.type !== "commandExecution") {
        nextItems.push(item);
        continue;
      }

      const validatedItem = CommandExecutionItemSchema.parse(item);
      const outputDetections =
        validatedItem.aggregatedOutput != null
          ? extractLocalDevServerDetections(validatedItem.aggregatedOutput)
          : [];
      const commandDetections = extractLocalDevServerDetections(
        validatedItem.command,
      );
      const detections = mergeDetectionsByPort([
        ...outputDetections,
        ...commandDetections,
      ]);

      if (detections.length === 0) {
        nextItems.push(validatedItem);
        continue;
      }

      const registeredEntries = await registry.registerDetections({
        detections,
        sourceThreadId: thread.id,
        sourceItemId: validatedItem.id,
      });
      const existingActions = validatedItem.commandActions ?? [];
      const existingPreviewPorts = new Set(
        existingActions.flatMap((action) =>
          isOpenDevPreviewAction(action) ? [action.port] : [],
        ),
      );

      const previewActions = registeredEntries
        .filter((entry) => !existingPreviewPorts.has(entry.port))
        .map((entry) => ({
          type: "openDevPreview" as const,
          name: `Open preview (${entry.protocol.toUpperCase()} :${String(entry.port)})`,
          path: registry.getPreviewPath(entry.port),
          port: entry.port,
          status: entry.status,
        }));

      nextItems.push({
        ...validatedItem,
        commandActions:
          previewActions.length > 0
            ? [...existingActions, ...previewActions]
            : existingActions,
      });
    }

    nextTurns.push({
      ...turn,
      items: nextItems,
    });
  }

  return {
    ...thread,
    turns: nextTurns,
  };
}

export async function proxyDevPreviewRequest(input: {
  req: IncomingMessage;
  res: ServerResponse;
  registry: DevPreviewRegistry;
  previewPrefix?: string;
}): Promise<boolean> {
  if (input.req.url == null) {
    return false;
  }

  const requestUrl = new URL(input.req.url, "http://127.0.0.1");
  const previewPrefix =
    input.previewPrefix ?? input.registry.getPreviewPrefix();
  const match = parsePreviewMatch(requestUrl.pathname, previewPrefix);
  if (match == null) {
    return false;
  }

  if (match.shouldRedirectToCanonicalPath) {
    const location = `${match.canonicalPath}${requestUrl.search}`;
    input.res.writeHead(308, {
      Location: location,
    });
    input.res.end();
    return true;
  }

  const entry = await input.registry.refreshEntry(match.port);
  if (entry == null) {
    writePlainResponse(input.res, 404, "Dev preview port is not registered.");
    return true;
  }

  if (entry.status === "offline") {
    writePlainResponse(input.res, 502, "Dev preview target is offline.");
    return true;
  }

  await new Promise<void>((resolve, reject) => {
    const transport = entry.protocol === "https" ? https : http;
    const upstreamRequest = transport.request(
      {
        hostname: "127.0.0.1",
        port: entry.port,
        method: input.req.method,
        path: `${match.upstreamPath}${requestUrl.search}`,
        headers: sanitizeProxyRequestHeaders(input.req.headers, entry.port),
      },
      (upstreamResponse) => {
        const responseHeaders = copyProxyResponseHeaders(
          upstreamResponse.headers,
          entry,
          previewPrefix,
        );

        if (isHtmlResponse(upstreamResponse.headers["content-type"])) {
          const chunks: Buffer[] = [];
          upstreamResponse.on("data", (chunk) => {
            chunks.push(
              typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk,
            );
          });
          upstreamResponse.on("end", () => {
            const body = Buffer.concat(chunks).toString("utf8");
            const rewrittenBody = rewriteHtmlForPreview(
              body,
              previewPrefix,
              entry.port,
            );
            const encodedBody = Buffer.from(rewrittenBody, "utf8");
            delete responseHeaders["transfer-encoding"];
            delete responseHeaders["content-encoding"];
            responseHeaders["content-length"] = encodedBody.length;
            input.res.writeHead(upstreamResponse.statusCode ?? 200, responseHeaders);
            input.res.end(encodedBody);
            resolve();
          });
          upstreamResponse.on("error", reject);
          return;
        }

        input.res.writeHead(upstreamResponse.statusCode ?? 200, responseHeaders);
        upstreamResponse.pipe(input.res);
        upstreamResponse.on("end", () => {
          resolve();
        });
        upstreamResponse.on("error", reject);
      },
    );

    upstreamRequest.on("error", reject);
    input.req.pipe(upstreamRequest);
  });

  return true;
}

export async function proxyDevPreviewUpgrade(input: {
  req: IncomingMessage;
  socket: Duplex;
  head: Buffer;
  registry: DevPreviewRegistry;
  previewPrefix?: string;
}): Promise<boolean> {
  if (input.req.url == null) {
    return false;
  }

  const requestUrl = new URL(input.req.url, "http://127.0.0.1");
  const previewPrefix =
    input.previewPrefix ?? input.registry.getPreviewPrefix();
  const match = parsePreviewMatch(requestUrl.pathname, previewPrefix);
  if (match == null) {
    return false;
  }

  const entry = await input.registry.refreshEntry(match.port);
  if (entry == null || entry.status === "offline") {
    input.socket.write(
      "HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n",
    );
    input.socket.destroy();
    return true;
  }

  await new Promise<void>((resolve, reject) => {
    const transport = entry.protocol === "https" ? https : http;
    const upstreamRequest = transport.request({
      hostname: "127.0.0.1",
      port: entry.port,
      method: input.req.method,
      path: `${match.upstreamPath}${requestUrl.search}`,
      headers: sanitizeProxyRequestHeaders(input.req.headers, entry.port),
    });

    upstreamRequest.on("upgrade", (upstreamResponse, upstreamSocket, upstreamHead) => {
      const headerBlock = formatUpgradeHeaders(upstreamResponse.headers);
      const responseStatusCode = upstreamResponse.statusCode ?? 101;
      const responseStatusMessage =
        upstreamResponse.statusMessage ?? "Switching Protocols";
      input.socket.write(
        `HTTP/1.1 ${String(responseStatusCode)} ${responseStatusMessage}\r\n${headerBlock}\r\n\r\n`,
      );
      if (input.head.length > 0) {
        upstreamSocket.write(input.head);
      }
      if (upstreamHead.length > 0) {
        input.socket.write(upstreamHead);
      }
      upstreamSocket.pipe(input.socket);
      input.socket.pipe(upstreamSocket);
      upstreamSocket.on("close", () => {
        resolve();
      });
      upstreamSocket.on("error", reject);
      input.socket.on("error", reject);
    });

    upstreamRequest.on("response", () => {
      input.socket.write(
        "HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n",
      );
      input.socket.destroy();
      resolve();
    });
    upstreamRequest.on("error", reject);
    upstreamRequest.end();
  });

  return true;
}
