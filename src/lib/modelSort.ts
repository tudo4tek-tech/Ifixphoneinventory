// Orders device models "newest first" for a line listing page (iPhone,
// Galaxy S, Redmi Note, Reno, ...). There's no stored release date, so
// this is a heuristic: pull the primary generation number out of the name
// (17 from "iPhone 17 Pro Max", 23 from "Galaxy S23 Ultra", 13 from
// "Redmi Note 13 Pro+"), sort that descending, then within a tied
// generation rank by how "high-end" the variant name reads (Ultra/Pro Max
// first, Mini/SE/e last). Good enough across brands without per-line
// special-casing; ties fall back to name.

function generationNumber(name: string): number {
  // Strip parenthetical model codes ("(A3517)", "(2412DPC0AG)") first --
  // otherwise the code's digits get picked up instead of (or as if they
  // were) the actual generation number.
  const withoutCode = name.replace(/\([^)]*\)/g, "");
  const m = withoutCode.match(/\d+/);
  if (m) {
    const n = parseInt(m[0], 10);
    // Reject anything year-like (e.g. "iPhone SE 2022") or otherwise too
    // large to plausibly be a generation/model number -- those aren't a
    // reliable "newer means bigger" signal the way 11-17, S21-S25 are.
    if (n < 1000) return n;
  }
  // Apple's X-era (X / XR / XS / XS Max) has no digit at all -- it sat
  // between iPhone 8 and iPhone 11 in real release order.
  if (/\bx[rs]?\b/i.test(withoutCode)) return 10;
  return -1;
}

function variantTier(name: string): number {
  const n = name.toLowerCase();
  if (n.includes("ultra")) return 6;
  if (n.includes("pro max")) return 5;
  if (n.includes("pro+") || n.includes("pro plus")) return 4;
  if (n.includes("pro")) return 3;
  if (n.includes("plus")) return 2;
  if (n.includes("lite")) return 0;
  if (n.includes("mini")) return -1;
  if (/\d+e\b/.test(n) || n.includes(" se")) return -2;
  return 1; // base / no qualifier
}

export function compareModelsNewestFirst(a: { name: string }, b: { name: string }): number {
  const genDiff = generationNumber(b.name) - generationNumber(a.name);
  if (genDiff !== 0) return genDiff;
  const tierDiff = variantTier(b.name) - variantTier(a.name);
  if (tierDiff !== 0) return tierDiff;
  return a.name.localeCompare(b.name);
}
