import { describe, expect, it, vi } from "vitest";
import {
  buildUpgradeCommand,
  resolveUpgradeTag,
  upgrade,
} from "../../src/commands/upgrade.js";

describe("upgrade command", () => {
  it("defaults stable versions to latest", () => {
    expect(resolveUpgradeTag("0.5.12")).toBe("latest");
  });

  it("defaults beta versions to beta", () => {
    expect(resolveUpgradeTag("0.6.0-beta.8")).toBe("beta");
  });

  it("defaults rc versions to rc", () => {
    expect(resolveUpgradeTag("0.5.0-rc.7")).toBe("rc");
  });

  it("honors an explicit tag or version", () => {
    expect(resolveUpgradeTag("0.6.0-beta.8", "latest")).toBe("latest");
    expect(resolveUpgradeTag("0.6.0-beta.8", "0.6.0-beta.9")).toBe(
      "0.6.0-beta.9",
    );
  });

  it("rejects shell-shaped tags", () => {
    expect(() => resolveUpgradeTag("0.5.12", "latest && rm -rf /")).toThrow(
      /Invalid npm tag\/version/,
    );
  });

  it("builds POSIX npm global install command without shell", () => {
    expect(
      buildUpgradeCommand({ tag: "beta" }, "0.5.12", "darwin"),
    ).toMatchObject({
      command: "npm",
      args: ["install", "-g", "@mindfoldhq/trellis@beta"],
      spawnOptions: { stdio: "inherit", shell: false },
      displayCommand: "npm install -g @mindfoldhq/trellis@beta",
      target: "@mindfoldhq/trellis@beta",
      tag: "beta",
      binaryCheckCommand: "which trellis",
    });
  });

  it("builds Windows command through cmd.exe", () => {
    expect(
      buildUpgradeCommand({ tag: "beta" }, "0.5.12", "win32"),
    ).toMatchObject({
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "npm install -g @mindfoldhq/trellis@beta"],
      spawnOptions: { stdio: "inherit", shell: false },
      displayCommand: "npm install -g @mindfoldhq/trellis@beta",
      target: "@mindfoldhq/trellis@beta",
      tag: "beta",
      binaryCheckCommand: "where trellis",
    });
  });

  it("dry-run does not execute npm", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const runner = vi.fn();

    await upgrade({ dryRun: true, tag: "latest" }, runner);

    expect(runner).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("Run: npm install -g @mindfoldhq/trellis@latest"),
    );

    log.mockRestore();
  });

  it("executes npm install for real upgrades", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const runner = vi.fn(() => ({ status: 0, signal: null }));
    const isWindows = process.platform === "win32";

    await upgrade({ tag: "latest" }, runner);

    expect(runner).toHaveBeenCalledWith(
      isWindows ? "cmd.exe" : "npm",
      isWindows
        ? ["/d", "/s", "/c", "npm install -g @mindfoldhq/trellis@latest"]
        : ["install", "-g", "@mindfoldhq/trellis@latest"],
      { stdio: "inherit", shell: false },
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("trellis --version"),
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(isWindows ? "where trellis" : "which trellis"),
    );

    log.mockRestore();
  });

  it("fails when npm exits non-zero", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const runner = vi.fn(() => ({ status: 1, signal: null }));
    const posixFailure =
      /npm install failed with exit code 1\.[\s\S]*Troubleshooting:[\s\S]*Manual command: npm install -g @mindfoldhq\/trellis@latest[\s\S]*npm config get prefix[\s\S]*which trellis/;
    const platformFailure =
      process.platform === "win32"
        ? new RegExp(
            posixFailure.source.replace("which trellis", "where trellis"),
          )
        : posixFailure;

    await expect(upgrade({ tag: "latest" }, runner)).rejects.toThrow(
      platformFailure,
    );

    log.mockRestore();
  });
});
