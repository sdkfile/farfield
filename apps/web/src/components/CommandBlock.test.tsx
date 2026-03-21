// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UnifiedThreadSchema } from "@farfield/unified-surface";
import { CommandBlock } from "./CommandBlock";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

function createCommandItem() {
  const thread = UnifiedThreadSchema.parse({
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
            aggregatedOutput: "ready",
            commandActions: [
              {
                type: "openDevPreview",
                name: "Open preview (HTTP :3000)",
                path: "/__preview/3000/",
                port: 3000,
                status: "online",
              },
            ],
          },
        ],
      },
    ],
    requests: [],
    latestCollaborationMode: null,
    latestModel: null,
    latestReasoningEffort: null,
  });

  const item = thread.turns[0]?.items[0];
  if (item?.type !== "commandExecution") {
    throw new Error("Expected commandExecution item");
  }
  return item;
}

describe("CommandBlock", () => {
  it("renders dev preview links in the expanded body", () => {
    render(<CommandBlock item={createCommandItem()} isActive={false} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: /Preview :3000 \(online\)/i,
      }),
    );

    const previewLink = screen.getByRole("link", {
      name: /Open preview \(HTTP :3000\)/i,
    });

    expect(previewLink.getAttribute("href")).toBe("/__preview/3000/");
    expect(screen.getByText("online")).toBeTruthy();
  });
});
