import { describe, expect, it } from "vitest";
import {
  describeCommandAction,
  summarizeCommandForHeader,
} from "./command-action-ui";

describe("command-action-ui", () => {
  it("describes dev preview actions with a dedicated icon and status text", () => {
    const presentation = describeCommandAction({
      type: "openDevPreview",
      name: "Open preview (HTTP :3000)",
      path: "/__preview/3000/",
      port: 3000,
      status: "online",
    });

    expect(presentation).toEqual({
      iconKey: "openDevPreview",
      text: "Preview :3000 (online)",
      tooltip: "/__preview/3000/",
    });
  });

  it("includes preview actions in command header summaries", () => {
    const segments = summarizeCommandForHeader("bun run dev", [
      {
        type: "openDevPreview",
        name: "Open preview (HTTP :3000)",
        path: "/__preview/3000/",
        port: 3000,
        status: "offline",
      },
    ]);

    expect(segments[0]?.iconKey).toBe("openDevPreview");
    expect(segments[0]?.text).toBe("Preview :3000 (offline)");
  });
});
