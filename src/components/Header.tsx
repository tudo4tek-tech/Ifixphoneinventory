import { prisma } from "@/lib/prisma";
import HeaderClient from "@/components/HeaderClient";

export default async function Header() {
  // Falls back to an empty nav instead of hard-failing: this component
  // renders on every page, including Next's own internal /_not-found,
  // which can't be marked force-dynamic. Without this, an unreachable
  // database (e.g. no DATABASE_URL during a build step) would fail the
  // whole production build rather than just the nav being briefly empty.
  let brands: { name: string; slug: string }[] = [];
  try {
    brands = await prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    });
  } catch (err) {
    console.error("Header: failed to load brands", err);
  }

  return <HeaderClient brands={brands} />;
}
