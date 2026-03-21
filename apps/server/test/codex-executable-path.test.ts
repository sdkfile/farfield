import { describe, expect, it } from "vitest";
import { pickPreferredWindowsCodexExecutablePath } from "../src/agents/codex-executable-path.js";

describe("pickPreferredWindowsCodexExecutablePath", () => {
  it("prefers cmd and exe launchers over powershell shims", () => {
    const preferredPath = pickPreferredWindowsCodexExecutablePath([
      "C:\\Users\\seong\\AppData\\Roaming\\npm\\codex.ps1",
      "C:\\Users\\seong\\AppData\\Roaming\\npm\\codex.cmd",
      "C:\\Program Files\\WindowsApps\\OpenAI.Codex\\codex.exe",
    ]);

    expect(preferredPath).toBe(
      "C:\\Users\\seong\\AppData\\Roaming\\npm\\codex.cmd",
    );
  });

  it("falls back to the first non-powershell candidate", () => {
    const preferredPath = pickPreferredWindowsCodexExecutablePath([
      "codex",
      "C:\\Users\\seong\\AppData\\Roaming\\npm\\codex.ps1",
    ]);

    expect(preferredPath).toBe("codex");
  });

  it("returns the powershell path only when no better candidate exists", () => {
    const preferredPath = pickPreferredWindowsCodexExecutablePath([
      "C:\\Users\\seong\\AppData\\Roaming\\npm\\codex.ps1",
    ]);

    expect(preferredPath).toBe(
      "C:\\Users\\seong\\AppData\\Roaming\\npm\\codex.ps1",
    );
  });
});
