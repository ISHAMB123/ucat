import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* Two of this project's app-killing bugs came from editing a single
   very long file by text search. A component accidentally declared
   twice at the top level shadows the earlier one silently. This scans
   the source for top-level PascalCase declarations (components) and
   asserts every name is unique. Indented (inner) components are scoped
   to their parent and are intentionally allowed to repeat, so only
   column-zero declarations are considered. */
const SOURCE = resolve(process.cwd(), "ucat-drill-trainer.jsx");

describe("no duplicate component names", () => {
  it("every top-level component is declared once", () => {
    const text = readFileSync(SOURCE, "utf8");
    /* PascalCase: starts uppercase, contains a lowercase letter, which
       distinguishes components (Home, MockCentre) from ALL-CAPS data
       constants (PASSAGES, DRILLS, CSS). */
    const re = /^(?:function|const)\s+([A-Z][A-Za-z0-9]*)\b/gm;
    const counts = {};
    let m;
    while ((m = re.exec(text)) !== null) {
      const name = m[1];
      if (!/[a-z]/.test(name)) continue; /* skip ALL_CAPS constants */
      counts[name] = (counts[name] || 0) + 1;
    }
    const duplicates = Object.entries(counts).filter(([, n]) => n > 1).map(([name]) => name);
    expect(duplicates, `duplicated top-level names: ${duplicates.join(", ")}`).toEqual([]);
  });
});
