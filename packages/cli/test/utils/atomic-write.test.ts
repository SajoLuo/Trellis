import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { writeFileAtomic } from "../../src/utils/atomic-write.js";

describe("writeFileAtomic", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-atomic-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("writes new content", () => {
    const f = path.join(dir, "a.json");
    writeFileAtomic(f, '{"x":1}');
    expect(fs.readFileSync(f, "utf-8")).toBe('{"x":1}');
  });

  it("overwrites and leaves no temp file behind", () => {
    const f = path.join(dir, "a.json");
    writeFileAtomic(f, "old");
    writeFileAtomic(f, "new");
    expect(fs.readFileSync(f, "utf-8")).toBe("new");
    expect(fs.readdirSync(dir)).toEqual(["a.json"]);
  });

  it("preserves the original file when the write fails", () => {
    const target = path.join(dir, "x.json");
    writeFileAtomic(target, "first");
    const original = fs.readFileSync(target);
    const failure = Object.assign(new Error("fixture rename denied"), {
      code: "EPERM",
    });
    // The real temp write, old file readback, and cleanup still execute.
    const rename = vi
      .spyOn(fs, "renameSync")
      .mockImplementationOnce((from, to) => {
        expect(to).toBe(target);
        expect(fs.readFileSync(from, "utf-8")).toBe("second");
        throw failure;
      });
    try {
      let caught: unknown;
      try {
        writeFileAtomic(target, "second");
      } catch (error) {
        caught = error;
      }
      expect(caught).toBe(failure);
      expect(rename).toHaveBeenCalledTimes(1);
      // Original survives; no half-written temp left in the dir.
      expect(fs.readFileSync(target)).toEqual(original);
      expect(fs.readdirSync(dir)).toEqual(["x.json"]);
    } finally {
      rename.mockRestore();
    }
  });
});
