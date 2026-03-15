import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatComposer } from "../src/components/ChatComposer";

describe("ChatComposer", () => {
  it("submits only once while a send is already in flight", async () => {
    let resolveSend: (() => void) | null = null;
    const onSend = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );

    render(
      <ChatComposer
        canSend
        isBusy={false}
        isGenerating={false}
        onInterrupt={() => {}}
        onSend={onSend}
      />,
    );

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

    resolveSend?.();
  });
});
