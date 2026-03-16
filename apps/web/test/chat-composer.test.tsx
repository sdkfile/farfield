import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatComposer } from "../src/components/ChatComposer";

function ControlledComposerHarness({
  initialDraft = "",
  onSend,
}: {
  initialDraft?: string;
  onSend: (text: string) => void | Promise<void>;
}): React.JSX.Element {
  const [draft, setDraft] = useState(initialDraft);

  return (
    <ChatComposer
      canSend
      draft={draft}
      isBusy={false}
      isGenerating={false}
      onDraftChange={setDraft}
      onInterrupt={() => {}}
      onSend={onSend}
    />
  );
}

afterEach(() => {
  cleanup();
});

describe("ChatComposer", () => {
  it("submits only once while a send is already in flight", async () => {
    const onSend = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          void resolve;
        }),
    );

    render(<ControlledComposerHarness onSend={onSend} />);

    const composer = screen.getByPlaceholderText("Message Codex…");

    fireEvent.change(composer, { target: { value: "hello" } });
    fireEvent.keyDown(composer, {
      key: "Enter",
      code: "Enter",
      charCode: 13,
    });
    fireEvent.keyDown(composer, {
      key: "Enter",
      code: "Enter",
      charCode: 13,
    });

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("clears a controlled draft after a successful send", async () => {
    const onSend = vi.fn(async () => {});
    render(<ControlledComposerHarness initialDraft="hello" onSend={onSend} />);

    const composer = screen.getByPlaceholderText(
      "Message Codex…",
    ) as HTMLTextAreaElement;
    fireEvent.keyDown(composer, {
      key: "Enter",
      code: "Enter",
      charCode: 13,
    });

    expect(onSend).toHaveBeenCalledWith("hello");
    await waitFor(() => {
      expect(
        (screen.getByPlaceholderText("Message Codex…") as HTMLTextAreaElement)
          .value,
      ).toBe("");
    });
  });
});
