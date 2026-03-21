// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { shouldSendOnEnterForViewport } from "./ChatComposer";

describe("shouldSendOnEnterForViewport", () => {
  it("allows Enter to send on fine pointer devices", () => {
    expect(
      shouldSendOnEnterForViewport({
        hasCoarsePointer: false,
        layoutViewportHeight: 900,
        visualViewportHeight: null,
      }),
    ).toBe(true);
  });

  it("keeps Enter as newline when the software keyboard shrinks the viewport", () => {
    expect(
      shouldSendOnEnterForViewport({
        hasCoarsePointer: true,
        layoutViewportHeight: 1024,
        visualViewportHeight: 780,
      }),
    ).toBe(false);
  });

  it("allows Enter to send on coarse pointer devices with a hardware keyboard", () => {
    expect(
      shouldSendOnEnterForViewport({
        hasCoarsePointer: true,
        layoutViewportHeight: 1024,
        visualViewportHeight: 1024,
      }),
    ).toBe(true);
  });
});
