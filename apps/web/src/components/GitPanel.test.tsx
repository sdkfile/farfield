// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UnifiedGitStatusSchema } from "@farfield/unified-surface";
import { GitPanel } from "./GitPanel";

const gitStatus = UnifiedGitStatusSchema.parse({
  cwd: "C:\\Users\\seong\\Desktop\\business\\farfield",
  root: "C:\\Users\\seong\\Desktop\\business\\farfield",
  branch: "main",
  upstream: "origin/main",
  detached: false,
  ahead: 0,
  behind: 0,
  isClean: true,
  hasStagedChanges: false,
  hasUnstagedChanges: false,
  hasUntrackedChanges: false,
  stagedCount: 0,
  unstagedCount: 0,
  untrackedCount: 0,
  ghCliAvailable: true,
  ghAuthenticated: true,
  localBranches: ["main"],
  files: [],
});

describe("GitPanel", () => {
  it("toggles collapsed content from the header control", () => {
    render(
      <GitPanel
        status={gitStatus}
        loading={false}
        busyAction={null}
        error=""
        pullRequestUrl={null}
        onRefresh={() => {}}
        onCommit={() => {}}
        onCommitAndPush={() => {}}
        onSwitchBranch={() => {}}
        onCreatePullRequest={() => {}}
      />,
    );

    expect(screen.getByPlaceholderText("Commit message")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Collapse git panel" }));

    expect(screen.queryByPlaceholderText("Commit message")).toBeNull();
    expect(screen.getByText("Clean")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Expand git panel" }));

    expect(screen.getByPlaceholderText("Commit message")).toBeTruthy();
  });
});
