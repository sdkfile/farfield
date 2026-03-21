import path from "node:path";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import {
  UnifiedGitStatusSchema,
  type JsonValue,
  type UnifiedGitFile,
  type UnifiedGitFileChangeKind,
  type UnifiedGitStatus,
} from "@farfield/unified-surface";
import { z } from "zod";

export class GitActionError extends Error {
  public readonly code: string;
  public readonly details?: JsonValue;

  public constructor(code: string, message: string, details?: JsonValue) {
    super(message);
    this.name = "GitActionError";
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export interface GitCommitResult {
  commitHash: string;
  summary: string;
  status: UnifiedGitStatus;
}

export interface GitCommitAndPushResult extends GitCommitResult {
  pushedBranch: string;
  remoteName: string;
  upstreamBranch: string;
}

export interface GitSwitchBranchResult {
  previousBranch: string | null;
  currentBranch: string | null;
  status: UnifiedGitStatus;
}

export interface GitCreatePullRequestInput {
  title?: string | null;
  body?: string | null;
  baseBranch?: string | null;
}

export interface GitCreatePullRequestResult {
  number: number;
  url: string;
  title: string;
  baseBranch: string;
  headBranch: string;
  status: UnifiedGitStatus;
}

export interface GitBackend {
  getStatus(cwd?: string): Promise<UnifiedGitStatus>;
  commit(message: string, cwd?: string): Promise<GitCommitResult>;
  commitAndPush(message: string, cwd?: string): Promise<GitCommitAndPushResult>;
  switchBranch(branch: string, cwd?: string): Promise<GitSwitchBranchResult>;
  createPullRequest(
    input: GitCreatePullRequestInput,
    cwd?: string,
  ): Promise<GitCreatePullRequestResult>;
}

interface GitExecResult {
  stdout: string;
  stderr: string;
}

interface ParsedBranchHeader {
  branch: string | null;
  upstream: string | null;
  detached: boolean;
  ahead: number;
  behind: number;
}

interface GhState {
  cliAvailable: boolean;
  authenticated: boolean;
}

const DEFAULT_WORKSPACE = path.resolve(process.cwd());
const GitHubPullRequestViewSchema = z.object({
  number: z.number().int().nonnegative(),
  url: z.string().trim().min(1),
  title: z.string().trim().min(1),
  baseRefName: z.string().trim().min(1),
  headRefName: z.string().trim().min(1),
});

function getGhExecutableCandidates(): string[] {
  if (process.platform !== "win32") {
    return ["gh"];
  }

  const candidates = ["gh", "C:\\Program Files\\GitHub CLI\\gh.exe"];
  const localAppData = process.env["LOCALAPPDATA"];
  if (localAppData && localAppData.length > 0) {
    candidates.push(
      path.join(localAppData, "Programs", "GitHub CLI", "gh.exe"),
    );
  }

  return candidates;
}

function resolveGhExecutable(): string {
  for (const candidate of getGhExecutableCandidates()) {
    if (candidate === "gh") {
      continue;
    }
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return "gh";
}

function normalizeGitFileChangeKind(status: string): UnifiedGitFileChangeKind {
  switch (status) {
    case " ":
      return "unmodified";
    case "M":
    case "T":
      return "modified";
    case "A":
      return "added";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    case "C":
      return "copied";
    case "?":
      return "untracked";
    case "U":
      return "unmerged";
    default:
      throw new GitActionError(
        "unsupportedGitStatusCode",
        `Unsupported git status code: ${status}`,
      );
  }
}

function parseBranchHeader(header: string | null): ParsedBranchHeader {
  if (header === null) {
    return {
      branch: null,
      upstream: null,
      detached: false,
      ahead: 0,
      behind: 0,
    };
  }

  const value = header.startsWith("## ") ? header.slice(3) : header;
  const [branchSectionValue, aheadBehindSectionValue] = value.split(" [", 2);
  const branchSection = branchSectionValue ?? "";
  const aheadBehindSection = aheadBehindSectionValue ?? "";
  const normalizedAheadBehind = aheadBehindSection
    ? aheadBehindSection.replace(/\]$/, "")
    : "";
  const [branchPart, upstreamPart] = branchSection.split("...", 2);

  const detached = branchPart === "HEAD (no branch)";
  const branch = detached ? null : (branchPart ?? null);
  const upstream = upstreamPart ?? null;

  let ahead = 0;
  let behind = 0;
  if (normalizedAheadBehind.length > 0) {
    const segments = normalizedAheadBehind.split(", ");
    for (const segment of segments) {
      if (segment.startsWith("ahead ")) {
        ahead = Number(segment.slice("ahead ".length));
        continue;
      }
      if (segment.startsWith("behind ")) {
        behind = Number(segment.slice("behind ".length));
      }
    }
  }

  return {
    branch,
    upstream,
    detached,
    ahead: Number.isInteger(ahead) && ahead >= 0 ? ahead : 0,
    behind: Number.isInteger(behind) && behind >= 0 ? behind : 0,
  };
}

function parseStatusEntries(stdout: string): {
  branchHeader: ParsedBranchHeader;
  files: UnifiedGitFile[];
} {
  const entries = stdout.split("\u0000");
  const files: UnifiedGitFile[] = [];
  let branchHeader = parseBranchHeader(null);

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) {
      continue;
    }

    if (entry.startsWith("## ")) {
      branchHeader = parseBranchHeader(entry);
      continue;
    }

    if (entry.startsWith("?? ")) {
      files.push({
        path: entry.slice(3),
        indexStatus: "untracked",
        workingTreeStatus: "untracked",
      });
      continue;
    }

    if (entry.length < 4) {
      throw new GitActionError(
        "invalidGitStatusOutput",
        `Unexpected git status entry: ${entry}`,
      );
    }

    const indexStatus = normalizeGitFileChangeKind(entry[0] ?? " ");
    const workingTreeStatus = normalizeGitFileChangeKind(entry[1] ?? " ");
    const pathValue = entry.slice(3);
    const needsOriginalPath =
      indexStatus === "renamed" ||
      indexStatus === "copied" ||
      workingTreeStatus === "renamed" ||
      workingTreeStatus === "copied";

    let originalPath: string | null = null;
    if (needsOriginalPath) {
      const nextEntry = entries[index + 1];
      if (!nextEntry || nextEntry.length === 0) {
        throw new GitActionError(
          "invalidGitStatusOutput",
          `Missing original path for git status entry: ${entry}`,
        );
      }
      originalPath = nextEntry;
      index += 1;
    }

    files.push({
      path: pathValue,
      ...(originalPath !== null ? { originalPath } : {}),
      indexStatus,
      workingTreeStatus,
    });
  }

  return {
    branchHeader,
    files,
  };
}

async function execGit(args: string[], cwd: string): Promise<GitExecResult> {
  return new Promise<GitExecResult>((resolve, reject) => {
    execFile(
      "git",
      args,
      {
        cwd,
        encoding: "utf8",
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          const stderrText = stderr.trim();
          if (
            stderrText.includes("not a git repository") ||
            stderrText.includes("not a git repository (or any of the parent directories)")
          ) {
            reject(
              new GitActionError(
                "notGitRepository",
                `No git repository found for ${cwd}`,
                { cwd },
              ),
            );
            return;
          }

          reject(
            new GitActionError(
              "gitCommandFailed",
              stderrText.length > 0
                ? stderrText
                : `git ${args.join(" ")} failed`,
              {
                cwd,
                args,
                stderr: stderrText,
              },
            ),
          );
          return;
        }

        resolve({
          stdout,
          stderr,
        });
      },
    );
  });
}

async function execGh(
  args: string[],
  cwd: string,
): Promise<GitExecResult> {
  return new Promise<GitExecResult>((resolve, reject) => {
    execFile(
      resolveGhExecutable(),
      args,
      {
        cwd,
        encoding: "utf8",
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });
}

async function getGhState(cwd: string): Promise<GhState> {
  try {
    await execGh(["--version"], cwd);
  } catch {
    return {
      cliAvailable: false,
      authenticated: false,
    };
  }

  try {
    await execGh(["auth", "status"], cwd);
    return {
      cliAvailable: true,
      authenticated: true,
    };
  } catch {
    return {
      cliAvailable: true,
      authenticated: false,
    };
  }
}

async function resolveRepositoryCwd(cwd?: string): Promise<string> {
  const resolvedCwd = cwd ? path.resolve(cwd) : DEFAULT_WORKSPACE;
  const topLevel = await execGit(["rev-parse", "--show-toplevel"], resolvedCwd);
  return topLevel.stdout.trim();
}

async function readLocalBranches(cwd: string): Promise<string[]> {
  const result = await execGit(
    ["branch", "--format=%(refname:short)"],
    cwd,
  );
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function readStatus(cwd?: string): Promise<UnifiedGitStatus> {
  const root = await resolveRepositoryCwd(cwd);
  const ghState = await getGhState(root);
  const statusResult = await execGit(
    ["status", "--branch", "--porcelain=v1", "-z"],
    root,
  );
  const parsed = parseStatusEntries(statusResult.stdout);
  const localBranches = await readLocalBranches(root);

  const stagedCount = parsed.files.filter(
    (file) =>
      file.indexStatus !== "unmodified" && file.indexStatus !== "untracked",
  ).length;
  const unstagedCount = parsed.files.filter(
    (file) =>
      file.workingTreeStatus !== "unmodified" &&
      file.workingTreeStatus !== "untracked",
  ).length;
  const untrackedCount = parsed.files.filter(
    (file) =>
      file.indexStatus === "untracked" &&
      file.workingTreeStatus === "untracked",
  ).length;

  return UnifiedGitStatusSchema.parse({
    cwd: cwd ? path.resolve(cwd) : DEFAULT_WORKSPACE,
    root,
    branch: parsed.branchHeader.branch,
    upstream: parsed.branchHeader.upstream,
    detached: parsed.branchHeader.detached,
    ahead: parsed.branchHeader.ahead,
    behind: parsed.branchHeader.behind,
    isClean: parsed.files.length === 0,
    hasStagedChanges: stagedCount > 0,
    hasUnstagedChanges: unstagedCount > 0,
    hasUntrackedChanges: untrackedCount > 0,
    stagedCount,
    unstagedCount,
    untrackedCount,
    ghCliAvailable: ghState.cliAvailable,
    ghAuthenticated: ghState.authenticated,
    localBranches,
    files: parsed.files,
  });
}

async function readHeadSummary(cwd: string): Promise<{
  commitHash: string;
  summary: string;
}> {
  const [hashResult, summaryResult] = await Promise.all([
    execGit(["rev-parse", "--short", "HEAD"], cwd),
    execGit(["log", "-1", "--pretty=%s"], cwd),
  ]);

  return {
    commitHash: hashResult.stdout.trim(),
    summary: summaryResult.stdout.trim(),
  };
}

export function createGitBackend(): GitBackend {
  return {
    async getStatus(cwd?: string): Promise<UnifiedGitStatus> {
      return readStatus(cwd);
    },

    async commit(message: string, cwd?: string): Promise<GitCommitResult> {
      const beforeStatus = await readStatus(cwd);
      if (!beforeStatus.hasStagedChanges) {
        throw new GitActionError(
          "nothingToCommit",
          "There are no staged changes to commit.",
          {
            cwd: beforeStatus.cwd,
            root: beforeStatus.root,
          },
        );
      }

      await execGit(["commit", "-m", message], beforeStatus.root);
      const head = await readHeadSummary(beforeStatus.root);
      const status = await readStatus(beforeStatus.root);

      return {
        commitHash: head.commitHash,
        summary: head.summary,
        status,
      };
    },

    async commitAndPush(
      message: string,
      cwd?: string,
    ): Promise<GitCommitAndPushResult> {
      const commitResult = await this.commit(message, cwd);
      const upstreamBranch = commitResult.status.upstream;
      const pushedBranch = commitResult.status.branch;

      if (upstreamBranch === null || pushedBranch === null) {
        throw new GitActionError(
          "noUpstreamBranch",
          "The current branch has no upstream branch configured for push.",
          {
            commitHash: commitResult.commitHash,
            branch: commitResult.status.branch,
            upstream: commitResult.status.upstream,
          },
        );
      }

      const remoteName = upstreamBranch.split("/")[0];
      if (!remoteName || remoteName.length === 0) {
        throw new GitActionError(
          "invalidUpstreamBranch",
          `Could not determine remote from upstream branch ${upstreamBranch}.`,
          {
            commitHash: commitResult.commitHash,
            upstreamBranch,
          },
        );
      }

      try {
        await execGit(["push", "--porcelain"], commitResult.status.root);
      } catch (error) {
        if (error instanceof GitActionError) {
          throw new GitActionError("pushRejected", error.message, {
            commitHash: commitResult.commitHash,
            branch: pushedBranch,
            upstreamBranch,
            remoteName,
            cause: error.details ?? null,
          });
        }
        throw error;
      }

      const status = await readStatus(commitResult.status.root);
      return {
        commitHash: commitResult.commitHash,
        summary: commitResult.summary,
        pushedBranch,
        remoteName,
        upstreamBranch,
        status,
      };
    },

    async switchBranch(
      branch: string,
      cwd?: string,
    ): Promise<GitSwitchBranchResult> {
      const beforeStatus = await readStatus(cwd);
      if (!beforeStatus.isClean) {
        throw new GitActionError(
          "branchCheckoutBlocked",
          "Switching branches is blocked while the working tree has changes.",
          {
            branch: beforeStatus.branch,
            stagedCount: beforeStatus.stagedCount,
            unstagedCount: beforeStatus.unstagedCount,
            untrackedCount: beforeStatus.untrackedCount,
          },
        );
      }

      if (beforeStatus.branch === branch) {
        return {
          previousBranch: beforeStatus.branch,
          currentBranch: beforeStatus.branch,
          status: beforeStatus,
        };
      }

      try {
        await execGit(["switch", branch], beforeStatus.root);
      } catch (error) {
        if (error instanceof GitActionError) {
          throw new GitActionError(
            "branchSwitchFailed",
            error.message,
            {
              branch,
              previousBranch: beforeStatus.branch,
              cause: error.details ?? null,
            },
          );
        }
        throw error;
      }

      const status = await readStatus(beforeStatus.root);
      return {
        previousBranch: beforeStatus.branch,
        currentBranch: status.branch,
        status,
      };
    },

    async createPullRequest(
      input: GitCreatePullRequestInput,
      cwd?: string,
    ): Promise<GitCreatePullRequestResult> {
      const status = await readStatus(cwd);
      if (!status.ghCliAvailable) {
        throw new GitActionError(
          "ghUnavailable",
          "GitHub CLI is not installed.",
          {
            cwd: status.cwd,
            root: status.root,
          },
        );
      }

      if (!status.ghAuthenticated) {
        throw new GitActionError(
          "ghAuthRequired",
          "GitHub CLI is not authenticated.",
          {
            cwd: status.cwd,
            root: status.root,
          },
        );
      }

      if (status.branch === null) {
        throw new GitActionError(
          "detachedHead",
          "Pull requests cannot be created from a detached HEAD state.",
          {
            cwd: status.cwd,
            root: status.root,
          },
        );
      }

      if (status.upstream === null) {
        throw new GitActionError(
          "noUpstreamBranch",
          "Push the current branch before creating a pull request.",
          {
            branch: status.branch,
            cwd: status.cwd,
            root: status.root,
          },
        );
      }

      const createArgs = ["pr", "create", "--fill"];
      if (input.title !== undefined && input.title !== null) {
        createArgs.push("--title", input.title);
      }
      if (input.body !== undefined && input.body !== null) {
        createArgs.push("--body", input.body);
      }
      if (input.baseBranch !== undefined && input.baseBranch !== null) {
        createArgs.push("--base", input.baseBranch);
      }

      try {
        await execGh(createArgs, status.root);
      } catch (error) {
        const message =
          error instanceof Error && error.message.length > 0
            ? error.message
            : "GitHub CLI failed to create the pull request.";
        throw new GitActionError("pullRequestCreateFailed", message, {
          branch: status.branch,
          baseBranch: input.baseBranch ?? null,
        });
      }

      let viewResult: GitExecResult;
      try {
        viewResult = await execGh(
          [
            "pr",
            "view",
            "--json",
            "number,title,url,baseRefName,headRefName",
          ],
          status.root,
        );
      } catch (error) {
        const message =
          error instanceof Error && error.message.length > 0
            ? error.message
            : "GitHub CLI failed to read the created pull request.";
        throw new GitActionError("pullRequestReadFailed", message, {
          branch: status.branch,
        });
      }

      let parsed: z.infer<typeof GitHubPullRequestViewSchema>;
      try {
        parsed = GitHubPullRequestViewSchema.parse(JSON.parse(viewResult.stdout));
      } catch {
        throw new GitActionError(
          "invalidGhOutput",
          "GitHub CLI returned invalid JSON for the created pull request.",
        );
      }

      return {
        number: parsed.number,
        url: parsed.url,
        title: parsed.title,
        baseBranch: parsed.baseRefName,
        headBranch: parsed.headRefName,
        status: await readStatus(status.root),
      };
    },
  };
}
