import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  RefreshCcw,
  Upload,
  CheckCheck,
  Github,
} from "lucide-react";
import type { UnifiedGitStatus } from "@farfield/unified-surface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GitPanelProps {
  status: UnifiedGitStatus | null;
  loading: boolean;
  busyAction:
    | "commit"
    | "commitAndPush"
    | "switchBranch"
    | "createPullRequest"
    | null;
  error: string;
  pullRequestUrl: string | null;
  onRefresh: () => void;
  onCommit: (message: string) => void;
  onCommitAndPush: (message: string) => void;
  onSwitchBranch: (branch: string) => void;
  onCreatePullRequest: (input: {
    title?: string | null;
    body?: string | null;
    baseBranch?: string | null;
  }) => void;
}

function summarizeGitPath(pathValue: string): string {
  const segments = pathValue.split(/[\\/]/).filter((segment) => segment.length > 0);
  return segments[segments.length - 1] ?? pathValue;
}

export function GitPanel({
  status,
  loading,
  busyAction,
  error,
  pullRequestUrl,
  onRefresh,
  onCommit,
  onCommitAndPush,
  onSwitchBranch,
  onCreatePullRequest,
}: GitPanelProps): React.JSX.Element {
  const [commitMessage, setCommitMessage] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [pullRequestTitle, setPullRequestTitle] = useState("");
  const [pullRequestBody, setPullRequestBody] = useState("");
  const [pullRequestBaseBranch, setPullRequestBaseBranch] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const branchOptions = useMemo(() => {
    if (!status) {
      return [];
    }
    return status.localBranches.filter((branch) => branch !== status.branch);
  }, [status]);

  const canCommit = status !== null && status.hasStagedChanges && busyAction === null;
  const canCommitAndPush =
    canCommit && status !== null && status.upstream !== null;
  const canSwitchBranch =
    status !== null &&
    branchOptions.length > 0 &&
    busyAction === null &&
    status.isClean;
  const canCreatePullRequest =
    status !== null &&
    busyAction === null &&
    status.branch !== null &&
    status.upstream !== null &&
    status.ghCliAvailable &&
    status.ghAuthenticated;

  return (
    <Card className="border-border/70 bg-background/90 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2">
              <GitBranch size={14} />
              Git
            </CardTitle>
            <CardDescription>
              Local repository controls for the active workspace.
            </CardDescription>
            {isCollapsed && status && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/60 bg-muted/20 px-2 py-0.5">
                  {status.branch ?? "Detached HEAD"}
                </span>
                <span className="rounded-full border border-border/60 bg-muted/20 px-2 py-0.5">
                  {status.isClean ? "Clean" : "Dirty"}
                </span>
                <span className="rounded-full border border-border/60 bg-muted/20 px-2 py-0.5">
                  {status.stagedCount + status.unstagedCount + status.untrackedCount} changes
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={loading || busyAction !== null}
              onClick={onRefresh}
            >
              <RefreshCcw size={12} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label={isCollapsed ? "Expand git panel" : "Collapse git panel"}
              onClick={() => setIsCollapsed((value) => !value)}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-4">
        {status ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Branch
                </div>
                <div className="mt-1 text-sm font-medium">
                  {status.branch ?? "Detached HEAD"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {status.upstream ?? "No upstream"}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  State
                </div>
                <div className="mt-1 text-sm font-medium">
                  {status.isClean ? "Clean" : "Dirty"}
                </div>
                <div className="text-xs text-muted-foreground">
                  ahead {status.ahead} / behind {status.behind}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Changes
                </div>
                <div className="mt-1 text-sm font-medium">
                  staged {status.stagedCount}
                </div>
                <div className="text-xs text-muted-foreground">
                  unstaged {status.unstagedCount}, untracked {status.untrackedCount}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  GitHub CLI
                </div>
                <div className="mt-1 text-sm font-medium">
                  {status.ghCliAvailable ? "Installed" : "Missing"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {status.ghAuthenticated ? "Authenticated" : "Not authenticated"}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Root
              </div>
              <div className="mt-1 text-sm font-medium truncate" title={status.root}>
                {summarizeGitPath(status.root)}
              </div>
              <div className="text-xs text-muted-foreground truncate" title={status.cwd}>
                {status.cwd}
              </div>
            </div>

            {status.files.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-3">
                <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Changed Files
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {status.files.slice(0, 12).map((file) => (
                    <div
                      key={`${file.path}-${file.originalPath ?? ""}`}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="truncate font-mono text-foreground" title={file.path}>
                        {file.path}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {file.indexStatus}/{file.workingTreeStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-2">
                <Input
                  value={commitMessage}
                  onChange={(event) => setCommitMessage(event.target.value)}
                  placeholder="Commit message"
                  className="h-9 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canCommit || commitMessage.trim().length === 0}
                    onClick={() => {
                      const message = commitMessage.trim();
                      if (message.length === 0) {
                        return;
                      }
                      onCommit(message);
                      setCommitMessage("");
                    }}
                  >
                    <CheckCheck size={12} />
                    Commit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canCommitAndPush || commitMessage.trim().length === 0}
                    onClick={() => {
                      const message = commitMessage.trim();
                      if (message.length === 0) {
                        return;
                      }
                      onCommitAndPush(message);
                      setCommitMessage("");
                    }}
                  >
                    <Upload size={12} />
                    Commit & Push
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Select
                  value={selectedBranch}
                  onValueChange={(value) => setSelectedBranch(value)}
                  disabled={branchOptions.length === 0 || busyAction !== null}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Switch branch" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {branchOptions.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canSwitchBranch || selectedBranch.trim().length === 0}
                  onClick={() => {
                    const branch = selectedBranch.trim();
                    if (branch.length === 0) {
                      return;
                    }
                    onSwitchBranch(branch);
                    setSelectedBranch("");
                  }}
                >
                  <GitBranch size={12} />
                  Switch Branch
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-3 space-y-3">
              <div className="flex items-center gap-2">
                <Github size={14} />
                <div className="text-sm font-medium">Pull Request</div>
              </div>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-2">
                  <Input
                    value={pullRequestTitle}
                    onChange={(event) => setPullRequestTitle(event.target.value)}
                    placeholder="PR title (optional)"
                    className="h-9 text-sm"
                  />
                  <Textarea
                    value={pullRequestBody}
                    onChange={(event) => setPullRequestBody(event.target.value)}
                    placeholder="PR body (optional)"
                    className="min-h-[96px] text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    value={pullRequestBaseBranch}
                    onChange={(event) =>
                      setPullRequestBaseBranch(event.target.value)
                    }
                    placeholder="Base branch (optional)"
                    className="h-9 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canCreatePullRequest}
                    onClick={() => {
                      onCreatePullRequest({
                        title:
                          pullRequestTitle.trim().length > 0
                            ? pullRequestTitle.trim()
                            : null,
                        body:
                          pullRequestBody.length > 0 ? pullRequestBody : null,
                        baseBranch:
                          pullRequestBaseBranch.trim().length > 0
                            ? pullRequestBaseBranch.trim()
                            : null,
                      });
                      setPullRequestTitle("");
                      setPullRequestBody("");
                      setPullRequestBaseBranch("");
                    }}
                  >
                    <Github size={12} />
                    Create PR
                  </Button>
                  {pullRequestUrl && (
                    <a
                      href={pullRequestUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Open pull request
                    </a>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            {loading ? "Loading repository state..." : "Repository state is unavailable."}
          </div>
        )}

        {error.length > 0 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        </CardContent>
      )}
    </Card>
  );
}
