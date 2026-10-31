import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Next.js rejects a `"use server"` module that exports anything but an async
 * function, and it does so when the module is *loaded* — which kills every
 * action in the file, not just the offending export.
 *
 * Nothing else catches it: TypeScript is happy with a re-exported object, unit
 * tests never load the file through the Server Action runtime, and `next build`
 * in this project does not fail on it. The symptom is a form button that does
 * nothing at all, so this test guards the invariant directly.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });
}

/** Top-level `export` statements that create a runtime value. */
function valueExports(source: string): string[] {
  const out: string[] = [];
  for (const line of source.split("\n")) {
    const text = line.trim();
    // `export type` / `export interface` are erased at compile time and allowed.
    if (/^export\s+(type|interface)\b/.test(text)) continue;
    // import-then-export lists: `export { a, b };` and `export { a } from "..."`.
    const list = text.match(/^export\s*\{([^}]*)\}/);
    if (list) {
      for (const name of list[1].split(",")) {
        const clean = name.replace(/\btype\b/, "").trim();
        if (clean) out.push(clean);
      }
      continue;
    }
    // `export const` / `let` / `class` are values; `export async function` is fine.
    const decl = text.match(/^export\s+(?:default\s+)?(const|let|var|class|function\s*\*?)\b/);
    if (decl) out.push(decl[1] === "function" && /^export\s+(?:default\s+)?function\b/.test(text) ? "__sync_function__" : text.slice(0, 40));
  }
  return out;
}

describe('"use server" modules', () => {
  const files = walk(SRC).filter((file) => /^\s*["']use server["'];/.test(readFileSync(file, "utf8")));

  it("finds the action modules", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("export only async functions", () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const name of valueExports(source)) {
        // A plain `export function` (not `async`) is also rejected by Next.js.
        if (name === "__sync_function__") {
          offenders.push(`${relative(SRC, file)}: synchronous function export`);
          continue;
        }
        offenders.push(`${relative(SRC, file)}: exports ` + name);
      }
    }

    expect(offenders, 'a "use server" file may only export async functions').toEqual([]);
  });
});
