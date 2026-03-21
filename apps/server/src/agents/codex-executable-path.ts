import { execFileSync } from "node:child_process";

export function pickPreferredWindowsCodexExecutablePath(
  candidates: readonly string[],
): string | null {
  const normalizedCandidates = candidates
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate.length > 0);

  for (const candidate of normalizedCandidates) {
    const lowerCandidate = candidate.toLowerCase();
    if (lowerCandidate.endsWith(".cmd") || lowerCandidate.endsWith(".exe")) {
      return candidate;
    }
  }

  for (const candidate of normalizedCandidates) {
    const lowerCandidate = candidate.toLowerCase();
    if (!lowerCandidate.endsWith(".ps1")) {
      return candidate;
    }
  }

  return normalizedCandidates[0] ?? null;
}

function resolveWindowsCodexExecutablePath(candidate: string): string {
  const trimmedCandidate = candidate.trim();
  if (trimmedCandidate.length === 0) {
    return candidate;
  }

  try {
    const whereOutput = execFileSync("where.exe", [trimmedCandidate], {
      encoding: "utf8",
    });
    const preferredPath = pickPreferredWindowsCodexExecutablePath(
      whereOutput
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    );
    return preferredPath ?? trimmedCandidate;
  } catch {
    return trimmedCandidate;
  }
}

export function resolveCodexExecutablePath(
  configuredPath: string | undefined,
): string {
  if (configuredPath && configuredPath.length > 0) {
    return process.platform === "win32"
      ? resolveWindowsCodexExecutablePath(configuredPath)
      : configuredPath;
  }

  if (process.platform === "win32") {
    return resolveWindowsCodexExecutablePath("codex");
  }

  return "codex";
}
