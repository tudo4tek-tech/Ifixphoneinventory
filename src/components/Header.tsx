import { prisma } from "@/lib/prisma";
import HeaderClient from "@/components/HeaderClient";

export default async function Header() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    select: { name: true, slug: true },
  });

  return <HeaderClient brands={brands} />;
}
