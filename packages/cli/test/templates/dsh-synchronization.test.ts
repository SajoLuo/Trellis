import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { configurePlatform } from "../../src/configurators/index.js";
import { getDshGuide } from "../../src/templates/dsh/index.js";
import { workflowMdTemplate } from "../../src/templates/trellis/index.js";

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const normalize = (text: string): string => text.replace(/\r\n/g, "\n");
const compact = (text: string): string => normalize(text).replace(/\s+/g, " ");

function requiredMatch(text: string, pattern: RegExp): string {
  const match = pattern.exec(normalize(text));
  if (!match) throw new Error(`Missing DSH instructions: ${pattern.source}`);
  return match[1];
}

function phaseDispatch(step: string): string {
  const section = requiredMatch(
    workflowMdTemplate,
    new RegExp(`#### ${step}[^\\n]*\\n([\\s\\S]*?)(?=\\n#### |$)`),
  );
  return requiredMatch(section, /^- \*\*DeepSeek Harness\*\*: ([^\n]+)/m);
}

function expectCapabilityPaths(instructions: string): void {
  const text = compact(instructions);
  // The catalog/schema, not installation of an optional package, selects the path.
  expect(text).toMatch(/(?:actual tool catalog and (?:`subagent` )?schema)/);
  expect(text).toMatch(/(?:with|With|use) `trellis_wait`/);
  expect(text).toMatch(/(?:independent|unrelated) work/);
  expect(text).toMatch(/successful (?:settled outcome|returned outcome)/);
  expect(text).toMatch(/actual report or transcript/);
  expect(text).toMatch(
    /(?:wait result|end event).*does not prove.*notice.*queued or delivered/,
  );
  expect(text).toMatch(
    /`run_in_background: false` only (?:if|when) the legacy (?:tool )?schema supports it/,
  );
  expect(text).toMatch(
    /0\.2\.1-alpha\.2 returns a `subagentId` immediately and has no `run_in_background`/,
  );
  expect(text).toMatch(/verified native notification\/yield path/);
  expect(text).toMatch(/yield the parent/);
  expect(text).toMatch(/actual successful result and report or transcript/);
  expect(text).toMatch(/no reliable synchronization path exists/);
  expect(text).toMatch(/main session/);
  expect(text).toMatch(/(?:Do not|do not) start an unsynchronizable child/);
  expect(text).toMatch(
    /(?:Unknown|Unknown, aborted, or failed) .*?(?:block|failed)/,
  );
  expect(text).toMatch(
    /(?:SDK `session\/wait`.*not automatically.*model-callable tool|(?:Never assume|or assume).*SDK `session\/wait`.*model-callable tool)/,
  );
  expect(text).not.toMatch(/returns only after DSH has queued/);
  expect(text).not.toMatch(
    /(?:Without `trellis_wait`|If unavailable), dispatch (?:every|each) child with/,
  );
}

describe("DSH synchronization instructions", () => {
  const temporaryProjects: string[] = [];

  afterEach(() => {
    for (const root of temporaryProjects.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("#1 writes a capability-selected guide through the actual DSH configurator", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-dsh-sync-"));
    temporaryProjects.push(root);
    await configurePlatform("dsh", root);

    const guide = fs.readFileSync(path.join(root, ".dsh", "DSH.md"), "utf-8");
    const fallback = requiredMatch(
      guide,
      /## Companion plugin fallback contract\n([\s\S]*?)(?=\n## )/,
    );
    expectCapabilityPaths(fallback);
    expect(fallback).toMatch(/not plugin presence\s+alone/);
    expect(fallback).toMatch(/returned child id is not completion evidence/);
    expect(fallback).toMatch(
      /Do not start an\s+unsynchronizable child or load a child-only role skill in the main session/,
    );
    expect(fallback).toMatch(
      /Unknown, aborted, or failed outcomes leave the dependent gate blocked or failed/,
    );
    expect(fallback).toMatch(
      /`settlementNoticeQueued: false` means delivery is unverified/,
    );
    expect(fallback).toMatch(
      /Do not wait for a separate notice after a verified result/,
    );
    expect(guide).not.toContain(
      "| Implement/check/research roles | Foreground native sub-agent |",
    );
  });

  const dispatchContexts: [string, () => string][] = [
    [
      "protocol",
      () =>
        requiredMatch(
          workflowMdTemplate,
          /Sub-agent dispatch protocol[^\n]*?On DeepSeek Harness, ([^\n]+)/,
        ),
    ],
    [
      "in-progress breadcrumb",
      () => {
        const body = requiredMatch(
          workflowMdTemplate,
          /\[workflow-state:in_progress\]\n([\s\S]*?)\n\[\/workflow-state:in_progress\]/,
        );
        return requiredMatch(body, /^On DeepSeek Harness, ([^\n]+)/m);
      },
    ],
    ["research (1.2)", () => phaseDispatch("1\\.2")],
    ["implement (2.1)", () => phaseDispatch("2\\.1")],
    ["check (2.2)", () => phaseDispatch("2\\.2")],
  ];

  it.each(dispatchContexts)(
    "#2 keeps all four synchronization paths safe in %s",
    (_context, load) => {
      expectCapabilityPaths(load());
    },
  );

  it("#3 preserves the same synchronization contract in the exported guide and runtime workflow mirror", () => {
    expect(getDshGuide()).toContain("not plugin presence");
    for (const relativePath of [
      ".trellis/workflow.md",
      "marketplace/workflows/native/workflow.md",
    ]) {
      expect(
        normalize(fs.readFileSync(path.join(repoRoot, relativePath), "utf-8")),
        `${relativePath} must preserve the shared synchronization contract`,
      ).toBe(normalize(workflowMdTemplate));
    }
    expect(workflowMdTemplate).toMatch(
      /Main-session default: dispatch implement\/check sub-agents, except the capability-selected DeepSeek Harness main-session fallback/,
    );
  });
});
