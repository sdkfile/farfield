import { describe, expect, it } from "vitest";
import { shouldUseShellForExecutablePath } from "../src/app-server-transport.js";

describe("shouldUseShellForExecutablePath", () => {
  it("returns false for windows-independent executable names", () => {
    expect(shouldUseShellForExecutablePath("codex")).toBe(false);
    expect(shouldUseShellForExecutablePath("C:\\Tools\\codex.exe")).toBe(
      false,
    );
  });

  it("returns true for windows command scripts", () => {
    expect(
      shouldUseShellForExecutablePath("C:\\Users\\seong\\AppData\\Roaming\\npm\\codex.cmd"),
    ).toBe(true);
    expect(
      shouldUseShellForExecutablePath("C:\\Users\\seong\\AppData\\Roaming\\npm\\codex.bat"),
    ).toBe(true);
  });
});
