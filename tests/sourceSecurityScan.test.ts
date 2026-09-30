import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== ".git") {
        getAllFiles(fullPath, fileList);
      }
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") || entry.name.endsWith(".js"))
    ) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const rootDir = process.cwd();
const srcDirs = [
  path.join(rootDir, "app"),
  path.join(rootDir, "components"),
  path.join(rootDir, "lib"),
];

describe("Source Security Scan (Phase 10)", () => {
  const allSourceFiles = srcDirs.flatMap((d) => getAllFiles(d));

  it("never uses dangerouslySetInnerHTML, innerHTML, insertAdjacentHTML, document.write, eval, or new Function", () => {
    const forbiddenPatterns = [
      /dangerouslySetInnerHTML/,
      /\.innerHTML\s*=/,
      /insertAdjacentHTML/,
      /document\.write/,
      /\beval\s*\(/,
      /new\s+Function\s*\(/,
    ];

    for (const file of allSourceFiles) {
      const content = fs.readFileSync(file, "utf-8");
      for (const pattern of forbiddenPatterns) {
        expect(
          pattern.test(content),
          `Forbidden pattern ${pattern} found in ${path.relative(rootDir, file)}`
        ).toBe(false);
      }
    }
  });

  it("never exposes NEXT_PUBLIC_TRIAGE in any source code file", () => {
    for (const file of allSourceFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(
        content.includes("NEXT_PUBLIC_TRIAGE"),
        `NEXT_PUBLIC_TRIAGE found in ${path.relative(rootDir, file)}`
      ).toBe(false);
    }
  });

  it("only references TRIAGE_API_KEY inside lib/server and app/api", () => {
    for (const file of allSourceFiles) {
      const rel = path.relative(rootDir, file).replace(/\\/g, "/");
      const content = fs.readFileSync(file, "utf-8");
      if (content.includes("TRIAGE_API_KEY")) {
        const isAllowed = rel.startsWith("lib/server/") || rel.startsWith("app/api/");
        expect(
          isAllowed,
          `TRIAGE_API_KEY referenced in unauthorized location: ${rel}`
        ).toBe(true);
      }
    }
  });

  it("never imports lib/server from client layers (components/, lib/store/, lib/api/)", () => {
    const clientDirs = [
      path.join(rootDir, "components"),
      path.join(rootDir, "lib", "store"),
      path.join(rootDir, "lib", "api"),
    ];
    const clientFiles = clientDirs.flatMap((d) => getAllFiles(d));

    for (const file of clientFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(
        /@\/lib\/server|\.\.\/.*server/.test(content),
        `Client file ${path.relative(rootDir, file)} imports from server layer`
      ).toBe(false);
    }
  });

  it("only references localStorage in lib/agents/agent-storage.ts", () => {
    for (const file of allSourceFiles) {
      const rel = path.relative(rootDir, file).replace(/\\/g, "/");
      const content = fs.readFileSync(file, "utf-8");
      // Strip comments so mentions in documentation or comments don't false positive
      const codeOnly = content.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");
      if (codeOnly.includes("localStorage")) {
        expect(
          rel === "lib/agents/agent-storage.ts",
          `localStorage code found outside agent-storage in: ${rel}`
        ).toBe(true);
      }
    }
  });

  it("only references setInterval in lib/tickets/ticker.ts", () => {
    for (const file of allSourceFiles) {
      const rel = path.relative(rootDir, file).replace(/\\/g, "/");
      const content = fs.readFileSync(file, "utf-8");
      if (content.includes("setInterval")) {
        expect(
          rel === "lib/tickets/ticker.ts",
          `setInterval found outside ticker in: ${rel}`
        ).toBe(true);
      }
    }
  });
});
